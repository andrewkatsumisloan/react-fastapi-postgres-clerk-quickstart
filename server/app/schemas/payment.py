from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PaymentConfig(BaseModel):
    """Browser-safe Stripe integration state."""

    enabled: bool
    default_price_configured: bool
    webhook_configured: bool
    mode: str


class CheckoutSessionCreate(BaseModel):
    """Request to create a Stripe Checkout Session."""

    quantity: int = Field(default=1, ge=1, le=99)


class CheckoutSessionResponse(BaseModel):
    """Stripe Checkout redirect details."""

    checkout_url: str
    session_id: str
    order_id: int


class PaymentOrder(BaseModel):
    """Local payment order state."""

    id: int
    stripe_checkout_session_id: str
    stripe_payment_intent_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    mode: str
    status: str
    payment_status: str
    currency: Optional[str] = None
    amount_total: Optional[int] = None
    price_id: str
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
