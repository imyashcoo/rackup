from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import re
import io
import pandas as pd
import requests
from pymongo import UpdateOne, ASCENDING


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

# Locations Models
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
