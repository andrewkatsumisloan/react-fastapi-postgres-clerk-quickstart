# Server

FastAPI backend with Clerk JWT validation, SQLAlchemy models, Alembic
migrations, and a small authenticated user API.

Most setup instructions live in the root `README.md`.

## Common Commands

```bash
python3 -m unittest discover -s tests
alembic upgrade head
uvicorn app.main:app --reload
```

## Environment

Use `server/.env.example` as the local template. Docker Compose provides local
Postgres connection parts by default. For non-Docker development, set
`DATABASE_URL`, for example:

```bash
DATABASE_URL=sqlite:///./app.db
```

Required Clerk settings:

```bash
CLERK_JWT_ISSUER=https://your-clerk-instance.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...
```

`CLERK_SECRET_KEY` is used only when a JWT does not include enough user claims to
create the local user row.

## API

- `GET /api/health`
- `GET /api/info`
- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`
