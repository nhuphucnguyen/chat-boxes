const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
const dataDir = path.join(os.homedir(), '.chat-boxes');
const dataFile = path.join(dataDir, 'tabs.json');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');
    
    // Only open dev tools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Load tabs data and send to renderer process
    if (fs.existsSync(dataFile)) {
        const tabsData = JSON.parse(fs.readFileSync(dataFile));
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('load-tabs', tabsData);
        });
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('create-instance', (event, url) => {
    console.log('Received create-instance with URL:', url);
    mainWindow.webContents.send('create-tab', url);
});

ipcMain.on('save-tabs', (event, tabs) => {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    fs.writeFileSync(dataFile, JSON.stringify(tabs));
});
