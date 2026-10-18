# PHARAOH TALENT 1.9.0 — Release Readiness Plan

This release strengthens preflight validation, cookie-origin checks, database readiness reporting, graceful shutdown, and CI coverage. It is **not a claim that the live service has been deployed or independently security-audited**.

## Six workstreams

1. **Backend and database:** production startup requires HTTPS, PostgreSQL, a strong `APP_SECRET`, and configured email verification. `/api/health` now checks PostgreSQL connectivity and returns `503` when the database cannot be reached. CI runs a real PostgreSQL migration/persistence round-trip against a disposable database.
2. **Accounts and authorization:** automated API tests cover registration, verification, session cookies, logout revocation, authorization boundaries, account export/deletion, duplicate applications, and privacy fields. Before release, repeat these tests against the hosted environment with synthetic accounts.
3. **Videos:** uploads are limited to MP4/WebM, 50 MiB, signature checked, stored outside the public web root, and pending admin moderation. CI/API tests cover unauthorized access, range streaming, and deletion. Production still needs real-device playback tests, malicious-file review, storage-capacity monitoring, backup/restore, and orphan-file cleanup checks.
4. **Minors and guardians:** new talent profiles default to private; public visibility requires an email-confirmed guardian consent workflow; revocation makes the profile private and removes guardian access. Email confirmation alone does not legally verify the adult's identity or relationship. Obtain local legal/privacy review before collecting real minors' information.
5. **Mobile and performance:** responsive CSS, viewport metadata, and reduced-motion behavior are checked automatically. This is a static regression check, not a substitute for browser/device testing. Manually test narrow Android/iOS screens, keyboard navigation, forms, slow networks, and large video playback.
6. **Pre-launch security:** CI syntax-checks browser/server code, runs automated tests, performs a PostgreSQL integration test, and audits production dependencies. A qualified independent security assessment, load test, live email-delivery test, and database/media restore drill remain required before launch.

## Local checks

```bash
npm install
npm test
node --check server.js
node --check public/app.js
node --check docs/app.js
```

The PostgreSQL integration test is skipped locally unless `TEST_DATABASE_URL` points to a **dedicated disposable database**. It drops the `pt_*` tables before running and must never be pointed at a production database.

## Deployment notes

- GitHub Pages at `https://kemo-777.github.io/Pharaoh-talent/` is a static preview only.
- Use the Render Blueprint for the full Node.js + PostgreSQL application, and review the current costs before provisioning resources.
- Keep frontend and API on the same origin. Do not point the Pages preview at a separately hosted API without deliberately redesigning and testing CORS, cookie, CSRF, and origin protections.
- Configure a verified Resend sender and secrets in the host's environment settings; never commit real credentials.
- Configure PostgreSQL provider backups and back up persistent media separately. Perform a restore drill before launch.
- The persistence implementation currently loads relational entities into an in-memory application state and serializes writes. Do not claim high-scale concurrency readiness without redesign/load tests.
