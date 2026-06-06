# Adaptive Rate Limit Gateway UI

Production-grade **React 19.2 + TypeScript** admin console for the `adaptive-rate-limit-gateway` backend.

## GitHub repository

**Repository name:** `adaptive-rate-limit-gateway-ui`

**Description:** Banking-style React 19.2 admin console for adaptive API gateway rate limits, blocklists, allowlists, abuse dashboards, policy inspection, health checks, and protected-route probes.

## Current version

`1.1.0` — production hardening update.

## What is implemented

- Banking-style shell with header, sidebar, central workspace, and footer.
- Responsive layout for desktop, tablet, and narrow screens.
- Gateway connection panel with API base URL and in-memory admin token handling.
- Dashboard for top abusive IPs, tenants, routes, and Redis abuse scores.
- Dashboard auto-refresh and partial-failure rendering so one broken panel does not hide all telemetry.
- Access-list management form for `ALLOW` / `BLOCK` entries by `IP`, `TENANT`, or `API_KEY` hash.
- Client-side guardrails for IPv4/CIDR, tenant id, SHA-256 API-key hash, reason length, and future expiry.
- Active access-list table with search, mode/type filters, CSV export, and disable confirmation dialog.
- Active policy viewer for global and route-specific rate-limit settings.
- Health page for `/actuator/health` and quick operational checks.
- Traffic probe form for `/api/**` and `/auth/**` gateway routes with tenant/API-key headers.
- Secure fetch client with URL validation, timeout, request IDs, safe JSON parsing, and retry only for idempotent transient GET failures.
- Runtime error boundary so one render failure does not blank the whole console.
- No `dangerouslySetInnerHTML`; token is not persisted to `localStorage`.
- Unit tests for security helpers, validation, formatting, and CSV export safety.
- Essential Playwright E2E tests with mocked backend responses.
- Docker/Nginx static deployment with non-root NGINX image and strict security headers.
- GitHub Actions CI.

## Backend endpoints used

| UI area | Backend endpoint |
|---|---|
| Dashboard | `GET /admin/dashboard/top-ips?window=PT1H&limit=10` |
| Dashboard | `GET /admin/dashboard/top-tenants?window=PT1H&limit=10` |
| Dashboard | `GET /admin/dashboard/top-routes?window=PT1H&limit=10` |
| Dashboard | `GET /admin/dashboard/redis-scores?type=ip&limit=10` |
| Access list | `GET /admin/access-list` |
| Access list | `POST /admin/access-list` |
| Access list | `DELETE /admin/access-list/{id}` |
| Policy | `GET /admin/policy` |
| Health | `GET /actuator/health` |
| Probe | `/api/**` and `/auth/**` proxied gateway paths |

Admin endpoints require the backend header:

```http
X-Admin-Token: <gateway admin token>
```

## Recommended local run

Run backend first from the backend project:

```bash
docker compose up -d postgres redis kafka upstream-api
./gradlew bootRun
```

Run the UI:

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:5173
```

Default dev behavior uses Vite proxy to reach backend on `http://localhost:8080`, so the browser calls same-origin `/admin`, `/actuator`, `/api`, and `/auth` paths.

## Environment variables

Create `.env.local` if needed:

```bash
VITE_GATEWAY_API_BASE_URL=http://localhost:8080
VITE_REQUEST_TIMEOUT_MS=8000
VITE_DEV_BACKEND_TARGET=http://localhost:8080
```

For local Vite proxy mode, keep `VITE_GATEWAY_API_BASE_URL` empty.

## Production deployment

Build static assets:

```bash
npm run build
```

Docker:

```bash
docker build -t adaptive-rate-limit-gateway-ui:1.1.0 .
docker run --rm -p 8088:8080 \
  -e GATEWAY_BACKEND_URL=http://host.docker.internal:8080 \
  adaptive-rate-limit-gateway-ui:1.1.0
```

The Dockerfile uses `nginxinc/nginx-unprivileged` so the web server does not run as root.

## Tests

```bash
npm run typecheck
npm run test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run security:deps
```

The E2E tests mock backend API responses, so they validate UI workflows without requiring a running gateway.

If the environment blocks Playwright browser downloads but has a trusted Chromium binary available:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

## Security notes

- The admin token is stored only in React memory state, not `localStorage`.
- `VITE_GATEWAY_API_BASE_URL` accepts only same-origin, `http://`, or `https://` URLs and rejects credentials/control characters.
- Probe paths are limited to relative `/api/**` and `/auth/**` paths and reject encoded traversal.
- CSV export escapes formula-leading cells.
- Request body rendering uses plain text with React escaping, never raw HTML injection.
- Nginx config sets CSP, frame, content-type, referrer, and permission policy headers.
- Dependency set is intentionally small: React, Vite, TypeScript, Vitest, Testing Library, and Playwright.

## Backend CORS note

The backend does not need CORS changes when the UI is served behind the same origin or the included Vite/Nginx proxy is used. If deploying UI and backend on different origins without a reverse proxy, configure CORS on the backend explicitly for the UI origin.
