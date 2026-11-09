"""End-to-end API tests against a real PostgreSQL with pgvector.

Skipped unless TEST_DATABASE_URL is set. Accounts use unique emails and nothing is deleted.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL is not set")


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    from main import app
    from routes.auth import forgot_limiter, login_limiter

    with TestClient(app) as test_client:
        login_limiter._hits.clear()
        forgot_limiter._hits.clear()
        yield test_client


def signup(client):
    email = f"test-{uuid.uuid4().hex}@example.com"
    response = client.post("/api/auth/signup", json={"email": email, "password": "correct-horse", "name": "Tester"})
    assert response.status_code == 201
    return email


def insert_reset_token(email, expires_at):
    from config import get_settings
    from database import get_pool
    from security.crypto import email_lookup_hash
    from security.tokens import hash_reset_token, new_reset_token

    token = new_reset_token()
    with get_pool().connection() as connection:
        user = connection.execute(
            "SELECT id FROM users WHERE email_hash = %s", (email_lookup_hash(email, get_settings().hmac_key),)
        ).fetchone()
        connection.execute(
            "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user["id"], hash_reset_token(token), expires_at),
        )
    return token


def in_the_future():
    return datetime.now(timezone.utc) + timedelta(minutes=30)


def test_email_is_stored_encrypted(client):
    from config import get_settings
    from database import get_pool
    from security.crypto import decrypt, email_lookup_hash

    email = signup(client)
    settings = get_settings()
    with get_pool().connection() as connection:
        user = connection.execute(
            "SELECT email_enc, password_hash FROM users WHERE email_hash = %s",
            (email_lookup_hash(email, settings.hmac_key),),
        ).fetchone()
    assert email.encode() not in bytes(user["email_enc"])
    assert decrypt(user["email_enc"], settings.aes_256_key) == email
    assert user["password_hash"].startswith("$argon2id$")


def test_signup_login_me_logout(client):
    client.cookies.clear()
    email = signup(client)
    assert client.get("/api/auth/me").json()["email"] == email

    assert client.post("/api/auth/logout").status_code == 204
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401

    response = client.post("/api/auth/login", json={"email": email, "password": "correct-horse"})
    assert response.status_code == 200
    assert "httponly" in response.headers["set-cookie"].lower()
    assert "samesite=lax" in response.headers["set-cookie"].lower()


def test_duplicate_signup_is_rejected(client):
    email = signup(client)
    response = client.post("/api/auth/signup", json={"email": email.upper(), "password": "correct-horse"})
    assert response.status_code == 409


def test_login_is_rate_limited(client):
    from routes.auth import login_limiter

    login_limiter._hits.clear()
    email = signup(client)
    codes = [client.post("/api/auth/login", json={"email": email, "password": "wrong"}).status_code for _ in range(6)]
    login_limiter._hits.clear()
    assert codes == [401] * 5 + [429]


def test_forgot_password_response_is_the_same_for_unknown_email(client):
    email = signup(client)
    known = client.post("/api/auth/forgot-password", json={"email": email})
    unknown = client.post("/api/auth/forgot-password", json={"email": f"nobody-{uuid.uuid4().hex}@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()


def test_reset_token_is_single_use_and_signs_out_old_sessions(client):
    email = signup(client)
    old_session = client.cookies.get("clinch_session")
    token = insert_reset_token(email, in_the_future())

    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "new-password-1"}).status_code == 200
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "new-password-2"}).status_code == 400

    client.cookies.clear()
    client.cookies.set("clinch_session", old_session)
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"email": email, "password": "new-password-1"}).status_code == 200


def test_expired_reset_token_is_rejected(client):
    email = signup(client)
    token = insert_reset_token(email, datetime.now(timezone.utc) - timedelta(seconds=1))
    response = client.post("/api/auth/reset-password", json={"token": token, "new_password": "new-password-1"})
    assert response.status_code == 400


@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/api/append/run_12345678"),
        ("get", "/api/append/tasks/1"),
        ("get", "/api/dataset"),
        ("get", "/api/dataset/1/similar"),
    ],
)
def test_data_routes_require_login(client, method, path):
    client.cookies.clear()
    response = getattr(client, method)(path, **({"json": {"records": [{"transaction": {}}]}} if method == "post" else {}))
    assert response.status_code == 401
