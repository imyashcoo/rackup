import os
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
import firebase_admin
from firebase_admin import credentials, auth as fb_auth

# Constants
ALG = "HS256"
SECRET_FILE = Path(__file__).parent / "app_jwt_secret.key"
SERVICE_ACCOUNT_PATH = Path(__file__).parent / "firebase_service_account.json"
ISSUER = "rackup-auth"

# Initialize Firebase Admin using local service account file without env changes
if not firebase_admin._apps:
    if SERVICE_ACCOUNT_PATH.exists():
        cred = credentials.Certificate(str(SERVICE_ACCOUNT_PATH))
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()  # Application Default Credentials


def _ensure_secret() -> bytes:
    if SECRET_FILE.exists():
        return SECRET_FILE.read_bytes()
    # generate random 32 bytes
    secret = os.urandom(32)
    SECRET_FILE.write_bytes(secret)
    return secret


APP_SECRET = _ensure_secret()


def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    decoded = fb_auth.verify_id_token(id_token)
    return decoded


def mint_app_jwt(payload: Dict[str, Any], expires_minutes: int = 60 * 24) -> str:
    to_encode = payload.copy()
    to_encode.update({
        "iss": ISSUER,
        "iat": int(datetime.utcnow().timestamp()),
        "exp": int((datetime.utcnow() + timedelta(minutes=expires_minutes)).timestamp()),
    })
    return jwt.encode(to_encode, APP_SECRET, algorithm=ALG)


def decode_app_jwt(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, APP_SECRET, algorithms=[ALG])
    except JWTError as e:
        raise e