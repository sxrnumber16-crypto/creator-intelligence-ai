# YouTube Integration

## Google OAuth 2.0 setup (one-time, ~10 minutes)

1. Open [Google Cloud Console](https://console.cloud.google.com/) -> create/select a project.
2. **APIs & Services > Library**: enable **YouTube Data API v3** and **YouTube Analytics API**.
3. **OAuth consent screen**: External, add scopes `.../auth/youtube.readonly`, `.../auth/yt-analytics.readonly`, `openid`, `.../userinfo.email`, `.../userinfo.profile`. While in *Testing* mode, add your Google account as a test user.
4. **Credentials > Create credentials > OAuth client ID > Web application**:
   - Authorized redirect URI: `{PUBLIC_BASE_URL}/api/auth/google/callback` (e.g. `http://localhost:3000/api/auth/google/callback`).
   - Copy the client ID/secret into `apps/backend/.env`.
5. **Credentials > Create credentials > API key** (for public competitor/overlay data). Restrict it to the two YouTube APIs. Put it in `YOUTUBE_API_KEY`.

### Scopes used (minimum set, read-only)

| Scope | Why |
| --- | --- |
| `openid`, `userinfo.email`, `userinfo.profile` | Identify the account, show the user. |
| `youtube.readonly` | Read channel + video metadata and public stats for **your** connected channels. |
| `yt-analytics.readonly` | Read private daily metrics (views, watch time, subs gained/lost, retention, traffic sources). |

No write scopes are requested. The product never modifies anything on YouTube.

## Multi-channel model

One user account can connect **multiple Google accounts** (each becomes a `GoogleConnection`). Each connection contributes its owned channels (`channels.list(mine=true)`). The user activates exactly one channel at a time; all analytics, SEO and AI features operate in that channel's context. Disconnecting a connection revokes the Google token and cascade-deletes its data.

## API usage and quota management

Default quotas (per project, per day, resets midnight Pacific):

| API | Default | Product behavior |
| --- | --- | --- |
| YouTube Data API v3 | 10,000 units | `channels.list`/`videos.list`/`playlistItems` = 1 unit; `search.list` = 100 units (used only for competitor search + keyword competition). Tracked per channel in `QuotaUsage`; requests are refused early with `QUOTA_EXCEEDED` instead of burning quota blind. Heavy results are cached (keywords 24h, overlay stats 30 min). |
| YouTube Analytics API | 50,000 units | ~1 unit per report query. Sync uses 2-3 queries (overview + engagement groups); per-video detail pages add 2-3. |

A full sync costs roughly 5-10 data units + 2-4 analytics units per channel. Keyword exploration costs ~1,700-2,000 units the first time (18 keywords x ~100) - subsequent identical keywords are free from cache. This is why the UI always shows sources, freshness, and sample sizes.

## What the official APIs give us (and what they don't)

| Signal | Available? | Source |
| --- | --- | --- |
| Your private daily views/watch time/subs | Yes (authorized) | Analytics API |
| Retention curve per video | Yes (authorized, where supported) | Analytics API `audienceWatchRatio` |
| Traffic sources | Yes (authorized) | Analytics API `insightTrafficSourceType` |
| Impressions / CTR | Partially (metric group `reach`; not guaranteed for all channels) | Analytics API |
| Competitor subscriber counts | Only when public | Data API `channels.list` |
| Competitor hidden analytics (real watch time, CTR, retention) | **Never** | - |
| Competitor tags | Only if returned publicly; hidden tags are never guessed | Data API |
| Keyword search volume / official difficulty | **Do not exist** in any YouTube API | - |

## Keyword opportunity methodology (no fake volumes)

Because no official volume source exists, the Keyword Explorer:

1. Expands the seed via morphology, public autocomplete (supplementary, labeled) and AI (labeled).
2. Verifies **every** candidate against live `search.list` + `videos.list` + `channels.list` data (cached 24h).
3. Computes a relative 0-100 opportunity from: median top-10 views (log-scaled, max 45 pts pressure), exact-match title share (max 20), median ranking-channel size (max 20), recency of top results (max 15); ±10 adjustment for how recent uploads perform vs the top.
4. Always displays the formula, the sample size, and a disclosure that YouTube publishes no search volumes. Nothing unverified is ever displayed.

## Best-time methodology

1. Pull per-video daily views from the Analytics API for the last N videos in range.
2. `first48hViews` = daily views for the first 2 days after publish.
3. Group by publish weekday/hour in the user's timezone (`Intl`-based conversion).
4. Heatmap cell = median first-48h views; windows require >= 2 samples; confidence from total sample size (<12 low, <25 medium, else high).
5. The UI states plainly: this correlates publish time with early traction; it is not audience-presence and not a guarantee.

## Content-script integration rules

- SPA navigation handled via the public `yt-navigate-finish` event + URL polling fallback (1.5s interval) - no aggressive MutationObserver loops (the search-badge observer self-disconnects after 8s).
- Overlays are opt-out (Settings) and injected into a single host element; the watch-page panel is **dynamically imported** so YouTube pages pay no cost until it is opened.
- Content scripts contain no credentials; all data comes from the background worker.
- No undocumented internal endpoints are used for any core feature. The only non-Data-API call is the public autocomplete suggest endpoint, which is optional, clearly labeled, and the system works fully without it.
- The extension never modifies YouTube's own DOM behavior (no removal, no interception) - it only appends optional elements.
