// Electron main — เปิดหน้าต่าง + dialog เลือกโฟลเดอร์ + อัปเดตอัตโนมัติผ่านเน็ต
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
