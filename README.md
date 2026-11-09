# Creator Intelligence AI

A next-generation, AI-powered YouTube Creator Intelligence platform: a Manifest V3 Chrome extension plus a self-hostable Node.js backend. It combines channel analytics, SEO intelligence, keyword research, competitor tracking, an AI content studio, publishing-time intelligence and a conversational growth assistant into one product that competes with vidIQ and TubeBuddy.

**Design principle: real data over fabricated metrics.** The platform uses only official APIs (YouTube Data API v3, YouTube Analytics API v2, Google OAuth 2.0) and clearly separates measured facts from AI interpretation. It never shows fake search volumes, never guesses hidden metadata, and documents every limitation inline.

---

## Repository layout

```
creator-intelligence-ai/
├── apps/
│   ├── extension/          # Chrome Extension (MV3, React 18, TypeScript, Tailwind, Vite+esbuild)
│   │   ├── public/         # manifest.json + icons
│   │   ├── src/
│   │   │   ├── background/ # Service worker: API proxy, OAuth, badge, alarms
│   │   │   ├── content/    # YouTube page integration (bootstrap + lazy React panel)
│   │   │   ├── sidepanel/  # Main app: 12-section workspace
│   │   │   ├── popup/      # Toolbar quick view
│   │   │   ├── dashboard/  # Full-page dashboard (options page)
│   │   │   ├── pages/      # Overview, Analytics, SEO, Keywords, Competitors, Studio...
│   │   │   ├── components/ # Design system + charts (Recharts)
│   │   │   ├── lib/        # API client (via background), storage, formatting, hooks
│   │   │   └── store/      # Zustand state
│   │   └── scripts/        # Build tooling (Vite for UI, esbuild for content scripts)
│   └── backend/            # Fastify + Prisma + PostgreSQL + Redis/BullMQ
│       ├── prisma/         # Schema (25 models) + migrations workflow
│       ├── src/
│       │   ├── routes/     # REST API (auth, channels, videos, keywords, seo, competitors, ai, ...)
│       │   ├── services/   # OAuth, YouTube clients, AI gateway, SEO scorer, keyword engine,
│       │   │               # competitor tracker, best-time engine, sync jobs
│       │   ├── jobs/       # BullMQ workers (sync, snapshots, notifications)
│       │   └── lib/        # Crypto (AES-256-GCM), cache, errors, auth
│       └── tests/          # Vitest unit tests
├── packages/shared/        # Shared API contract types (single source of truth)
├── docs/                   # All required documentation
├── docker-compose.yml      # Postgres + Redis + backend
└── LICENSE
```

## Feature map

| Module | What it does | Data source |
| --- | --- | --- |
| Overview dashboard | Subs, views, watch time, deltas, daily charts, AI summary | Analytics API + Data API |
| Channel / Video analytics | Trends, per-video retention, traffic sources, comparisons | Analytics API (authorized) |
| SEO Intelligence | Transparent 100-point metadata rubric, AI title/description/tag tools | Rule engine + optional AI |
| Keyword Explorer | Related-keyword discovery, intent, competition verification, opportunity estimate, history, CSV export | Data API (+ optional AI/autocomplete) |
| Competitor Intelligence | Track channels, snapshots, comparisons, video patterns, content gaps | Data API (public data only) |
| AI Content Studio | Ideas, scripts, plans, metadata - channel-aware | Configurable AI provider |
| Best Time to Publish | Weekly heatmap of publish slot vs first-48h views, with sample size + confidence | Analytics API |
| Video Auditor | URL-based full audit with export, honest "not analyzed" list | Data API + rule engine |
| AI Assistant | Chat grounded in your synced data with context injection | Configurable AI provider |
| Saved Workspace | Keywords, ideas, scripts, audits, reports - search + JSON/CSV export | Backend DB |
| YouTube integration | Search badges, watch-page panel, channel card, Studio button | Public overlays |

See `docs/FEATURE_STATUS.md` for per-feature implementation and testing status, including what requires credentials.

## Quick start

Prerequisites: Node.js >= 20, Docker (or your own Postgres 14+/Redis 6+).

### 1. Start infrastructure and backend

```bash
# from the repo root
docker compose up -d postgres redis

cd apps/backend
cp .env.example .env
# Edit .env: generate secrets with:
#   openssl rand -hex 32   (ENCRYPTION_KEY)
#   openssl rand -hex 32   (JWT_SECRET)
# Add your Google OAuth client + YouTube Data API key (see docs/YOUTUBE_INTEGRATION.md)

npm install            # from repo root (npm workspaces)
npm run db:migrate     # applies the bundled initial migration (0_init)
npm run dev:backend    # http://localhost:3000
```

Health check: `curl http://localhost:3000/api/health`

### 2. Build and load the extension

```bash
cd apps/extension
npm run build          # outputs dist/
```

Chrome -> `chrome://extensions` -> enable **Developer mode** -> **Load unpacked** -> select `apps/extension/dist`.

### 3. Sign in and sync

1. Open the extension popup -> **Sign in with Google** (consent screen served by your OAuth client).
2. Approve the minimum scopes: `youtube.readonly` + `yt-analytics.readonly` (+ profile/email).
3. In the side panel, press **Sync** on Overview to pull channel data + 90 days of analytics.
4. Optionally add an AI provider key in **Settings > AI providers** (Anthropic / OpenAI / Gemini) to unlock AI features.

Full configuration and deployment guides: `docs/DEPLOYMENT.md`.

## What needs external credentials

| Credential | Required for | Where |
| --- | --- | --- |
| Google OAuth client (Web app) | Sign-in, channel connection, authorized analytics | backend `.env` |
| YouTube Data API v3 key | Competitor lookups, public video stats, keyword competition | backend `.env` |
| Anthropic / OpenAI / Gemini API key | All AI features (optional; rules-based fallbacks exist) | backend `.env` or Settings > AI providers |
| PostgreSQL + Redis | Persistence, caching, background jobs | `docker-compose.yml` |

Nothing else. No third-party metric vendors, no scraping of protected data.

## Data honesty policy (short version)

- YouTube publishes **no official keyword search volumes or difficulty scores**. This product shows a transparent, formula-documented *opportunity* estimate built from live competition data instead of inventing "search volume".
- Competitor data is **public only** and never mixed with your private analytics.
- Historical comparisons start **when tracking begins**; the app never fabricates history.
- Every AI output labels its source; every metric row stores its origin and fetch time.
- Features degrade honestly: missing data, missing scopes, exhausted quotas and unconfigured providers are reported as explicit states, never replaced with sample data.

## Tests

```bash
npm run test          # runs backend + extension unit tests (Vitest)
npm run typecheck     # strict TypeScript across all workspaces
```

Covered: SEO rubric behavior, keyword opportunity formula, intent classification, AES-GCM credential round-trip, video/channel input parsing, model-JSON extraction, extension formatters.

## Documentation index

- `docs/ARCHITECTURE.md` - system design, components, data flow
- `docs/DATABASE_SCHEMA.md` - all entities and relationships
- `docs/API_DOCUMENTATION.md` - REST contract
- `docs/YOUTUBE_INTEGRATION.md` - OAuth scopes, API usage, quotas, keyword methodology
- `docs/AI_PROVIDER_SETUP.md` - gateway, BYOK model, task routing
- `docs/SECURITY.md` - threat model, data isolation, Chrome Web Store compliance
- `docs/DEPLOYMENT.md` - local dev, Docker, production hardening
- `docs/DEVELOPMENT_ROADMAP.md` - phase plan (as specified) and current phase status
- `docs/FEATURE_STATUS.md` - honest per-feature status, dependencies, known limitations

## License

MIT
