# Architecture

## System overview

Creator Intelligence AI is a **modular monolith backend + Chrome extension client**. Every domain (auth, YouTube integration, SEO, keywords, competitors, AI, notifications, jobs) lives in its own service module with its own folder and can be extracted into a standalone service later without touching the others.

```
┌───────────────────────────────────────────────┐
│ Chrome Extension (MV3)                        │
│                                               │
│  Popup ─┐                                     │
│  Side Panel ─┼─> Background Service Worker ───┼──┐   HTTPS + Bearer JWT
│  Dashboard ─┘        │  (API proxy, OAuth,    │  │
│                      │   token refresh, badge)│  │
│  Content Scripts ────┘                       │  │
│  (YouTube overlays, lazy React panel)        │  │
└───────────────────────────────────────────────┘  │
                                                   v
┌──────────────────────────────────────────────────────────────┐
│ Backend API (Fastify, TypeScript, Node 20+)                  │
│                                                              │
│  REST routes ──> Domain services                             │
│    auth          oauth/google.ts        (Google OAuth 2.0)   │
│    channels      sync/syncChannel.ts    (Data + Analytics)   │
│    videos        youtube/dataApi.ts                          │
│    keywords      keywords/engine.ts                          │
│    seo           seo/scorer.ts, seo/audit.ts                 │
│    competitors   competitors/tracker.ts                      │
│    ai            ai/gateway.ts ─> provider adapters          │
│    best-time     analytics/bestTime.ts                       │
│    misc          notifications, workspace, preferences       │
│                                                              │
│  Background jobs (BullMQ on Redis)                           │
│    channel-sync · competitor-sync · notify diffing           │
└───────────────┬──────────────────────────┬───────────────────┘
                v                          v
         PostgreSQL (Prisma)          Redis (cache + queues)
```

## Components and responsibilities

### 1. Chrome Extension

- **Background service worker** (`src/background/index.ts`): the single network egress point for all backend calls. Owns the session JWT, performs 401-triggered refresh, handles the Google OAuth handshake through `chrome.identity.launchWebAuthFlow`, maintains the unread-notification badge and a 15-minute alarm.
- **Content scripts** (`src/content/index.ts`): a tiny IIFE bootstrap (no framework) that reacts to YouTube SPA navigation (`yt-navigate-finish` + URL polling), renders search badges / channel cards / Studio button in plain DOM, and lazy-imports the React intelligence panel (`panel.js`) only when the user opens it. No token ever reaches a content script.
- **UI surfaces**: side panel (primary 12-section workspace), popup (quick stats + entry points), dashboard/options page (same app shell at full width).
- **State**: Zustand store bootstrapped from `chrome.storage.local` (session, settings, channels).

### 2. Backend API

Fastify with zod-validated inputs, structured JSON errors (`{error:{code,message}}`), global rate limiting, strict CORS (extension origins only), security headers on every response.

### 3. Authentication service (`services/oauth/google.ts` + `routes/auth.ts`)

Google OAuth 2.0 authorization-code flow with offline access. The backend is the confidential client: it exchanges the code, encrypts and stores refresh tokens (AES-256-GCM), and issues the extension a short session JWT bound to a revocable `UserSession` row. The redirect target is `https://<extension-id>.chromiumapp.org/` carrying a **one-time login code** - the session token itself never transits a redirect URL.

### 4. YouTube integration service (`services/youtube/`)

- `dataApi.ts`: typed client for channels/videos/search/playlistItems with per-endpoint quota costs.
- `analyticsApi.ts`: Analytics API v2 queries with metric-group fallbacks (metrics that are unavailable for a channel/report are surfaced as errors, not zeroed).
- `quota.ts`: per-channel daily quota accounting against Google's defaults (10k data units, 50k analytics units) with early, explicit `QUOTA_EXCEEDED` errors.

### 5. Analytics processing engine

`services/sync/syncChannel.ts` performs idempotent sync: channel snapshot -> uploads playlist upserts -> daily analytics backfill (overview + engagement metric groups). All numbers are stored exactly as reported; `null` means "not available", never zero.

### 6. SEO intelligence engine

`services/seo/scorer.ts` - a deterministic, weighted rubric (title 30, description 25, tags 15, keyword consistency 20, engagement benchmarked separately). Each component exposes score, weight, explanation and per-finding confidence. Unit-tested.

### 7. Competitor research engine

`services/competitors/tracker.ts` - public-data-only tracking with snapshot history that starts at tracking time. Content-gap analysis is title-token based over recent competitor uploads, with public view totals as the strength signal.

### 8. AI provider gateway (`services/ai/`)

Provider-agnostic `runCompletion(userId, task, request)` with: user-configured BYOK providers (encrypted), per-task routing, automatic fallback to server env keys, status/error tracking per provider, usage logging. Prompts (`prompts.ts`) enforce the grounding rules (no invented numbers, facts vs interpretation, JSON-only responses parsed by `extractJson`).

### 9. Notification service

Snapshot diffing in the job worker creates notifications for subscriber spikes/drops, competitor uploads (48h window, deduplicated), and sync failures. The extension polls and renders a badge; per-type settings are stored per user.

### 10. Background job processing

BullMQ queue `cia-jobs` with a dispatcher (expands cron ticks into per-channel/per-competitor jobs) and a main worker (runs syncs + notification cycle). Every run is recorded in `JobRun` with status and error detail.

### 11. Database and cache layer

PostgreSQL via Prisma (25 models, user-scoped with cascading deletes) + Redis for response caching (e.g. keyword competition 24h, public overlay stats 30min) and BullMQ. The cache layer degrades gracefully to in-memory when Redis is unavailable in development.

## Data flow examples

**Dashboard load:** extension -> background `GET /api/channels/:id/dashboard?range=28` -> route reads `ChannelSnapshot` + `AnalyticsRecord` (already synced; no live API call needed for the happy path) -> computes deltas + rankings -> generates AI/rules insight -> returns typed `DashboardResponse`.

**Keyword exploration:** extension `POST /api/keywords/explore {seed}` -> expansion (autocomplete + AI + morphology) -> per-keyword `search.list` verification (cached 24h) -> opportunity formula -> clustered `KeywordExploreResponse` + query logged to `KeywordQuery`.

**Channel sync (job or manual):** sync service -> `channels.list(mine)` snapshot -> `playlistItems` + `videos.list` upserts -> Analytics `reports.query` per metric group -> rows upserted with source + fetchedAt -> notification diff cycle runs after.

## Extensibility notes

- New AI provider = implement the 2-method `ProviderAdapter` interface and register it in `gateway.ts`.
- New SEO component = add a scoring function returning `SeoComponentScore`; the aggregator and UI pick it up automatically.
- Extractable services: each folder under `services/` has no cross-imports beyond `lib/`, so any domain can be lifted into its own deployable with its Prisma models.
