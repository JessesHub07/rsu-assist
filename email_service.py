"""
Sends transactional email via Resend's HTTP API. Only used for the
password-reset OTP right now. Requires RESEND_API_KEY in the environment;
without it, sending is skipped so local dev doesn't need a Resend account,
and the caller treats that the same as a delivery failure.
"""

import os

import requests

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
FROM_ADDRESS = os.environ.get("RESEND_FROM_ADDRESS", "RSU Assist <onboarding@resend.dev>")


def send_otp_email(to_email, otp, student_name):
    if not RESEND_API_KEY:
        return False, "Email sending is not configured on this server."

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": FROM_ADDRESS,
                "to": [to_email],
                "subject": "Your RSU Assist password reset code",
                "html": (
                    f"<p>Hi {student_name},</p>"
                    f"<p>Your RSU Assist password reset code is:</p>"
                    f"<p style=\"font-size:28px;font-weight:700;letter-spacing:6px;\">{otp}</p>"
                    f"<p>This code expires in 10 minutes. If you didn't request a password reset, "
                    f"you can safely ignore this email.</p>"
                ),
            },
            timeout=10,
        )
        if response.status_code >= 400:
            return False, f"Email provider error ({response.status_code})."
        return True, None
    except requests.RequestException:
        return False, "Couldn't reach the email provider."
