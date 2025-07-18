@echo off
title MedChat AI Pro - Next.js Application

echo.
echo =====================================
echo   MedChat AI Pro - Next.js App
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
    pause
    exit /b 1
)

echo [OK] Node.js is installed
for /f "tokens=*" %%i in ('node --version') do echo     Version: %%i
echo.

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    echo       This may take a few minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo        Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
    echo.
)

:: Check for .env.local file
if not exist ".env.local" (
    echo [INFO] Creating .env.local from template...
    copy .env.example .env.local >nul
    
    echo.
    echo [WARNING] Please edit .env.local and add your API keys!
    echo           Opening .env.local in notepad...
    start /wait notepad .env.local
)

:: Display configuration status
echo.
echo API Configuration Status:
echo ========================

:: Simple check for configured keys
findstr /C:"ANTHROPIC_API_KEY=your-anthropic-api-key" .env.local >nul
if %errorlevel% equ 0 (
    echo   Claude AI:  [NOT CONFIGURED - Using mock data]
) else (
    echo   Claude AI:  [CONFIGURED]
)

findstr /C:"OPENAI_API_KEY=your-openai-api-key" .env.local >nul
if %errorlevel% equ 0 (
    echo   OpenAI:     [NOT CONFIGURED - Using mock data]
) else (
    echo   OpenAI:     [CONFIGURED]
)

findstr /C:"NEXT_PUBLIC_SUPABASE_URL=your-supabase-url" .env.local >nul
if %errorlevel% equ 0 (
    echo   Supabase:   [NOT CONFIGURED - Using mock data]
) else (
    echo   Supabase:   [CONFIGURED]
)

echo.
echo =====================================
echo Starting MedChat AI Pro...
echo =====================================
echo.
echo Application will open at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

:: Open browser after delay
start /b cmd /c "timeout /t 5 >nul & start http://localhost:3000"

:: Start the development server
call npm run dev