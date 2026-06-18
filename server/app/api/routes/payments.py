from datetime import datetime, timezone
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import stripe

from app.core.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.models import PaymentOrder as PaymentOrderModel
from app.models.models import User
from app.schemas.payment import (
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    PaymentConfig,
    PaymentOrder,
    PaymentStatus,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _stripe_value(stripe_object: Any, key: str) -> Any:
    if isinstance(stripe_object, dict):
        return stripe_object.get(key)
    return getattr(stripe_object, key, None)


def _stripe_id(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return _stripe_value(value, "id")


def _mark_order_from_session(order: PaymentOrderModel, session: Any) -> None:
    payment_status = _stripe_value(session, "payment_status") or order.payment_status

    order.status = _stripe_value(session, "status") or order.status
    order.payment_status = payment_status
    order.stripe_payment_intent_id = _stripe_id(
        _stripe_value(session, "payment_intent")
    )
    order.stripe_customer_id = _stripe_id(_stripe_value(session, "customer"))
    order.currency = _stripe_value(session, "currency") or order.currency
    order.amount_total = _stripe_value(session, "amount_total") or order.amount_total

    if payment_status == "paid" and order.paid_at is None:
        order.paid_at = datetime.now(timezone.utc)


@router.get("/config", response_model=PaymentConfig)
async def get_payment_config():
    """
    Return browser-safe Stripe readiness.
    """
    return PaymentConfig(
        enabled=settings.is_stripe_enabled(),
        default_price_configured=bool(settings.STRIPE_DEFAULT_PRICE_ID),
        webhook_configured=bool(settings.STRIPE_WEBHOOK_SECRET),
        mode=settings.STRIPE_PAYMENT_MODE,
    )


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    checkout_data: CheckoutSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a Stripe-hosted Checkout Session for the current user.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY.",
        )
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhooks are not configured. Set STRIPE_WEBHOOK_SECRET.",
        )

    price_id = settings.STRIPE_DEFAULT_PRICE_ID
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe price configured. Set STRIPE_DEFAULT_PRICE_ID.",
        )

    try:
        mode = settings.get_stripe_payment_mode()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        session = stripe.checkout.Session.create(
            mode=mode,
            line_items=[
                {
                    "price": price_id,
                    "quantity": checkout_data.quantity,
                }
            ],
            customer_email=current_user.email,
            client_reference_id=current_user.clerk_user_id,
            metadata={
                "user_id": str(current_user.id),
                "clerk_user_id": current_user.clerk_user_id,
            },
            success_url=settings.get_stripe_success_url(),
            cancel_url=settings.get_stripe_cancel_url(),
            automatic_tax={"enabled": settings.STRIPE_AUTOMATIC_TAX_ENABLED},
        )
    except Exception as exc:
        logger.exception("Stripe Checkout Session creation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to create Stripe Checkout Session",
        ) from exc

    checkout_url = _stripe_value(session, "url")
    session_id = _stripe_value(session, "id")
    if not checkout_url or not session_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe did not return a Checkout URL",
        )

    order = PaymentOrderModel(
        user_id=current_user.id,
        stripe_checkout_session_id=session_id,
        mode=mode,
        status=_stripe_value(session, "status") or "open",
        payment_status=_stripe_value(session, "payment_status") or "unpaid",
        currency=_stripe_value(session, "currency"),
        amount_total=_stripe_value(session, "amount_total"),
        price_id=price_id,
    )
    _mark_order_from_session(order, session)

    try:
        db.add(order)
        db.commit()
        db.refresh(order)
    except IntegrityError:
        db.rollback()
        logger.exception("Checkout Session already exists locally")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment order already exists for this Checkout Session",
        )

    return CheckoutSessionResponse(
        checkout_url=checkout_url,
        session_id=session_id,
        order_id=order.id,
    )


@router.get("/orders", response_model=list[PaymentOrder])
async def list_payment_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List local payment orders for the current user.
    """
    return (
        db.query(PaymentOrderModel)
        .filter_by(user_id=current_user.id)
        .order_by(PaymentOrderModel.created_at.desc())
        .all()
    )


@router.get("/status", response_model=PaymentStatus)
async def get_payment_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return whether the current user has a paid Checkout order.
    """
    paid_order = (
        db.query(PaymentOrderModel)
        .filter_by(user_id=current_user.id, payment_status="paid")
        .order_by(
            PaymentOrderModel.paid_at.desc(),
            PaymentOrderModel.created_at.desc(),
        )
        .first()
    )

    if not paid_order:
        return PaymentStatus(is_paid=False, payment_status="unpaid")

    return PaymentStatus(
        is_paid=True,
        payment_status=paid_order.payment_status,
        order_id=paid_order.id,
        paid_at=paid_order.paid_at,
    )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receive Stripe webhook events and update local payment order state.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook secret is not configured.",
        )

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header.",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature.",
        ) from exc

    event_type = _stripe_value(event, "type")
    event_data = _stripe_value(_stripe_value(event, "data"), "object")

    if event_type in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
    }:
        session_id = _stripe_value(event_data, "id")
        order = (
            db.query(PaymentOrderModel)
            .filter_by(stripe_checkout_session_id=session_id)
            .first()
        )
        if order:
            _mark_order_from_session(order, event_data)
            db.commit()
        else:
            logger.warning("No local payment order found for session_id=%s", session_id)

    return {"received": True}
