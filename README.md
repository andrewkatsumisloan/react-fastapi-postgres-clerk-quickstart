# Fullstack React + FastAPI + Postgres Starter

A launch-ready starter for authenticated fullstack apps:

- React, Vite, TypeScript, Tailwind, and shadcn/ui
- Clerk for authentication
- FastAPI with SQLAlchemy
- Postgres with Alembic migrations
- Optional Stripe Checkout payments
- Docker Compose for local development
- Production Compose profile with nginx serving the SPA and proxying `/api`

## Requirements

- Docker and Docker Compose
- Node 20 if running the client outside Docker
- Python 3.11 if running the API outside Docker
- A Clerk application
- A Stripe account if enabling payments

## Environment

Create the local env files from the examples:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Set at least:

```bash
# client/.env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# server/.env
CLERK_JWT_ISSUER=https://your-clerk-instance.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...
```

Local Docker Compose supplies the Postgres settings for the API, so `DATABASE_URL`
is optional for local Docker development.

Stripe is optional. The app boots without Stripe keys and shows payments as
disabled until these server variables are set:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_DEFAULT_PRICE_ID=price_...
STRIPE_PAYMENT_MODE=payment
STRIPE_FRONTEND_URL=http://localhost:3000
```

## Run Locally With Docker

```bash
make dev
```

This starts Postgres, runs `alembic upgrade head`, starts FastAPI on
`http://localhost:8000`, and starts Vite on `http://localhost:3000`.

Useful URLs:

- App: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/api/health`

## Stripe Payments

The starter uses Stripe-hosted Checkout Sessions so card data never touches the
React or FastAPI app.

To enable local payments:

1. Create a Stripe product and price, then set `STRIPE_DEFAULT_PRICE_ID` in
   `server/.env`.
2. Set `STRIPE_SECRET_KEY` in `server/.env`.
3. Forward webhooks locally:

   ```bash
   stripe listen --forward-to localhost:8000/api/v1/payments/webhook
   ```

4. Copy the printed `whsec_...` value to `STRIPE_WEBHOOK_SECRET`.
5. Restart the API and open the Payments view in the app.

The backend handles `checkout.session.completed`,
`checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `checkout.session.expired` events.
Payment rows are stored in `payment_orders` and exposed to the signed-in user at
`GET /api/v1/payments/orders`. The current user's paid flag is exposed at
`GET /api/v1/payments/status`.

## Run Without Docker

Server:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=sqlite:///./app.db alembic upgrade head
DATABASE_URL=sqlite:///./app.db uvicorn app.main:app --reload
```

Client:

```bash
cd client
npm install
npm run dev
```

## Migrations

Schema changes should go through Alembic:

```bash
cd server
alembic revision --autogenerate -m "Describe the schema change"
alembic upgrade head
```

The app initializes database connectivity on startup, but it does not create or
alter tables. Compose runs migrations before starting the API.

## Verification

```bash
make test
make compose-config
```

`make test` runs backend unit tests, frontend lint, and frontend build.

## Production Compose

The production Compose file expects an external Postgres database. It builds the
client, runs migrations once, starts the API internally, and exposes nginx on
port 80. nginx serves the SPA and proxies `/api` to the FastAPI service.

```bash
cp .env.production.example .env.production
# edit .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up --build
```

Production variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `CLERK_JWT_ISSUER`
- `CLERK_SECRET_KEY`
- `VITE_API_BASE_URL` optional; leave blank for same-origin `/api`
- `CLERK_AUDIENCE` optional
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_DEFAULT_PRICE_ID`
  optional; set all three to enable Checkout
- `CORS_ALLOW_ORIGINS` optional for direct cross-origin API calls

## Project Layout

```text
client/   React app and nginx production config
server/   FastAPI app, SQLAlchemy models, Alembic migrations, tests
```
