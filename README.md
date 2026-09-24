# Charge Grid ⚡🚗

A full-stack, grid-aware EV charging management and optimization platform built for multi-tenant charging sites.

The system combines a **React + Vite frontend** with a **FastAPI + MongoDB backend** and provides:

- Multi-tenant authentication with JWT
- Charger and vehicle management
- EV charging session lifecycle management
- Priority-based charging allocation
- Site power-cap enforcement
- Automatic allocator and charging simulation loops
- Billing and invoice generation
- Real-time WebSocket updates
- REST API documentation through FastAPI / Swagger UI
- Docker Compose support for local MongoDB + API development

---

## Architecture

```text
┌─────────────────────────────┐
│        React Frontend       │
│       Vite + TypeScript     │
│        Port: 3000           │
└──────────────┬──────────────┘
               │ REST / WebSocket
               ▼
┌─────────────────────────────┐
│       FastAPI Backend       │
│         Port: 8000          │
│                             │
│  JWT Auth                   │
│  Tenant Management          │
│  Charger Management         │
│  Vehicle Management         │
│  Charging Sessions          │
│  Smart Allocator            │
│  Billing / Invoices         │
│  WebSocket Events           │
└──────────────┬──────────────┘
               │ Motor (async MongoDB)
               ▼
┌─────────────────────────────┐
│          MongoDB 7          │
│         Port: 27017         │
└─────────────────────────────┘
```

---

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Recharts
- Motion

### Backend

- Python 3.12
- FastAPI
- Uvicorn
- Motor (async MongoDB driver)
- PyMongo
- Pydantic / Pydantic Settings
- JWT authentication
- bcrypt password hashing
- WebSockets

### Database

- MongoDB 7

### Development / Deployment

- Docker
- Docker Compose
- Git / GitHub

---

# Project Structure

```text
ChargeGrid/
│
├── backend/
│   └── backend/
│       ├── app/
│       │   ├── api/
│       │   │   ├── allocator.py
│       │   │   ├── auth.py
│       │   │   ├── chargers.py
│       │   │   ├── invoices.py
│       │   │   ├── sessions.py
│       │   │   ├── simulator.py
│       │   │   ├── tenants.py
│       │   │   ├── vehicles.py
│       │   │   └── websocket.py
│       │   │
│       │   ├── core/
│       │   │   ├── config.py
│       │   │   └── security.py
│       │   │
│       │   ├── db/
│       │   │   ├── init_db.py
│       │   │   └── session.py
│       │   │
│       │   ├── models/
│       │   ├── schemas/
│       │   └── main.py
│       │
│       ├── tests/
│       ├── .env.example
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

> Do not commit `node_modules`, `dist`, Python virtual environments, `.env` files, or other generated files.

---

# Prerequisites

Install the following before running the project:

- Git
- Python 3.12+
- Node.js 18+
- npm
- Docker Desktop (recommended)
- Docker Compose

Verify:

```bash
python --version
node --version
npm --version
docker --version
docker compose version
```

---

# 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ChargeGrid
```

---

# 2. Backend Setup

The backend is located at:

```text
backend/backend
```

Move into the backend directory:

```bash
cd backend/backend
```

## Option A — Recommended: Docker Compose

Docker Compose starts:

- MongoDB 7
- FastAPI backend
- Database initialization (indexes are created idempotently)
- API server

### Create the environment file

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` before using the project outside local development.

### Start the backend

```bash
docker compose up --build
```

The API will be available at:

```text
http://localhost:8000
```

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

Health check:

```text
http://localhost:8000/health
```

Stop the services:

```bash
docker compose down
```

Stop and remove the MongoDB volume as well:

```bash
docker compose down -v
```

> `down -v` deletes the local MongoDB data volume. Use it only when you intentionally want a clean database.

---

# 3. Backend Setup Without Docker

Docker is recommended, but the backend can also be run locally.

## Create a virtual environment

From:

```text
backend/backend
```

Windows:

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Configure MongoDB

You need a running MongoDB instance (local `mongod`, Docker, or MongoDB Atlas).

The default development connection settings in `.env.example` are:

```text
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=chargegrid
```

Create your local environment file:

```bash
cp .env.example .env
```

Then make sure the MongoDB values match your local database. Collections and indexes are created automatically on startup; nothing needs to be pre-provisioned.

## Initialize the database

```bash
python -m app.db.init_db
```

## Start FastAPI

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend:

```text
http://localhost:8000
```

---

# 4. Backend Environment Variables

Create:

```text
backend/backend/.env
```

Use `.env.example` as the template.

Example:

```env
APP_NAME=Charge Grid
APP_ENV=development
DEBUG=true

MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=chargegrid

SECRET_KEY=replace-this-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

ALLOCATOR_INTERVAL_SECONDS=60
SITE_POWER_CAP_KW=50

WS_HEARTBEAT_INTERVAL=30

CORS_ALLOWED_ORIGINS=["http://localhost:3000"]
```

## Environment Variable Reference

| Variable | Purpose | Example |
|---|---|---|
| `APP_NAME` | Application name | `Charge Grid` |
| `APP_ENV` | Runtime environment | `development` |
| `DEBUG` | Debug mode | `true` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` / `mongodb+srv://...` |
| `MONGO_DB_NAME` | MongoDB database name | `chargegrid` |
| `SECRET_KEY` | JWT signing secret | Strong random secret |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration | `60` |
| `ALLOCATOR_INTERVAL_SECONDS` | Automatic allocator interval | `60` |
| `SITE_POWER_CAP_KW` | Default site power cap | `50` |
| `WS_HEARTBEAT_INTERVAL` | WebSocket heartbeat interval | `30` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `["http://localhost:3000"]` |

### Important

Never push the real `.env` file to GitHub.

Generate a strong production secret for:

```env
SECRET_KEY=...
```

Do not reuse the placeholder value from `.env.example`.

---

# 5. Frontend Setup

Open a new terminal from the repository root:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the environment file.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Set:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

---

# 6. Run the Complete Application

Open two terminals.

## Terminal 1 — Backend

```bash
cd backend/backend
docker compose up --build
```

## Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend communicates with:

```text
http://localhost:8000/api/v1
```

The WebSocket endpoint is:

```text
ws://localhost:8000/api/v1/ws/live/{tenant_id}?token={JWT_TOKEN}
```

---

# 7. Authentication

The backend uses JWT-based authentication.

## Register

```http
POST /api/v1/auth/register
```

The registration endpoint accepts:

```json
{
  "username": "site-a",
  "password": "demo123"
}
```

## Login

```http
POST /api/v1/auth/login
```

The login endpoint uses OAuth2 form fields:

```text
username=site-a
password=demo123
```

A successful login returns an access token.

Use it for protected requests:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

---

# 8. Main API Modules

Base URL:

```text
http://localhost:8000/api/v1
```

| Module | Prefix | Examples |
|---|---|---|
| Authentication | `/auth` | Register, login |
| Tenants | `/tenants` | Current tenant, update site limits |
| Chargers | `/chargers` | Create, list, start/stop sessions |
| Sessions | `/sessions` | Active sessions, completion |
| Vehicles | `/vehicles` | Create, list, update priority |
| Invoices | `/invoices` | Generate and inspect invoices |
| Allocator | `/allocator` | Run allocator, inspect status |
| WebSocket | `/ws` | Live tenant updates |

Complete interactive API documentation is available at:

```text
http://localhost:8000/docs
```

---

# 9. Smart Charging Allocator

The project uses a priority-based charging allocator to distribute limited site power among active charging sessions.

The system supports:

```text
HIGH
MEDIUM
LOW
```

priority tiers.

The allocator considers:

- Site power capacity
- Active sessions
- Requested charging power
- Vehicle priority
- Charger availability
- Existing allocated power

The automatic allocator runs periodically using:

```env
ALLOCATOR_INTERVAL_SECONDS=60
```

The site-level default power limit is:

```env
SITE_POWER_CAP_KW=50
```

The allocator can also be triggered manually:

```http
POST /api/v1/allocator/run
```

---

# 10. Simulation

The backend starts background simulation tasks during application startup.

These simulate charging activity and periodically publish updates to connected WebSocket clients.

The application also seeds demo data when it starts, including sample tenants, chargers, vehicles, and sessions.

This makes it possible to demonstrate the dashboard without manually creating every record first.

---

# 11. Real-Time WebSocket Updates

The frontend establishes a WebSocket connection for live charging updates.

Endpoint:

```text
ws://localhost:8000/api/v1/ws/live/{tenant_id}?token={JWT_TOKEN}
```

The backend can broadcast events such as:

- Initial state
- Telemetry updates
- Allocation updates
- Session started
- Session completed
- Charger status changes

The frontend automatically reconnects when the WebSocket connection is lost.

---

# 12. Billing

The backend includes invoice generation and invoice breakdown endpoints.

Available operations include:

```text
POST /api/v1/invoices
GET  /api/v1/invoices
GET  /api/v1/invoices/{invoice_id}
POST /api/v1/invoices/generate/{period}
GET  /api/v1/invoices/{invoice_id}/breakdown
```

Refer to `/docs` for the exact request and response schemas.

---

# 13. Testing

Backend tests are located in:

```text
backend/backend/tests
```

Run tests locally:

```bash
cd backend/backend
pytest -v
```

With Docker:

```bash
docker compose exec api pytest -v
```

Run with coverage:

```bash
pytest --cov=app --cov-report=term-missing
```

---

# 14. Production Configuration

Before deploying to production:

1. Generate a strong `SECRET_KEY`.
2. Set `APP_ENV=production`.
3. Set `DEBUG=false`.
4. Use a production MongoDB database (MongoDB Atlas).
5. Update `MONGO_URI` credentials.
6. Restrict `CORS_ALLOWED_ORIGINS`.
7. Use HTTPS for the API.
8. Use `wss://` instead of `ws://` for WebSocket connections.
9. Store secrets in the deployment platform's secret manager/environment settings.
10. Do not expose database credentials in source control.

The application already prevents non-development startup when the default JWT secret is still being used.

---

# 15. Frontend Production Build

Create a production build:

```bash
cd frontend
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The build output is generated in:

```text
frontend/dist
```

Do not commit `dist/` unless your deployment workflow specifically requires it.

---

# 16. GitHub Setup

Before the first push, make sure secrets and generated files are ignored.

At minimum, your repository should not contain:

```text
.env
.env.local
.venv/
venv/
node_modules/
dist/
__pycache__/
.pytest_cache/
```

The backend and frontend already contain `.gitignore` files for most of these.

## Check for accidentally tracked secrets

From the repository root:

```bash
git status
```

Check tracked environment files:

```bash
git ls-files | findstr /I ".env"
```

On Linux/macOS:

```bash
git ls-files | grep -E '(^|/)\.env($|\.)'
```

If a real `.env` file is already tracked, remove it from Git tracking before pushing:

```bash
git rm --cached backend/backend/.env
git rm --cached frontend/.env
```

Then commit the removal.

> If a real secret was ever committed to a public repository, rotate that secret immediately. Removing the file from the latest commit does not make an exposed secret safe.

---

# 17. Recommended Root `.gitignore`

If the repository does not already have a root `.gitignore`, create one with:

```gitignore
# Environment files
.env
.env.*
!.env.example

# Python
__pycache__/
*.py[cod]
*.so
.venv/
venv/
env/
.pytest_cache/
.coverage
htmlcov/
*.egg-info/

# Node
node_modules/
dist/
coverage/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Local database / dumps
*.dump
```

---

# 18. Push the Project to GitHub

From the repository root:

```bash
git status
```

Add the files:

```bash
git add .
```

Commit:

```bash
git commit -m "Initial full-stack Charge Grid commit"
```

Create a GitHub repository, then connect it:

```bash
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
```

Push:

```bash
git branch -M main
git push -u origin main
```

For future changes:

```bash
git add .
git commit -m "Describe your changes"
git push
```

---

# 19. Useful Development URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |
| MongoDB (local only) | localhost:27017 |

---

# 20. Troubleshooting

## Backend cannot connect to MongoDB

Check:

```bash
docker compose ps
```

Make sure the database container is healthy.

For Docker Compose, the backend connects to:

```text
mongodb://mongo:27017
```

For local Python execution, it normally connects to:

```text
mongodb://localhost:27017
```

Therefore, use different `MONGO_URI` values depending on how you run the backend (the backend comes with a `MONGO_DB_NAME` that defaults to `chargegrid`).

---

## Frontend shows API/network errors

Check:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Then make sure the backend is actually running:

```text
http://localhost:8000/health
```

Restart Vite after changing `.env`:

```bash
npm run dev
```

---

## WebSocket is not connecting

Check:

1. The user is authenticated.
2. The JWT token is valid.
3. The backend is running.
4. The frontend `VITE_API_BASE_URL` points to the correct backend.
5. The tenant ID is valid.

For local development:

```text
ws://localhost:8000/api/v1/ws/live/{tenant_id}?token={JWT_TOKEN}
```

For HTTPS deployments, use:

```text
wss://...
```

---

## Port already in use

Check which application is using:

```text
8000
3000
27017
```

Then stop the conflicting process or change the port configuration.

---

# 21. Notes for Contributors

When contributing:

- Keep backend and frontend configuration separate.
- Update `.env.example` when adding a new environment variable.
- Never commit secret values.
- Add tests for backend behavior changes.
- Keep API schemas synchronized with frontend types.
- Document new endpoints in the project README or API docs.
- Run the application locally before opening a pull request.

---

# 22. Project Status

Current implementation includes:

- ✅ React/Vite frontend
- ✅ FastAPI backend
- ✅ MongoDB persistence
- ✅ Multi-tenant authentication
- ✅ JWT security
- ✅ Charger management
- ✅ Vehicle management
- ✅ Charging sessions
- ✅ Priority-based allocator
- ✅ Background charging simulation
- ✅ WebSocket live updates
- ✅ Billing and invoices
- ✅ Docker Compose development environment
- ✅ API documentation
- ✅ Backend tests

---

# License

Add your project's license here, for example:

```text
MIT License
```

If this repository is intended for a hackathon submission, replace this section with the license or usage terms required by your team or organizers.

---

## Security Notice

Never commit API keys, JWT secrets, database passwords, or other credentials to GitHub.

Use:

```text
.env
```

for local secrets and:

```text
.env.example
```

for safe configuration templates containing placeholders only.
