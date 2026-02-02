const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Catch any uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Keep reference to window object
let mainWindow;

// Check for development mode
const isDev = process.env.ELECTRON_IS_DEV === '1' || process.env.NODE_ENV === 'development';

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

        // Auto-updater temporarily disabled to ensure app starts
        // TODO: Re-enable when properly configured
        // if (!isDev && updaterAvailable) {
        //     autoUpdater.checkForUpdatesAndNotify();
        // }
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

// App ready event
app.whenReady().then(() => {
    console.log('App is ready, creating window...');
    console.log('Running in development mode:', isDev);
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

// Auto-updater completely removed to prevent crashes
// The code below is commented out
/*
if (false) { // Always false - auto-updater disabled
    const autoUpdater = require('electron-updater');

    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });

    // ... rest of auto-updater code removed
}
*/

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