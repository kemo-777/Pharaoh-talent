'use strict';

// The application keeps a short-lived in-memory view for its current route handlers,
// but PostgreSQL persistence is per-entity and column-based. JSON snapshot payloads
// from older releases are migrated once and then dropped from the relational tables.
const NORMALIZED_TABLES = [
  { key:'users', table:'pt_users', id:x=>x.id, columns:['email','role','status','name','password_salt','password_hash','email_verified','auth_version','verified','created_at'], values:x=>[x.email,x.role,x.status||'active',x.name,x.passwordSalt,x.passwordHash,x.emailVerified===true,Number(x.authVersion||0),x.verified===true,x.createdAt||null], decode:r=>({id:r.id,email:r.email,role:r.role,status:r.status,name:r.name,passwordSalt:r.password_salt,passwordHash:r.password_hash,emailVerified:r.email_verified,authVersion:Number(r.auth_version||0),verified:r.verified,createdAt:iso(r.created_at)||''}), order:10 },
  { key:'talents', table:'pt_talents', id:x=>x.id, columns:['user_id','name','headline','category','location','bio','skills','achievements','portfolio_url','video_url','video_id','guardian_approved','guardian_consent_status','guardian_email','guardian_consent_email','guardian_consent_at','guardian_consent_revoked_at','guardian_consent_revoked_by','external_video_moderation_status','visibility','verified','created_at','updated_at','reviewed_at','reviewed_by','review_note'], values:x=>[x.userId||null,x.name||'',x.headline||'',x.category||'أخرى',x.location||'',x.bio||'',array(x.skills),array(x.achievements),x.portfolioUrl||'',x.videoUrl||'',x.videoId||'',x.guardianApproved===true,x.guardianConsentStatus||'',x.guardianEmail||'',x.guardianConsentEmail||'',x.guardianConsentAt||null,x.guardianConsentRevokedAt||null,x.guardianConsentRevokedBy||null,x.externalVideoModerationStatus||'',x.visibility||'private',x.verified===true,x.createdAt||null,x.updatedAt||null,x.reviewedAt||null,x.reviewedBy||null,x.reviewNote||''], decode:r=>({id:r.id,userId:r.user_id,name:r.name,headline:r.headline,category:r.category,location:r.location,bio:r.bio,skills:array(r.skills),achievements:array(r.achievements),portfolioUrl:r.portfolio_url||'',videoUrl:r.video_url||'',videoId:r.video_id||'',guardianApproved:r.guardian_approved===true,guardianConsentStatus:r.guardian_consent_status||'',guardianEmail:r.guardian_email||'',guardianConsentEmail:r.guardian_consent_email||'',guardianConsentAt:iso(r.guardian_consent_at),guardianConsentRevokedAt:iso(r.guardian_consent_revoked_at),guardianConsentRevokedBy:r.guardian_consent_revoked_by||'',externalVideoModerationStatus:r.external_video_moderation_status||'',visibility:r.visibility||'private',verified:r.verified===true,createdAt:iso(r.created_at)||'',updatedAt:iso(r.updated_at)||'',reviewedAt:iso(r.reviewed_at),reviewedBy:r.reviewed_by||'',reviewNote:r.review_note||''}), order:20 },
  { key:'opportunities', table:'pt_opportunities', id:x=>x.id, columns:['owner_id','organization','title','category','type','location','description','skills','age_min','age_max','deadline','status','created_at'], values:x=>[x.ownerId||null,x.organization||'',x.title||'',x.category||'أخرى',x.type||'فرصة',x.location||'',x.description||'',array(x.skills),intOrNull(x.ageMin),intOrNull(x.ageMax),dateOrNull(x.deadline),x.status||'open',x.createdAt||null], decode:r=>({id:r.id,ownerId:r.owner_id,organization:r.organization,title:r.title,category:r.category,type:r.type,location:r.location,description:r.description,skills:array(r.skills),ageMin:r.age_min===null?null:Number(r.age_min),ageMax:r.age_max===null?null:Number(r.age_max),deadline:dateOnly(r.deadline),status:r.status,createdAt:iso(r.created_at)||''}), order:30 },
  { key:'applications', table:'pt_applications', id:x=>x.id, columns:['opportunity_id','talent_user_id','cover_letter','status','created_at','updated_at'], values:x=>[x.opportunityId,x.talentUserId,x.coverLetter||'',x.status||'submitted',x.createdAt||null,x.updatedAt||null], decode:r=>({id:r.id,opportunityId:r.opportunity_id,talentUserId:r.talent_user_id,coverLetter:r.cover_letter||'',status:r.status,createdAt:iso(r.created_at)||'',updatedAt:iso(r.updated_at)||''}), order:40 },
  { key:'messages', table:'pt_messages', id:x=>x.id, columns:['from_id','to_id','message','created_at','read'], values:x=>[x.fromId,x.toId,x.message||'',x.createdAt||null,x.read===true], decode:r=>({id:r.id,fromId:r.from_id,toId:r.to_id,message:r.message,createdAt:iso(r.created_at)||'',read:r.read===true}), order:50 },
  { key:'saved', table:'pt_saved', id:x=>x.id, columns:['user_id','kind','target_id','created_at'], values:x=>[x.userId,x.kind,x.targetId,x.createdAt||null], decode:r=>({id:r.id,userId:r.user_id,kind:r.kind,targetId:r.target_id,createdAt:iso(r.created_at)||''}), order:60 },
  { key:'reports', table:'pt_reports', id:x=>x.id, columns:['reporter_id','target_type','target_id','reason','details','status','created_at','reviewed_at','reviewed_by'], values:x=>[x.reporterId||null,x.targetType,x.targetId,x.reason||'',x.details||'',x.status||'open',x.createdAt||null,x.reviewedAt||null,x.reviewedBy||null], decode:r=>({id:r.id,reporterId:r.reporter_id,targetType:r.target_type,targetId:r.target_id,reason:r.reason,details:r.details,status:r.status,createdAt:iso(r.created_at)||'',reviewedAt:iso(r.reviewed_at),reviewedBy:r.reviewed_by||null}), order:70 },
  { key:'audit', table:'pt_audit', id:x=>x.id, columns:['actor_id','action','target_id','created_at'], values:x=>[x.actorId||null,x.action,x.targetId||null,x.at||null], decode:r=>({id:r.id,actorId:r.actor_id,action:r.action,targetId:r.target_id,at:iso(r.created_at)}), order:80 },
  { key:'revokedTokens', table:'pt_revoked_tokens', keyColumn:'digest', id:x=>typeof x==='string'?x:x.digest, columns:['revoked_at'], values:x=>[typeof x==='string'?null:x.revokedAt||null], decode:r=>({digest:r.digest,revokedAt:iso(r.revoked_at)}), order:90 },
  { key:'emailTokens', table:'pt_email_tokens', keyColumn:'digest', id:x=>x.digest, columns:['user_id','purpose','expires_at','created_at'], values:x=>[x.userId,x.purpose,new Date(Number(x.expiresAt)).toISOString(),x.createdAt||null], decode:r=>({digest:r.digest,userId:r.user_id,purpose:r.purpose,expiresAt:Date.parse(iso(r.expires_at)),createdAt:iso(r.created_at)||''}), order:100 },
  { key:'orgVerificationRequests', table:'pt_org_verification_requests', id:x=>x.id, columns:['user_id','legal_name','website','details','proof_url','status','created_at','reviewed_at','reviewed_by','review_note'], values:x=>[x.userId,x.legalName||'',x.website||'',x.details||'',x.proofUrl||'',x.status||'pending',x.createdAt||null,x.reviewedAt||null,x.reviewedBy||null,x.reviewNote||''], decode:r=>({id:r.id,userId:r.user_id,legalName:r.legal_name,website:r.website||'',details:r.details||'',proofUrl:r.proof_url||'',status:r.status,createdAt:iso(r.created_at)||'',reviewedAt:iso(r.reviewed_at),reviewedBy:r.reviewed_by||null,reviewNote:r.review_note||''}), order:110 },
  { key:'videoFiles', table:'pt_video_files', id:x=>x.id, columns:['user_id','storage_name','mime_type','size_bytes','moderation_status','created_at'], values:x=>[x.userId,x.storageName,x.mimeType,Number(x.size||0),x.moderationStatus||'pending',x.createdAt||null], decode:r=>({id:r.id,userId:r.user_id,storageName:r.storage_name,mimeType:r.mime_type,size:Number(r.size_bytes||0),moderationStatus:r.moderation_status,createdAt:iso(r.created_at)||''}), order:120 },
  { key:'guardianConsentRequests', table:'pt_guardian_consent_requests', id:x=>x.id, columns:['user_id','guardian_email','status','created_at','expires_at','approved_at'], values:x=>[x.userId,x.guardianEmail,x.status||'pending',x.createdAt||null,x.expiresAt?new Date(Number(x.expiresAt)).toISOString():null,x.approvedAt||null], decode:r=>({id:r.id,userId:r.user_id,guardianEmail:r.guardian_email,status:r.status,createdAt:iso(r.created_at)||'',expiresAt:r.expires_at?Date.parse(iso(r.expires_at)):0,approvedAt:iso(r.approved_at)}), order:130 },
  { key:'guardianLinks', table:'pt_guardian_links', id:x=>x.id, columns:['guardian_user_id','talent_user_id','guardian_email','status','consent_at','created_at','revoked_at'], values:x=>[x.guardianUserId||null,x.talentUserId,x.guardianEmail,x.status||'active',x.consentAt||null,x.createdAt||null,x.revokedAt||null], decode:r=>({id:r.id,guardianUserId:r.guardian_user_id,talentUserId:r.talent_user_id,guardianEmail:r.guardian_email,status:r.status,consentAt:iso(r.consent_at),createdAt:iso(r.created_at)||'',revokedAt:iso(r.revoked_at)}), order:140 }
];
function array(v){return Array.isArray(v)?v:[];}
function intOrNull(v){return Number.isInteger(v)?v:null;}
function dateOrNull(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:null;}
function iso(v){if(!v)return null;const d=v instanceof Date?v:new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();}
function dateOnly(v){if(!v)return '';return v instanceof Date?v.toISOString().slice(0,10):String(v).slice(0,10);}
const TABLE_COLUMNS = {
  pt_users:{name:'TEXT',password_salt:'TEXT',password_hash:'TEXT',email_verified:'BOOLEAN NOT NULL DEFAULT FALSE',auth_version:'INTEGER NOT NULL DEFAULT 0',verified:'BOOLEAN NOT NULL DEFAULT FALSE',created_at:'TIMESTAMPTZ'},
  pt_talents:{name:'TEXT NOT NULL DEFAULT \'\'',headline:'TEXT NOT NULL DEFAULT \'\'',location:'TEXT NOT NULL DEFAULT \'\'',bio:'TEXT NOT NULL DEFAULT \'\'',skills:'TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',achievements:'TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',portfolio_url:'TEXT NOT NULL DEFAULT \'\'',video_url:'TEXT NOT NULL DEFAULT \'\'',video_id:'TEXT NOT NULL DEFAULT \'\'',guardian_approved:'BOOLEAN NOT NULL DEFAULT FALSE',guardian_consent_status:'TEXT NOT NULL DEFAULT \'\'',guardian_email:'TEXT NOT NULL DEFAULT \'\'',guardian_consent_email:'TEXT NOT NULL DEFAULT \'\'',guardian_consent_at:'TIMESTAMPTZ',guardian_consent_revoked_at:'TIMESTAMPTZ',guardian_consent_revoked_by:'TEXT',external_video_moderation_status:'TEXT NOT NULL DEFAULT \'\'',verified:'BOOLEAN NOT NULL DEFAULT FALSE',created_at:'TIMESTAMPTZ',updated_at:'TIMESTAMPTZ',reviewed_at:'TIMESTAMPTZ',reviewed_by:'TEXT',review_note:'TEXT NOT NULL DEFAULT \'\''},
  pt_opportunities:{organization:'TEXT NOT NULL DEFAULT \'\'',title:'TEXT NOT NULL DEFAULT \'\'',category:'TEXT NOT NULL DEFAULT \'أخرى\'',type:'TEXT NOT NULL DEFAULT \'فرصة\'',location:'TEXT NOT NULL DEFAULT \'\'',description:'TEXT NOT NULL DEFAULT \'\'',skills:'TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]',age_min:'INTEGER',age_max:'INTEGER',created_at:'TIMESTAMPTZ'},
  pt_applications:{cover_letter:'TEXT NOT NULL DEFAULT \'\'',created_at:'TIMESTAMPTZ',updated_at:'TIMESTAMPTZ'},
  pt_messages:{message:'TEXT NOT NULL DEFAULT \'\'',created_at:'TIMESTAMPTZ',read:'BOOLEAN NOT NULL DEFAULT FALSE'},
  pt_saved:{created_at:'TIMESTAMPTZ'},
  pt_reports:{reason:'TEXT NOT NULL DEFAULT \'\'',details:'TEXT NOT NULL DEFAULT \'\'',created_at:'TIMESTAMPTZ',reviewed_at:'TIMESTAMPTZ',reviewed_by:'TEXT'},
  pt_audit:{created_at:'TIMESTAMPTZ'},
  pt_revoked_tokens:{revoked_at:'TIMESTAMPTZ'},
  pt_email_tokens:{created_at:'TIMESTAMPTZ'},
  pt_org_verification_requests:{legal_name:'TEXT NOT NULL DEFAULT \'\'',website:'TEXT NOT NULL DEFAULT \'\'',details:'TEXT NOT NULL DEFAULT \'\'',proof_url:'TEXT NOT NULL DEFAULT \'\'',created_at:'TIMESTAMPTZ',reviewed_at:'TIMESTAMPTZ',reviewed_by:'TEXT',review_note:'TEXT NOT NULL DEFAULT \'\''},
  pt_video_files:{mime_type:'TEXT NOT NULL DEFAULT \'video/mp4\'',size_bytes:'BIGINT NOT NULL DEFAULT 0',created_at:'TIMESTAMPTZ'},
  pt_guardian_consent_requests:{created_at:'TIMESTAMPTZ',approved_at:'TIMESTAMPTZ'},
  pt_guardian_links:{created_at:'TIMESTAMPTZ',revoked_at:'TIMESTAMPTZ'}
};
const NORMALIZED_SCHEMA_SQL = [
 `CREATE TABLE IF NOT EXISTS pt_schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS pt_meta (id SMALLINT PRIMARY KEY CHECK (id=1), version BIGINT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
 `CREATE TABLE IF NOT EXISTS pt_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,role TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',name TEXT,password_salt TEXT,password_hash TEXT,email_verified BOOLEAN NOT NULL DEFAULT FALSE,auth_version INTEGER NOT NULL DEFAULT 0,verified BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ)`,
 `CREATE TABLE IF NOT EXISTS pt_talents (id TEXT PRIMARY KEY,user_id TEXT UNIQUE REFERENCES pt_users(id) ON DELETE SET NULL,visibility TEXT NOT NULL DEFAULT 'private',category TEXT NOT NULL DEFAULT 'أخرى',name TEXT NOT NULL DEFAULT '',headline TEXT NOT NULL DEFAULT '',location TEXT NOT NULL DEFAULT '',bio TEXT NOT NULL DEFAULT '',skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],achievements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],portfolio_url TEXT NOT NULL DEFAULT '',video_url TEXT NOT NULL DEFAULT '',video_id TEXT NOT NULL DEFAULT '',guardian_approved BOOLEAN NOT NULL DEFAULT FALSE,guardian_consent_status TEXT NOT NULL DEFAULT '',guardian_email TEXT NOT NULL DEFAULT '',guardian_consent_email TEXT NOT NULL DEFAULT '',guardian_consent_at TIMESTAMPTZ,guardian_consent_revoked_at TIMESTAMPTZ,guardian_consent_revoked_by TEXT,external_video_moderation_status TEXT NOT NULL DEFAULT '',verified BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,reviewed_at TIMESTAMPTZ,reviewed_by TEXT,review_note TEXT NOT NULL DEFAULT '')`,
 `CREATE TABLE IF NOT EXISTS pt_opportunities (id TEXT PRIMARY KEY,owner_id TEXT REFERENCES pt_users(id) ON DELETE SET NULL,organization TEXT NOT NULL DEFAULT '',title TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT 'أخرى',type TEXT NOT NULL DEFAULT 'فرصة',location TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],age_min INTEGER,age_max INTEGER,deadline DATE,status TEXT,created_at TIMESTAMPTZ)`,
 `CREATE TABLE IF NOT EXISTS pt_applications (id TEXT PRIMARY KEY,opportunity_id TEXT NOT NULL REFERENCES pt_opportunities(id) ON DELETE CASCADE,talent_user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,cover_letter TEXT NOT NULL DEFAULT '',status TEXT,created_at TIMESTAMPTZ,updated_at TIMESTAMPTZ,UNIQUE(talent_user_id,opportunity_id))`,
 `CREATE TABLE IF NOT EXISTS pt_messages (id TEXT PRIMARY KEY,from_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,to_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,message TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ,read BOOLEAN NOT NULL DEFAULT FALSE)`,
 `CREATE TABLE IF NOT EXISTS pt_saved (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,kind TEXT NOT NULL,target_id TEXT NOT NULL,created_at TIMESTAMPTZ,UNIQUE(user_id,kind,target_id))`,
 `CREATE TABLE IF NOT EXISTS pt_reports (id TEXT PRIMARY KEY,reporter_id TEXT REFERENCES pt_users(id) ON DELETE SET NULL,target_type TEXT NOT NULL,target_id TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',details TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open',created_at TIMESTAMPTZ,reviewed_at TIMESTAMPTZ,reviewed_by TEXT)`,
 `CREATE TABLE IF NOT EXISTS pt_audit (id TEXT PRIMARY KEY,actor_id TEXT REFERENCES pt_users(id) ON DELETE SET NULL,action TEXT NOT NULL,target_id TEXT,created_at TIMESTAMPTZ NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS pt_revoked_tokens (digest TEXT PRIMARY KEY,revoked_at TIMESTAMPTZ)`,
 `CREATE TABLE IF NOT EXISTS pt_email_tokens (digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,purpose TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ)`,
 `CREATE TABLE IF NOT EXISTS pt_org_verification_requests (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,legal_name TEXT NOT NULL DEFAULT '',website TEXT NOT NULL DEFAULT '',details TEXT NOT NULL DEFAULT '',proof_url TEXT NOT NULL DEFAULT '',status TEXT NOT NULL,created_at TIMESTAMPTZ,reviewed_at TIMESTAMPTZ,reviewed_by TEXT,review_note TEXT NOT NULL DEFAULT '')`,
 `CREATE TABLE IF NOT EXISTS pt_video_files (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,storage_name TEXT NOT NULL UNIQUE,mime_type TEXT NOT NULL DEFAULT 'video/mp4',size_bytes BIGINT NOT NULL DEFAULT 0,moderation_status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ)`,
 `CREATE TABLE IF NOT EXISTS pt_guardian_consent_requests (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,guardian_email TEXT NOT NULL,status TEXT NOT NULL,created_at TIMESTAMPTZ,expires_at TIMESTAMPTZ,approved_at TIMESTAMPTZ)`,
 `CREATE TABLE IF NOT EXISTS pt_guardian_links (id TEXT PRIMARY KEY,guardian_user_id TEXT REFERENCES pt_users(id) ON DELETE SET NULL,talent_user_id TEXT NOT NULL REFERENCES pt_users(id) ON DELETE CASCADE,guardian_email TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',consent_at TIMESTAMPTZ,created_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ)`,
 `CREATE INDEX IF NOT EXISTS pt_talents_public_category_idx ON pt_talents (visibility,category)`,
 `CREATE INDEX IF NOT EXISTS pt_opportunities_status_deadline_idx ON pt_opportunities (status,deadline)`,
 `CREATE INDEX IF NOT EXISTS pt_applications_owner_idx ON pt_applications (talent_user_id,created_at DESC)`,
 `CREATE INDEX IF NOT EXISTS pt_messages_inbox_idx ON pt_messages (to_id,created_at DESC)`,
 `CREATE INDEX IF NOT EXISTS pt_messages_outbox_idx ON pt_messages (from_id,created_at DESC)`,
 `CREATE INDEX IF NOT EXISTS pt_reports_status_idx ON pt_reports (status)`,
 `CREATE INDEX IF NOT EXISTS pt_email_tokens_expiry_idx ON pt_email_tokens (expires_at)`,
 `CREATE INDEX IF NOT EXISTS pt_video_moderation_idx ON pt_video_files (moderation_status)`,
 `CREATE INDEX IF NOT EXISTS pt_guardian_links_email_status_idx ON pt_guardian_links (guardian_email,status)`,
 `CREATE INDEX IF NOT EXISTS pt_guardian_links_talent_status_idx ON pt_guardian_links (talent_user_id,status)`
];

async function hasColumn(client, table, column) {
 const r=await client.query('SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND column_name=$2',[table,column]); return r.rowCount>0;
}
async function ensureNormalizedSchema(client) {
 for (const sql of NORMALIZED_SCHEMA_SQL) await client.query(sql);
 // Expand tables from the prior JSONB-payload schema, if this is an upgrade.
 for (const [table, columns] of Object.entries(TABLE_COLUMNS)) for (const [column, type] of Object.entries(columns)) await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
 // One-time payload-to-columns migration. New writes never use JSONB payloads.
 for (const spec of NORMALIZED_TABLES) {
   if (!await hasColumn(client,spec.table,'payload')) continue;
   const result=await client.query(`SELECT ${spec.keyColumn||'id'} AS row_key,payload FROM ${spec.table} WHERE payload IS NOT NULL`);
   for (const row of result.rows) {
     const item=row.payload; if(!item || typeof item!=='object') continue;
     const values=spec.values(item); const assignments=[]; const params=[row.row_key];
     for(let i=0;i<spec.columns.length;i++) { const col=spec.columns[i]; const value=values[i]; if(value===undefined)continue; assignments.push(`${col}=$${params.length+1}`); params.push(value); }
     if(assignments.length) await client.query(`UPDATE ${spec.table} SET ${assignments.join(',')} WHERE ${spec.keyColumn||'id'}=$1`,params);
   }
   await client.query(`ALTER TABLE ${spec.table} DROP COLUMN payload`);
 }
 // Older iterations could leave duplicate active link rows; keep the newest active relationship before enforcing uniqueness.
 await client.query(`WITH ranked AS (SELECT id,ROW_NUMBER() OVER (PARTITION BY guardian_email,talent_user_id ORDER BY consent_at DESC NULLS LAST,created_at DESC NULLS LAST,id) AS rn FROM pt_guardian_links WHERE status='active') UPDATE pt_guardian_links AS link SET status='revoked',revoked_at=COALESCE(link.revoked_at,NOW()) FROM ranked WHERE link.id=ranked.id AND ranked.rn>1`);
 await client.query("CREATE UNIQUE INDEX IF NOT EXISTS pt_guardian_links_one_active_idx ON pt_guardian_links (guardian_email,talent_user_id) WHERE status='active'");
 await client.query("INSERT INTO pt_schema_migrations (version,name) VALUES (1,'normalized_entity_tables') ON CONFLICT (version) DO NOTHING");
 await client.query("INSERT INTO pt_schema_migrations (version,name) VALUES (2,'guardian_accounts_and_links') ON CONFLICT (version) DO NOTHING");
 await client.query("INSERT INTO pt_schema_migrations (version,name) VALUES (3,'column_normalized_entity_storage') ON CONFLICT (version) DO NOTHING");
}
async function loadNormalizedState(client) {
 const next={version:1};
 for (const spec of NORMALIZED_TABLES) { const columns=[spec.keyColumn||'id',...spec.columns]; const result=await client.query(`SELECT ${columns.join(',')} FROM ${spec.table}`); next[spec.key]=result.rows.map(row=>spec.decode(row)); }
 next.guardianConsentRequests ||= []; next.guardianLinks ||= []; return next;
}
async function persistNormalizedState(client,state) {
 const ordered=[...NORMALIZED_TABLES].sort((a,b)=>a.order-b.order);
 for(const spec of ordered) {
  const rows=Array.isArray(state[spec.key])?state[spec.key]:[];
  for(const item of rows) {
   const id=spec.id(item); if(typeof id!=='string'||!id)throw new Error(`Invalid ${spec.key} record key`);
   const keyColumn=spec.keyColumn||'id', cols=[keyColumn,...spec.columns], vals=[id,...spec.values(item)];
   const placeholders=vals.map((_,i)=>`$${i+1}`);
   const updates=cols.slice(1).map(c=>`${c}=EXCLUDED.${c}`).join(',');
   await client.query(`INSERT INTO ${spec.table} (${cols.join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT (${keyColumn}) DO UPDATE SET ${updates}`,vals);
  }
 }
 for(const spec of [...ordered].reverse()) {
  const ids=(Array.isArray(state[spec.key])?state[spec.key]:[]).map(spec.id).filter(x=>typeof x==='string'&&x);
  await client.query(`DELETE FROM ${spec.table} WHERE NOT (${spec.keyColumn||'id'} = ANY($1::text[]))`,[ids]);
 }
 const result=await client.query('INSERT INTO pt_meta (id,version,updated_at) VALUES (1,1,NOW()) ON CONFLICT (id) DO UPDATE SET version=pt_meta.version+1,updated_at=NOW() RETURNING version');
 return Number(result.rows[0].version);
}

async function migrateNormalizedSchema(pool) {
 const client=await pool.connect();
 try {
  await client.query('SELECT pg_advisory_lock(2026101800)');
  await client.query('BEGIN');
  await ensureNormalizedSchema(client);
  await client.query('COMMIT');
 } catch(e) {
  try { await client.query('ROLLBACK'); } catch {}
  throw e;
 } finally {
  try { await client.query('SELECT pg_advisory_unlock(2026101800)'); } catch {}
  client.release();
 }
}
module.exports={NORMALIZED_TABLES,NORMALIZED_SCHEMA_SQL,TABLE_COLUMNS,loadNormalizedState,persistNormalizedState,ensureNormalizedSchema,migrateNormalizedSchema};
