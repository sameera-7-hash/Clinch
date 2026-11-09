"""Password reset email through Brevo's transactional API."""
from __future__ import annotations

import logging

import httpx

from config import Settings

logger = logging.getLogger("email")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def send_password_reset(settings: Settings, to_email: str, reset_link: str) -> None:
    if not settings.brevo_api_key:
        logger.warning("BREVO_API_KEY is empty - dev mode, not sending email. Reset link: %s", reset_link)
        return
    if not settings.brevo_sender_email:
        logger.error("BREVO_SENDER_EMAIL is empty - cannot send the password reset email.")
        return

    payload = {
        "sender": {"name": settings.brevo_sender_name, "email": settings.brevo_sender_email},
        "to": [{"email": to_email}],
        "subject": "Reset your Clinch password",
        "htmlContent": (
            "<p>We received a request to reset your Clinch password.</p>"
            f'<p><a href="{reset_link}">Choose a new password</a></p>'
            "<p>This link expires in 30 minutes and works once. "
            "If you didn't ask for it, you can ignore this email.</p>"
        ),
        "textContent": (
            f"Reset your Clinch password: {reset_link}\n\n"
            "This link expires in 30 minutes and works once. "
            "If you didn't ask for it, you can ignore this email."
        ),
    }
    try:
        response = httpx.post(
            BREVO_URL,
            json=payload,
            headers={"api-key": settings.brevo_api_key, "accept": "application/json"},
            timeout=15.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as error:
        logger.error("Brevo rejected the reset email with status %s.", error.response.status_code)
    except httpx.HTTPError as error:
        logger.error("Could not reach Brevo: %s", type(error).__name__)
