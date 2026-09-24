# Charge Grid - Deployment Guide

This guide walks through deploying **Charge Grid** from scratch using your own accounts, credentials, and infrastructure.

> **Important:** The backend of this project uses **MongoDB** (Motor async driver). No PostgreSQL. The frontend lists the Gemini SDK (`@google/genai`) as a dependency but has **no code path that calls it**; there is no Tavily integration in the codebase. All credentials must be provided via environment variables. Never commit real `.env` files.

---

## 1. Prerequisites

- A GitHub account
- A Vercel account (frontend hosting)
- A backend hosting account: **Railway** or **Render** (FastAPI + WebSockets + background tasks)
- A managed MongoDB database: **MongoDB Atlas** (free M0 tier is fine for a demo)

Local tools: Git, Node.js 18+, Python 3.12+.

---

## 2. Database Setup (MongoDB Atlas)

1. Create a free **MongoDB Atlas** cluster at https://www.mongodb.com/atlas.
2. In **Database Access**, create a database user with a strong password (e.g. `chargegrid`).
3. In **Network Access**, add the IP addresses that will connect:
   - Backend host IP (Railway/Render), or `0.0.0.0/0` to allow all (fine for a demo, tighten for production).
   - Your local IP for development.
4. Choose your database name (e.g. `chargegrid`).
5. Copy the connection string from **Connect → Drivers**. It looks like:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

`MONGO_URI` takes this string; `MONGO_DB_NAME` is the database name. Tables/collections and indexes are auto-created on startup by `init_db()` — nothing to pre-provision.

---

## 3. API Keys

### 3.1 Gemini API Key

1. Go to https://aistudio.google.com/apikey and create a key.
2. Store it only in backend/frontend hosting environment variables (see section 5).

> The `@google/genai` package is currently a dependency of the frontend. At the time of writing there is no code path that calls Gemini; this placeholder documents where the key belongs. **Do not embed the key in JS source or client bundles.**

---

## 4. Environment Variables

### Backend (`backend/backend/.env`)

```env
APP_NAME=Charge Grid
APP_ENV=production
DEBUG=false

MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=chargegrid

SECRET_KEY=<generate with: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

ALLOCATOR_INTERVAL_SECONDS=60
SITE_POWER_CAP_KW=50

WS_HEARTBEAT_INTERVAL=30

CORS_ALLOWED_ORIGINS=["https://<your-frontend-domain>"]
# or, for a single origin:
# FRONTEND_URL=https://<your-frontend-domain>
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=https://<your-backend-domain>/api/v1
```

---

## 5. GitHub Setup

1. Create a new GitHub repository (private or public) named `ChargeGrid`.
2. From the project root:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/sk-sadik/ChargeGrid.git
git push -u origin main
```

3. Verify `.env` files are **never** tracked:

```bash
git ls-files | findstr /I ".env"
# Only .env.example files should appear
```

---

## 6. Backend Deployment (Railway or Render)

The backend is at `backend/backend`. It contains a `Dockerfile` and `requirements.txt`.

### Railway

1. Push the repo to GitHub, then create a **New Project → Deploy from GitHub repo**.
2. Set the **Root Directory** to `backend/backend`.
3. Add the backend environment variables from section 4 (production values, including `APP_ENV=production`).
4. Railway automatically uses the `Dockerfile`:

```bash
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000
```

5. Add `APP_ENV=production` and a strong `SECRET_KEY`. The app refuses to boot with `APP_ENV=production` and the placeholder `SECRET_KEY`.

### Render (alternative)

1. Create a **Web Service** from the GitHub repo.
2. Root directory: `backend/backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Add the environment variables, then deploy (health check endpoint: `/health`).

> WebSockets: ensure your hosting provider supports WebSocket connections (not required for the REST API, required for the live board).

---

## 7. Frontend Deployment (Vercel)

1. In Vercel, **Add New Project → Import** your GitHub repo `ChargeGrid`.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `dist` (default).
6. Add the environment variable:

```env
VITE_API_BASE_URL=https://<your-backend-domain>/api/v1
```

7. Deploy. Rebuild/redeploy whenever the backend URL changes (Vite embeds env vars at build time).

---

## 8. CORS Configuration

On the backend, CORS is configured via environment variables. Allowed origins are:

- `CORS_ALLOWED_ORIGINS` - JSON array of allowed origins, e.g. `["https://chargegrid.vercel.app","http://localhost:3000"]`
- `FRONTEND_URL` - convenience single-origin setting that gets appended to the allowed list

Never use `allow_origins=["*"]` together with credentials. Local development already allows `http://localhost:3000`.

---

## 9. Production Testing

Backend:

```bash
curl -s https://<your-backend-domain>/health
curl -s https://<your-backend-domain>/
```

Register the first tenant (production has no demo users):

```bash
curl -X POST https://<your-backend-domain>/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "your-site-id", "password": "<strong-password>"}'
```

Frontend:

1. Open the Vercel URL.
2. Sign in with the registered tenant account.
3. Confirm the live board connects (WS beacon shows connected).
4. Start/stop sessions, run the allocator, generate an invoice.
5. Open browser DevTools → Sources and confirm **no API keys** appear in the bundle.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| Backend won't start: `SECRET_KEY is still the default placeholder` | Set a strong `SECRET_KEY` and `APP_ENV=production` |
| CORS errors in browser | Check `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` matches the exact frontend origin |
| Frontend can't reach backend | Confirm `VITE_API_BASE_URL` includes `/api/v1` and redeploy |
| WebSocket disconnected | Host must support WebSockets; use `wss://` derived from an `https://` API URL |
| DB connection refused | Verify `MONGO_URI`, database user password, and that your backend IP is whitelisted in Atlas **Network Access** |
| `Server selection timeout` error | Atlas cluster is paused/not reachable from the backend host; check IP whitelist and cluster status |
| Backend slow or demo data reappears | Demo seeding only runs when `APP_ENV != production`; set `APP_ENV=production` |

---

## 11. Security Notes

- Generate `SECRET_KEY` with `openssl rand -hex 32`. Never reuse the placeholder.
- Rotate the key immediately if it was ever committed publicly.
- The demo login (`site-a` / `demo123`) only exists in non-production environments.
- Keep `DEBUG=false` and `APP_ENV=production` in production.
- Keep the Atlas user password (and the whole `MONGO_URI`) out of source code; use environment variables/secrets manager on your hosting platform.
- Restrict Atlas **Network Access** to the backend host IP where possible instead of `0.0.0.0/0`.