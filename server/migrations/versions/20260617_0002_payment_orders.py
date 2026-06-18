"""Add payment orders.

Revision ID: 20260617_0002
Revises: 20260617_0001
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260617_0002"
down_revision: Union[str, None] = "20260617_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payment_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stripe_checkout_session_id", sa.String(), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(), nullable=True),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("payment_status", sa.String(), nullable=False),
        sa.Column("currency", sa.String(), nullable=True),
        sa.Column("amount_total", sa.BigInteger(), nullable=True),
        sa.Column("price_id", sa.String(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["app_users.id"],
            name=op.f("fk_payment_orders_user_id_app_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payment_orders")),
        sa.UniqueConstraint(
            "stripe_checkout_session_id",
            name=op.f("uq_payment_orders_stripe_checkout_session_id"),
        ),
    )
    op.create_index(op.f("ix_payment_orders_id"), "payment_orders", ["id"], unique=False)
    op.create_index(
        op.f("ix_payment_orders_payment_status"),
        "payment_orders",
        ["payment_status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_orders_status"),
        "payment_orders",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_orders_stripe_checkout_session_id"),
        "payment_orders",
        ["stripe_checkout_session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_orders_stripe_customer_id"),
        "payment_orders",
        ["stripe_customer_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_orders_stripe_payment_intent_id"),
        "payment_orders",
        ["stripe_payment_intent_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payment_orders_user_id"),
        "payment_orders",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_orders_user_id"), table_name="payment_orders")
    op.drop_index(
        op.f("ix_payment_orders_stripe_payment_intent_id"),
        table_name="payment_orders",
    )
    op.drop_index(
        op.f("ix_payment_orders_stripe_customer_id"), table_name="payment_orders"
    )
    op.drop_index(
        op.f("ix_payment_orders_stripe_checkout_session_id"),
        table_name="payment_orders",
    )
    op.drop_index(op.f("ix_payment_orders_status"), table_name="payment_orders")
    op.drop_index(
        op.f("ix_payment_orders_payment_status"), table_name="payment_orders"
    )
    op.drop_index(op.f("ix_payment_orders_id"), table_name="payment_orders")
    op.drop_table("payment_orders")
