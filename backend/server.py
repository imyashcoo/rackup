from fastapi import FastAPI, APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import re
import io
import pandas as pd
import requests
from pymongo import UpdateOne, ASCENDING
from utils_auth import verify_firebase_id_token, mint_app_jwt, decode_app_jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# -------------------- Auth endpoints --------------------
security = HTTPBearer()

class ExchangeReq(BaseModel):
    idToken: str

@api_router.post("/auth/exchange")
async def exchange_token(body: ExchangeReq):
    try:
        claims = verify_firebase_id_token(body.idToken)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")
    uid = claims.get("uid")
    user = {
        "uid": uid,
        "name": claims.get("name"),
        "email": claims.get("email"),
        "phone": claims.get("phone_number"),
        "avatar": claims.get("picture"),
        "provider": claims.get("firebase", {}).get("sign_in_provider", "unknown"),
        "updatedAt": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
    }
    await db.users.update_one({"uid": uid}, {"$set": user, "$setOnInsert": {"createdAt": datetime.utcnow()}}, upsert=True)
    app_token = mint_app_jwt({"sub": uid, **user})
    return {"token": app_token, "user": user}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    token = credentials.credentials
    try:
        payload = decode_app_jwt(token)
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@api_router.get("/auth/me")
async def me(payload: Dict[str, Any] = Depends(get_current_user)):
    return {"user": {k: payload.get(k) for k in ["sub", "name", "email", "phone", "avatar", "provider"]}}

# -------------------- Listings --------------------
class ListingIn(BaseModel):
    title: str
    city: str
    locality: str
    category: str
    images: List[str] = []
    footfall: int = 0
    expectedRevenue: int = 0
    pricePerMonth: int = 0
    size: str = ""
    plus: bool = False
    description: str = ""

class Listing(ListingIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ownerId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

@api_router.post("/listings")
async def create_listing(body: ListingIn, payload: Dict[str, Any] = Depends(get_current_user)):
    owner_id = payload.get("sub")
    listing = Listing(ownerId=owner_id, **body.dict())
    await db.listings.insert_one(listing.dict())
    return listing

@api_router.get("/listings")
async def list_listings(q: Optional[str] = None, city: Optional[str] = None, locality: Optional[str] = None,
                        category: Optional[str] = None, plus: Optional[bool] = None,
                        minFootfall: Optional[int] = None, maxPrice: Optional[int] = None,
                        page: int = 1, limit: int = 12):
    query: Dict[str, Any] = {}
    if q:
        regex = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"title": regex}, {"city": regex}, {"locality": regex}, {"category": regex}
        ]
    if city: query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    if locality: query["locality"] = {"$regex": f"^{re.escape(locality)}$", "$options": "i"}
    if category: query["category"] = {"$regex": f"^{re.escape(category)}$", "$options": "i"}
    if plus is not None: query["plus"] = plus
    if minFootfall is not None: query["footfall"] = {"$gte": int(minFootfall)}
    if maxPrice is not None: query["pricePerMonth"] = {"$lte": int(maxPrice)}

    skip = max(0, (page - 1) * limit)
    cursor = db.listings.find(query).skip(skip).limit(limit).sort("createdAt", -1)
    items = [Listing(**doc) async for doc in cursor]
    total = await db.listings.count_documents(query)
    return {"items": items, "page": page, "limit": limit, "total": total}

@api_router.get("/listings/{id}")
async def get_listing(id: str):
    doc = await db.listings.find_one({"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    return Listing(**doc)

@api_router.patch("/listings/{id}")
async def update_listing(id: str, body: ListingIn, payload: Dict[str, Any] = Depends(get_current_user)):
    doc = await db.listings.find_one({"id": id})
    if not doc: raise HTTPException(status_code=404, detail="Listing not found")
    if doc.get("ownerId") != payload.get("sub"): raise HTTPException(status_code=403, detail="Not owner")
    update = body.dict()
    update["updatedAt"] = datetime.utcnow()
    await db.listings.update_one({"id": id}, {"$set": update})
    new_doc = await db.listings.find_one({"id": id})
    return Listing(**new_doc)

@api_router.delete("/listings/{id}")
async def delete_listing(id: str, payload: Dict[str, Any] = Depends(get_current_user)):
    doc = await db.listings.find_one({"id": id})
    if not doc: raise HTTPException(status_code=404, detail="Listing not found")
    if doc.get("ownerId") != payload.get("sub"): raise HTTPException(status_code=403, detail="Not owner")
    await db.listings.delete_one({"id": id})
    return {"deleted": True}

# -------------------- Favorites --------------------
@api_router.post("/listings/{id}/favorite")
async def favorite_listing(id: str, payload: Dict[str, Any] = Depends(get_current_user)):
    uid = payload.get("sub")
    await db.favorites.update_one({"userId": uid, "listingId": id}, {"$set": {"userId": uid, "listingId": id, "createdAt": datetime.utcnow()}}, upsert=True)
    return {"favorited": True}

@api_router.delete("/listings/{id}/favorite")
async def unfavorite_listing(id: str, payload: Dict[str, Any] = Depends(get_current_user)):
    uid = payload.get("sub")
    await db.favorites.delete_one({"userId": uid, "listingId": id})
    return {"favorited": False}

# -------------------- Conversations & Messages --------------------
class ConversationIn(BaseModel):
    listingId: str
    ownerId: str

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    listingId: str
    buyerId: str
    ownerId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    lastMessageAt: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversationId: str
    senderId: str
    text: str
    ts: datetime = Field(default_factory=datetime.utcnow)

@api_router.get("/conversations")
async def get_conversations(listingId: Optional[str] = None, payload: Dict[str, Any] = Depends(get_current_user)):
    uid = payload.get("sub")
    q: Dict[str, Any] = {"$or": [{"buyerId": uid}, {"ownerId": uid}]}
    if listingId: q["listingId"] = listingId
    items = [Conversation(**doc) async for doc in db.conversations.find(q).sort("lastMessageAt", -1)]
    return items

@api_router.post("/conversations")
async def create_conversation(body: ConversationIn, payload: Dict[str, Any] = Depends(get_current_user)):
    uid = payload.get("sub")
    # ensure one convo per buyer+listing
    existing = await db.conversations.find_one({"buyerId": uid, "listingId": body.listingId, "ownerId": body.ownerId})
    if existing:
        return Conversation(**existing)
    convo = Conversation(listingId=body.listingId, buyerId=uid, ownerId=body.ownerId)
    await db.conversations.insert_one(convo.dict())
    return convo

@api_router.get("/conversations/{cid}/messages")
async def get_messages(cid: str, payload: Dict[str, Any] = Depends(get_current_user)):
    # Verify membership
    convo = await db.conversations.find_one({"id": cid})
    if not convo: raise HTTPException(status_code=404, detail="Conversation not found")
    if payload.get("sub") not in [convo.get("buyerId"), convo.get("ownerId")]:
        raise HTTPException(status_code=403, detail="Not a participant")
    msgs = [Message(**doc) async for doc in db.messages.find({"conversationId": cid}).sort("ts", 1).limit(200)]
    return msgs

@api_router.post("/conversations/{cid}/messages")
async def post_message(cid: str, text: str, payload: Dict[str, Any] = Depends(get_current_user)):
    convo = await db.conversations.find_one({"id": cid})
    if not convo: raise HTTPException(status_code=404, detail="Conversation not found")
    if payload.get("sub") not in [convo.get("buyerId"), convo.get("ownerId")]:
        raise HTTPException(status_code=403, detail="Not a participant")
    msg = Message(conversationId=cid, senderId=payload.get("sub"), text=text)
    await db.messages.insert_one(msg.dict())
    await db.conversations.update_one({"id": cid}, {"$set": {"lastMessageAt": datetime.utcnow()}})
    # broadcast via WS if connected
    await ws_manager.broadcast(cid, {"type": "msg", "message": msg.dict()})
    return msg

# -------------------- WebSocket Chat --------------------
class WSManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, cid: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(cid, []).append(websocket)

    def disconnect(self, cid: str, websocket: WebSocket):
        conns = self.active.get(cid, [])
        if websocket in conns:
            conns.remove(websocket)

    async def broadcast(self, cid: str, data: Dict[str, Any]):
        for ws in list(self.active.get(cid, [])):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(cid, ws)

ws_manager = WSManager()

@app.websocket("/api/ws/chat")
async def ws_chat(websocket: WebSocket):
    # token and conversationId via query params
    token = websocket.query_params.get("token")
    cid = websocket.query_params.get("conversationId")
    if not token or not cid:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_app_jwt(token)
    except Exception:
        await websocket.close(code=4401)
        return
    await ws_manager.connect(cid, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "msg":
                text = data.get("text", "")
                # store and broadcast
                msg = Message(conversationId=cid, senderId=payload.get("sub"), text=text)
                await db.messages.insert_one(msg.dict())
                await db.conversations.update_one({"id": cid}, {"$set": {"lastMessageAt": datetime.utcnow()}})
                await ws_manager.broadcast(cid, {"type": "msg", "message": msg.dict()})
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(cid, websocket)

# -------------------- Locations --------------------
class Location(BaseModel):
    state: str
    city: str
    pincode: str

class ImportResult(BaseModel):
    imported: int
    states: int
    cities: int

# Locations endpoints
@api_router.post("/admin/locations/import", response_model=ImportResult)
async def import_locations(source: str = Query("remote", pattern="^(remote|file)$"), url: Optional[str] = None):
    try:
        if source == "remote":
            if not url:
                raise HTTPException(status_code=400, detail="Missing url for remote import")
            resp = requests.get(url, timeout=60)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch CSV")
            content = resp.content
        else:
            if not url:
                raise HTTPException(status_code=400, detail="Missing path for file import (use url param as path)")
            with open(url, "rb") as f:
                content = f.read()

        df = pd.read_csv(io.BytesIO(content))
        # Try common column names present in India pin code datasets
        # Fallbacks to be resilient
        cols = {c.lower(): c for c in df.columns}
        state_col = cols.get("statename") or cols.get("state") or cols.get("circle_name")
        city_col = cols.get("districtname") or cols.get("district") or cols.get("regionname") or cols.get("region_name")
        pin_col = cols.get("pincode") or cols.get("pin code") or cols.get("officename")
        if not (state_col and city_col and pin_col):
            raise HTTPException(status_code=400, detail=f"CSV missing required columns. Found: {list(df.columns)}")

        # Normalize strings
        def norm(s):
            if pd.isna(s):
                return ""
            return str(s).strip().title()

        ops = []
        states_set = set()
        cities_set = set()
        for _, row in df.iterrows():
            state = norm(row[state_col])
            city = norm(row[city_col])
            pin = str(row[pin_col]).strip()
            if not state or not city:
                continue
            states_set.add(state)
            cities_set.add((state, city))
            ops.append(UpdateOne({"state": state, "city": city, "pincode": pin}, {"$set": {"state": state, "city": city, "pincode": pin}}, upsert=True))

        if ops:
            await db.locations.bulk_write(ops, ordered=False)
            await db.locations.create_index([("state", ASCENDING), ("city", ASCENDING)])
            await db.locations.create_index([("city", ASCENDING)])

        return ImportResult(imported=len(ops), states=len(states_set), cities=len(cities_set))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Import failed")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/locations/states", response_model=List[str])
async def get_states():
    states = await db.locations.distinct("state")
    return sorted([s for s in states if s])

@api_router.get("/locations/cities", response_model=List[str])
async def get_cities(state: Optional[str] = None):
    query = {}
    if state:
        query["state"] = {"$regex": f"^{re.escape(state)}$", "$options": "i"}
    cities = await db.locations.distinct("city", query)
    return sorted([c for c in cities if c])

@api_router.get("/locations/search")
async def search_locations(term: str):
    regex = {"$regex": term, "$options": "i"}
    states = await db.locations.distinct("state", {"state": regex})
    cities = await db.locations.distinct("city", {"city": regex})
    return {"states": sorted(states), "cities": sorted(cities)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()