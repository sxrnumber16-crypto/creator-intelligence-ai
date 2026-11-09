# Feature Status

Status legend: DONE (implemented + unit-tested where applicable) | VERIFIED-BY-OPERATOR (works, but requires real external credentials to see live results) | PARTIAL (shipped with a documented scope limit).

Every item lists dependencies and known limitations. This file is the honest map of the product.

## Authentication & channels

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Google OAuth sign-in (extension) | DONE + VERIFIED-BY-OPERATOR | GOOGLE_CLIENT_ID/SECRET | One-time-code handshake; state HMAC-bound to the extension ID. |
| Token refresh / revocation / logout | DONE | Google tokens stored encrypted | Refresh happens on 401 and lazily per connection. |
| Multi-account + multi-channel, switch, disconnect | DONE | OAuth | One active channel at a time; per-channel AI/notification context. |
| Minimum scopes | DONE | - | `youtube.readonly` + `yt-analytics.readonly` + identity only. |

## Analytics

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Dashboard (totals, deltas, timeseries, rankings, AI summary) | DONE | Channel sync (YouTube APIs) | Private metrics appear only after first sync and only where the Analytics API returns them. |
| Channel sync (snapshot + videos + 90d backfill) | DONE | OAuth + quotas | Idempotent; manual + scheduled (6h) modes. |
| Video analytics: retention, traffic sources, daily views | DONE | yt-analytics.readonly | Retention unavailable for very new/Shorts-feed views; the UI says so instead of faking. |
| Shorts vs long-form filters + comparisons | DONE | Sync | Comparison across videos uses per-video analytics rows. |
| Best-time heatmap | DONE | yt-analytics.readonly + >= 5 videos in range | Correlates publish time with first-48h views; explicit insufficient-data state; sample size + confidence always shown. |
| Impressions / CTR | PARTIAL | Analytics API `reach` metric group | Not all channels expose these metrics; requested in a safe group and reported unavailable when absent. |

## SEO

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Score analyzer (transparent rubric) | DONE (unit-tested) | None | Measures metadata quality only - never a ranking promise. |
| Full video audit by URL | DONE | YOUTUBE_API_KEY | Public data + benchmarks; "not analyzed" list states limits (thumbnail vision, hidden tags). |
| AI title/description/tag generation | DONE | An AI provider | Editable, copyable, exportable; includes no-guarantee note. |

## Keywords

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Exploration + verification + clustering | DONE | YOUTUBE_API_KEY (search.list ~100 units/keyword, cached 24h) | First full exploration of 18 keywords costs ~1.7-2k units. |
| Opportunity estimate | DONE (unit-tested) | Same | Relative 0-100 estimate; formula disclosed in-product; **no search volumes shown because none exist**. |
| Intent classification | DONE (unit-tested, heuristic) | Optional AI for refinement | Heuristic baseline is always available. |
| Saved keywords, lists, history, CSV export | DONE | Backend DB | - |

## Competitors

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Discovery + tracking + snapshots | DONE | YOUTUBE_API_KEY | History starts at tracking time (never fabricated). |
| Comparison table | DONE | Your channel snapshot + public data | Competitor subscriber counts only when public. |
| Video intelligence (top videos, patterns) | DONE | Data API | Patterns are heuristic (numbers/questions/brackets/format share). |
| Content gap analysis | DONE | Tracked competitors | Title-token based with public view totals as signal; labeled as a starting point. |

## AI

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Multi-provider gateway (Anthropic/OpenAI/Gemini) | DONE | Provider key (BYOK or env) | Task routing, fallback, status tracking, usage log. |
| BYOK storage | DONE | Backend ENCRYPTION_KEY | AES-256-GCM at rest; keys never returned to the client. |
| Content Studio (ideas, scripts, plans) | DONE | AI provider | Channel-aware when channel data is synced. |
| Dashboard AI summary | DONE | AI provider (rules fallback otherwise) | Output source is labeled `ai` or `rules`. |
| Growth Assistant chat | DONE | AI provider + synced channel | Context injection server-side; states missing data; conversations persisted. |
| Thumbnail content analysis | NOT BUILT | - | Documented as not-analyzed in audits; gateway slot reserved. |

## YouTube page integration

| Feature | Status | Depends on | Notes / limitations |
| --- | --- | --- | --- |
| Search results badges | DONE | Backend (public overlay endpoint, cached) | Opt-out; batched single API call; observer self-disconnects. |
| Watch/Shorts intelligence panel | DONE | YOUTUBE_API_KEY | Lazy-loaded React in shadow DOM; zero cost until opened. |
| Channel page card | DONE | Backend overlay endpoint | Public stats only. |
| Studio helper button | DONE | - | Opens the side panel. |

## Platform

| Feature | Status | Notes |
| --- | --- | --- |
| Notifications (diff-based + badge + settings) | DONE | Performance spikes/drops, competitor uploads, sync failures; 15-min badge polling. |
| Saved workspace + export | DONE | JSON/CSV per item and bulk. |
| Account data export/deletion | DONE | Scopes: keywords/audits/workspace/conversations/competitors/everything. |
| Quota tracking | DONE | Per channel/day/service; early explicit QUOTA_EXCEEDED errors. |
| Background jobs | DONE | BullMQ channel/competitor sync + notification cycle; JobRun audit table. |
| Tests | DONE (unit) | Backend: scorer/keywords/crypto/parsers/JSON extraction. Extension: formatters. Live-API integration + E2E require operator credentials (scripts and flows documented). |
| i18n | PARTIAL | Infrastructure in place (`src/i18n`, t() with interpolation); v1 strings are English. |
| PDF export | NOT BUILT | JSON/CSV shipped; PDF deferred to a renderer service (roadmap). |

## Verification still required from the operator (cannot be done without credentials)

1. Real Google OAuth consent run (Phase 2 verification).
2. First live channel sync with a real YouTube channel.
3. Analytics API visibility for your channel class (metrics vary by channel).
4. One AI provider connectivity test (Settings > AI providers > Test).
5. Chrome Web Store review submission.

Everything above is wired and waiting on credentials only - no code changes are needed for these steps.
