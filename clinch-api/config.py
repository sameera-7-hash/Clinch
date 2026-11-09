"""Environment settings for the Clinch API, read from app/.env."""
from __future__ import annotations

import base64
import binascii
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is not set - add it to app/.env (see .env.example).")
    return value


def _base64_key(name: str, expected_length: int | None = None) -> bytes:
    try:
        key = base64.b64decode(_required(name), validate=True)
    except binascii.Error as error:
        raise RuntimeError(f"{name} must be valid base64.") from error
    if expected_length is not None and len(key) != expected_length:
        raise RuntimeError(f"{name} must decode to exactly {expected_length} bytes, got {len(key)}.")
    return key


@dataclass(frozen=True)
class Settings:
    database_url: str
    aes_256_key: bytes
    hmac_key: bytes
    jwt_secret: str
    ollama_host: str
    ollama_model: str
    ollama_timeout_seconds: float
    ollama_concurrency: int
    embedding_model: str
    brevo_api_key: str
    brevo_sender_email: str
    brevo_sender_name: str
    app_base_url: str

    @property
    def secure_cookies(self) -> bool:
        return urlparse(self.app_base_url).hostname not in {"localhost", "127.0.0.1"}


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=_required("DATABASE_URL"),
        aes_256_key=_base64_key("AES_256_KEY", expected_length=32),
        hmac_key=_base64_key("HMAC_KEY"),
        jwt_secret=_required("JWT_SECRET"),
        ollama_host=os.environ.get("OLLAMA_HOST", "http://localhost:11434").rstrip("/"),
        ollama_model=os.environ.get("OLLAMA_MODEL", "llama3.2:1b"),
        ollama_timeout_seconds=float(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "60")),
        ollama_concurrency=int(os.environ.get("OLLAMA_CONCURRENCY", "3")),
        embedding_model=os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        brevo_api_key=os.environ.get("BREVO_API_KEY", "").strip(),
        brevo_sender_email=os.environ.get("BREVO_SENDER_EMAIL", "").strip(),
        brevo_sender_name=os.environ.get("BREVO_SENDER_NAME", "Clinch").strip(),
        app_base_url=os.environ.get("APP_BASE_URL", "http://localhost:5174").rstrip("/"),
    )
