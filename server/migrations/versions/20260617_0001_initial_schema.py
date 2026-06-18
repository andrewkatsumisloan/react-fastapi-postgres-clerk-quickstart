"""Initial schema.

Revision ID: 20260617_0001
Revises:
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260617_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clerk_user_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_app_users")),
        sa.UniqueConstraint("clerk_user_id", name="uq_clerk_user_id"),
        sa.UniqueConstraint("email", name=op.f("uq_app_users_email")),
    )
    op.create_index(op.f("ix_app_users_clerk_user_id"), "app_users", ["clerk_user_id"], unique=False)
    op.create_index(op.f("ix_app_users_email"), "app_users", ["email"], unique=False)
    op.create_index(op.f("ix_app_users_id"), "app_users", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_app_users_id"), table_name="app_users")
    op.drop_index(op.f("ix_app_users_email"), table_name="app_users")
    op.drop_index(op.f("ix_app_users_clerk_user_id"), table_name="app_users")
    op.drop_table("app_users")
