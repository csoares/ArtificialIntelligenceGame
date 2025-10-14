@echo off
echo ================================================
echo   DESAFIO DAS EMOCOES - Starting Server
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting Node.js server...
echo Server will run on: http://localhost:3000
echo Results will be saved to: resultados_emocoes.csv
echo.
echo Press Ctrl+C to stop the server
echo ================================================
echo.

REM Start Node.js server
npm start

pause
