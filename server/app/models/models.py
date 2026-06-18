from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class User(Base):
    """User model for authentication and profile data"""

    # Explicitly set table name to avoid PostgreSQL reserved keyword
    __tablename__ = "app_users"

    id = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)

    payment_orders = relationship("PaymentOrder", back_populates="user")

    __table_args__ = (UniqueConstraint("clerk_user_id", name="uq_clerk_user_id"),)

    def __str__(self):
        return f"{self.name or self.email}"


class PaymentOrder(Base):
    """Local record for Stripe Checkout attempts and webhook updates."""

    __tablename__ = "payment_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), index=True, nullable=False)
    stripe_checkout_session_id = Column(String, unique=True, index=True, nullable=False)
    stripe_payment_intent_id = Column(String, index=True, nullable=True)
    stripe_customer_id = Column(String, index=True, nullable=True)
    mode = Column(String, nullable=False)
    status = Column(String, index=True, nullable=False)
    payment_status = Column(String, index=True, nullable=False)
    currency = Column(String, nullable=True)
    amount_total = Column(BigInteger, nullable=True)
    price_id = Column(String, nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="payment_orders")
