'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

test('release version and deployment configuration are consistent', () => {
  const pkg = JSON.parse(read('package.json'));
  const server = read('server.js');
  const readme = read('README.md');
  assert.equal(pkg.version, '1.9.0');
  assert.match(server, /APP_VERSION = '1\.9\.0'/);
  assert.match(readme, /^# PHARAOH TALENT 1\.9\.0/m);
  assert.ok(fs.existsSync(path.join(root, '.env.example')), 'documented environment template exists');
  assert.match(read('render.yaml'), /healthCheckPath: \/api\/health/);
  assert.match(read('DEPLOY_RENDER.md'), /GitHub Pages is not suitable for the complete platform/);
});

test('frontend has responsive and reduced-motion foundations', () => {
  const html = read('public/index.html');
  const css = read('public/styles.css');
  assert.match(html, /name=["']viewport["']/i);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-width:\s*0/);
});

test('GitHub Pages preview uses relative asset URLs and clearly discloses static-only scope', () => {
  const html = read('docs/index.html');
  const js = read('docs/app.js');
  const notice = read('docs/PAGES_PREVIEW.md');
  assert.match(html, /href=["']\.\/styles\.css["']/);
  assert.match(html, /src=["']\.\/app\.js["']/);
  assert.match(js, /github\.io/);
  assert.match(notice, /static visual preview/i);
  assert.match(notice, /Node\.js\/Express backend/i);
});

test('production deployment refuses weak/default secrets and missing database/email configuration', () => {
  const server = read('server.js');
  assert.match(server, /production.*PUBLIC_APP_URL/i);
  assert.match(server, /Production requires DATABASE_URL/);
  assert.match(server, /EMAIL_VERIFICATION_REQUIRED=true, RESEND_API_KEY and MAIL_FROM/);
  assert.match(server, /hasSessionCookie/);
  assert.match(server, /Cookie-authenticated browser mutations must carry an origin/);
});
