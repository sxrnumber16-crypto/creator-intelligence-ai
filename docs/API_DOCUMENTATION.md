# API Documentation

Base URL: `{backend}/api`. All responses are JSON. Errors use a single envelope:

```json
{ "error": { "code": "NOT_CONFIGURED", "message": "...", "details": null } }
```

Common codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `BAD_REQUEST` (400), `RATE_LIMITED` (429), `QUOTA_EXCEEDED` (429), `DATA_UNAVAILABLE` (409), `NOT_CONFIGURED` (503), `UPSTREAM_ERROR` (502).

Authentication: `Authorization: Bearer <session JWT>` on everything except `health`, the OAuth endpoints, and the public overlay endpoints (`/api/youtube/*`). Rate limit: 300 req/min per IP in production. Shared response types live in `packages/shared/src/index.ts`.

---

## Auth

| Method | Path | Body/Query | Notes |
| --- | --- | --- | --- |
| GET | `/auth/google/authorize` | `?extensionId=` | Returns `{url, scopes}` - the Google consent URL with HMAC-signed state binding the extension redirect. |
| GET | `/auth/google/callback` | Google redirect | Exchanges code, upserts user + connection + channels, redirects to `https://<extId>.chromiumapp.org/?code=<oneTimeCode>`. |
| POST | `/auth/exchange` | `{code}` | Exchanges the one-time code for `{accessToken, expiresIn, user}`. Code is single-use, 5-minute TTL. |
| POST | `/auth/refresh` | - | Extends the current session, returns a fresh JWT. |
| POST | `/auth/logout` | - | Revokes the session row. |
| GET | `/auth/me` | - | `{user, channels[]}`. |
| DELETE | `/auth/connections/:connectionId` | - | Revokes at Google and deletes the connection + its channels (cascade). |

## Channels & dashboard

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/channels` | List connected channels. |
| POST | `/channels/:id/activate` | Make this the active channel (switch context). |
| POST | `/channels/:id/sync` | Full sync: snapshot + videos + analytics backfill. Returns counts. |
| DELETE | `/channels/:id` | Disconnect the channel. |
| GET | `/channels/:id/dashboard?range=7|28|90|365` | `DashboardResponse`: totals, deltas, timeseries, top/underperforming videos, recent uploads, AI/rules insights, data sources, quota. |

## Videos

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/channels/:id/videos?format=all|shorts|long&sort=recent|views|viewsPerDay|engagement&page=&pageSize=&q=` | Paginated `VideoRanking[]`. |
| GET | `/channels/:id/videos/:videoId` | `VideoAnalyticsDetail`: retention curve, traffic sources, daily views, notes about unavailable metrics. Refreshes per-video analytics from the API. |
| POST | `/channels/:id/compare` | `{videoIds[], metrics[]}` -> per-video aggregated metrics. |

## Keywords

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/keywords/explore` | `{seed}` -> `KeywordExploreResponse` (clusters, opportunity + factor breakdown, methodology, volume disclosure, sources). Uses ~17 search.list calls (quota!) and caches each keyword 24h. |
| POST | `/keywords/analyze` | `{keyword}` -> deep single-keyword analysis with top-10 competing videos. |
| GET/POST | `/keywords/saved` | List / upsert saved keywords. |
| DELETE | `/keywords/saved/:id` | Remove. |
| GET/POST | `/keywords/lists` | Named keyword lists. DELETE `/keywords/lists/:id`. |
| GET | `/keywords/history` | Recent query audit trail. |

**Opportunity formula (transparent, no fake volume):** `opportunity = 100 - competition`, where competition = log-scaled median top-10 views (max 45) + exact-match title ratio (max 20) + log-scaled median ranking-channel subs (max 20) + recency of top results (max 15), adjusted ±10 by how recent uploads perform relative to the top. Sample size is always shown.

## SEO

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/seo/score` | `{title, description, tags, keyword?}` -> instant rule-based `SeoScoreResult` (no quota, no AI). |
| POST | `/seo/audit` | `{videoUrl, keyword?}` -> full `SeoAuditReport` (saved by default). |
| GET | `/seo/audits` / `/seo/audits/:id` | Audit history / full report. |
| POST | `/seo/audit-own` | `{videoId}` -> metadata pull + score for a connected-channel video. |
| POST | `/seo/titles` | AI title variants (styles: seo/curiosity/clear/shorts). |
| POST | `/seo/description` | AI description + hashtags + pinned comment. |
| POST | `/seo/tags` | AI tags + metadata gap notes. |
| POST | `/ideas` | AI idea generation (`type`, `topic`, `count`, optional `channelContext`). |
| POST | `/seo/parse-video-id` | URL -> videoId helper. |

## Competitors (public data only)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/competitors` | Tracked channels with derived stats (uploads/wk, median views, shorts share). |
| POST | `/competitors/search` | `{query}` -> channel results (1 search.list call = 100 quota units, cached). |
| POST | `/competitors` | `{input}` (URL/@handle/ID) -> track + first snapshot + initial video pull. |
| POST | `/competitors/:id/sync` | Refresh snapshot + recent videos. |
| DELETE | `/competitors/:id` | Untrack. |
| GET | `/competitors/:id` | Detail: recent/top videos, snapshot history, title/format patterns. |
| POST | `/competitors/compare` | `{competitorIds[]}` -> your channel vs theirs (public stats + your snapshots). |
| POST | `/competitors/gap` | `{competitorIds[]}` -> content gaps from title tokens + public view totals. |

## AI

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/ai/providers` | Configured providers (keys never returned - only `hasKey`). |
| POST | `/ai/providers` | `{kind, apiKey, model, setDefault?}` - key encrypted at rest immediately. |
| PATCH | `/ai/providers/:id` | Model, default, task routing, daily limit. |
| DELETE | `/ai/providers/:id` | Remove. |
| POST | `/ai/providers/:id/test` | Connectivity test, updates provider status. |
| GET | `/ai/usage` | Recent usage log (task, tokens, latency, errors). |
| POST | `/ai/script` | `{brief, format, durationMinutes?, tone?, channelContext?}` -> structured script JSON. |
| POST | `/ai/plan` | `{weeks, focus?, channelContext?}` -> weekly plan JSON. |
| POST | `/ai/chat` | `{conversationId?, message}` -> grounded assistant reply (channel context injected server-side). |
| GET | `/ai/conversations` / DELETE `/:id` | Conversation history. |

Tasks: `content_generation`, `seo_analysis`, `competitor_analysis`, `analytics_interpretation`, `script_writing`, `assistant`.

## Best time / workspace / notifications / system

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/channels/:id/best-time?format=&range=&timezone=` | Heatmap + windows + confidence + methodology. Explicit `insufficientData` state. |
| GET/POST/DELETE | `/workspace`, `/workspace/:id` | Saved items (`kind`, `title`, `payload`). |
| GET | `/notifications` | Items + unread count + settings. |
| POST | `/notifications/read` | Mark read (all or ids). |
| PATCH | `/notifications/settings` | Toggle types. |
| GET/PATCH | `/preferences` | Timezone, theme, brand name, overlays. |
| GET | `/account/export` | Full JSON export of the user's data. |
| DELETE | `/account/data` | `{scope: keywords|audits|workspace|conversations|competitors|everything}`. |
| GET | `/health` | `{ok, version, uptimeSeconds, services{database,redis,youtube,ai}}`. |
| GET | `/system/status` | Credential configuration + today's quota. |
| GET | `/youtube/videos?ids=` | Public stats for up to 25 ids (cached 30 min) - powers on-page overlays. |
| GET | `/youtube/channel?id=|handle=` | Public channel stats (cached 30 min). |

## Pagination & limits

List endpoints return `{items, page, pageSize, total, hasMore}` where applicable. Request bodies are limited to 2 MB. Search-based endpoints are the expensive ones (100 quota units per `search.list`); the product prefers `playlistItems` (1 unit) everywhere possible.
