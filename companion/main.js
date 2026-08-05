// Electron main — เปิดหน้าต่าง + dialog เลือกโฟลเดอร์ + อัปเดตอัตโนมัติ + Google login (loopback)
// build: Google desktop secret ฝังตอน CI · rebuild
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
const http = require('node:http'), crypto = require('node:crypto'), path = require('node:path');
const SERVER = process.env.AI_SERVER || 'https://ai.charoenlap.com'; // โหลด UI เว็บเต็ม (ฟีเจอร์ครบ) + สะพานแตะไฟล์ในเครื่อง
Menu.setApplicationMenu(null); // ซ่อนแถบเมนู File/Edit/View/Window/Help
let win, tray, quitting = false;
const TRAY_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAaklEQVR4nO3VTQoAIQiA0S7YSbr/ulZBBFH+paIfuEweTDNTautdc0oCEkA5PIsJ2IsFOPUFcEsU8JoIABorABsZwBUYIJUfgPojMHMJzbyGUARkp69P8Q2B2eXzd2wCsCIoO3wDOCYBCRhij9xuNH6MygAAAABJRU5ErkJggg==';
function createTray() {
  tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON));
  tray.setToolTip('AI Agent');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'เปิดโปรแกรม', click: () => { win.show(); win.focus(); } },
    { type: 'separator' },
    { label: 'ปิดโปรแกรม', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => { win.isVisible() ? win.hide() : (win.show(), win.focus()); });
}
app.on('before-quit', () => { quitting = true; });

// Desktop OAuth client (installed app) — secret ของ desktop client ไม่ถือเป็นความลับตามสเปค Google
const GA = { clientId: '435463760499-kkf0uj2t7i5jb14md609abd15i41jte5.apps.googleusercontent.com', clientSecret: 'INJECT_AT_BUILD' };

// เปิด Google ใน browser ระบบ → รับ code ที่ loopback → แลกเป็น id_token (PKCE)
ipcMain.handle('google-login', () => new Promise((resolve, reject) => {
  if (GA.clientId.startsWith('PUT_')) return reject(new Error('ยังไม่ได้ตั้ง Desktop OAuth client'));
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  let redirect, done = false;
  const server = http.createServer(async (req, res) => {
    const q = new URL(req.url, 'http://127.0.0.1').searchParams;
    const code = q.get('code'), err = q.get('error');
    if (!code && !err) { res.statusCode = 204; res.end(); return; } // เช่น favicon — เพิกเฉย รอ callback จริง
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<body style="font-family:sans-serif;background:#0f1117;color:#e6e8ef;text-align:center;padding-top:64px"><h2>' + (code ? 'ล็อกอินสำเร็จ ✓' : 'ล็อกอินไม่สำเร็จ') + '</h2><p>กลับไปที่แอป AI Agent ได้เลย · ปิดหน้านี้ได้</p></body>');
    if (done) return; done = true;
    server.close();
    if (err) return reject(new Error('Google: ' + err));
    if (!code) return reject(new Error('ไม่ได้รับ code'));
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
  setTimeout(() => { if (done) return; done = true; try { server.close(); } catch {} reject(new Error('หมดเวลา 3 นาที')); }, 180000);
}));
function createWindow() {
  win = new BrowserWindow({
    width: 1040, height: 740, backgroundColor: '#0f1117', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
  });
  win.loadURL(SERVER); // ฟีเจอร์เว็บครบ (streaming/ธีม/รูป/extensions/ความจำ...) + window.desktop สำหรับไฟล์ในเครื่อง
  win.webContents.on('did-fail-load', (e, code, desc) => { if (code !== -3) win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="font-family:sans-serif;background:#0f1117;color:#e6e8ef;text-align:center;padding-top:80px"><h2>เชื่อมต่อ ' + SERVER + ' ไม่ได้</h2><p>' + desc + '</p><p>ตรวจอินเทอร์เน็ตแล้วเปิดโปรแกรมใหม่</p></body>')); });
  // เปิดลิงก์ภายนอก (target=_blank) ในเบราว์เซอร์ระบบ ไม่ใช่ในแอป
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } }); // ปิดหน้าต่าง = ยุบลง system tray
}
let manualCheck = false;
// ตั้ง event ครั้งเดียว + เช็คอัปเดตจาก https://ai.charoenlap.com/downloads/ (โหลด+ติดตั้งเอง)
function checkUpdates() {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.on('update-available', () => { if (manualCheck) dialog.showMessageBox({ type: 'info', message: 'พบเวอร์ชันใหม่ กำลังดาวน์โหลด...' }); });
    autoUpdater.on('update-not-available', () => { if (manualCheck) { manualCheck = false; dialog.showMessageBox({ type: 'info', message: 'เป็นเวอร์ชันล่าสุดแล้ว (v' + app.getVersion() + ')' }); } });
    autoUpdater.on('error', e => { if (manualCheck) { manualCheck = false; dialog.showMessageBox({ type: 'error', message: 'ตรวจอัปเดตไม่สำเร็จ: ' + (e && e.message || e) }); } });
    autoUpdater.on('update-downloaded', () => {
      manualCheck = false;
      dialog.showMessageBox({ type: 'info', buttons: ['รีสตาร์ทเลย', 'ทีหลัง'], defaultId: 0,
        title: 'มีเวอร์ชันใหม่', message: 'ดาวน์โหลดอัปเดตเสร็จแล้ว — รีสตาร์ทเพื่อใช้เวอร์ชันใหม่' })
        .then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); });
    });
    autoUpdater.checkForUpdatesAndNotify();
  } catch (e) { /* dev mode / ไม่มี feed → ข้าม */ }
}
// กดปุ่ม ⟳ อัปเดต ในแอป → ตรวจ + เด้งผลให้เห็น
ipcMain.handle('check-update', () => { try { manualCheck = true; require('electron-updater').autoUpdater.checkForUpdates(); return true; } catch { return false; } });
ipcMain.handle('app-version', () => app.getVersion());
// ---- TTS อ่านออกเสียงด้วยเสียงเนทีฟ OS ----
const tts = require('./tts.js');
ipcMain.handle('tts-speak', (e, a) => { try { tts.speak(a && a.text, a && a.voice); return true; } catch { return false; } });
ipcMain.handle('tts-stop', () => { try { tts.stop(); } catch {} return true; });
ipcMain.handle('tts-voices', () => { try { return tts.voices(); } catch { return []; } });
app.whenReady().then(() => { createWindow(); createTray(); checkUpdates(); });
app.on('window-all-closed', () => {}); // ไม่ quit — อยู่ใน system tray ต่อ
app.on('activate', () => { if (win) { win.show(); win.focus(); } });
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
