import jwt
import pytest
from cryptography.exceptions import InvalidTag

from rate_limit import SlidingWindowLimiter
from security.crypto import NONCE_LENGTH, decrypt, email_lookup_hash, encrypt
from security.passwords import burn_verification_time, hash_password, verify_password
from security.tokens import (
    RESET_TOKEN_LIFETIME,
    create_session_token,
    decode_session_token,
    hash_reset_token,
    new_reset_token,
)

KEY = b"k" * 32
OTHER_KEY = b"z" * 32
SECRET = "unit-test-secret-long-enough-for-hs256"


def test_encrypt_decrypt_round_trip():
    assert decrypt(encrypt("analyst@example.com", KEY), KEY) == "analyst@example.com"


def test_round_trip_handles_unicode():
    assert decrypt(encrypt("Dr. Sørensen 日本", KEY), KEY) == "Dr. Sørensen 日本"


def test_each_encryption_uses_a_new_nonce():
    first, second = encrypt("same value", KEY), encrypt("same value", KEY)
    assert first[:NONCE_LENGTH] != second[:NONCE_LENGTH]
    assert first != second


def test_blob_layout_is_nonce_ciphertext_tag():
    assert len(encrypt("abc", KEY)) == NONCE_LENGTH + 3 + 16


@pytest.mark.parametrize("position", [0, NONCE_LENGTH + 1, -1], ids=["nonce", "ciphertext", "tag"])
def test_tampering_is_detected(position):
    blob = bytearray(encrypt("analyst@example.com", KEY))
    blob[position] ^= 0x01
    with pytest.raises(InvalidTag):
        decrypt(bytes(blob), KEY)


def test_wrong_key_is_rejected():
    with pytest.raises(InvalidTag):
        decrypt(encrypt("secret", KEY), OTHER_KEY)


def test_email_hash_ignores_case_and_whitespace():
    assert email_lookup_hash(" Analyst@Example.COM ", KEY) == email_lookup_hash("analyst@example.com", KEY)


def test_email_hash_depends_on_key():
    assert email_lookup_hash("a@example.com", KEY) != email_lookup_hash("a@example.com", OTHER_KEY)


def test_password_hash_is_argon2id_and_verifies():
    hashed = hash_password("correct horse battery")
    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, "correct horse battery")


def test_wrong_password_fails():
    assert not verify_password(hash_password("correct horse battery"), "wrong password")


def test_malformed_hash_fails_without_raising():
    assert not verify_password("not-a-hash", "anything")
    burn_verification_time("anything")


def test_session_token_round_trip():
    claims = decode_session_token(create_session_token(7, 2, SECRET), SECRET)
    assert claims["sub"] == "7" and claims["ver"] == 2


def test_session_token_signed_with_another_secret_is_rejected():
    assert decode_session_token(create_session_token(7, 0, SECRET), "another-secret-long-enough-for-hs256") is None


def test_expired_session_token_is_rejected():
    expired = jwt.encode({"sub": "7", "ver": 0, "exp": 1}, SECRET, algorithm="HS256")
    assert decode_session_token(expired, SECRET) is None


def test_unsigned_session_token_is_rejected():
    forged = jwt.encode({"sub": "7", "ver": 0, "exp": 9999999999}, "", algorithm="none")
    assert decode_session_token(forged, SECRET) is None


def test_reset_tokens_are_random_and_hashed():
    token = new_reset_token()
    assert token != new_reset_token()
    assert hash_reset_token(token) != token
    assert len(hash_reset_token(token)) == 64


def test_reset_token_lifetime_is_thirty_minutes():
    assert RESET_TOKEN_LIFETIME.total_seconds() == 1800


def test_limiter_blocks_after_limit_then_recovers():
    now = [0.0]
    limiter = SlidingWindowLimiter(limit=5, window_seconds=900, clock=lambda: now[0])
    assert all(limiter.hit("key") == 0 for _ in range(5))
    assert limiter.hit("key") == 900
    now[0] = 900.0
    assert limiter.hit("key") == 0


def test_limiter_keys_are_independent_and_clearable():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=900)
    assert limiter.hit("a") == 0
    assert limiter.hit("a") > 0
    assert limiter.hit("b") == 0
    limiter.clear("a")
    assert limiter.hit("a") == 0
