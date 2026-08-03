// ตัวเชื่อม Slack Web API (Bot token xoxb-) — zero-dep
async function api(cfg, method, body) {
  if (!cfg || !cfg.token) throw new Error('ยังไม่ได้ตั้ง Slack token');
  const r = await fetch('https://slack.com/api/' + method, {
    method: 'POST', headers: { authorization: 'Bearer ' + cfg.token, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body || {}), signal: AbortSignal.timeout(20000),
  });
  const j = await r.json();
  if (!j.ok) throw new Error('Slack: ' + (j.error || 'unknown'));
  return j;
}
export const meta = { name: 'Slack', color: '#4a154b', desc: 'ส่งข้อความ + ดูช่องใน Slack' };
export const fields = [{ key: 'token', label: 'Bot User OAuth Token', secret: true, ph: 'xoxb-...', hint: 'api.slack.com/apps → OAuth & Permissions (scope: chat:write, channels:read)' }];
export async function test(cfg) { const j = await api(cfg, 'auth.test'); return { displayName: j.user + ' @ ' + j.team }; }
export async function run(name, args, cfg) {
  if (name === 'slack_post_message') { await api(cfg, 'chat.postMessage', { channel: args.channel, text: args.text }); return 'ส่งข้อความไป ' + args.channel + ' แล้ว'; }
  if (name === 'slack_list_channels') { const j = await api(cfg, 'conversations.list', { limit: 100, types: 'public_channel' }); return (j.channels || []).map(c => '#' + c.name + ' (' + c.id + ')').join('\n') || 'ไม่มีช่อง'; }
  throw new Error('unknown slack tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'slack_post_message', description: 'ส่งข้อความไปช่อง Slack (channel = ชื่อ #general หรือ channel id)', parameters: { type: 'object', properties: { channel: { type: 'string' }, text: { type: 'string' } }, required: ['channel', 'text'] } } },
  { type: 'function', function: { name: 'slack_list_channels', description: 'ลิสต์ช่อง Slack', parameters: { type: 'object', properties: {}, required: [] } } },
];
