const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('get-app-version'),

    // File operations
    exportCSV: (data) => ipcRenderer.invoke('export-csv', data),
    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

    // Menu events
    onMenuExportCSV: (callback) => ipcRenderer.on('menu-export-csv', callback),

    // Auto-updater
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Log that preload script loaded
console.log('Preload script loaded successfully');