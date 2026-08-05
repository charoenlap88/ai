// สะพานปลอดภัย: หน้าเว็บ (โหลดจาก server) เรียกไฟล์ในเครื่อง + ฟีเจอร์เนทีฟผ่าน window.desktop
// contextIsolation: true — page ไม่ได้ Node ตรงๆ, เข้าถึงได้แค่ API ที่ expose ด้านล่าง
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('node:fs'), path = require('node:path'), { execSync } = require('node:child_process');

// จำกัดทุก path ให้อยู่ในโฟลเดอร์ที่ user เลือก (กันหลุดออกนอก root)
function safe(root, p) {
  if (!root) throw new Error('ยังไม่ได้เลือกโฟลเดอร์');
  const abs = path.resolve(root, p || '.');
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('path นอกโฟลเดอร์ที่อนุญาต');
  return abs;
}
const DANGER = /rm\s+-rf\s+[\/~]|\bmkfs\b|\bdd\s+if=|:\(\)\s*\{|>\s*\/dev\/|\bshutdown\b|\breboot\b|\bsudo\b/i;

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  version: () => ipcRenderer.invoke('app-version'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  googleLogin: () => ipcRenderer.invoke('google-login'),
  ttsSpeak: (text, voice) => ipcRenderer.invoke('tts-speak', { text, voice }),
  ttsStop: () => ipcRenderer.invoke('tts-stop'),
  ttsVoices: () => ipcRenderer.invoke('tts-voices'),
  // ---- ไฟล์ในเครื่อง (จำกัดใน root) ----
  listDir: (root, p) => fs.readdirSync(safe(root, p), { withFileTypes: true }).filter(d => !d.name.startsWith('.')).map(d => d.name + (d.isDirectory() ? '/' : '')).join('\n') || '(ว่าง)',
  readFile: (root, p) => fs.readFileSync(safe(root, p), 'utf8').slice(0, 100000),
  writeFile: (root, p, content, append) => {
    const abs = safe(root, p); fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (append && fs.existsSync(abs)) { fs.appendFileSync(abs, content); return 'ต่อไฟล์สำเร็จ (รวม ' + fs.statSync(abs).size + ' bytes) — ยังไม่จบเรียก append=true ต่อ'; }
    if (fs.existsSync(abs)) fs.copyFileSync(abs, abs + '.bak'); // backup ก่อนทับ
    fs.writeFileSync(abs, content); return 'เขียนสำเร็จ';
  },
  runCommand: (root, cmd) => {
    if (DANGER.test(cmd || '')) return 'ปฏิเสธ: คำสั่งอันตราย';
    try { return execSync(cmd, { cwd: root, timeout: 60000, maxBuffer: 2e6 }).toString().slice(0, 8000) || '(ไม่มี output)'; }
    catch (e) { return 'ERROR: ' + String(e.stderr || e.message).slice(0, 2000); }
  },
});
