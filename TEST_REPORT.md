# PHARAOH TALENT 1.8.0 — Test report

## Automated checks executed in this environment

Command: `npm test`

Result: **4 top-level tests passed, 0 failed** (2 API integration tests and 2 relational schema/mapping tests).

Coverage includes:

- Health route and security response headers.
- HttpOnly/SameSite session cookie creation, cookie-based authenticated request, and logout cookie revocation.
- Rejection of public profiles before separate-email guardian consent and rejection of unapproved external video domains.
- Video upload signature/type checks, valid MP4 upload, pending moderation blocks anonymous/organization streaming, admin moderation, verified-club streaming of approved videos (`206`), list-response video ID redaction, and video deletion.
- Guardian consent request to a separate email, single-use token confirmation, and rejection of token reuse. A dedicated guardian account must verify email before login; tests cover parent dashboard isolation, approved child-video streaming, and consent revocation that makes the child profile private.
- JSON content-type rejection.
- Cross-site mutation request rejection using `Origin` and Fetch Metadata.
- Paginated discovery response metadata.
- Homepage, password-reset page and email-verification landing page.
- Registration/login, email verification, mandatory-verification mode, and invalid reset token behavior.
- Profile update/search and public-profile omission of internal `userId`.
- Organization verification request and admin approval.
- Verified-organization-only opportunity publishing, invalid/expired deadline rejection, duplicate application prevention, recommendations fallback, saved-item privacy filtering, messaging, reporting, authorization denial, export, logout revocation, suspension/reactivation session invalidation, and account deletion.
- Authentication rate limiting.

Syntax checks passed for `server.js`, `public/app.js`, `public/reset-password.js`, `public/verify-email.js`, `public/guardian-consent.js`, `lib/relational-store.js`, `scripts/create-admin.js`, `scripts/backup.js`, `scripts/restore.js`, `tests/api.test.js`, and `tests/relational-store.test.js`.

## Changes in 1.5.0 (retained)

- Browser sessions use HttpOnly SameSite cookies; production responses omit bearer tokens. The frontend no longer stores auth tokens in localStorage.
- Added YouTube/Vimeo links and MP4/WebM uploads (50 MB cap, server-generated filenames, signature checks, local storage outside public web root, per-account upload limits, authorized byte-range streaming, and deletion).
- Added a guardian-safety acknowledgement gate for public talent profiles; replaced in 1.6.0 with a single-use guardian email confirmation flow.
- Added Origin/Fetch Metadata checks for browser-originated API mutations.
- Added configurable IP limits and per-email limits for registration, login, forgot password, and verification resend.
- Login performs a dummy scrypt hash for unknown accounts to reduce straightforward timing-based account enumeration.
- Increased new-account password minimum to 12 characters, with a 256-character maximum.
- Added generic resend-verification endpoint and a UI action to request a fresh verification email.
- Added pagination metadata for talent, opportunity, application, and message listings; talent/opportunity UI has load-more controls.
- Expired public opportunities are hidden from discovery/recommendations and cannot receive applications/saves; new opportunity deadlines must be valid and not in the past. Only manually verified organizations can publish public opportunities. Public organization statistics count verified organizations only.
- PostgreSQL persistence now maps entities to explicit relational columns and uses foreign keys, unique constraints and indexes. A startup migration backfills legacy JSONB payloads into columns and drops the old payload columns inside a transaction protected by a schema advisory lock. The app still loads entities into memory and serializes mutations, so this is not yet an entity-repository architecture for high scale.
- PostgreSQL mode no longer writes an extra local JSON snapshot on every change.
- Docker Compose requires production HTTPS URL, mandatory verification, and mail credentials instead of starting with contradictory defaults.

## Not tested / release blockers

- Live PostgreSQL connectivity, advisory-lock behavior across two actual application processes, and PostgreSQL backup/restore.
- Real Resend delivery and real AI provider behavior.
- Browser automation, accessibility/mobile compatibility, independent penetration testing, fuzzing, and load/stress tests.
- Distributed rate limiting, live PostgreSQL migration/concurrency tests, end-to-end encrypted messages, malware scanning/media transcoding, legal guardian identity/relationship verification, legal/privacy review, and independent minors' safety audit.
- `npm install --package-lock-only` could not reach `registry.npmjs.org` (`EAI_AGAIN`), so no new lockfile was generated and `npm audit` could not be completed here.

Passing these local integration tests does not prove the absence of vulnerabilities and does not certify production readiness. Do not launch broadly until the live PostgreSQL migration, concurrency, backup/restore and external security gates are completed.


## Version 1.8.0 verification

- `node --check server.js` — passed.
- `node --check public/app.js` — passed.
- `node --check public/guardian-consent.js` — passed.
- `node --check tests/api.test.js` — passed.
- `npm test` — 4 top-level tests passed, 0 failed. These include guardian-consent token one-time behavior, admin video moderation, privacy redaction, verified club video access, guardian account email verification, parent dashboard isolation, parent video access and consent revocation. Two additional schema/mapping tests validate explicit columns and relational constraints without requiring a live database.
- No live Resend delivery, PostgreSQL schema migration/connection/concurrency, Docker build, browser automation, external penetration test, or external load test was run in this environment.
