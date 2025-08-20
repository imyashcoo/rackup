# Separated endpoints to be merged into server.py via imports if needed.
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from .utils_auth import verify_firebase_id_token, mint_app_jwt, decode_app_jwt

router = APIRouter()
security = HTTPBearer()

class ExchangeReq(BaseModel):
    idToken: str

@router.post("/auth/exchange")
async def exchange_token(body: ExchangeReq, db: AsyncIOMotorDatabase = None):
    try:
        claims = verify_firebase_id_token(body.idToken)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")

    # Upsert user profile
    uid = claims.get("uid")
    user = {
        "uid": uid,
        "name": claims.get("name"),
        "email": claims.get("email"),
        "phone": claims.get("phone_number"),
        "avatar": claims.get("picture"),
        "provider": claims.get("firebase", {}).get("sign_in_provider", "unknown"),
    }
    if db is not None:
        await db.users.update_one({"uid": uid}, {"$set": user}, upsert=True)

    app_token = mint_app_jwt({"sub": uid, **user})
    return {"token": app_token, "user": user}

@router.get("/auth/me")
async def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = decode_app_jwt(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"user": {k: payload.get(k) for k in ["sub", "name", "email", "phone", "avatar", "provider"]}}