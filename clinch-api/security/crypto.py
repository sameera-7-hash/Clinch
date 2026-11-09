"""AES-256-GCM encryption of personal data, and keyed hashing for lookups.

Stored ciphertext layout: 12-byte nonce || ciphertext || 16-byte GCM tag.
"""
from __future__ import annotations

import hashlib
import hmac
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

NONCE_LENGTH = 12


def encrypt(plaintext: str, key: bytes) -> bytes:
    nonce = os.urandom(NONCE_LENGTH)
    return nonce + AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)


def decrypt(blob: bytes, key: bytes) -> str:
    """Raises cryptography.exceptions.InvalidTag if the value was tampered with."""
    blob = bytes(blob)
    return AESGCM(key).decrypt(blob[:NONCE_LENGTH], blob[NONCE_LENGTH:], None).decode("utf-8")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_lookup_hash(email: str, key: bytes) -> str:
    """Deterministic, unlike encrypt(), so it can back a UNIQUE column."""
    return hmac.new(key, normalize_email(email).encode("utf-8"), hashlib.sha256).hexdigest()
