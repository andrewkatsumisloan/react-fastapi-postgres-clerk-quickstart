import asyncio
from datetime import datetime, timezone
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_payments_route.db")
os.environ.setdefault("CLERK_JWT_ISSUER", "https://issuer.example.clerk.accounts.dev")

from app.api.routes.payments import create_checkout_session, get_payment_status
from app.schemas.payment import CheckoutSessionCreate


class DummyUser:
    id = 1
    clerk_user_id = "user_123"
    email = "user@example.com"


class PaidOrder:
    id = 42
    payment_status = "paid"
    paid_at = datetime(2026, 6, 17, tzinfo=timezone.utc)


class QueryStub:
    def __init__(self, result):
        self.result = result

    def filter_by(self, **_kwargs):
        return self

    def order_by(self, *_args):
        return self

    def first(self):
        return self.result


class StatusDBStub:
    def __init__(self, result):
        self.result = result

    def query(self, _model):
        return QueryStub(self.result)


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

    def test_payment_status_returns_paid_flag_for_paid_order(self):
        status = asyncio.run(
            get_payment_status(current_user=DummyUser(), db=StatusDBStub(PaidOrder()))
        )

        self.assertTrue(status.is_paid)
        self.assertEqual(status.payment_status, "paid")
        self.assertEqual(status.order_id, 42)

    def test_payment_status_returns_unpaid_without_paid_order(self):
        status = asyncio.run(
            get_payment_status(current_user=DummyUser(), db=StatusDBStub(None))
        )

        self.assertFalse(status.is_paid)
        self.assertEqual(status.payment_status, "unpaid")


if __name__ == "__main__":
    unittest.main()
