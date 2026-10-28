# cloudflare-kubernetes-platform — gpu.kubex.my

![Live](https://img.shields.io/badge/Live-gpu.kubex.my-brightgreen?style=flat-square&logo=cloudflare)
![Cloudflare Workers](https://img.shields.io/badge/Runtime-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![D1](https://img.shields.io/badge/Database-Cloudflare%20D1-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Hono](https://img.shields.io/badge/API-Hono-E36002?style=flat-square&logo=hono&logoColor=white)
![React](https://img.shields.io/badge/UI-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

**Kubex** is a simulated GPU cloud marketplace (think vast.ai / TensorDock): browse GPU and CPU plans, deposit funds, deploy
virtual servers, and get billed hourly. It runs entirely on Cloudflare's free tier — no servers, containers or VPS to maintain.

> **Live:** https://gpu.kubex.my — browse the deploy pages and dashboard without signing in (demo data), or create an account to deploy.

## History

This project started as a self-managed Kubernetes platform (RKE2 on bare metal, Terraform, Ansible, GitLab CI, and later AWS).
It was migrated to a serverless Cloudflare stack so it can stay online 24/7 at no cost. The original infrastructure code and the
Python/FastAPI backend are in the git history; `backend/` is kept as the reference implementation of the API.

## Architecture

```
Browser ──► gpu.kubex.my (Cloudflare DNS + TLS)
               │
               ▼
        Worker "kubex"  ── /api/*  ──► Hono routes ──► D1 (SQLite)
               │                                ▲
               │ everything else                │
               ▼                                │
      Static assets (React build)      Cron Trigger (hourly) ──► billing job
```

One Worker serves both the React app and the API from the same origin, so there is no CORS and no separate API host.

| Concern | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind, TanStack Query |
| API | [Hono](https://hono.dev) on Cloudflare Workers, validated with Zod |
| Database | Cloudflare D1 (SQLite), schema + seed data in `worker/migrations/` |
| Auth | JWT (HS256) with PBKDF2 password hashing via WebCrypto |
| Hourly billing | Cron Trigger → `worker/src/billing.ts` (idempotent and crash-safe) |
| Hosting | Workers + Workers Static Assets (free plan) |
| CI/CD | GitHub Actions → `wrangler deploy` |

## Application

| Route | Page | Auth |
|---|---|---|
| `/deploy/gpu`, `/deploy/cpu` | Browse plans and deploy a server | Public (deploying needs sign-in) |
| `/dashboard`, `/servers`, `/billing`, `/usage`, `/secrets` | Dashboard, servers, balance and top-up rules, usage, SSH keys | Demo data when signed out |
| `/developers`, `/account`, `/invoices` | API keys, profile, monthly invoices | Sign-in required |

API (all under `/api`): `/auth`, `/plans`, `/os-images`, `/instances`, `/billing`, `/usage`, `/invoices`, `/dashboard/summary`,
`/ssh-keys`, `/api-keys`, `/health`.

How billing works: every hour each non-terminated instance is charged its compute rate (running or stopped) plus storage. Charges are
recorded once per instance per hour (`UNIQUE (instance_id, hour)`) and deducted from the balance in a single D1 transaction. When the
balance drops below the user's threshold it auto-tops-up; at zero, running instances are stopped.

## Project structure

```
frontend/   React app (Vite)
worker/     Cloudflare Worker: API, billing cron, D1 migrations, wrangler.jsonc
backend/    Original Python/FastAPI + Postgres implementation (reference only, not deployed)
.github/    CI and deploy workflows, Dependabot
```

## Run locally

```bash
cd frontend && npm ci && VITE_API_URL=/api npm run build    # the Worker serves frontend/dist
cd ../worker && npm install
cp .dev.vars.example .dev.vars                              # local JWT secret
npm run db:migrate:local
npm run dev                                                 # http://localhost:8787
npm run smoke                                               # in another terminal: end-to-end API + billing test
```

For frontend hot-reload, run `npm run dev` in `frontend/` instead and point `VITE_API_URL` at `http://localhost:8787/api`.

## Deploy

One-time setup:

```bash
cd worker
npx wrangler login
npx wrangler d1 create kubex-db        # put the printed database_id in wrangler.jsonc
npx wrangler secret put JWT_SECRET     # a long random value
# staging: the same with a separate database and secret
npx wrangler d1 create kubex-staging-db
npx wrangler secret put JWT_SECRET --env staging
```

Manual deploy (the pipeline does this for you):

```bash
cd frontend && VITE_API_URL=/api npm run build
cd ../worker
npm run db:migrate:remote && npm run deploy                                              # production
npx wrangler d1 migrations apply kubex-staging-db --env staging --remote && npx wrangler deploy --env staging   # staging
```

Smoke-test a deployed environment: `BASE=https://<host>/api SKIP_CRON=1 npm run smoke` (from `worker/`).

## Branching and CI/CD

Two long-lived branches, and `main` only changes through a pull request from `development`:

```
feature ──PR──► development ──push──► CI ──► deploy STAGING ──► smoke test
                    │
                    └────PR (CI must pass)────► main ──push──► CI ──► deploy PRODUCTION ──► health check
                                                                                             └─ fails → auto-rollback
```

| Branch | Environment | URL | Database |
|---|---|---|---|
| `development` | staging (`kubex-staging`) | https://kubex-staging.ikhmalhisyam4.workers.dev | `kubex-staging-db` |
| `main` | production (`kubex`) | https://gpu.kubex.my | `kubex-db` |

Workflows in `.github/workflows/`:

- **`ci.yml`** — runs on pull requests (and is reused by the deploy workflow, so nothing deploys unless it passed):
  - *frontend*: lint, typecheck, build (the build is saved as an artifact so exactly what was tested is what gets deployed)
  - *worker*: typecheck, bundle both environments (`wrangler deploy --dry-run`), then start the Worker on a local D1 and run the
    end-to-end smoke test (auth, deploy, billing cron, ...)
- **`deploy.yml`** — on push to `development` or `main`: CI → apply pending D1 migrations → `wrangler deploy` → verify the site responds.
  Staging then runs the full smoke test against the live Worker; production rolls back to the previous version if the health check fails.
  (Database migrations are not rolled back, so keep them backward compatible.)
- **`dependabot.yml`** — weekly dependency PRs against `development`.

One-time GitHub setup:

1. Repository secrets (Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account id |
   | `CLOUDFLARE_API_TOKEN` | API token with *Workers Scripts: Edit* and *D1: Edit* |

2. Branch protection on `main` (Settings → Branches): require a pull request and the `Frontend (lint + build)` and
   `Worker (typecheck, bundle, integration test)` status checks to pass before merging.
3. Optional: Settings → Environments → `production` → *Required reviewers* adds a manual approval before production deploys.

## Notes and limits

- Provisioning is simulated: a new instance becomes `running` with a fake IP about 10 seconds after creation (applied on the next read
  and on each billing tick), since Workers have no long-running process to sleep in.
- The free plan allows about 100k requests per day and ~10 ms CPU per request. Password hashing is the CPU-heaviest request; if
  signup or login ever fails with a CPU-limit error, lower `PBKDF2_ITERATIONS` in `worker/src/security.ts` or move to the paid plan.
- Password hashes from the old Postgres app (bcrypt) are not compatible with this deployment.

## Author

**Ikhmal** — DevOps Engineer · [GitHub](https://github.com/Ikhmal-Hisyam-4) · [gpu.kubex.my](https://gpu.kubex.my)
