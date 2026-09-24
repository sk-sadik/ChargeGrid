# Charge Grid - Frontend

React + Vite + TypeScript dashboard for the Charge Grid grid-aware multi-tenant EV fleet charging orchestration platform.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the environment file:

   ```bash
   cp .env.example .env
   ```

   Set `VITE_API_BASE_URL` to point at the FastAPI backend:

   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run preview
```

Build output is written to `dist/`.

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the FastAPI backend (including `/api/v1`) | `http://localhost:8000/api/v1` |

Never commit secrets to the frontend bundle. Any keys used server-side must stay on the backend.