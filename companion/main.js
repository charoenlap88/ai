// Electron main — เปิดหน้าต่าง + dialog เลือกโฟลเดอร์
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
function createWindow() {
  const win = new BrowserWindow({
    width: 1040, height: 740, backgroundColor: '#0f1117',
    webPreferences: { nodeIntegration: true, contextIsolation: false }, // local trusted app
  });
  win.loadFile('index.html');
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
