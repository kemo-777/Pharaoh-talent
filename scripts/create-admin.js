'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const file = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'db.json');
const [emailArg, passwordArg, nameArg = 'مدير المنصة'] = process.argv.slice(2);
async function main() {
  if (!emailArg || !passwordArg) { console.error('Usage: node scripts/create-admin.js admin@example.com StrongPass123456 "Admin Name"'); process.exit(1); }
  const email = emailArg.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email.');
  if (passwordArg.length < 14 || !/[A-Za-z]/.test(passwordArg) || !/[0-9]/.test(passwordArg)) throw new Error('Admin password must be at least 14 chars with letters and numbers.');
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(passwordArg, salt, 64).toString('hex');
  const admin = { id: crypto.randomUUID(), name: String(nameArg).slice(0, 100), email, role: 'admin', passwordSalt: salt, passwordHash, status: 'active', emailVerified: true, verified: false, authVersion: 0, createdAt: new Date().toISOString() };
  if (process.env.DATABASE_URL) {
    let Pool; try { ({ Pool } = require('pg')); } catch { throw new Error('Install dependencies first: npm install'); }
    const { migrateNormalizedSchema } = require('../lib/relational-store');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'disable' ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : undefined), connectionTimeoutMillis:10000, statement_timeout:15000 });
    try {
      await migrateNormalizedSchema(pool);
      const client = await pool.connect();
      try {
        await client.query('SELECT pg_advisory_lock(2026101801)');
        await client.query('BEGIN');
        const existing = await client.query('SELECT id FROM pt_users WHERE email=$1', [email]);
        if (existing.rowCount) throw new Error('This email already exists.');
        await client.query('INSERT INTO pt_users (id,email,role,status,name,password_salt,password_hash,email_verified,auth_version,verified,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [admin.id,admin.email,admin.role,admin.status,admin.name,admin.passwordSalt,admin.passwordHash,admin.emailVerified,admin.authVersion,admin.verified,admin.createdAt]);
        await client.query('INSERT INTO pt_meta (id,version,updated_at) VALUES (1,1,NOW()) ON CONFLICT (id) DO UPDATE SET version=pt_meta.version+1,updated_at=NOW()');
        await client.query('COMMIT');
      } catch (e) { try { await client.query('ROLLBACK'); } catch {} throw e; }
      finally { try { await client.query('SELECT pg_advisory_unlock(2026101801)'); } catch {} client.release(); }
    } finally { await pool.end(); }
  } else {
    if (!fs.existsSync(file)) throw new Error('Database not found. Start the app once, then run this command.');
    const db = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (db.users.some(u => u.email === email)) throw new Error('This email already exists.');
    db.users.push(admin); const tmp=file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600}); fs.renameSync(tmp,file);
  }
  console.log('Admin account created. Keep the credentials private.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
