// Confluence Cloud REST API (email + API token, Basic auth) — ค้น/ดู/สร้างหน้า
const authHeader = cfg => 'Basic ' + Buffer.from(cfg.email + ':' + cfg.token).toString('base64');
async function req(cfg, method, apiPath, body) {
  if (!cfg || !cfg.baseUrl || !cfg.email || !cfg.token) throw new Error('ยังไม่ได้ตั้งค่า Confluence (baseUrl/email/token)');
  const r = await fetch(cfg.baseUrl.replace(/\/$/, '') + apiPath, {
    method, headers: { authorization: authHeader(cfg), 'content-type': 'application/json', accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error('Confluence ' + r.status + ': ' + String(typeof j === 'object' ? JSON.stringify(j) : j).slice(0, 250));
  return j;
}
export const meta = { name: 'Confluence', color: '#172B4D', category: 'จดบันทึก (Docs)', desc: 'ค้น/ดู/สร้างหน้าใน Confluence' };
export const fields = [
  { key: 'baseUrl', label: 'Confluence URL', ph: 'https://yourcompany.atlassian.net' },
  { key: 'email', label: 'Email', ph: 'you@company.com' },
  { key: 'token', label: 'API Token', secret: true, ph: 'API token', hint: 'id.atlassian.com → Security → Create API token (ใช้ตัวเดียวกับ Jira ได้)' },
];
export async function test(cfg) { const d = await req(cfg, 'GET', '/wiki/rest/api/space?limit=1'); return { displayName: 'Confluence (' + ((d.results && d.results[0] && d.results[0].name) || 'connected') + ')' }; }
export async function run(name, args, cfg) {
  if (name === 'confluence_search') { const d = await req(cfg, 'GET', '/wiki/rest/api/content/search?limit=15&cql=' + encodeURIComponent(args.cql || ('text ~ "' + (args.query || '') + '"'))); return (d.results || []).map(p => p.title + ' — id ' + p.id).join('\n') || 'ไม่พบ'; }
  if (name === 'confluence_get_page') { const p = await req(cfg, 'GET', '/wiki/rest/api/content/' + encodeURIComponent(args.id) + '?expand=body.storage'); return p.title + '\n\n' + String((p.body && p.body.storage && p.body.storage.value) || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000); }
  if (name === 'confluence_create_page') { const p = await req(cfg, 'POST', '/wiki/rest/api/content', { type: 'page', title: args.title, space: { key: args.spaceKey }, body: { storage: { value: '<p>' + String(args.body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '</p><p>') + '</p>', representation: 'storage' } } }); return 'สร้างหน้าแล้ว: ' + cfg.baseUrl.replace(/\/$/, '') + '/wiki' + (p._links && p._links.webui || ''); }
  throw new Error('unknown confluence tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'confluence_search', description: 'ค้นหาหน้าใน Confluence (query = คำค้น)', parameters: { type: 'object', properties: { query: { type: 'string' }, cql: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'confluence_get_page', description: 'อ่านเนื้อหาหน้า Confluence จาก id', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
  { type: 'function', function: { name: 'confluence_create_page', description: 'สร้างหน้าใหม่ (spaceKey = key ของ space)', parameters: { type: 'object', properties: { spaceKey: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['spaceKey', 'title'] } } },
];
