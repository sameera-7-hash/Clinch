"""Session JWTs and single-use password reset tokens."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt

ALGORITHM = "HS256"
SESSION_LIFETIME = timedelta(hours=24)
RESET_TOKEN_LIFETIME = timedelta(minutes=30)


def create_session_token(user_id: int, session_version: int, secret: str) -> str:
    now = datetime.now(timezone.utc)
    claims = {"sub": str(user_id), "ver": session_version, "iat": now, "exp": now + SESSION_LIFETIME}
    return jwt.encode(claims, secret, algorithm=ALGORITHM)


def decode_session_token(token: str, secret: str) -> dict | None:
    try:
        return jwt.decode(token, secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub", "ver"]})
    except jwt.InvalidTokenError:
        return None


def new_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
