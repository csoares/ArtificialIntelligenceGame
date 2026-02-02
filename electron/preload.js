const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getResourcesPath: () => ipcRenderer.invoke('get-resources-path'),

    // File operations
    exportCSV: (data) => ipcRenderer.invoke('export-csv', data),
    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

    // Menu events
    onMenuExportCSV: (callback) => ipcRenderer.on('menu-export-csv', callback),

    // Auto-updater events
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Log that preload script loaded
console.log('Preload script loaded successfully');