@echo off
title Installing MedChat AI Pro Dependencies

echo.
echo =====================================
echo   MedChat AI Pro - Dependency Setup
echo =====================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    echo Recommended: Download the LTS version
    pause
    exit /b 1
)

echo [OK] Node.js is installed
for /f "tokens=*" %%i in ('node --version') do echo     Version: %%i
echo.

:: Check npm version
echo [OK] npm is installed
for /f "tokens=*" %%i in ('npm --version') do echo     Version: %%i
echo.

:: Clean install to avoid conflicts
if exist "node_modules" (
    echo [INFO] Removing existing node_modules...
    rmdir /s /q node_modules
)

if exist "package-lock.json" (
    echo [INFO] Removing package-lock.json...
    del package-lock.json
)

echo.
echo [INFO] Installing dependencies...
echo       This may take several minutes...
echo.

:: Install dependencies
npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies!
    echo.
    echo Troubleshooting:
    echo 1. Check your internet connection
    echo 2. Try running as Administrator
    echo 3. Clear npm cache: npm cache clean --force
    echo.
    pause
    exit /b 1
)

echo.
echo =====================================
echo [SUCCESS] Dependencies installed!
echo =====================================
echo.
echo Next steps:
echo 1. Configure your API keys in .env.local
echo 2. Run start-windows.bat to launch the app
echo.
pause