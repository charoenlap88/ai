// Discord Webhook — โพสต์ข้อความเข้าช่อง (webhook URL)
export const meta = { name: 'Discord', color: '#5865F2', category: 'สื่อสาร (Chat)', desc: 'โพสต์ข้อความเข้าช่อง Discord ผ่าน webhook' };
export const fields = [{ key: 'webhookUrl', label: 'Webhook URL', secret: true, ph: 'https://discord.com/api/webhooks/...', hint: 'Discord → Server Settings → Integrations → Webhooks → New' }];
export async function test(cfg) {
  if (!cfg || !cfg.webhookUrl) throw new Error('ยังไม่ได้ตั้ง Discord webhook URL');
  const r = await fetch(cfg.webhookUrl, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('Discord ' + r.status); const j = await r.json(); return { displayName: j.name + (j.channel_id ? ' (#' + j.channel_id + ')' : '') };
}
export async function run(name, args, cfg) {
  if (name === 'discord_send') {
    if (!cfg || !cfg.webhookUrl) throw new Error('ยังไม่ได้ตั้ง Discord webhook URL');
    const r = await fetch(cfg.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: String(args.text || '').slice(0, 1900) }), signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('Discord ' + r.status + ': ' + (await r.text()).slice(0, 150));
    return 'โพสต์ข้อความเข้า Discord แล้ว';
  }
  throw new Error('unknown discord tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'discord_send', description: 'โพสต์ข้อความเข้าช่อง Discord', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
];
