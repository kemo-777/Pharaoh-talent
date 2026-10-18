'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { migrateNormalizedSchema, persistNormalizedState, loadNormalizedState } = require('../lib/relational-store');

const connectionString = process.env.TEST_DATABASE_URL;
test('PostgreSQL migrations and normalized persistence round-trip', { skip: !connectionString && 'Set TEST_DATABASE_URL to run PostgreSQL integration checks' }, async (t) => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString, ssl: process.env.TEST_PGSSL === 'disable' ? false : undefined, max: 2, connectionTimeoutMillis: 5000 });
  t.after(async () => { await pool.end(); });
  // This test requires a dedicated disposable database. CI provisions one for this job.
  await pool.query(`DROP TABLE IF EXISTS pt_guardian_links,pt_guardian_consent_requests,pt_video_files,pt_org_verification_requests,pt_email_tokens,pt_revoked_tokens,pt_audit,pt_reports,pt_saved,pt_messages,pt_applications,pt_opportunities,pt_talents,pt_users,pt_meta,pt_schema_migrations CASCADE`);
  await migrateNormalizedSchema(pool);
  const now = new Date().toISOString();
  const userId = `integration-${crypto.randomUUID()}`;
  const talentId = `talent-${crypto.randomUUID()}`;
  const state = {
    version: 1,
    users: [{ id: userId, email: `${userId}@example.test`, role: 'talent', status: 'active', name: 'Integration Test', passwordSalt: 'salt', passwordHash: 'hash', emailVerified: true, authVersion: 0, verified: false, createdAt: now }],
    talents: [{ id: talentId, userId, name: 'Synthetic Test Talent', headline: 'Testing', category: 'Technology', location: '', bio: '', skills: ['Node.js'], achievements: [], portfolioUrl: '', videoUrl: '', videoId: '', guardianApproved: false, guardianConsentStatus: '', guardianEmail: '', guardianConsentEmail: '', visibility: 'private', verified: false, createdAt: now }],
    opportunities: [], applications: [], messages: [], saved: [], reports: [], audit: [], revokedTokens: [], emailTokens: [], orgVerificationRequests: [], videoFiles: [], guardianConsentRequests: [], guardianLinks: []
  };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await persistNormalizedState(client, state);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  const loaded = await loadNormalizedState(pool);
  assert.equal(loaded.users.length, 1);
  assert.equal(loaded.users[0].id, userId);
  assert.equal(loaded.talents.length, 1);
  assert.equal(loaded.talents[0].userId, userId);
  assert.deepEqual(loaded.talents[0].skills, ['Node.js']);
  const version = await pool.query('SELECT version FROM pt_meta WHERE id=1');
  assert.ok(Number(version.rows[0].version) >= 1);
});
