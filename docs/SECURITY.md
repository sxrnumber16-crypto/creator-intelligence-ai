# Security

## Principles

Security and privacy by design: least-privilege scopes, encrypted secrets at rest, user-level data isolation, no credentials in content scripts, explicit permission disclosure, and honest failure states. The product reads YouTube data; it never writes, scrapes protected surfaces, or circumvents any API restriction.

## Credential handling

| Secret | Where it lives | Protection |
| --- | --- | --- |
| Google access/refresh tokens | `GoogleConnection` columns | AES-256-GCM (`v1:iv:tag:ciphertext`), random IV per encryption, auth-tag verified on decrypt |
| AI provider API keys (BYOK) | `AiProvider.apiKeyEnc` | Same AES-256-GCM envelope; never returned to the client (only `hasKey`) |
| Extension session JWT | `chrome.storage.local` (extension only) | HS256, bound to a revocable `UserSession` row; 7-day expiry; logout revokes server-side |
| One-time login code | `UserSession.tokenHash` (SHA-256) | Single-use, 5-minute TTL, exchanged once then promoted to a normal session |
| `ENCRYPTION_KEY` / `JWT_SECRET` / client secrets | Backend env only | Never transmitted; `.env` is git-ignored; `.env.example` documents generation |

Rotation of `ENCRYPTION_KEY` fails closed: old ciphertexts are undecryptable and users re-enter keys. `safeEqual` (constant-time compare) is used for secret comparisons.

## Authentication & authorization

- Google OAuth 2.0 authorization-code flow; the **backend** is the confidential client holding client secrets. The extension only ever handles its own session JWT.
- State parameter is HMAC-signed and time-boxed (10 min) and binds the response to the requesting extension ID (`https://<extId>.chromiumapp.org/` redirect).
- Every protected route runs `requireAuth`: JWT verification **plus** a live session lookup (revocation and expiry enforced server-side).
- Channel-scoped routes resolve the channel through `userId` scoping - one user can never read or act on another user's channel, audits, keywords, conversations or workspace items. This is enforced by Prisma `where` clauses on every query (`findFirst({where: {id, userId}})`, `deleteMany({where: {id, userId}})`).

## Data isolation

- All user-owned tables cascade from `User`; `DELETE /api/account/data {scope}` implements per-scope and full deletion.
- Competitor (public) data lives in dedicated tables (`Competitor`, `CompetitorVideo`, `CompetitorSnapshot`) that are never joined to private `AnalyticsRecord` rows.
- The public overlay endpoints (`/api/youtube/*`) expose only Data-API public stats, cached, rate-limited, no user data.

## Transport & headers

- CORS restricted to configured origins (`CORS_ORIGINS`, e.g. `chrome-extension://<id>`); no wildcard in production.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` locked down, HSTS in production.
- Global rate limiting (300 req/min production), plus explicit quota guards for YouTube APIs.
- Body limit 2 MB; zod validation on every input (query, params, body).

## Extension permissions (least privilege)

| Permission | Why |
| --- | --- |
| `storage` | Session + settings |
| `identity` | `launchWebAuthFlow` for Google sign-in |
| `sidePanel` | Primary UI surface |
| `alarms` | Notification badge polling (15 min) |
| `notifications` | Chrome-native notifications |
| Host: `http://localhost:3000/*` | Default backend (add your production origin before shipping - see DEPLOYMENT.md) |
| Content scripts: `*://*.youtube.com/*` | On-page overlays |

No `tabs` broad access, no `<all_urls>`, no `webRequest`, no cookies access. Content scripts hold no tokens and talk only to the background worker.

## Privacy

- Only the minimum OAuth scopes (two read-only YouTube scopes + identity).
- No third-party analytics/trackers anywhere in extension or backend.
- Data export (`GET /api/account/export`) and deletion (`DELETE /api/account/data`) are built-in, one-click.
- A privacy-policy template for the Chrome Web Store listing is in the store-assets section of DEPLOYMENT.md.

## Prohibited by design (and enforced in code review)

No CAPTCHA bypass, no paywall circumvention, no access to unauthorized private data, no scraping of protected or restricted information, no undocumented internal YouTube APIs as a foundation (the only unofficial call is the public autocomplete suggest endpoint, used as an optional, clearly-labeled supplementary source), no fabricated metrics presented as real.

## Audit points for reviewers

- `apps/backend/src/lib/crypto.ts` - encryption implementation
- `apps/backend/src/lib/auth.ts` - session verification
- `apps/backend/src/routes/auth.ts` - OAuth + one-time code exchange
- `apps/backend/src/config/env.ts` - fail-fast configuration validation
- `apps/extension/src/background/index.ts` - the extension's single network egress point
- `apps/extension/src/content/index.ts` - no-credential content script
