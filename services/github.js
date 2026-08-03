// ตัวเชื่อม GitHub REST API (Personal Access Token) — zero-dep
async function req(cfg, method, path, body) {
  if (!cfg || !cfg.token) throw new Error('ยังไม่ได้ตั้ง GitHub token');
  const r = await fetch('https://api.github.com' + path, {
    method, headers: { authorization: 'Bearer ' + cfg.token, accept: 'application/vnd.github+json', 'user-agent': 'ai-agent', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error('GitHub ' + r.status + ': ' + String(typeof j === 'object' ? (j.message || JSON.stringify(j)) : j).slice(0, 300));
  return j;
}
export const meta = { name: 'GitHub', color: '#24292f', desc: 'ค้น/ดู/สร้าง issue + คอมเมนต์ ในรีโปของคุณ' };
export const fields = [{ key: 'token', label: 'Personal Access Token', secret: true, ph: 'ghp_...', hint: 'github.com → Settings → Developer settings → Personal access tokens (scope: repo)' }];
export async function test(cfg) { const u = await req(cfg, 'GET', '/user'); return { displayName: u.login }; }
export async function run(name, args, cfg) {
  if (name === 'gh_search_issues') { const d = await req(cfg, 'GET', '/search/issues?q=' + encodeURIComponent(args.query || '')); return (d.items || []).slice(0, 15).map(i => `#${i.number} [${i.state}] ${i.title} (${i.repository_url.split('/').slice(-2).join('/')})`).join('\n') || 'ไม่พบ'; }
  if (name === 'gh_get_issue') { const [o, rp] = (args.repo || '').split('/'); const i = await req(cfg, 'GET', `/repos/${o}/${rp}/issues/${args.number}`); return `#${i.number} [${i.state}] ${i.title}\n\n${i.body || ''}`; }
  if (name === 'gh_create_issue') { const [o, rp] = (args.repo || '').split('/'); const i = await req(cfg, 'POST', `/repos/${o}/${rp}/issues`, { title: args.title, body: args.body || '' }); return 'สร้าง issue: ' + i.html_url; }
  if (name === 'gh_comment') { const [o, rp] = (args.repo || '').split('/'); await req(cfg, 'POST', `/repos/${o}/${rp}/issues/${args.number}/comments`, { body: args.text || '' }); return 'คอมเมนต์แล้วที่ ' + args.repo + '#' + args.number; }
  if (name === 'gh_list_repos') { const d = await req(cfg, 'GET', '/user/repos?per_page=30&sort=updated'); return d.map(r => r.full_name).join('\n'); }
  throw new Error('unknown github tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'gh_search_issues', description: 'ค้นหา GitHub issues/PR ด้วย query เช่น "repo:owner/name is:open"', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'gh_get_issue', description: 'ดู GitHub issue', parameters: { type: 'object', properties: { repo: { type: 'string', description: 'owner/repo' }, number: { type: 'number' } }, required: ['repo', 'number'] } } },
  { type: 'function', function: { name: 'gh_create_issue', description: 'สร้าง GitHub issue', parameters: { type: 'object', properties: { repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['repo', 'title'] } } },
  { type: 'function', function: { name: 'gh_comment', description: 'คอมเมนต์ GitHub issue', parameters: { type: 'object', properties: { repo: { type: 'string' }, number: { type: 'number' }, text: { type: 'string' } }, required: ['repo', 'number', 'text'] } } },
  { type: 'function', function: { name: 'gh_list_repos', description: 'ลิสต์ repo ของฉัน', parameters: { type: 'object', properties: {}, required: [] } } },
];
