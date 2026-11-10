const { app, BrowserWindow, Menu, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Register custom protocol scheme BEFORE app is ready
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app-resource',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            corsEnabled: true
        }
    }
]);

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
        // We ask the user before downloading (see promptForUpdate)
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
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

        // Check for updates in production: shortly after start, then periodically
        if (!isDev && autoUpdater) {
            setTimeout(checkForUpdates, 3000);
            setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
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
// Content types the renderer needs to be exact: ES modules (MediaPipe's vision_bundle.mjs) and
// WebAssembly. Everything else is served as Electron reports it.
const RESOURCE_MIME_TYPES = {
    '.mjs': 'text/javascript',
    '.js': 'text/javascript',
    '.wasm': 'application/wasm',
    '.json': 'application/json'
};

// Serves models/ (face-api weights, MediaPipe) as app-resource://models/... from the app resources.
function registerModelProtocol() {
    const baseDir = isDev ? path.join(__dirname, '..') : process.resourcesPath;

    protocol.handle('app-resource', async (request) => {
        try {
            const { host, pathname } = new URL(request.url);
            const filePath = path.resolve(baseDir, host, '.' + decodeURIComponent(pathname));

            // Never serve anything outside the resources folder
            if (!filePath.startsWith(path.resolve(baseDir) + path.sep) || !fs.existsSync(filePath)) {
                console.error('Resource not found:', request.url);
                return new Response('Not found', { status: 404 });
            }

            const response = await net.fetch(url.pathToFileURL(filePath).href);
            const headers = new Headers(response.headers);
            // The page is loaded from file://, so module/script loads need CORS
            headers.set('Access-Control-Allow-Origin', '*');
            const mimeType = RESOURCE_MIME_TYPES[path.extname(filePath).toLowerCase()];
            if (mimeType) headers.set('Content-Type', mimeType);

            return new Response(response.body, { status: response.status, headers });
        } catch (error) {
            console.error('Error serving resource:', request.url, error);
            return new Response('Not found', { status: 404 });
        }
    });
    console.log('Custom protocol app-resource:// registered');
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

// ===================================
// AUTO-UPDATE
// Every push to main publishes a GitHub release (see .github/workflows/release.yml).
// The app checks for it on start and every few hours, asks the user (never mid-game),
// then downloads, installs and restarts on every platform:
// - Windows / Linux: electron-updater's own installer.
// - macOS: builds are unsigned and Squirrel.Mac refuses unsigned updates, so
//   electron/mac-updater.js swaps the .app bundle itself.
// ===================================

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
const IDLE_RETRY_MS = 60 * 1000;                      // retry the prompt every minute while a game is running
const RELEASES_URL = 'https://github.com/csoares/ArtificialIntelligenceGame/releases/latest';
const IS_MAC = process.platform === 'darwin';
const macUpdater = IS_MAC ? require('./mac-updater') : null;

let updatePromptOpen = false;
let updateDownloading = false;
let pendingUpdateVersion = null; // version being downloaded by electron-updater (Windows/Linux)
// Downloaded update waiting for a restart: { version, installNow(), installOnQuit() }
let readyUpdate = null;

function checkForUpdates() {
    if (readyUpdate) {
        askToRestart(); // downloaded earlier but "Mais tarde" was chosen: ask again
        return;
    }
    if (!autoUpdater || updatePromptOpen || updateDownloading) return;
    autoUpdater.checkForUpdates().catch(err => {
        console.log('Update check failed:', err.message);
    });
}

// True while a game round is running in the renderer (don't interrupt players)
async function isGameRunning() {
    if (!mainWindow) return false;
    try {
        return await mainWindow.webContents.executeJavaScript(
            "typeof gameState !== 'undefined' && gameState.isPlaying === true", true);
    } catch (e) {
        return false;
    }
}

async function promptForUpdate(info) {
    if (!mainWindow || updatePromptOpen || updateDownloading) return;

    if (await isGameRunning()) {
        setTimeout(() => promptForUpdate(info), IDLE_RETRY_MS);
        return;
    }

    // On macOS the app must live somewhere it can overwrite itself (e.g. /Applications)
    const macBundle = IS_MAC ? macUpdater.currentAppBundle() : null;
    const macCheck = IS_MAC ? macUpdater.canReplace(macBundle) : { ok: true };

    updatePromptOpen = true;
    const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Nova versão disponível',
        message: `Está disponível a versão ${info.version} (tens a ${app.getVersion()}).`,
        detail: macCheck.ok
            ? 'A atualização é transferida agora. Quando terminar, perguntamos se podes reiniciar a aplicação.'
            : 'Para se atualizar sozinha, a aplicação tem de estar na pasta Aplicações. ' +
              'Podes instalar esta versão à mão a partir da página de download.',
        buttons: [macCheck.ok ? 'Atualizar agora' : 'Abrir página de download', 'Mais tarde'],
        defaultId: 0,
        cancelId: 1
    });
    updatePromptOpen = false;

    if (response !== 0) return; // asked again on the next periodic check

    if (!macCheck.ok) {
        shell.openExternal(RELEASES_URL);
        return;
    }

    updateDownloading = true;

    if (IS_MAC) {
        installMacUpdate(info, macBundle);
        return;
    }

    pendingUpdateVersion = info.version;
    reportUpdateProgress({ version: info.version, transferred: 0, total: 0 });
    autoUpdater.downloadUpdate().catch(showUpdateError);
}

// Progress for the in-app banner and the Dock/taskbar bar. state is null to hide the banner.
let lastProgressSent = 0;
function reportUpdateProgress(state) {
    if (!mainWindow) return;
    if (!state) {
        mainWindow.setProgressBar(-1);
        mainWindow.webContents.send('update-progress', null);
        return;
    }
    const now = Date.now();
    if (!state.retrying && !state.done && now - lastProgressSent < 250) return; // max ~4 updates/s
    lastProgressSent = now;
    if (state.total) mainWindow.setProgressBar(Math.min(1, state.transferred / state.total));
    mainWindow.webContents.send('update-progress', state);
}

async function installMacUpdate(info, bundle) {
    try {
        reportUpdateProgress({ version: info.version, transferred: 0, total: 0 });
        const prepared = await macUpdater.prepareUpdate(info, {
            onProgress: ({ transferred, total, retrying }) =>
                reportUpdateProgress({ version: info.version, transferred, total, retrying })
        });
        updateReady({
            version: info.version,
            // The swap script waits for us to exit, replaces the app and (optionally) reopens it
            installNow: () => {
                macUpdater.installAndRelaunch(prepared, bundle);
                app.quit();
            },
            installOnQuit: () => macUpdater.installAndRelaunch(prepared, bundle, { relaunch: false })
        });
    } catch (err) {
        showUpdateError(err);
    }
}

// The update is downloaded: ask before restarting (never in the middle of a game)
function updateReady(update) {
    updateDownloading = false;
    readyUpdate = update;
    reportUpdateProgress({ version: update.version, transferred: 1, total: 1, done: true });
    if (mainWindow) mainWindow.setProgressBar(-1);
    askToRestart();
}

async function askToRestart() {
    if (!readyUpdate || !mainWindow || updatePromptOpen) return;

    if (await isGameRunning()) {
        setTimeout(askToRestart, IDLE_RETRY_MS);
        return;
    }

    updatePromptOpen = true;
    const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização pronta',
        message: `A versão ${readyUpdate.version} já foi transferida.`,
        detail: 'Para a instalar, a aplicação tem de reiniciar (demora poucos segundos). ' +
            'Se escolheres "Mais tarde", é instalada quando fechares a aplicação.',
        buttons: ['Reiniciar agora', 'Mais tarde'],
        defaultId: 0,
        cancelId: 1
    });
    updatePromptOpen = false;
    reportUpdateProgress(null);

    if (response === 0 && readyUpdate) {
        const update = readyUpdate;
        readyUpdate = null;
        update.installNow();
    }
}

// "Mais tarde" on macOS: swap the app when it quits (electron-updater does this itself on Windows/Linux)
app.on('will-quit', () => {
    if (readyUpdate && readyUpdate.installOnQuit) {
        const update = readyUpdate;
        readyUpdate = null;
        update.installOnQuit();
    }
});

function showUpdateError(err) {
    console.error('Update failed:', err);
    updateDownloading = false;
    if (!mainWindow) return;
    reportUpdateProgress(null);
    dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Erro na atualização',
        message: 'Não foi possível instalar a atualização.',
        detail: `${err.message}\n\nPodes instalar a nova versão à mão a partir da página de download.`,
        buttons: ['Abrir página de download', 'Fechar'],
        defaultId: 0,
        cancelId: 1
    }).then(({ response }) => {
        if (response === 0) shell.openExternal(RELEASES_URL);
    });
}

if (autoUpdater) {
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info);
        }
        promptForUpdate(info);
    });

    autoUpdater.on('update-not-available', () => {
        console.log('Update not available, current version is latest');
    });

    autoUpdater.on('error', (err) => {
        console.error('Auto-updater error:', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        console.log(`Download progress: ${progressObj.percent.toFixed(1)}%`);
        reportUpdateProgress({
            version: pendingUpdateVersion,
            transferred: progressObj.transferred,
            total: progressObj.total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        // autoInstallOnAppQuit installs it on quit if the user picks "Mais tarde"
        updateReady({ version: info.version, installNow: () => autoUpdater.quitAndInstall() });
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
                // No zoom items: preload.js scales the page to fit the window automatically
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