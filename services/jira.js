// ตัวเชื่อม Jira Cloud REST API v3 (Basic auth: email + API token) — zero-dep
const authHeader = cfg => 'Basic ' + Buffer.from(cfg.email + ':' + cfg.token).toString('base64');

async function req(cfg, method, apiPath, body) {
  if (!cfg || !cfg.baseUrl || !cfg.email || !cfg.token) throw new Error('ยังไม่ได้ตั้งค่า Jira (baseUrl/email/token)');
  const url = cfg.baseUrl.replace(/\/$/, '') + apiPath;
  const r = await fetch(url, {
    method, headers: { authorization: authHeader(cfg), 'content-type': 'application/json', accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error('Jira ' + r.status + ': ' + (typeof j === 'object' ? JSON.stringify(j).slice(0, 300) : String(j).slice(0, 300)));
  return j;
}

// ทดสอบการเชื่อมต่อ
export async function test(cfg) { const me = await req(cfg, 'GET', '/rest/api/3/myself'); return { displayName: me.displayName, email: me.emailAddress }; }

// Atlassian Document Format (v3 ต้องใช้ ADF สำหรับ description/comment)
const adf = text => ({ type: 'doc', version: 1, content: String(text || '').split('\n').map(p => ({ type: 'paragraph', content: p ? [{ type: 'text', text: p }] : [] })) });
function adfText(d) { if (!d || typeof d !== 'object') return String(d || ''); const out = []; (function walk(n) { if (!n) return; if (n.type === 'text') out.push(n.text); (n.content || []).forEach(walk); if (n.type === 'paragraph') out.push('\n'); })(d); return out.join('').trim(); }

export async function run(name, args, cfg) {
  if (name === 'jira_search') {
    const d = await req(cfg, 'POST', '/rest/api/3/search/jql', { jql: args.jql || 'order by updated DESC', maxResults: Math.min(args.max || 15, 50), fields: ['summary', 'status', 'assignee', 'priority'] });
    return (d.issues || []).map(i => `${i.key} [${i.fields.status && i.fields.status.name}] ${i.fields.summary}${i.fields.assignee ? ' · ' + i.fields.assignee.displayName : ''}`).join('\n') || 'ไม่พบ issue';
  }
  if (name === 'jira_get_issue') {
    const i = await req(cfg, 'GET', '/rest/api/3/issue/' + encodeURIComponent(args.key) + '?fields=summary,status,assignee,priority,description');
    return `${i.key} [${i.fields.status && i.fields.status.name}] ${i.fields.summary}\nassignee: ${i.fields.assignee ? i.fields.assignee.displayName : '-'} · priority: ${i.fields.priority ? i.fields.priority.name : '-'}\n\n` + adfText(i.fields.description);
  }
  if (name === 'jira_create_issue') {
    const d = await req(cfg, 'POST', '/rest/api/3/issue', { fields: { project: { key: args.project }, summary: args.summary, description: adf(args.description || ''), issuetype: { name: args.type || 'Task' } } });
    return 'สร้าง issue สำเร็จ: ' + d.key + ' (' + cfg.baseUrl.replace(/\/$/, '') + '/browse/' + d.key + ')';
  }
  if (name === 'jira_comment') { await req(cfg, 'POST', '/rest/api/3/issue/' + encodeURIComponent(args.key) + '/comment', { body: adf(args.text || '') }); return 'คอมเมนต์แล้วที่ ' + args.key; }
  throw new Error('unknown jira tool ' + name);
}

export const meta = { name: 'Jira', color: '#2563eb', desc: 'ค้นหา/ดู/สร้าง issue และคอมเมนต์ใน Jira ของคุณ' };
export const fields = [
  { key: 'baseUrl', label: 'Jira URL', ph: 'https://yourcompany.atlassian.net' },
  { key: 'email', label: 'Email', ph: 'you@company.com' },
  { key: 'token', label: 'API Token', secret: true, ph: 'API token', hint: 'id.atlassian.com → Security → Create API token' },
];
export const TOOLS = [
  { type: 'function', function: { name: 'jira_search', description: 'ค้นหา Jira issue ด้วย JQL เช่น "assignee = currentUser() AND status != Done"', parameters: { type: 'object', properties: { jql: { type: 'string' }, max: { type: 'number' } }, required: ['jql'] } } },
  { type: 'function', function: { name: 'jira_get_issue', description: 'ดูรายละเอียด Jira issue จาก key เช่น PROJ-123', parameters: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } } },
  { type: 'function', function: { name: 'jira_create_issue', description: 'สร้าง Jira issue ใหม่', parameters: { type: 'object', properties: { project: { type: 'string', description: 'project key เช่น PROJ' }, summary: { type: 'string' }, description: { type: 'string' }, type: { type: 'string', description: 'Task/Bug/Story' } }, required: ['project', 'summary'] } } },
  { type: 'function', function: { name: 'jira_comment', description: 'เพิ่มคอมเมนต์ใน Jira issue', parameters: { type: 'object', properties: { key: { type: 'string' }, text: { type: 'string' } }, required: ['key', 'text'] } } },
];
