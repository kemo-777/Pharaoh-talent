# PHARAOH TALENT 1.8.0 — PostgreSQL Migration Guide

## Before you upgrade

1. Stop the running application.
2. Take a PostgreSQL-native backup (`pg_dump`) and copy the `data/media` directory. The app backup command also exports a logical JSON snapshot and a media copy, but it is not a replacement for provider-native backups.
3. Restore the backup into a disposable database and test the upgrade there first.
4. Ensure the deployment has the `pg` dependency installed and that `DATABASE_URL` points to the intended database.

## What startup does

On startup, the app acquires a PostgreSQL advisory lock for schema upgrades and runs the migration in a transaction. It creates/updates the entity tables, adds missing columns for older per-entity JSONB layouts, copies each legacy payload field into typed columns, drops the old `payload` columns, and records migration versions in `pt_schema_migrations`. If the database is still on the older single-row snapshot layout and has no normalized `pt_meta` row, startup imports that legacy snapshot into the new tables.

Entities include users, talents, opportunities, applications, messages, saved items, reports, audit events, revoked tokens, email tokens, organization-verification requests, video files, guardian-consent requests, and guardian-child links. The schema uses foreign keys, uniqueness constraints, and indexes.

## After migration

- Check startup logs for `PostgreSQL persistence enabled (normalized entity tables, foreign keys, uniqueness constraints, indexes, and one-time legacy migration).`
- Compare row counts with the backup and inspect `pt_schema_migrations`.
- Test registration/login, opportunity creation/application, messages, guardian consent, parent dashboard, video access/revocation, backup, and restore.
- Test writes from at least two application processes and restart the service.

## Rollback warning

The migration drops legacy per-entity `payload` columns after backfilling. Do not attempt a schema-only rollback. Restore the pre-upgrade database backup into a separate database and point the previous release to that restored database. Keep the original backup until post-upgrade validation is complete.

## Verification limitation

This package was syntax-checked and its local JSON-backed API suite passed, but this build environment did not provide a live PostgreSQL server or Docker engine. The migration has **not** been executed against a real PostgreSQL instance here. Treat a disposable-database migration test as mandatory before production.
