# PHARAOH TALENT — Render deployment guide

This repository contains a Render Blueprint (`render.yaml`) for the full Node.js API + PostgreSQL app. GitHub Pages is not suitable for the complete platform because it cannot run this backend or database.

## Before deploying

1. Review Render's current service/database/disk pricing and availability. The Blueprint uses paid resources, including a persistent disk for uploaded videos. Do not apply it without reviewing the bill estimate.
2. Push this folder to a private GitHub repository first. Do not commit `.env`, credentials, database dumps, or real user/video data.
3. In Render, create a new Blueprint from the repository and inspect every resource and environment variable before confirming.
4. Set `RESEND_API_KEY` and `MAIL_FROM` when prompted. `MAIL_FROM` must use a sender/domain verified with Resend. Email verification is mandatory in production; the app should refuse to start if these are missing.
5. Confirm the public service URL matches `PUBLIC_APP_URL`. If you use a custom domain, update the variable to its HTTPS origin and redeploy.
6. Confirm `DATABASE_URL` points to the managed PostgreSQL database and TLS validation remains enabled. Do not switch off certificate validation to work around connection errors.
7. After deployment, check `/api/health`, register a test account using an email you control, confirm delivery/verification, sign in, and test guardian isolation with synthetic test accounts.
8. Configure provider-native database backups and run a restore drill before storing real data. The disk holds uploaded media; database backups alone do not back up videos.

## Important application limits

- `TRUST_PROXY=true` is configured for the Render proxy. Only use this setting when the app is behind a trusted hosting proxy.
- Current rate limits are process-local and are not distributed across multiple app instances.
- The current persistence layer loads the normalized PostgreSQL entities into memory and serializes writes. It is not yet designed or load-tested for large-scale/high-concurrency use.
- The persistent disk is a single-instance design. Do not scale the web service horizontally while using local disk video storage.
- The consent email flow is not legal verification of guardian identity or relationship. Obtain appropriate legal/privacy review before launching a service for minors.
- Do not claim the app is secure or production-ready until live PostgreSQL migration/concurrency/backup-restore tests, email delivery tests, browser/device tests, and independent security/load tests pass.

## Local preflight

```bash
npm install
npm test
node --check server.js
node --check public/app.js
```

The deployment is not considered live merely because the Blueprint file exists. It becomes live only after the provider successfully creates the resources and the post-deployment checks pass.
