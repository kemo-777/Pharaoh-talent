# PHARAOH TALENT 1.8.1 — Talent Discovery Platform

An Arabic-first, responsive talent discovery platform with a Node.js HTTP API, local JSON development storage, and column-based PostgreSQL persistence for deployment. It runs on Node.js 20+; PostgreSQL mode requires the `pg` dependency and database configuration.

## What is included

- RTL Arabic interface, responsive layout, light/dark theme, talent and opportunity discovery.
- Account roles: talent, parent/guardian, investor, club/academy, company, agency, and admin. Parent accounts must verify their email and can access only child profiles linked by confirmed guardian consent.
- Password hashing using Node.js `scrypt`, signed expiring sessions, HttpOnly/SameSite cookies for browser sessions (Secure in production), persistent token revocation on logout, JSON content-type enforcement, request-body byte limits, request/header timeouts, request rate limiting, per-IP and per-email authentication limits, cross-site mutation request checks, constant-work login verification for unknown emails, paginated discovery endpoints, and hardened browser/API security headers. Production mode fails closed unless HTTPS URL, PostgreSQL configuration, and mandatory email verification credentials are supplied.
- Talent profiles, skill/achievement lists, profile visibility (new profiles default to private), HTTPS-only portfolio links, validated YouTube/Vimeo links and private server-side MP4/WebM skill-video uploads (50 MB maximum, signature checked, 5 uploads/hour/account), plus an email-confirmed separate guardian-consent workflow before public profiles, and public profile responses that avoid exposing the internal `userId` field (a separate `contactId` is used for messaging).
- Opportunity publishing (only manually verified organizations can publish public opportunities), search and filters, applications/status tracking, saved items, messaging, reporting, and admin moderation APIs.
- Account data export (JSON) and self-service account deletion with password confirmation, including removal of related profile, messages, applications, saved records, and owned opportunities. Some report/audit records are retained in anonymized form for moderation/audit continuity.
- Transparent rule-based recommendations by category and skill overlap; this is not an external AI model or an objective talent score.
- Demo talent profiles and demo opportunities. They are sample content and are not verified people or organizations.
- Automated integration tests for the main API workflow, duplicate application prevention, authorization, privacy defaults, data export, logout revocation, invalid saved targets, and account deletion.
- Email verification links, resend-verification endpoint, and password reset using Resend when configured; hashed one-time tokens expire after 30 minutes.
- Manual organization verification request/review workflow for organizations and admins. This is human review, not automatic legal identity validation.
- Optional OpenAI-compatible AI matching endpoint with strict timeouts and a transparent local skill/category fallback. AI is advisory only.
- PostgreSQL persistence now uses separate column-based tables for users, talents, opportunities, applications, messages, saved items, reports, audit events, tokens, organization verification, videos, guardian consent requests and guardian-child links. Foreign keys, uniqueness constraints and indexes are applied. A one-time transactional migration backfills prior per-entity JSONB payloads into columns and drops the payload columns. Database schema upgrades are serialized with an advisory lock; application writes also use a separate advisory lock. This is a major relational migration, but live PostgreSQL validation is still required before production.
- Local JSON backup command.

## Run on Windows PowerShell

```powershell
cd D:\New folder\pharaoh-talent
npm start
```

Open `http://127.0.0.1:3000`.

For development auto-restart:

```powershell
npm run dev
```

Run tests:

```powershell
npm test
```

Create a database snapshot backup (reads PostgreSQL directly when `DATABASE_URL` is configured):

```powershell
npm run backup
```

To restore, stop the app, select a backup file, and pass the explicit confirmation flag:

```powershell
npm run restore -- .\data\backups\db-YYYY-MM-DDTHH-MM-SS-sssZ.json --confirm
```

Restore overwrites current data. Backups are stored under `data/backups/`. Keep backups private and store a second copy somewhere secure. With `DATABASE_URL`, the backup command exports a logical snapshot from the normalized PostgreSQL tables and also copies the local media directory. Without `DATABASE_URL`, it backs up local JSON storage. Configure and test provider-native database backups as well.

## Hosted deployment (Render + PostgreSQL)

See [DEPLOY_RENDER.md](DEPLOY_RENDER.md) and review [DEVICE_COMPATIBILITY.md](DEVICE_COMPATIBILITY.md). The repository includes a `render.yaml` Blueprint and GitHub Actions CI workflow. These files prepare deployment but do not mean that a GitHub repository or hosted service has already been created. Review provider pricing before applying the Blueprint; it provisions paid resources. Persistent video storage is configured for a single web instance.

## Docker Compose deployment

Docker Compose is configured for production mode and intentionally refuses to start unless you provide a real public HTTPS URL, a strong `APP_SECRET`, a PostgreSQL URL, and valid Resend sender credentials. Do **not** run it unchanged using `.env.example`.

1. Copy `.env.example` to `.env` and replace every placeholder with unique secrets.
2. Set `PUBLIC_APP_URL=https://your-real-domain.example`.
3. Set `POSTGRES_PASSWORD` and use the same password in `DATABASE_URL`; URL-encode special characters in the database URL password.
4. Configure `RESEND_API_KEY` and a verified `MAIL_FROM` sender. Keep `.env` private and never commit it.
5. Put a properly configured HTTPS reverse proxy in front of the app; the app and database ports are bound to loopback on the host by default.
6. Run `docker compose config` to validate the resolved configuration, then `docker compose up --build -d` and inspect logs and health before testing with synthetic data.

The old single JSONB state snapshot is no longer the PostgreSQL persistence model. The schema uses entity tables and explicit columns, with a one-time migration from the older per-entity JSONB payload layout. Docker support is not a claim that the data architecture is already proven at large scale.

## Admin account

1. Start the app once and stop it with `Ctrl+C` (this initializes the database).
2. Run the following with your own unique password. When using PostgreSQL, set `DATABASE_URL` in the same terminal/environment.

```powershell
node scripts/create-admin.js admin@example.com "Use-A-Unique-Long-Password-123" "Platform Admin"
```

Admin registration is not available from public signup. Never use the example password.

## API overview

- `GET /api/health`, `GET /api/public/stats`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/resend-verification`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/verify-email?token=...` (landing page), `POST /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/talents`, `GET /api/talents/:id`, `GET/PUT /api/talents/me`, `POST /api/guardian-consent/request`, `POST /api/guardian-consent/confirm`, `GET /api/guardian/dashboard`, `POST /api/guardian/children/:talentId/revoke`, `POST/DELETE /api/talents/me/video`, `GET/HEAD /api/talent-videos/:id`, `GET /api/admin/videos`, `PATCH /api/admin/videos/:id`
- `GET/POST /api/opportunities`, `PATCH /api/opportunities/:id`
- `POST/GET /api/applications`, `PATCH /api/applications/:id`
- `GET /api/recommendations`, `GET/POST /api/saved`
- `GET/POST /api/messages`, `POST /api/reports`
- `GET /api/account/export`, `DELETE /api/account`
- `POST/GET /api/org-verification`, `GET /api/org-verification/me`, `GET /api/admin/org-verification`, `PATCH /api/admin/org-verification/:id`
- `GET /api/admin/overview`, `PATCH /api/admin/users/:id`, `PATCH /api/admin/reports/:id`

## Version 1.5.0 improvements (retained)

- Browser sessions now use an HttpOnly, SameSite=Strict cookie (Secure in production); the browser UI no longer stores session tokens in localStorage. Production login responses omit bearer tokens. Bearer auth remains supported for API clients.
- Legacy public-profile acknowledgement behavior has been superseded in 1.6.0 by the email-confirmed consent flow described below.
- Added external YouTube/Vimeo links plus MP4/WebM uploads up to 50 MB, server-generated filenames, storage outside the public web root, file-signature checks, per-account upload limits, range streaming, and video deletion. In 1.6.0, uploaded videos require admin moderation and verified organization access.
- Configurable IP-level limits plus per-email limits for registration/login/forgot-password/resend-verification. Limits are process-local and are not a distributed defense.
- Login performs a password hash even when an email does not exist to reduce simple timing-based account enumeration.
- Public talent/opportunity discovery supports `page` and `limit` (maximum 100) and the UI offers “load more”. Application and message endpoints return pagination metadata.
- Expired opportunities are no longer listed as open to the public; new opportunity deadlines must be valid and not in the past.
- PostgreSQL-backed mutating API requests acquire a database advisory lock, reload the latest snapshot, and persist through the lock-held connection. This is a consistency guard, not a scalability solution.
- Resend-verification route with a generic response to reduce email enumeration.
- Docker Compose now fails early unless production HTTPS, database URL, mandatory email verification, and verified mail credentials are configured.

## Known limits — honest launch checklist

This is still an enhanced MVP, not a guarantee of zero defects or production readiness. PostgreSQL stores entities in separate tables with explicit columns, foreign keys and indexes, and migrates legacy payload data transactionally. Current request handlers still operate on an in-memory state model and persist the entity tables as a coordinated set, so writes are serialized and the whole application state is loaded into memory. Rate limits remain process-local and are not shared across instances; use shared rate limiting before broad public exposure. Real PostgreSQL migration, restart, rollback, backup/restore and concurrent multi-process tests remain required before scale.

Email delivery works only when a valid Resend key and verified sender are configured; delivery has not been verified in this environment. AI matching requires a compatible provider and credentials; no AI key is bundled. The manual organization workflow is not automatic legal identity validation. SMS/OTP, payments, end-to-end encrypted messaging, malware scanning/media transcoding, real-time chat, background jobs, formal data retention workflows, and external penetration/load testing are not included. Uploaded video binaries live on the local DATA_DIR filesystem and are not included in the JSON backup; production needs persistent storage or object storage, lifecycle/backup policies, and malware scanning before broad public use. Demo profiles/opportunities are synthetic examples.

Before public launch: run the normalized PostgreSQL migration against a disposable copy of production-like data, validate row counts and foreign keys, test rollback and restore; configure verified email and enforce verification; test password reset delivery; add shared/distributed rate limiting; configure HTTPS, secret management and observability; test database and backup restoration; review child-safety/consent, privacy and terms with appropriate professionals; perform independent penetration and load tests. Production mode now refuses to start if HTTPS URL, PostgreSQL connection, mandatory email verification, or Resend credentials are missing. This guard does not replace real production-like database and load testing. AI recommendations must never be the sole basis for hiring, investment, team selection, or judging talent.

## Reset demo data

Stop the app and delete `data/db.json` only if you intentionally want to reset all local accounts and content. The app will seed sample data on the next start. Make a backup first if any real test data matters.



## Version 1.8.0 — parent accounts and column-based relational storage

- Added a first-class **ولي أمر** account role in registration and a dedicated dashboard tab. Guardian accounts must verify their email before login; their dashboard only lists child profiles linked by a confirmed consent email.
- Parents can view linked child profile/video status and revoke publication consent. Revocation immediately makes the talent profile private and removes guardian video access. Parent-child links are stored explicitly and audited.
- Replaced PostgreSQL per-entity JSONB payload persistence with explicit relational columns and typed arrays, foreign keys, unique constraints, and indexes across 14 entity tables. Startup runs a serialized schema migration, backfills legacy payload columns, and drops those columns after successful migration.
- Added schema/mapping tests and API coverage for guardian email verification, child video access, and consent revocation. The automated suite passes locally.
- **Important:** this environment does not provide a live PostgreSQL service. Do not run the migration first on the only production database. Test on a copy, verify record counts and backups, and confirm restart/rollback behavior before deployment. Email confirmation is mailbox control, not legal identity or relationship verification.

## Version 1.6.0 — guardian consent and verified video access

- Added a separate guardian-consent email workflow. The talent account cannot mark its own consent as approved; confirmation uses a single-use, 30-minute token sent to a different email address. Local development returns a test link; production must configure Resend and a verified sender. This confirms control of the mailbox only, not legal identity or that the mailbox belongs to a guardian.
- Added an admin-only video review queue, with preview for uploaded videos and a link to inspect external video URLs. Uploaded and external videos are pending by default. Approval is refused until the talent profile is public and guardian consent has been confirmed.
- Uploaded videos are viewable by the owner/admin for review, but organizations can stream only approved videos on public profiles and only when their organization account is active and verified and its role is `club`, `investor`, or `agency`. Video IDs and URLs are omitted from general talent-list responses.
- Added a guardian consent confirmation page and single-use token test. Legacy self-asserted guardian approvals are reset to private at startup unless they carry the new server-side approval status.

### Important remaining release gates

At the time of version 1.6.0, PostgreSQL still used a JSONB snapshot; version 1.8.0 replaces that layout with explicit entity columns. This is still a prototype, not a guarantee of production readiness, and no live PostgreSQL migration/concurrency test has been run. The email provider was not live-tested, and mailbox confirmation is not legal guardian identity verification. Video files are stored on the local filesystem, are not malware-scanned or transcoded, and are not included in JSON backups. There is no independent penetration test or external load test. Do not launch broadly until these gaps are resolved and a child-safety/privacy review is completed.


## Version 1.8.1 deployment preparation

- Added a Render Blueprint for the full Node.js service, managed PostgreSQL, required HTTPS/email verification configuration, and persistent media disk.
- Added GitHub Actions CI on Node.js 20 and 22.
- Added hosting and device compatibility checklists.
- No live cloud deployment, live PostgreSQL validation, physical-device test, or external security/load test is implied by these configuration additions.
