// ตัวเชื่อม Trello REST API (API key + token) — zero-dep
const auth = cfg => `key=${encodeURIComponent(cfg.key)}&token=${encodeURIComponent(cfg.token)}`;
async function req(cfg, method, path, extra) {
  if (!cfg || !cfg.key || !cfg.token) throw new Error('ยังไม่ได้ตั้ง Trello key/token');
  const url = 'https://api.trello.com/1' + path + (path.includes('?') ? '&' : '?') + auth(cfg) + (extra ? '&' + extra : '');
  const r = await fetch(url, { method, signal: AbortSignal.timeout(20000) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error('Trello ' + r.status + ': ' + String(typeof j === 'object' ? JSON.stringify(j) : j).slice(0, 200));
  return j;
}
export const meta = { name: 'Trello', color: '#0079bf', category: 'จัดการงาน (Project)', desc: 'ดูบอร์ด/การ์ด และสร้างการ์ดใหม่' };
export const fields = [
  { key: 'key', label: 'API Key', secret: true, ph: 'Trello API key' },
  { key: 'token', label: 'Token', secret: true, ph: 'Trello token', hint: 'trello.com/power-ups/admin → API key แล้วกด Token' },
];
export async function test(cfg) { const m = await req(cfg, 'GET', '/members/me'); return { displayName: m.fullName || m.username }; }
export async function run(name, args, cfg) {
  if (name === 'trello_list_boards') { const d = await req(cfg, 'GET', '/members/me/boards', 'fields=name'); return d.map(b => b.name + ' (' + b.id + ')').join('\n') || 'ไม่มีบอร์ด'; }
  if (name === 'trello_list_cards') { const d = await req(cfg, 'GET', '/boards/' + encodeURIComponent(args.boardId) + '/cards', 'fields=name,idList'); return d.map(c => c.name + ' (card ' + c.id + ', list ' + c.idList + ')').join('\n') || 'ไม่มีการ์ด'; }
  if (name === 'trello_create_card') { const d = await req(cfg, 'POST', '/cards', 'idList=' + encodeURIComponent(args.listId) + '&name=' + encodeURIComponent(args.name) + (args.desc ? '&desc=' + encodeURIComponent(args.desc) : '')); return 'สร้างการ์ด: ' + d.name + ' (' + (d.shortUrl || d.id) + ')'; }
  throw new Error('unknown trello tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'trello_list_boards', description: 'ลิสต์บอร์ด Trello ของฉัน (คืนชื่อ+id)', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'trello_list_cards', description: 'ลิสต์การ์ดในบอร์ด (ใช้ board id)', parameters: { type: 'object', properties: { boardId: { type: 'string' } }, required: ['boardId'] } } },
  { type: 'function', function: { name: 'trello_create_card', description: 'สร้างการ์ดใน list (ใช้ list id)', parameters: { type: 'object', properties: { listId: { type: 'string' }, name: { type: 'string' }, desc: { type: 'string' } }, required: ['listId', 'name'] } } },
];
