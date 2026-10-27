# Cloudflare Worker (Hono + D1)

Port of `backend/` (FastAPI + Postgres) that serves both the API (`/api/*`) and the built React app
(`../frontend/dist`) from a single Worker. The Python backend is untouched.

| Python backend | Worker |
|---|---|
| FastAPI routers | Hono routes in `src/routes/` |
| Postgres + Alembic + `seed.py` | D1 + `migrations/` (schema and seed data) |
| passlib/bcrypt, python-jose | WebCrypto PBKDF2, `hono/jwt` |
| APScheduler hourly job | Cron Trigger → `src/billing.ts` |
| `time.sleep(10)` provisioning | Lazy: flips to `running` on the next read (`src/provisioning.ts`) |

## Run locally

```bash
cd frontend && npm ci && VITE_API_URL=/api npm run build   # worker serves ../frontend/dist
cd ../worker && npm install
npm run db:migrate:local
npm run dev            # http://localhost:8787
npm run smoke          # in another terminal; end-to-end API + billing cron test
```

## Deploy

See the root `README.md` ("Deploy" and "Branching and CI/CD"). In short: `development` deploys to staging
(`wrangler deploy --env staging`) and `main` deploys to production (`wrangler deploy`) through GitHub Actions.

Notes:
- Existing bcrypt password hashes from the Postgres app are not compatible; users sign up again.
- Free plan caps CPU at ~10 ms per request. If signup/login fails with a CPU-limit error in production,
  that is PBKDF2 — upgrade to the $5 plan (or lower `PBKDF2_ITERATIONS` in `src/security.ts`).
