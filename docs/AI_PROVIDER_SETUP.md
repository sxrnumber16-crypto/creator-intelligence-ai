# AI Provider Setup

## Gateway design

All AI features flow through one gateway (`apps/backend/src/services/ai/gateway.ts`):

```
runCompletion(userId, task, request)
  1. Resolve provider for the task:
     a. task-specific routing (user config)
     b. user's default provider (BYOK)
     c. first working BYOK provider
     d. server env key (ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY)
  2. Execute via the provider adapter (timeout + retries at the HTTP layer)
  3. On failure: mark provider status=error, try a different env-key provider as fallback
  4. Log usage (provider, model, task, tokens, latency, ok/error) to AiUsage
```

If nothing is configured, AI endpoints return a structured `NOT_CONFIGURED` error and every AI-dependent feature falls back to its rules-based mode (e.g. dashboard summaries, SEO scoring) - the UI labels which mode produced the output.

## Supported providers

| Provider | Adapter | Default model | Env key |
| --- | --- | --- | --- |
| Anthropic Claude | `providers/anthropic.ts` (Messages API) | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| OpenAI | `providers/openai.ts` (Chat Completions, `response_format=json_object`) | `gpt-4o-mini` | `OPENAI_API_KEY` |
| Google Gemini | `providers/gemini.ts` (generateContent, `responseMimeType=application/json`) | `gemini-1.5-flash` | `GEMINI_API_KEY` |

Adding a provider = implement the `ProviderAdapter` interface (`complete`, `test`) and register it in `gateway.ts`. Nothing else changes.

## BYOK (Bring Your Own Key) - storage and security model

1. Users paste a key in **Settings > AI providers** (extension).
2. The backend encrypts it with AES-256-GCM using the server's `ENCRYPTION_KEY` before it touches the database.
3. Keys are **never** returned to the extension - the API exposes only `hasKey: true/false`, status and last error.
4. Decryption happens only in-process at call time.
5. Deleting the provider hard-deletes the ciphertext. There is no key escrow, logging or third-party transmission beyond the provider call itself.
6. Test connectivity (`POST /ai/providers/:id/test`) sends a 1-token "ping" and updates provider status.

If `ENCRYPTION_KEY` is rotated, re-enter BYOK keys (old ciphertexts become undecryptable by design - fail closed, never fail open).

## Task routing

Each user can route tasks to different providers via `PATCH /api/ai/providers/:id {taskRouting: {task: providerId}}`:

| Task | Used by |
| --- | --- |
| `content_generation` | Content Studio ideas/plans, description generator |
| `seo_analysis` | Keyword expansion, tag/title intelligence |
| `competitor_analysis` | (reserved for deeper competitor AI reports) |
| `analytics_interpretation` | Dashboard AI summary |
| `script_writing` | Script generator |
| `assistant` | AI Growth Assistant |

Reliability built into the gateway: request validation, timeouts, bounded retries with backoff (at the `fetchWithRetry` layer for network errors), rate-limit respect via `Retry-After`, provider status tracking, fallback routing, and full usage logging visible at `GET /api/ai/usage`.

## Prompt grounding rules

Every system prompt (see `services/ai/prompts.ts`) enforces:

- Use only the provided context; never invent metrics, titles or dates.
- Separate FACTS from INTERPRETATION.
- No promises of views/rankings.
- Strict JSON output for structured tasks, parsed with a defensive `extractJson` (handles code fences, extracts the JSON block, throws on failure - the caller then falls back rather than showing garbage).

The assistant additionally receives a server-assembled channel context block (real subscribers, top/weak videos, competitor topics) and is explicitly told which data was *not* loaded so it can say "I don't have that data" instead of guessing.

## Cost control

- Structured JSON + `maxTokens` caps per task (500-3000).
- Usage log per request with token counts.
- Optional per-provider `dailyRequestLimit` (enforced as a soft ceiling tracked via `AiUsage`).
- Rules-based fallbacks mean the product remains fully usable with zero AI spend.
