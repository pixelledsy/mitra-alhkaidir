// Fungsi bersama untuk API (login, sesi, penyimpanan berita di Redis/Upstash)
const crypto = require('crypto');

const DB_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const DB_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
// Akun utama. Disarankan mengganti lewat Environment Variables di Vercel (lihat PANDUAN-ADMIN.md).
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || 'mitraalkhaidir';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('mak|' + USER + '|' + PASS).digest('hex');
const COOKIE = 'mak_session';
const TTL = 60 * 60 * 12; // sesi 12 jam

const hasDB = () => !!(DB_URL && DB_TOKEN);

async function redis(...cmd) {
  const r = await fetch(DB_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + DB_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'redis ' + r.status);
  return j.result;
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const sign = (d) => crypto.createHmac('sha256', SECRET).update(d).digest('base64url');

function makeToken() {
  const p = Buffer.from(JSON.stringify({ u: USER, exp: Date.now() + TTL * 1000 })).toString('base64url');
  return p + '.' + sign(p);
}
function readToken(t) {
  if (!t || t.indexOf('.') < 0) return null;
  const [p, s] = t.split('.');
  const a = Buffer.from(s), b = Buffer.from(sign(p));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o : null; }
  catch (e) { return null; }
}
function cookies(req) {
  const o = {};
  (req.headers.cookie || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return o;
}
const session = (req) => readToken(cookies(req)[COOKIE]);
function setCookie(req, res, val, age) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`);
}
function json(res, code, obj, cache) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  let raw = '';
  for await (const c of req) raw += c;
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}
const ip = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
async function tooMany(req) {
  if (!hasDB()) return false;
  try {
    const k = 'rl:' + ip(req);
    const n = await redis('INCR', k);
    if (n === 1) await redis('EXPIRE', k, 900);
    return n > 8; // maksimal 8 percobaan per 15 menit
  } catch (e) { return false; }
}
async function resetLimit(req) { if (hasDB()) { try { await redis('DEL', 'rl:' + ip(req)); } catch (e) {} } }

async function allNews() {
  let r = await redis('HGETALL', 'news');
  const vals = Array.isArray(r) ? r.filter((_, i) => i % 2 === 1) : Object.values(r || {});
  const out = [];
  vals.forEach((v) => { try { out.push(JSON.parse(v)); } catch (e) {} });
  out.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  return out;
}

module.exports = { crypto, hasDB, redis, USER, PASS, safeEqual, makeToken, session, setCookie, json, body, sameOrigin, tooMany, resetLimit, allNews, TTL };
