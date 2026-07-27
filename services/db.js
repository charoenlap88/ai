// Storage layer — Firebase Realtime Database (JSON) ถ้าตั้ง FIREBASE_SA + FIREBASE_DB_URL
// ไม่งั้น fallback เป็นไฟล์ JSON ในเครื่อง · โหลดเข้า memory ตอน start → อ่าน sync, เขียน push กลับ (async)
// ไม่มี dependency (ใช้ node:crypto มินต์ OAuth token จาก service account เอง)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SESS = path.join(DIR, 'sessions'); fs.mkdirSync(SESS, { recursive: true });
const FILES = { users: path.join(DIR, 'users.json'), tokens: path.join(DIR, 'tokens.json'), schedules: path.join(DIR, 'schedules.json') };
const useFB = !!(process.env.FIREBASE_SA && process.env.FIREBASE_DB_URL);

const mem = { users: [], tokens: {}, schedules: [], sessions: {} };

// ---- Firebase RTDB REST (service account → OAuth token) ----
let _sa, _tok = null, _exp = 0;
const sa = () => (_sa ||= JSON.parse(process.env.FIREBASE_SA));
async function token() {
  if (_tok && Date.now() < _exp) return _tok;
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: sa().client_email, aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    iat: now, exp: now + 3600,
  });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa().private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + unsigned + '.' + sig,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Firebase auth: ' + JSON.stringify(d));
  _tok = d.access_token; _exp = Date.now() + (d.expires_in - 60) * 1000;
  return _tok;
}
const dbUrl = () => process.env.FIREBASE_DB_URL.replace(/\/$/, '');
async function fbGet(p) { const t = await token(); const r = await fetch(`${dbUrl()}/${p}.json?access_token=${t}`); return r.ok ? r.json() : null; }
async function fbSet(p, v) { const t = await token(); await fetch(`${dbUrl()}/${p}.json?access_token=${t}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) }); }

// ---- JSON file backend ----
const jLoad = (name, def) => { try { return JSON.parse(fs.readFileSync(FILES[name], 'utf8')); } catch { return def; } };
const jSave = (name, v) => fs.writeFileSync(FILES[name], JSON.stringify(v, null, 2));

// ---- โหลดเข้า memory ตอน start ----
export async function bootstrap() {
  if (useFB) {
    mem.users = Object.values((await fbGet('users')) || {});
    mem.tokens = (await fbGet('tokens')) || {};
    const sc = (await fbGet('schedules')) || [];
    mem.schedules = Array.isArray(sc) ? sc : Object.values(sc);
    mem.sessions = (await fbGet('sessions')) || {};
    console.log('DB: Firebase RTDB (' + mem.users.length + ' users, ' + Object.keys(mem.sessions).length + ' sessions)');
  } else {
    mem.users = jLoad('users', []);
    mem.tokens = jLoad('tokens', {});
    mem.schedules = jLoad('schedules', []);
    mem.sessions = {};
    for (const f of fs.readdirSync(SESS).filter(x => x.endsWith('.json'))) {
      try { const r = JSON.parse(fs.readFileSync(path.join(SESS, f))); mem.sessions[r.id] = r; } catch {}
    }
    console.log('DB: local JSON files');
  }
}
const fail = e => console.error('DB persist error:', e.message || e);
function persist(name) {
  if (!useFB) return jSave(name, mem[name]);
  const v = name === 'users' ? Object.fromEntries(mem.users.map(u => [u.id, u])) : mem[name];
  fbSet(name, v).catch(fail); // fire-and-forget
}

// ---- sync API (server อ่าน/เขียนเหมือนเดิม) ----
export const getUsers = () => mem.users;
export const saveUsers = a => { mem.users = a; persist('users'); };
export const getTokens = () => mem.tokens;
export const saveTokens = t => { mem.tokens = t; persist('tokens'); };
export const getSchedules = () => mem.schedules;
export const saveSchedules = a => { mem.schedules = a; persist('schedules'); };
export const listSessions = () => Object.values(mem.sessions);
export const getSession = id => mem.sessions[id] || null;
export const putSession = rec => { mem.sessions[rec.id] = rec; if (useFB) fbSet('sessions/' + rec.id, rec).catch(fail); else fs.writeFileSync(path.join(SESS, rec.id + '.json'), JSON.stringify(rec)); };
export const delSession = id => { delete mem.sessions[id]; if (useFB) fbSet('sessions/' + id, null).catch(fail); else fs.rmSync(path.join(SESS, id + '.json'), { force: true }); };
