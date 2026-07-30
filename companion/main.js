// Electron main — เปิดหน้าต่าง + dialog เลือกโฟลเดอร์ + อัปเดตอัตโนมัติ + Google login (loopback)
// build: Google desktop secret ฝังตอน CI · rebuild
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const http = require('node:http'), crypto = require('node:crypto');

// Desktop OAuth client (installed app) — secret ของ desktop client ไม่ถือเป็นความลับตามสเปค Google
const GA = { clientId: '435463760499-kkf0uj2t7i5jb14md609abd15i41jte5.apps.googleusercontent.com', clientSecret: 'INJECT_AT_BUILD' };

// เปิด Google ใน browser ระบบ → รับ code ที่ loopback → แลกเป็น id_token (PKCE)
ipcMain.handle('google-login', () => new Promise((resolve, reject) => {
  if (GA.clientId.startsWith('PUT_')) return reject(new Error('ยังไม่ได้ตั้ง Desktop OAuth client'));
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  let redirect;
  const server = http.createServer(async (req, res) => {
    const code = new URL(req.url, redirect).searchParams.get('code');
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<body style="font-family:sans-serif;background:#0f1117;color:#e6e8ef;text-align:center;padding-top:64px"><h2>ล็อกอินสำเร็จ ✓</h2><p>กลับไปที่แอป AI Agent ได้เลย · ปิดหน้านี้ได้</p></body>');
    server.close();
    if (!code) return reject(new Error('ยกเลิกการล็อกอิน'));
    try {
      const tok = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: GA.clientId, client_secret: GA.clientSecret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }),
      }).then(r => r.json());
      if (!tok.id_token) return reject(new Error('แลก token ไม่สำเร็จ: ' + (tok.error_description || tok.error || '')));
      resolve(tok.id_token);
    } catch (e) { reject(e); }
  });
  server.listen(0, '127.0.0.1', () => {
    redirect = `http://127.0.0.1:${server.address().port}`;
    shell.openExternal('https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: GA.clientId, redirect_uri: redirect, response_type: 'code',
      scope: 'openid email profile', code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
    }).toString());
  });
  setTimeout(() => { try { server.close(); } catch {} reject(new Error('หมดเวลา 3 นาที')); }, 180000);
}));
function createWindow() {
  const win = new BrowserWindow({
    width: 1040, height: 740, backgroundColor: '#0f1117',
    webPreferences: { nodeIntegration: true, contextIsolation: false }, // local trusted app
  });
  win.loadFile('index.html');
}
// เช็คอัปเดตจาก https://ai.charoenlap.com/downloads/ (โหลด+ติดตั้งเอง แจ้งเตือนเมื่อพร้อม)
function checkUpdates() {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({ type: 'info', buttons: ['รีสตาร์ทเลย', 'ทีหลัง'], defaultId: 0,
        title: 'มีเวอร์ชันใหม่', message: 'ดาวน์โหลดอัปเดตเสร็จแล้ว — รีสตาร์ทเพื่อใช้เวอร์ชันใหม่' })
        .then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); });
    });
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) { /* dev mode / ไม่มี feed → ข้าม */ }
}
app.whenReady().then(() => { createWindow(); checkUpdates(); });
app.on('window-all-closed', () => app.quit());
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
