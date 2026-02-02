const { app, BrowserWindow, Menu, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Catch any uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Keep reference to window object
let mainWindow;

// Check for development mode
const isDev = process.env.ELECTRON_IS_DEV === '1' || process.env.NODE_ENV === 'development';

// Auto-updater setup (only in production)
let autoUpdater = null;
if (!isDev) {
    try {
        const { autoUpdater: updater } = require('electron-updater');
        autoUpdater = updater;
        autoUpdater.logger = require('electron-log');
        autoUpdater.logger.transports.file.level = 'info';
        console.log('Auto-updater initialized');
    } catch (e) {
        console.log('Auto-updater not available:', e.message);
    }
}

function createWindow() {
    // Create browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        // icon: path.join(__dirname, '../assets/icon.png'),
        show: false // Don't show until ready
    });

    // Load the app
    if (isDev) {
        // In development, load from local server
        mainWindow.loadURL('http://localhost:3000');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load from file
        // Handle both asar and unpacked scenarios
        let indexPath = path.join(__dirname, '../index.html');

        // Log the path for debugging
        console.log('Loading index.html from:', indexPath);
        console.log('__dirname:', __dirname);
        console.log('app.getAppPath():', app.getAppPath());

        mainWindow.loadFile(indexPath).catch(err => {
            console.error('Failed to load index.html:', err);
            // Try alternative path
            const altPath = path.join(app.getAppPath(), 'index.html');
            console.log('Trying alternative path:', altPath);
            mainWindow.loadFile(altPath);
        });
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Check for updates in production
        if (!isDev && autoUpdater) {
            // Delay update check to let app fully load
            setTimeout(() => {
                autoUpdater.checkForUpdatesAndNotify().catch(err => {
                    console.log('Update check failed:', err.message);
                });
            }, 3000);
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Register custom protocol to serve models from resources
function registerModelProtocol() {
    protocol.handle('app-resource', (request) => {
        const urlPath = request.url.replace('app-resource://', '');
        let filePath;

        if (isDev) {
            filePath = path.join(__dirname, '..', urlPath);
        } else {
            filePath = path.join(process.resourcesPath, urlPath);
        }

        console.log('Serving resource:', filePath);

        try {
            return net.fetch(url.pathToFileURL(filePath).href);
        } catch (error) {
            console.error('Error serving resource:', error);
            return new Response('Not found', { status: 404 });
        }
    });
}

// App ready event
app.whenReady().then(() => {
    console.log('App is ready, creating window...');
    console.log('Running in development mode:', isDev);

    // Register custom protocol for serving resources
    registerModelProtocol();

    createWindow();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}).catch(err => {
    console.error('Failed to initialize app:', err);
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // On macOS, keep app running
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Auto-updater event handlers
if (autoUpdater) {
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info);
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available, current version is latest');
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        console.log(`Download progress: ${progressObj.percent.toFixed(1)}%`);
        if (mainWindow) {
            mainWindow.webContents.send('download-progress', progressObj);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded', info);
            // Show dialog to restart
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Atualização Disponível',
                message: `Uma nova versão (${info.version}) foi transferida.`,
                detail: 'A aplicação será reiniciada para aplicar a atualização.',
                buttons: ['Reiniciar Agora', 'Mais Tarde']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        }
    });
}

// IPC handlers for desktop features
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('export-csv', async (event, data) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'emotions-challenge-results.csv',
            filters: [
                { name: 'CSV Files', extensions: ['csv'] }
            ]
        });

        if (filePath) {
            fs.writeFileSync(filePath, data, 'utf8');
            return { success: true, filePath };
        }
        return { success: false, cancelled: true };
    } catch (error) {
        console.error('Export error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-data-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('get-resources-path', () => {
    // In production, models are in Resources/models
    // In development, models are in ./models
    if (isDev) {
        return path.join(__dirname, '..');
    }
    return process.resourcesPath;
});

// Kiosk mode support
function enableKioskMode() {
    if (mainWindow) {
        mainWindow.setKiosk(true);
        // Hide menu bar
        Menu.setApplicationMenu(null);
    }
}

function disableKioskMode() {
    if (mainWindow) {
        mainWindow.setKiosk(false);
        // Show menu bar
        createMenu();
    }
}

function createMenu() {
    const template = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Exportar Resultados',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-csv');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Sobre',
                            message: 'Desafio das Emoções + IA',
                            detail: `Versão: ${app.getVersion()}\n\nUma aplicação educativa para aprender sobre Inteligência Artificial e Visão Computacional.\n\nDesenvolvido pela UFP`
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Set up app menu
app.on('ready', () => {
    if (!isDev) {
        createMenu();
    }
});

// Export app methods for potential future use
module.exports = {
    enableKioskMode,
    disableKioskMode
};