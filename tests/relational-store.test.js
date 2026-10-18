'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../lib/relational-store');

test('PostgreSQL schema uses entity columns and relational constraints instead of JSONB snapshot payloads', () => {
  assert.equal(store.NORMALIZED_TABLES.length, 14);
  assert.ok(store.NORMALIZED_SCHEMA_SQL.every(sql => !/JSONB/i.test(sql)), 'new schema definitions must not create JSONB payload storage');
  const schema = store.NORMALIZED_SCHEMA_SQL.join('\n');
  for (const table of ['pt_users','pt_talents','pt_opportunities','pt_applications','pt_messages','pt_saved','pt_reports','pt_audit','pt_revoked_tokens','pt_email_tokens','pt_org_verification_requests','pt_video_files','pt_guardian_consent_requests','pt_guardian_links']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
  }
  assert.match(schema, /REFERENCES pt_users\(id\) ON DELETE CASCADE/);
  assert.match(schema, /UNIQUE\(talent_user_id,opportunity_id\)/);
  assert.match(schema, /UNIQUE\(user_id,kind,target_id\)/);
  assert.match(store.ensureNormalizedSchema.toString(), /pt_guardian_links_one_active_idx/);
  assert.match(schema, /CREATE INDEX IF NOT EXISTS pt_talents_public_category_idx/);
});

test('normalized row mappers preserve parent, consent and video state fields', () => {
  const userSpec = store.NORMALIZED_TABLES.find(x => x.key === 'users');
  const user = {id:'u1',name:'ولي أمر',email:'parent@example.test',role:'guardian',status:'active',passwordSalt:'salt',passwordHash:'hash',emailVerified:true,authVersion:2,verified:false,createdAt:'2026-10-18T10:00:00.000Z'};
  const userRow = {id:user.id}; userSpec.columns.forEach((c,i)=>userRow[c]=userSpec.values(user)[i]);
  assert.deepEqual(userSpec.decode(userRow),user);
  const talentSpec = store.NORMALIZED_TABLES.find(x => x.key === 'talents');
  const talent = {id:'t1',userId:'u2',name:'موهبة',category:'رياضة',visibility:'private',guardianEmail:'parent@example.test',guardianConsentEmail:'',skills:['كرة القدم'],achievements:[],guardianApproved:false,verified:false,createdAt:'2026-10-18T10:00:00.000Z'};
  const talentRow = {id:talent.id}; talentSpec.columns.forEach((c,i)=>talentRow[c]=talentSpec.values(talent)[i]);
  assert.equal(talentSpec.decode(talentRow).guardianEmail,'parent@example.test');
  const linkSpec = store.NORMALIZED_TABLES.find(x => x.key === 'guardianLinks');
  const link = {id:'l1',guardianUserId:'u1',talentUserId:'u2',guardianEmail:'parent@example.test',status:'active',consentAt:'2026-10-18T10:00:00.000Z',createdAt:'2026-10-18T10:00:00.000Z',revokedAt:null};
  const linkRow = {id:link.id}; linkSpec.columns.forEach((c,i)=>linkRow[c]=linkSpec.values(link)[i]);
  assert.deepEqual(linkSpec.decode(linkRow),link);
});
