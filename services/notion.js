// Notion API (integration token) — ค้นหา + สร้างหน้า
async function req(cfg, method, path, body) {
  if (!cfg || !cfg.token) throw new Error('ยังไม่ได้ตั้ง Notion integration token');
  const r = await fetch('https://api.notion.com/v1' + path, {
    method, headers: { authorization: 'Bearer ' + cfg.token, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error('Notion ' + r.status + ': ' + String(typeof j === 'object' ? (j.message || JSON.stringify(j)) : j).slice(0, 200));
  return j;
}
const titleOf = p => { const pr = p.properties || {}; for (const k in pr) if (pr[k].type === 'title') return (pr[k].title || []).map(t => t.plain_text).join('') || '(ไม่มีชื่อ)'; return '(ไม่มีชื่อ)'; };
export const meta = { name: 'Notion', color: '#111', category: 'จดบันทึก (Docs)', desc: 'ค้นหาหน้า + สร้างหน้าใหม่ใน Notion' };
export const fields = [{ key: 'token', label: 'Integration Token', secret: true, ph: 'secret_...', hint: 'notion.so/my-integrations → New integration → แชร์หน้า/ฐานข้อมูลให้ integration' }];
export async function test(cfg) { const u = await req(cfg, 'GET', '/users/me'); return { displayName: u.name || u.bot?.owner?.workspace ? (u.name || 'workspace') : 'Notion' }; }
export async function run(name, args, cfg) {
  if (name === 'notion_search') { const d = await req(cfg, 'POST', '/search', { query: args.query || '', page_size: 15 }); return (d.results || []).map(p => (p.object === 'page' ? titleOf(p) : '(database)') + ' — ' + p.id).join('\n') || 'ไม่พบ'; }
  if (name === 'notion_create_page') {
    const p = await req(cfg, 'POST', '/pages', { parent: { page_id: args.parentId }, properties: { title: { title: [{ text: { content: args.title || 'Untitled' } }] } }, children: (args.text ? String(args.text).split('\n') : []).map(t => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: t ? [{ type: 'text', text: { content: t } }] : [] } })) });
    return 'สร้างหน้า Notion แล้ว: ' + (p.url || p.id);
  }
  throw new Error('unknown notion tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'notion_search', description: 'ค้นหาหน้า/ฐานข้อมูลใน Notion (คืนชื่อ+id)', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'notion_create_page', description: 'สร้างหน้าใหม่ใต้หน้าแม่ (parentId = page id)', parameters: { type: 'object', properties: { parentId: { type: 'string' }, title: { type: 'string' }, text: { type: 'string' } }, required: ['parentId', 'title'] } } },
];
