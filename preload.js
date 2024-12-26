const { contextBridge, ipcRenderer } = require('electron');
const apps = require('./apps');

contextBridge.exposeInMainWorld('electron', {
    createInstance: (url) => ipcRenderer.send('create-instance', url),
    onCreateTab: (callback) => ipcRenderer.on('create-tab', (event, url) => callback(url)),
    getApps: () => apps,
    saveTabs: (tabs) => ipcRenderer.send('save-tabs', tabs),
    onLoadTabs: (callback) => ipcRenderer.on('load-tabs', (event, tabs) => callback(tabs))
});
