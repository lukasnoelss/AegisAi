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
python -m PyInstaller --onefile --log-level=WARN --paths aegis_local\gemma --name AegisAI-Local aegis_local\server.py

echo Copying to public/downloads for web distribution...
if not exist public\downloads mkdir public\downloads
copy /Y dist\AegisAI-Local.exe public\downloads\AegisAI-Local-Windows.exe

echo.
echo Build complete! The exe is in 'dist/' and 'public/downloads/AegisAI-Local-Windows.exe'.
pause
