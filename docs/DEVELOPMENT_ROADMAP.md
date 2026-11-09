# Development Roadmap

Phases follow the master specification. Status at delivery: **v1.0.0 source-complete** - all phases implemented as described below; external-credential-dependent verification steps remain for the operator (they cannot be executed without real Google/AI credentials, and this project never fakes verification).

## Phase 0 - Workspace audit - DONE
Inspected target environment, defined monorepo structure (npm workspaces: extension / backend / shared), wrote the technical specification into the docs set. No pre-existing projects were overwritten.

## Phase 1 - Architecture & foundation - DONE
Monorepo scaffolding, shared API contract types, Fastify app with security middleware, Prisma schema (25 models), extension manifest + build pipeline (Vite for UI, esbuild IIFE for content scripts), Tailwind design system, Docker compose.

## Phase 2 - Authentication & YouTube integration - DONE
Google OAuth (authorize/callback/exchange/refresh/revoke), one-time-code extension handshake, multi-connection + multi-channel model with activation, Data API + Analytics API clients with quota accounting, secure token storage (AES-256-GCM). **Operator verification required:** real OAuth consent + first sync with live credentials.

## Phase 3 - Core analytics - DONE
Dashboard aggregation (totals, deltas, timeseries, rankings), channel/video/shorts analytics surfaces, retention + traffic sources, historical snapshots, period/format comparisons.

## Phase 4 - SEO & competitor intelligence - DONE
SEO score rubric (unit-tested), full video audit with honest not-analyzed list, keyword engine (expansion + verified competition + transparent opportunity + clustering + history + CSV), competitor tracking with snapshots, comparison, patterns, content gaps.

## Phase 5 - AI intelligence - DONE
Multi-provider gateway (Anthropic/OpenAI/Gemini) with BYOK encryption, task routing, fallback, usage log; Content Studio (ideas/scripts/plans/metadata); AI dashboard summary with rules fallback; channel-aware assistant with context injection; AI title/description/tag generators.

## Phase 6 - Advanced features - DONE
Best-time heatmap with sample-size/confidence and explicit insufficient-data state; notification system with per-type settings and badge; saved workspace with search + JSON/CSV export; account data export/deletion.

## Phase 7 - YouTube page integration - DONE
Search badges (batched, cached), watch/shorts lazy React panel (overview/SEO/keywords tabs), channel page card, Studio button. SPA-safe, opt-out, zero-cost until opened.

## Phase 8 - Testing & optimization - DONE (unit level)
Vitest suites: SEO rubric, keyword formula/intent/clustering, crypto round-trip + tamper rejection, input parsers, JSON extraction, extension formatters. Typecheck across all workspaces. **Operator verification required for live API integration tests and E2E with real accounts** (needs credentials; documented in DEPLOYMENT.md).

## Phase 9 - Production release - READY
Docker image + compose, migration deploy step, production checklist, Web Store assets guidance (DEPLOYMENT.md), packaging script.

## Next steps beyond v1

1. Thumbnail vision analysis via a multimodal AI task (adapter slot already exists in the gateway).
2. Deeper competitor AI reports (`competitor_analysis` task routing is reserved).
3. Export PDF reports via a headless renderer service.
4. Locale dictionaries beyond English (i18n infrastructure is in place at `src/i18n`).
5. Optional hosted-SaaS mode (multi-tenant hardening checklist in SECURITY.md).
