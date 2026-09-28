@echo off
echo Starting Circle K Survey Automation...
echo.

cd /d "%~dp0"

echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Checking environment file...
if not exist ".env" (
    echo ERROR: .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
)

echo.
echo Running single test submission...
node index.js once

echo.
echo Test completed.
pause
