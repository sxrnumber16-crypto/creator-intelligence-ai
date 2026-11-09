# Deployment

## 1. Local development (fastest path)

```bash
# from repo root
docker compose up -d postgres redis
npm install                       # npm workspaces install everything
cd apps/backend && cp .env.example .env
#   - generate: openssl rand -hex 32  (twice: ENCRYPTION_KEY, JWT_SECRET)
#   - add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / YOUTUBE_API_KEY
cd ../..
npm run db:migrate                # apply schema
npm run dev:backend               # Fastify on :3000 with hot reload
npm run dev:extension             # extension watch build -> load dist/ unpacked
```

Verify: `curl http://localhost:3000/api/health` -> `{"ok":true,"services":{"database":true,"redis":true,...}}`.

## 2. Docker (single host)

```bash
cd apps/backend && cp .env.example .env   # fill secrets; DATABASE_URL/REDIS_URL are
# overridden by docker-compose to point at the containers
cd ../..
docker compose up -d --build              # postgres + redis + backend (:3000)
docker compose logs -f backend            # watch migrations run on boot
```

The backend image runs `prisma migrate deploy` before starting. Health check: `GET /api/health`.

## 3. Production checklist

**Backend**
- [ ] Set `NODE_ENV=production`, real `PUBLIC_BASE_URL` (https).
- [ ] Generate fresh `ENCRYPTION_KEY` + `JWT_SECRET` (never reuse dev values).
- [ ] Google OAuth client: add production redirect URI `{PUBLIC_BASE_URL}/api/auth/google/callback`; publish the consent screen (or keep test users limited).
- [ ] `CORS_ORIGINS=chrome-extension://<YOUR_EXTENSION_ID>` (find the ID after loading the packed extension).
- [ ] Managed PostgreSQL with backups (e.g. RDS/Cloud SQL) + Redis with persistence.
- [ ] Process manager: run `node dist/server.js` (backend build with `npm run build`). For scale, run a second process with `WORKER_ROLE` separation of the BullMQ workers (extract `startWorkers()` behind an env flag).
- [ ] Optional: Sentry DSN for error tracking; ship logs to your platform (Fastify logs are structured JSON).

**Extension**
- [ ] `apps/extension/public/manifest.json`: set `host_permissions` to your production backend origin; set name/version for your brand.
- [ ] `npm run build` -> verify `dist/` loads unpacked with zero console errors.
- [ ] `node scripts/package.mjs` (or zip the `dist/` folder) for the Web Store upload.

**Database**
- [ ] `npx prisma migrate deploy` against the production DB (CI step or container entrypoint).
- [ ] Enable automated backups + point-in-time recovery.

## 4. Chrome Web Store submission assets

- **Name / description**: set in `manifest.json` (branding is configurable; do not imply Google affiliation).
- **Privacy policy URL**: required. State: data processed includes YouTube channel analytics you authorize, competitor public statistics, and your saved workspace content; stored in your own backend; deletion via Settings > Data controls; no data sold; no third-party trackers.
- **Permission justifications** (paste into the review form):
  - `storage`: persist session and settings locally.
  - `identity`: Google OAuth sign-in via `launchWebAuthFlow`.
  - `sidePanel`: main analytics workspace.
  - `alarms` + `notifications`: unread-notification badge and alerts.
  - Host permissions: your backend API origin + `youtube.com` for optional on-page overlays.
- Single purpose: YouTube creator analytics and AI growth intelligence.

## 5. Operations

| Concern | Approach |
| --- | --- |
| Backups | Postgres automated snapshots; Redis AOF (config in compose); quarterly restore drill recommended |
| Monitoring | `GET /api/health` (db/redis flags) wired to your uptime monitor; structured JSON logs |
| Error tracking | Sentry DSN hook point in `apps/backend/src/config/env.ts` + `app.ts` error handler |
| Quota alerts | `GET /api/system/status` shows today's usage; alert at 80% of limits |
| Migrations | Always `prisma migrate deploy` in CI/CD before app rollout |
| Scaling | Modular monolith is stateless (JWT + Postgres/Redis) - run N replicas behind a load balancer; move BullMQ workers to a dedicated process first |
