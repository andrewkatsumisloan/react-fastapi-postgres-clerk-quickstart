# Client

React + Vite + TypeScript frontend for the fullstack starter.

Most setup instructions live in the root `README.md`.

## Environment

Create `client/.env` from `client/.env.example`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:8000
```

In production Compose, `VITE_API_BASE_URL` can be blank because nginx proxies
same-origin `/api` requests to the FastAPI container.

## Commands

```bash
npm run dev
npm run lint
npm run build
```
