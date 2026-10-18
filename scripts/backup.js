'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const source = path.join(dataDir, 'db.json');
async function readSnapshot() {
  if (process.env.DATABASE_URL) {
    let Pool; try { ({ Pool } = require('pg')); } catch { throw new Error('Install dependencies first: npm install'); }
    const { migrateNormalizedSchema, loadNormalizedState } = require('../lib/relational-store');
    const pool = new Pool({ connectionString:process.env.DATABASE_URL, ssl:process.env.PGSSL==='disable'?false:(process.env.NODE_ENV==='production'?{rejectUnauthorized:process.env.PGSSL_REJECT_UNAUTHORIZED!=='false'}:undefined), connectionTimeoutMillis:10000, statement_timeout:15000 });
    try { await migrateNormalizedSchema(pool); const client=await pool.connect(); try { await client.query('SELECT pg_advisory_lock(2026101801)'); const meta=await client.query('SELECT version FROM pt_meta WHERE id=1'); if(!meta.rows.length) throw new Error('PostgreSQL database is not initialized. Start the app first.'); return Buffer.from(JSON.stringify(await loadNormalizedState(client),null,2)+'\n'); } finally { try { await client.query('SELECT pg_advisory_unlock(2026101801)'); } catch {} client.release(); } }
    finally { await pool.end(); }
  }
  if (!fs.existsSync(source)) throw new Error('No local JSON database found. Start the app first.');
  const bytes=fs.readFileSync(source); JSON.parse(bytes.toString('utf8')); return bytes;
}
async function main(){
  fs.mkdirSync(dataDir,{recursive:true,mode:0o700});const backupDir=path.join(dataDir,'backups');fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');const destination=path.join(backupDir,`db-${stamp}.json`);const bytes=await readSnapshot();JSON.parse(bytes.toString('utf8'));
  const temp=`${destination}.${crypto.randomUUID()}.tmp`;fs.writeFileSync(temp,bytes,{flag:'wx',mode:0o600});fs.renameSync(temp,destination);
  // Uploaded videos are binary files outside the database. Back them up separately and
  // preserve the directory layout; store the JSON and media directory together off-host.
  const mediaSource=path.join(dataDir,'media');
  if(fs.existsSync(mediaSource)) { const mediaDestination=path.join(backupDir,`media-${stamp}`); fs.cpSync(mediaSource,mediaDestination,{recursive:true,errorOnExist:true,force:false}); }
  console.log(`Backup created: ${destination} (${bytes.length} bytes; source=${process.env.DATABASE_URL?'postgresql-normalized':'local-json'}). Video media, if present, is in the matching media-${stamp} directory; copy both off-host.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
