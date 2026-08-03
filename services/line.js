// LINE Messaging API — push ข้อความ (channel access token + userId/groupId ปลายทาง)
// หมายเหตุ: LINE Notify ปิดบริการแล้ว จึงใช้ Messaging API แทน
async function req(cfg, method, path, body) {
  if (!cfg || !cfg.token) throw new Error('ยังไม่ได้ตั้ง LINE channel access token');
  const r = await fetch('https://api.line.me' + path, {
    method, headers: { authorization: 'Bearer ' + cfg.token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error('LINE ' + r.status + ': ' + String(typeof j === 'object' ? (j.message || JSON.stringify(j)) : j).slice(0, 200));
  return j;
}
export const meta = { name: 'LINE', color: '#06C755', category: 'สื่อสาร (Chat)', desc: 'ส่งข้อความเข้า LINE (Messaging API)' };
export const fields = [
  { key: 'token', label: 'Channel Access Token', secret: true, ph: 'long-lived token', hint: 'developers.line.biz → Messaging API channel → Channel access token' },
  { key: 'to', label: 'ปลายทาง (userId/groupId)', ph: 'U1234... หรือ group id' },
];
export async function test(cfg) { const b = await req(cfg, 'GET', '/v2/bot/info'); return { displayName: b.displayName }; }
export async function run(name, args, cfg) {
  if (name === 'line_send') { await req(cfg, 'POST', '/v2/bot/message/push', { to: args.to || cfg.to, messages: [{ type: 'text', text: args.text }] }); return 'ส่งข้อความเข้า LINE แล้ว'; }
  throw new Error('unknown line tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'line_send', description: 'ส่งข้อความเข้า LINE (to = userId/groupId ถ้าไม่ระบุใช้ค่าที่ตั้งไว้)', parameters: { type: 'object', properties: { text: { type: 'string' }, to: { type: 'string' } }, required: ['text'] } } },
];
