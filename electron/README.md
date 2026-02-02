# Desafio das Emoções + IA - Desktop App

This directory contains the Electron desktop application wrapper for the Emotions Challenge.

## Features
- Native desktop application wrapper
- Auto-updater using GitHub releases
- Local file export without server dependency
- Cross-platform support (Windows, macOS, Linux)

## Development

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run electron-dev
```

### Build for production
```bash
# Build for current platform
npm run build

# Build for all platforms
npm run build-all
```

### Publishing Updates
1. Create a new GitHub release with a tag (e.g., v1.0.1)
2. Run the publish command:
```bash
npm run publish
```

The auto-updater will automatically check for updates when the app starts and notify users when a new version is available.

## Configuration

The app supports both web browser and desktop modes:
- In browser: Uses server for CSV export
- In Electron: Uses native file system dialog

## Kiosk Mode

To enable kiosk mode, set APP_CONFIG in the environment:
```bash
APP_CONFIG={"kioskMode": true} npm run electron
```

## File Structure

```
electron/
├── main.js      # Main Electron process
└── preload.js   # Secure bridge between renderer and main process
```