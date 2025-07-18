@echo off
title MedChat AI Pro - Fixed User Migration

echo.
echo ==========================================
echo   MedChat AI Pro - Fixed User Migration
echo ==========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies first...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo [INFO] Starting enhanced user migration...
echo       This script provides detailed logging
echo.

:: Run the fixed migration script
node migrate-users-fixed.js

echo.
echo ==========================================
echo Migration attempt completed!
echo ==========================================
echo.
echo If tables don't exist, you need to create them manually:
echo 1. Go to your Supabase dashboard
echo 2. Navigate to SQL Editor
echo 3. Run the SQL statements shown above
echo 4. Then run this script again
echo.
echo If successful, test with: start-windows.bat
pause