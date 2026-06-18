import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_payments_route.db")
os.environ.setdefault("CLERK_JWT_ISSUER", "https://issuer.example.clerk.accounts.dev")

from app.api.routes.payments import create_checkout_session
from app.schemas.payment import CheckoutSessionCreate


class DummyUser:
    id = 1
    clerk_user_id = "user_123"
    email = "user@example.com"


class PaymentsRouteTests(unittest.TestCase):
    def test_checkout_session_returns_unavailable_without_stripe_secret(self):
        with patch("app.api.routes.payments.settings.STRIPE_SECRET_KEY", None):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(
                    create_checkout_session(
                        checkout_data=CheckoutSessionCreate(),
                        current_user=DummyUser(),
                        db=object(),
                    )
                )

        self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
