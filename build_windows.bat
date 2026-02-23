@echo off
echo Setting up local environment for Windows...

:: Create virtual environment if it doesn't exist
if not exist venv (
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

echo Building standalone Windows executable (.exe)...
:: --onefile: bundle everything into a single exe
:: --paths: ensure PyInstaller can find your local modules
:: --name: naming the output
python -m PyInstaller --onefile --log-level=WARN --paths src/gemma --name AegisAI-Local server.py

echo.
echo Build complete! Check the 'dist' folder for 'AegisAI-Local.exe'.
pause
