const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('get-app-version'),

    // File operations
    exportCSV: (data) => ipcRenderer.invoke('export-csv', data),
    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

    // Menu events
    onMenuExportCSV: (callback) => ipcRenderer.on('menu-export-csv', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Log that preload script loaded
console.log('Preload script loaded successfully');