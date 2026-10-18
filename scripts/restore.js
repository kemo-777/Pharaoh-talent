'use strict';
const fs=require('node:fs');const path=require('node:path');
async function main(){
 const source=process.argv[2];
 if(!source||!process.argv.includes('--confirm')){console.error('Usage: node scripts/restore.js path-to-backup.json --confirm\nWARNING: overwrites current application data. Stop the app before restoring.');process.exit(1);}
 const resolved=path.resolve(source);if(!fs.existsSync(resolved))throw new Error('Backup file not found.');const bytes=fs.readFileSync(resolved);const data=JSON.parse(bytes.toString('utf8'));
 for(const key of ['users','talents','opportunities','applications','messages','saved','reports','audit'])if(!Array.isArray(data[key]))throw new Error(`Invalid backup: missing array ${key}`);
 for(const key of ['revokedTokens','emailTokens','orgVerificationRequests','videoFiles','guardianConsentRequests','guardianLinks'])data[key] ||= [];
 const dataDir=process.env.DATA_DIR||path.join(__dirname,'..','data');fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 if(process.env.DATABASE_URL){
  let Pool;try{({Pool}=require('pg'));}catch{throw new Error('Install dependencies first: npm install');}
  const {migrateNormalizedSchema,persistNormalizedState}=require('../lib/relational-store');
  const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSL==='disable'?false:(process.env.NODE_ENV==='production'?{rejectUnauthorized:process.env.PGSSL_REJECT_UNAUTHORIZED!=='false'}:undefined),connectionTimeoutMillis:10000,statement_timeout:15000});
  try{await migrateNormalizedSchema(pool);const client=await pool.connect();try{await client.query('SELECT pg_advisory_lock(2026101801)');await client.query('BEGIN');await persistNormalizedState(client,data);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{try{await client.query('SELECT pg_advisory_unlock(2026101801)')}catch{}client.release();}}
  finally{await pool.end();}
 } else {
  const file=path.join(dataDir,'db.json'),tmp=file+'.restore.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2),{mode:0o600});fs.renameSync(tmp,file);
 }
 console.log(`Restore completed from ${resolved}. If you backed up uploaded videos, restore the matching media directory into ${path.join(dataDir,'media')} before starting the app. Verify restored data and permissions.`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
