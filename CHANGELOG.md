# Changelog

## 1.1.0

Production hardening update:

- Added error boundary for last-resort render protection.
- Added idempotent GET retry for transient gateway failures.
- Added `X-Request-Id` on API calls and probes.
- Strengthened API base URL and probe path validation.
- Added access-list subject validation for IPv4/CIDR, tenant ids, and API-key SHA-256 hashes.
- Added access-list search, mode/type filters, quick expiry presets, safe CSV export, and disable confirmation.
- Added dashboard auto-refresh, last-refresh metadata, highest error-rate metric, and partial-failure rendering.
- Replaced dynamic inline score-bar style with native `progress`, allowing stricter CSP.
- Switched runtime Docker image to non-root `nginxinc/nginx-unprivileged`.
- Added tests for input validation and CSV formula-injection protection.

## 1.0.0

Initial banking-style admin console for the adaptive rate-limit gateway.
