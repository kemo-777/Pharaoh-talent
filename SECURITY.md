# PHARAOH TALENT 1.9.0 — Security and launch gate

This document describes controls in release 1.9.0 and the work that remains. It is not a penetration-test certificate.

## Controls currently implemented

- Passwords use Node.js `scrypt` with per-account random salts.
- Signed expiring sessions are revoked on logout; password reset increments the account auth version. Browser sessions use an HttpOnly, SameSite=Strict cookie, Secure in production; production login responses do not return bearer tokens. Bearer auth remains available for API clients.
- Login uses a dummy password hash for unknown accounts to reduce simple timing-based account enumeration.
- Authentication requests are rate-limited by client IP and, where an email is provided, by email identity. These counters are process-local.
- Mutation requests with a browser `Origin` header must match the request host; cross-site Fetch Metadata requests are rejected.
- Request body size/content type are checked; request/header timeouts and method allowlisting are enabled.
- Browser security headers include CSP, frame denial, no-sniff, referrer and permissions policies; HSTS is production-only.
- Email verification and reset tokens are stored as digests and expire after 30 minutes.
- PostgreSQL entities are stored in separate column-based tables with foreign keys, uniqueness constraints and indexes. Startup applies a transactional schema migration under a schema advisory lock; mutations are serialized with a separate advisory lock and the app reloads entity rows before mutation.
- Production refuses to start without a strong app secret, HTTPS public URL, PostgreSQL URL, mandatory email verification and Resend credentials.

## Additional 1.9.0 controls

- Cookie-authenticated browser mutations are rejected if neither a matching `Origin` nor same-origin Fetch Metadata is present. Explicit Bearer-token API clients remain supported.
- `/api/health` now verifies PostgreSQL connectivity and returns `503` if the database cannot be reached, so the hosting health check can detect a database outage.
- The process has explicit request/header/keep-alive limits and handles `SIGTERM`/`SIGINT` with graceful HTTP and database-pool shutdown.
- CI includes release-configuration checks and a PostgreSQL 16 migration/persistence round-trip against an isolated disposable database. The database integration result must be checked in the GitHub Actions run; it has not been run in this local environment.

## Known security and architecture limits

- Although PostgreSQL storage is now split into explicit entity columns, the route layer still reconstructs the complete entity state in memory and serializes mutations. This remains a scaling bottleneck; a future repository-per-entity architecture and narrower transactional writes are recommended.
- Rate limits are not shared across replicas. Put a distributed rate limiter at a trusted edge or use Redis before public exposure. `TRUST_PROXY=true` must only be set behind a reverse proxy you control.
- The browser UI no longer persists auth tokens in localStorage. Cookie auth still requires a production browser/reverse-proxy review, and XSS defenses remain essential. Bearer tokens remain accepted for non-browser API clients.
- No external penetration test, fuzzing campaign, load test, browser automation suite, live PostgreSQL test, real Resend delivery test, or external AI provider test has been completed in this environment.
- Public profiles now require a single-use email confirmation sent to a different guardian email address; the talent account cannot self-approve consent. This confirms mailbox control only, not legal identity or the family relationship, so legal/guardian verification remains a release gate. Video upload allows MP4/WebM up to 50 MB, validates a basic file signature, uses generated filenames outside the public web root, and limits uploads per account. Uploaded videos remain pending until manually approved by an administrator; the admin queue provides a preview. The system does not scan codecs with a hardened media parser or scan for malware. Video binaries are local filesystem assets, not part of the JSON database backup; use persistent/object storage and test media backups before production.
- There is no live PostgreSQL migration/concurrency test in this environment, full-text search service, shared cache, task queue, CDN setup, or disaster recovery rehearsal.
- The npm registry was unreachable in the build environment, so a fresh package-lock file could not be generated. Generate and commit one in an internet-connected environment, review dependency changes, and run `npm audit` before deployment.

## Required release gates

1. Generate and commit `package-lock.json`; review dependency tree and run `npm audit` plus a software-composition scan.
2. Run integration tests against a real isolated PostgreSQL instance, including concurrent writes from at least two app processes, lock-wait behavior, restart, and backup restore.
3. Run the column-based relational migration against a disposable copy of production-like data; verify row counts, foreign keys, constraints, restarts, rollback and backup/restore. Then move route handlers toward repository-per-entity transactions before scale.
4. Add distributed rate limiting, session cookie/CSRF review, security tests for every route, and independent penetration testing.
5. Run browser accessibility/mobile checks and staged load tests; set measured capacity limits and alerts.
6. Complete privacy, minors' safety, legal, moderation, and incident-response reviews before onboarding real users.
7. Deploy first to a staging environment with synthetic data; only proceed after all release gates have documented owners and passing evidence.


## Video and guardian access policy (1.8.0)

- Anonymous users and unverified organizations cannot stream uploaded videos.
- The owner and admin can inspect uploaded videos for account support/moderation.
- Only active, verified `club`, `investor`, or `agency` accounts can view approved videos on public profiles with confirmed consent. General talent-list API responses omit video identifiers/URLs.
- Video moderation is a manual admin decision, not automated content safety. The admin preview is not malware scanning.
- Guardian email confirmation is not identity proof. A malicious user could still lie about age or provide an unrelated mailbox; implement an appropriate age/guardian assurance process with legal review before broad deployment.
- The old single JSONB state row and per-entity JSONB payload columns have been replaced in code by column-based relational persistence, but a live database migration has not been exercised here. Production transaction tests, distributed rate limiting, object storage, malware scanning, backup restoration for media, independent penetration testing, and load testing are still outstanding.
