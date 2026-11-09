"""Shared FastAPI dependencies."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Cookie, HTTPException, status

from config import get_settings
from database import get_pool
from security.crypto import decrypt
from security.tokens import decode_session_token

SESSION_COOKIE = "clinch_session"


@dataclass(frozen=True)
class CurrentUser:
    id: int
    email: str
    name: str | None


def get_current_user(clinch_session: str | None = Cookie(default=None)) -> CurrentUser:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not signed in.")
    if not clinch_session:
        raise unauthorized

    settings = get_settings()
    claims = decode_session_token(clinch_session, settings.jwt_secret)
    if claims is None:
        raise unauthorized

    with get_pool().connection() as connection:
        user = connection.execute(
            "SELECT id, email_enc, name_enc, session_version FROM users WHERE id = %s", (int(claims["sub"]),)
        ).fetchone()
    if user is None or user["session_version"] != claims["ver"]:
        raise unauthorized

    return CurrentUser(
        id=user["id"],
        email=decrypt(user["email_enc"], settings.aes_256_key),
        name=decrypt(user["name_enc"], settings.aes_256_key) if user["name_enc"] else None,
    )
