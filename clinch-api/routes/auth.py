"""Local signup, login, logout and password reset."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import psycopg
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from config import get_settings
from database import get_pool
from dependencies import SESSION_COOKIE, CurrentUser, get_current_user
from rate_limit import SlidingWindowLimiter
from security.crypto import decrypt, email_lookup_hash, encrypt, normalize_email
from security.passwords import burn_verification_time, hash_password, verify_password
from security.tokens import (
    RESET_TOKEN_LIFETIME,
    SESSION_LIFETIME,
    create_session_token,
    hash_reset_token,
    new_reset_token,
)
from services.email import send_password_reset

logger = logging.getLogger("auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

FIFTEEN_MINUTES = 15 * 60
ONE_HOUR = 60 * 60
login_limiter = SlidingWindowLimiter(limit=5, window_seconds=FIFTEEN_MINUTES)
# Stops the forgot-password form being used to flood someone's inbox.
forgot_limiter = SlidingWindowLimiter(limit=5, window_seconds=ONE_HOUR)

FORGOT_PASSWORD_MESSAGE = "If an account exists for that email, a password reset link is on its way."
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 256


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)
    name: str | None = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=MAX_PASSWORD_LENGTH)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


def _set_session_cookie(response: Response, user_id: int, session_version: int) -> None:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(user_id, session_version, settings.jwt_secret),
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response) -> dict:
    settings = get_settings()
    email = normalize_email(body.email)
    name = (body.name or "").strip() or None
    try:
        with get_pool().connection() as connection:
            user = connection.execute(
                """
                INSERT INTO users (email_enc, email_hash, name_enc, password_hash, last_login_at)
                VALUES (%s, %s, %s, %s, now())
                RETURNING id, session_version
                """,
                (
                    encrypt(email, settings.aes_256_key),
                    email_lookup_hash(email, settings.hmac_key),
                    encrypt(name, settings.aes_256_key) if name else None,
                    hash_password(body.password),
                ),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    _set_session_cookie(response, user["id"], user["session_version"])
    return {"id": user["id"], "email": email, "name": name}


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response) -> dict:
    settings = get_settings()
    email_hash = email_lookup_hash(body.email, settings.hmac_key)
    ip_key, email_key = f"ip:{_client_ip(request)}", f"email:{email_hash}"

    # Both are recorded on every attempt, so one IP can't spray many emails and many
    # IPs can't hammer one email.
    wait_seconds = max(login_limiter.hit(ip_key), login_limiter.hit(email_key))
    if wait_seconds:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many sign-in attempts. Try again later.",
            headers={"Retry-After": str(wait_seconds)},
        )

    with get_pool().connection() as connection:
        user = connection.execute(
            "SELECT id, email_enc, name_enc, password_hash, session_version FROM users WHERE email_hash = %s",
            (email_hash,),
        ).fetchone()

    if user is None:
        burn_verification_time(body.password)
    if user is None or not verify_password(user["password_hash"], body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password.")

    with get_pool().connection() as connection:
        connection.execute("UPDATE users SET last_login_at = now() WHERE id = %s", (user["id"],))
    login_limiter.clear(email_key)
    login_limiter.clear(ip_key)

    _set_session_cookie(response, user["id"], user["session_version"])
    return {
        "id": user["id"],
        "email": decrypt(user["email_enc"], settings.aes_256_key),
        "name": decrypt(user["name_enc"], settings.aes_256_key) if user["name_enc"] else None,
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    return {"id": user.id, "email": user.email, "name": user.name}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks) -> dict:
    settings = get_settings()
    email_hash = email_lookup_hash(body.email, settings.hmac_key)

    # A limited request still gets the normal reply, so the limiter reveals nothing.
    if forgot_limiter.hit(f"ip:{_client_ip(request)}") or forgot_limiter.hit(f"email:{email_hash}"):
        logger.warning("Forgot-password rate limit reached.")
        return {"message": FORGOT_PASSWORD_MESSAGE}

    with get_pool().connection() as connection:
        user = connection.execute("SELECT id FROM users WHERE email_hash = %s", (email_hash,)).fetchone()
        if user is not None:
            token = new_reset_token()
            connection.execute(
                "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
                (user["id"], hash_reset_token(token), datetime.now(timezone.utc) + RESET_TOKEN_LIFETIME),
            )
            # Sent after responding, so response time doesn't reveal whether the account exists.
            background_tasks.add_task(
                send_password_reset,
                settings,
                normalize_email(body.email),
                f"{settings.app_base_url}/reset-password?token={token}",
            )
    return {"message": FORGOT_PASSWORD_MESSAGE}


def consume_reset_token(connection: psycopg.Connection, token: str) -> int | None:
    """Claims the token in one statement, so concurrent requests can't both use it."""
    row = connection.execute(
        """
        UPDATE password_resets SET used_at = now()
        WHERE token_hash = %s AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
        """,
        (hash_reset_token(token),),
    ).fetchone()
    return row["user_id"] if row else None


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest) -> dict:
    new_hash = hash_password(body.new_password)
    with get_pool().connection() as connection:
        user_id = consume_reset_token(connection, body.token)
        if user_id is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or has expired.")
        # session_version + 1 signs out every existing session.
        connection.execute(
            "UPDATE users SET password_hash = %s, session_version = session_version + 1 WHERE id = %s",
            (new_hash, user_id),
        )
        connection.execute(
            "UPDATE password_resets SET used_at = now() WHERE user_id = %s AND used_at IS NULL", (user_id,)
        )
    return {"message": "Your password has been updated. You can now sign in."}
