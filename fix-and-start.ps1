# MedChat AI Pro - Windows Fix and Start Script
# This script ensures the app runs properly on Windows

param(
    [switch]$SkipInstall,
    [switch]$Production
)

$Host.UI.RawUI.WindowTitle = "MedChat AI Pro - Launcher"

Write-Host "`n🏥 MedChat AI Pro - Windows Launcher" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to check if running in WSL
function Test-WSL {
    if ($env:WSL_DISTRO_NAME) {
        return $true
    }
    return $false
}

# Check if running in WSL
if (Test-WSL) {
    Write-Host "❌ ERROR: This script is running in WSL!" -ForegroundColor Red
    Write-Host "   Please run this script in Windows PowerShell or Command Prompt" -ForegroundColor Yellow
    Write-Host "`n   Steps:" -ForegroundColor Yellow
    Write-Host "   1. Open Windows PowerShell (not WSL)" -ForegroundColor Yellow
    Write-Host "   2. Navigate to: C:\Users\Rolando Fender\medpay-pro" -ForegroundColor Yellow
    Write-Host "   3. Run: .\fix-and-start.ps1" -ForegroundColor Yellow
    Read-Host "`nPress Enter to exit"
    exit 1
}

# Check current directory
$currentPath = Get-Location
Write-Host "📁 Current directory: $currentPath" -ForegroundColor Gray

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "   Please run this script from the medpay-pro directory" -ForegroundColor Yellow
    
    # Try to find the correct directory
    $possiblePath = "C:\Users\Rolando Fender\medpay-pro"
    if (Test-Path "$possiblePath\package.json") {
        Write-Host "`n📂 Found project at: $possiblePath" -ForegroundColor Green
        Set-Location $possiblePath
        Write-Host "✅ Changed to project directory" -ForegroundColor Green
    } else {
        Read-Host "`nPress Enter to exit"
        exit 1
    }
}

# Check Node.js installation
Write-Host "`n🔍 Checking Node.js installation..." -ForegroundColor Cyan
$nodeVersion = $null
try {
    $nodeVersion = node --version 2>$null
} catch {
    $nodeVersion = $null
}

if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "`n📥 Please install Node.js:" -ForegroundColor Yellow
    Write-Host "   1. Visit: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   2. Download the LTS version" -ForegroundColor Yellow
    Write-Host "   3. Install and run this script again" -ForegroundColor Yellow
    
    $response = Read-Host "`nWould you like to open the Node.js website? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process "https://nodejs.org/"
    }
    
    Read-Host "`nPress Enter to exit"
    exit 1
}

Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green

# Install dependencies if needed
if (-not $SkipInstall) {
    if (-not (Test-Path "node_modules") -or -not (Test-Path "node_modules\.bin\next.cmd")) {
        Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
        Write-Host "   This may take a few minutes..." -ForegroundColor Gray
        
        # Clean install
        if (Test-Path "node_modules") {
            Write-Host "🧹 Cleaning old node_modules..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        }
        
        if (Test-Path "package-lock.json") {
            Remove-Item package-lock.json -ErrorAction SilentlyContinue
        }
        
        # Install
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
            Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
            Write-Host "1. Clear npm cache: npm cache clean --force" -ForegroundColor Yellow
            Write-Host "2. Try running as Administrator" -ForegroundColor Yellow
            Write-Host "3. Check internet connection" -ForegroundColor Yellow
            Read-Host "`nPress Enter to exit"
            exit 1
        }
        
        Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "✅ Dependencies already installed" -ForegroundColor Green
    }
}

# Create or check .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "`n⚠️  Creating .env.local file..." -ForegroundColor Yellow
    
    $envContent = @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Service Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional Configuration
NEXT_PUBLIC_APP_NAME="MedChat AI Pro"
NEXT_PUBLIC_APP_VERSION="3.0.0"
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
    
    Write-Host "📝 Please configure your API keys in .env.local" -ForegroundColor Yellow
    $response = Read-Host "Would you like to edit .env.local now? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process notepad.exe -ArgumentList ".env.local" -Wait
    }
}

# Check API configuration
Write-Host "`n🔑 Checking API configuration..." -ForegroundColor Cyan
$envContent = Get-Content ".env.local" -Raw

$claudeConfigured = $envContent -notmatch "ANTHROPIC_API_KEY=your-anthropic-api-key"
$openaiConfigured = $envContent -notmatch "OPENAI_API_KEY=your-openai-api-key"
$supabaseConfigured = $envContent -notmatch "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url"

Write-Host "   Claude AI:  $(if ($claudeConfigured) {'✅ Configured'} else {'⚠️  Not configured (mock mode)'})" -ForegroundColor $(if ($claudeConfigured) {'Green'} else {'Yellow'})
Write-Host "   OpenAI:     $(if ($openaiConfigured) {'✅ Configured'} else {'⚠️  Not configured (mock mode)'})" -ForegroundColor $(if ($openaiConfigured) {'Green'} else {'Yellow'})
Write-Host "   Supabase:   $(if ($supabaseConfigured) {'✅ Configured'} else {'⚠️  Not configured (mock mode)'})" -ForegroundColor $(if ($supabaseConfigured) {'Green'} else {'Yellow'})

# Kill any existing Node.js processes on port 3000
Write-Host "`n🔍 Checking for existing processes on port 3000..." -ForegroundColor Cyan
$existingProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existingProcess) {
    Write-Host "⚠️  Found process using port 3000" -ForegroundColor Yellow
    $pid = $existingProcess.OwningProcess
    try {
        Stop-Process -Id $pid -Force -ErrorAction Stop
        Write-Host "✅ Stopped process $pid" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not stop process. Try running as Administrator." -ForegroundColor Red
    }
}

# Start the server
Write-Host "`n🚀 Starting MedChat AI Pro..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

if ($Production) {
    Write-Host "📦 Building for production..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "🌐 Starting production server..." -ForegroundColor Cyan
    
    # Open browser
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 3
        Start-Process "http://localhost:3000"
    } | Out-Null
    
    npm start
} else {
    Write-Host "🔧 Starting development server..." -ForegroundColor Cyan
    Write-Host "📌 URL: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "📌 Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Green
    
    # Open browser
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 5
        Start-Process "http://localhost:3000"
    } | Out-Null
    
    npm run dev
}