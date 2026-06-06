# Frontend Architecture

## Stack

- React 19.2
- TypeScript 6
- Vite 8
- Vitest
- Playwright
- Static deployment through NGINX reverse proxy

## Runtime model

The UI is a static SPA. It should normally be served on the same origin as the gateway reverse proxy. Same-origin deployment avoids browser CORS complexity and prevents exposing the gateway admin API to unnecessary origins.

## API client

The `GatewayApiClient` is intentionally small and based on `fetch`:

- Adds `Accept: application/json`.
- Adds `X-Admin-Token` only for admin endpoints.
- Adds `X-Request-Id` for correlation with gateway logs.
- Applies a request timeout.
- Retries only idempotent `GET` calls on transient failures.
- Converts invalid JSON into a clear gateway API error.

## Security model

- Admin token is held only in memory.
- Base URL validation rejects unsafe schemes, credentials, control characters, and oversized values.
- Probe path validation permits only relative `/api/**` and `/auth/**` gateway routes.
- Exported CSV fields are escaped against formula injection.
- The runtime CSP blocks external scripts, frames, forms, and now avoids inline style requirements.
- Docker runtime uses a non-root NGINX image.

## Feature modules

| Module | Responsibility |
|---|---|
| `dashboard` | Abuse telemetry, Redis abuse scores, auto-refresh, partial load handling |
| `access-list` | Allow/block entry creation, validation, filtering, CSV export, disable confirmation |
| `policy` | Read-only global and route policy inspection |
| `health` | Actuator health status |
| `probe` | Controlled gateway route probing |

## Testing

- Unit tests cover validation, URL security, CSV escaping, and formatting.
- Playwright tests cover the essential workflows with mocked backend responses.
- GitHub Actions runs install, typecheck, unit tests, build, browser install, E2E tests, and npm audit.
