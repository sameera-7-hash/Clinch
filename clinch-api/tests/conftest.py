"""Test settings. Set before config is imported, and never read from your real .env values.

Database tests run only when TEST_DATABASE_URL is set. Point it at a separate database:
they create accounts and rows there.
"""
import base64
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgresql://unused@localhost/unused")
os.environ["AES_256_KEY"] = base64.b64encode(b"a" * 32).decode()
os.environ["HMAC_KEY"] = base64.b64encode(b"b" * 32).decode()
os.environ["JWT_SECRET"] = "test-only-jwt-secret-that-is-long-enough"
os.environ["BREVO_API_KEY"] = ""
os.environ["APP_BASE_URL"] = "http://localhost:5174"
