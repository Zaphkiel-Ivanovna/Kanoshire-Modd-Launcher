const electron = require('electron');
const path = require('path');
const os = require('os');
const pkg = require('../../../../package.json');

let mainWindow;

function getWindow() {
  return mainWindow;
}

function destroyWindow() {
  if (!mainWindow) return;
  mainWindow.close();
  mainWindow = undefined;
}

function createWindow() {
  destroyWindow();
  mainWindow = new electron.BrowserWindow({
    title: pkg.preductname,
    width: 1280,
    height: 720,
    minWidth: 980,
    minHeight: 552,
    resizable: false,
    icon: `./src/assets/images/icon.${
      os.platform() === 'win32' ? 'ico' : 'png'
    }`,
    transparent: os.platform() === 'win32',
    frame: os.platform() !== 'win32',
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });
  electron.Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(
    path.join(electron.app.getAppPath(), 'src', 'launcher.html'),
  );
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: 'deny' };
  });
}

module.exports = {
  getWindow,
  createWindow,
  destroyWindow,
};
