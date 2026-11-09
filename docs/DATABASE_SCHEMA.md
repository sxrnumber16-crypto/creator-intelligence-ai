# Database Schema

PostgreSQL via Prisma. Full source of truth: `apps/backend/prisma/schema.prisma` (25 models). Apply with `npx prisma migrate dev`.

## Conventions

- **User isolation**: every user-owned row carries `userId` with `onDelete: Cascade` from `User`. Deleting a user removes all their data (GDPR-style delete is exposed at `DELETE /api/account/data`).
- **Source tracking**: analytics rows store `source` and `fetchedAt`; nothing is written without provenance.
- **Null semantics**: `null` = metric not available from the API. The app never substitutes zeros or estimates for missing measurements.
- **BigInt** for YouTube view counters (they exceed 2^31).
- **Quota tables** (`QuotaUsage`) are keyed per channel/day/service.

## Entity map

### Identity & access
| Model | Purpose | Key relations |
| --- | --- | --- |
| `User` | Account (email unique) | everything cascades from here |
| `UserSession` | Issued session tokens (hashed), revocable, expiring | User |
| `GoogleConnection` | One connected Google account; AES-256-GCM encrypted access/refresh tokens, scopes, expiry | User |
| `UserPreferences` | Timezone, theme, brand name, overlay defaults | User (1:1) |
| `NotificationSettings` | Per-type notification switches, quiet hours | User (1:1) |

### Owned channels & history
| Model | Purpose | Notes |
| --- | --- | --- |
| `Channel` | One owned YouTube channel (unique per user+ytChannelId), one active at a time | FK to GoogleConnection |
| `ChannelSnapshot` | Point-in-time subs/views/videoCount | history starts at first sync |
| `Video` | Owned-channel video, parsed duration, `isShort` (<= 62s), tags, last public stats | unique ytVideoId |
| `VideoSnapshot` | Public stat history per video | |
| `AnalyticsRecord` | One row per (channel, video|null, day) of **private** Analytics API metrics: views, estimatedWatchMinutes, averageViewDuration, subscribersGained/Lost, likes, comments | unique (channelId, videoId, date); `videoId: null` = channel-wide row |
| `QuotaUsage` | Daily API unit accounting per service | unique (channel, date, service) |

### Competitor intelligence (public data only)
| Model | Purpose | Notes |
| --- | --- | --- |
| `Competitor` | Tracked external channel | unique (userId, ytChannelId); groupId for grouping |
| `CompetitorSnapshot` | Public stat history | starts when tracking begins |
| `CompetitorVideo` | Public metadata + stats of competitor uploads | strictly separate table - never joined to `AnalyticsRecord` |

### Keywords
| Model | Purpose |
| --- | --- |
| `KeywordQuery` | Audit trail of every explore query (seed, sources, result JSON) |
| `SavedKeyword` | User's keyword database (opportunity, intent, cluster, optional list membership) |
| `KeywordList` | Named lists for organizing saved keywords |

### SEO & content
| Model | Purpose |
| --- | --- |
| `SeoAudit` | Stored audit reports (score + full JSON) |
| `GeneratedContent` | AI outputs (idea sets, scripts, plans) with provider/model attribution |
| `WorkspaceItem` | Generic saved items (kind, title, payload JSON) |

### AI
| Model | Purpose |
| --- | --- |
| `AiProvider` | Per-user BYOK config: kind, encrypted key, model, default flag, status/lastError, task routing JSON, daily limit |
| `AiConversation` / `AiMessage` | Assistant threads with data-reference annotations |
| `AiUsage` | Per-request log: provider, model, task, tokens, latency, ok/error |

### Platform
| Model | Purpose |
| --- | --- |
| `Notification` | Generated notifications (typed, readAt, payload) |
| `JobRun` | Background job audit (job, status, started/finished, detail) |

## Key indexes

- `Channel (userId)`, unique `(userId, ytChannelId)`
- `AnalyticsRecord` unique `(channelId, videoId, date)`, index `(channelId, date)`
- `Video` index `(channelId, publishedAt)`
- `CompetitorVideo` index `(competitorId, publishedAt)`
- `Notification` index `(userId, createdAt)`
- `KeywordQuery` index `(userId, createdAt)`
- `AiUsage` index `(userId, createdAt)`

## Relationships diagram (textual)

```
User 1─* UserSession
User 1─* GoogleConnection 1─* Channel 1─* ChannelSnapshot
                                        ├─* Video 1─* VideoSnapshot
                                        │        └─* AnalyticsRecord (video-scoped)
                                        ├─* AnalyticsRecord (channel-wide, videoId null)
                                        └─* QuotaUsage
User 1─* Competitor 1─* CompetitorSnapshot
                    └─* CompetitorVideo
User 1─* SavedKeyword *─1 KeywordList
User 1─* KeywordQuery / SeoAudit / GeneratedContent / WorkspaceItem
User 1─* AiProvider / AiUsage / Notification / JobRun
User 1─* AiConversation 1─* AiMessage
User 1─1 UserPreferences / NotificationSettings
```

## Migrations workflow

```bash
cd apps/backend
npx prisma migrate dev --name init     # create + apply locally
npx prisma migrate deploy              # production apply
npx prisma studio                      # inspect data
```

## Retention policy (defaults, enforced via jobs or manual ops)

- `AnalyticsRecord`: keep indefinitely (small rows, core history).
- `ChannelSnapshot` / `CompetitorSnapshot`: keep all (a few rows/day per channel).
- `JobRun`: prune rows older than 30 days.
- `KeywordQuery.resultJson`: prune result payloads older than 90 days (keep the seed line).
- `AiUsage`: prune older than 180 days.
