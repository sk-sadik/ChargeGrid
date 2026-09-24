# Charge Grid Backend

FastAPI + MongoDB (Motor) backend for grid-aware multi-tenant EV charging optimization.

## Quick Start

```bash
# 1. Copy env file
cp .env.example .env

# 2. Start with Docker Compose
docker-compose up --build

# 3. API available at http://localhost:8000
#    Docs at http://localhost:8000/docs
```

## Project Structure

```
app/
├── api/           # API routes (auth, tenants, chargers, sessions, vehicles, invoices, allocator, websocket)
├── core/          # Config, security (JWT)
├── db/            # MongoDB session (Motor client, init, id counters)
├── models/        # Enums + collection names (documents stored as dicts)
├── schemas/       # Pydantic schemas
└── main.py        # FastAPI app entry point
```

## Key Features

- **JWT Auth** with tenant-scoping (site_id + role claims)
- **5 Core Collections**: Tenants, Chargers, Sessions, Vehicles, Invoices (integer ids via a `counters` collection)
- **Greedy Priority Allocator** (60s loop) with High/Medium/Low tiers
- **Native FastAPI WebSocket** per-tenant broadcasts (<500ms)
- **Billing**: kWh × $0.30 + peak kW × $15 demand charge
- **Docker Compose** with MongoDB healthcheck + depends_on

## API Endpoints

| Module | Prefix | Key Endpoints |
|--------|--------|---------------|
| Auth | `/api/v1/auth` | `POST /login`, `POST /register` |
| Tenants | `/api/v1/tenants` | `GET /me`, `PATCH /{id}` |
| Chargers | `/api/v1/chargers` | `POST /`, `POST /{id}/start-session` |
| Sessions | `/api/v1/sessions` | `GET /active`, `POST /{id}/complete` |
| Vehicles | `/api/v1/vehicles` | `PATCH /{id}` (priority_tier) |
| Invoices | `/api/v1/invoices` | `POST /generate/{period}`, `GET /{id}/breakdown` |
| Allocator | `/api/v1/allocator` | `POST /run`, `GET /status` |
| WebSocket | `/api/v1/ws/live/{tenant_id}?token=...` | Real-time updates |

## Demo Script

```bash
# 1. Register two tenants
curl -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" -d '{"username": "site-a", "password": "demo123"}'
curl -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" -d '{"username": "site-b", "password": "demo123"}'

# 2. Login to get tokens
TOKEN_A=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -d "username=site-a&password=demo123" | jq -r .access_token)
TOKEN_B=$(curl -s -X POST http://localhost:8000/api/v1/auth/login -d "username=site-b&password=demo123" | jq -r .access_token)

# 3. Create 6 chargers per tenant (get your tenant_id from /api/v1/tenants/me)
for i in {1..6}; do curl -s -X POST http://localhost:8000/api/v1/chargers -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"site_id\": \"site-a\", \"tenant_id\": 1, \"max_power_kw\": 11}"; done
for i in {1..6}; do curl -s -X POST http://localhost:8000/api/v1/chargers -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -d "{\"site_id\": \"site-b\", \"tenant_id\": 2, \"max_power_kw\": 11}"; done

# 4. Create vehicles with different priorities (vehicle creation auto-scopes to your tenant_id)
curl -s -X POST http://localhost:8000/api/v1/vehicles -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"battery_capacity": 60, "driver": "Fleet-1", "priority_tier": "high"}'
curl -s -X POST http://localhost:8000/api/v1/vehicles -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"battery_capacity": 60, "driver": "Fleet-2", "priority_tier": "medium"}'
curl -s -X POST http://localhost:8000/api/v1/vehicles -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"battery_capacity": 60, "driver": "Employee-1", "priority_tier": "low"}'

# 5. Start charging sessions (simulate 8 concurrent)
# ... use /chargers/{id}/start-session

# 6. Run allocator
curl -s -X POST http://localhost:8000/api/v1/allocator/run -H "Authorization: Bearer $TOKEN_A"

# 7. Connect WebSocket for live dashboard
# ws://localhost:8000/api/v1/ws/live/{tenant_id}?token={TOKEN}
```

## Running Tests

```bash
docker-compose exec api pytest -v
```

## Environment Variables

See `.env.example` for all configurable options.