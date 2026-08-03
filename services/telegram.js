// Telegram Bot API — ส่งข้อความเข้าแชท/กลุ่ม (bot token + chat id)
async function api(cfg, method, body) {
  if (!cfg || !cfg.token) throw new Error('ยังไม่ได้ตั้ง Telegram bot token');
  const r = await fetch('https://api.telegram.org/bot' + cfg.token + '/' + method, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(20000),
  });
  const j = await r.json(); if (!j.ok) throw new Error('Telegram: ' + (j.description || 'error')); return j.result;
}
export const meta = { name: 'Telegram', color: '#229ED9', category: 'สื่อสาร (Chat)', desc: 'ส่งข้อความแจ้งเตือนเข้า Telegram' };
export const fields = [
  { key: 'token', label: 'Bot Token', secret: true, ph: '123456:ABC...', hint: 'สร้างบอทที่ @BotFather → คัดลอก token' },
  { key: 'chatId', label: 'Chat ID', ph: 'chat id ปลายทาง', hint: 'ส่งข้อความหาบอทแล้วดู id ที่ @userinfobot' },
];
export async function test(cfg) { const me = await api(cfg, 'getMe'); return { displayName: '@' + me.username }; }
export async function run(name, args, cfg) {
  if (name === 'telegram_send') { await api(cfg, 'sendMessage', { chat_id: args.chatId || cfg.chatId, text: args.text }); return 'ส่งข้อความเข้า Telegram แล้ว'; }
  throw new Error('unknown telegram tool ' + name);
}
export const TOOLS = [
  { type: 'function', function: { name: 'telegram_send', description: 'ส่งข้อความเข้า Telegram (chat id ปลายทาง ถ้าไม่ระบุใช้ค่าที่ตั้งไว้)', parameters: { type: 'object', properties: { text: { type: 'string' }, chatId: { type: 'string' } }, required: ['text'] } } },
];
