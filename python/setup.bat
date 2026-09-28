@echo off
REM Windows Setup Script for Circle K Survey Automation

echo Setting up Python environment for Circle K Survey Automation...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python 3.7 or higher.
    exit /b 1
)

REM Create virtual environment (optional but recommended)
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

echo Setup complete!
echo.
echo To activate the virtual environment in the future, run:
echo venv\Scripts\activate.bat
echo.
echo To run the automation:
echo python circle_k_automation.py
