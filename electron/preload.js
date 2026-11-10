const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Fit the game to any screen: the layout is designed for a 1280x720 window, so the page is
// zoomed so that it always has that much room (bigger on a 1080p/4K monitor, smaller on a tiny
// window). Real page zoom, not CSS zoom: CSS zoom also scales vh units and breaks the layout.
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 3;

function fitToWindow() {
    const zoom = webFrame.getZoomFactor();
    const width = window.innerWidth * zoom;   // window size in real (unzoomed) pixels
    const height = window.innerHeight * zoom;
    if (!width || !height) return;
    const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)));
    if (Math.abs(target - zoom) > 0.01) webFrame.setZoomFactor(target);
}

window.addEventListener('resize', fitToWindow);
window.addEventListener('DOMContentLoaded', fitToWindow);

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