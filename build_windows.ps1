# AegisAI Local Server — Windows Build Script (PowerShell)
Write-Host "Setting up local environment for Windows..." -ForegroundColor Cyan

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    python -m venv venv
}

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "Building standalone Windows executable (.exe)..." -ForegroundColor Cyan
python -m PyInstaller --onefile --log-level=WARN --paths src/gemma --name AegisAI-Local server.py

Write-Host "Copying to public/downloads for web distribution..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path public/downloads | Out-Null
Copy-Item -Force dist/AegisAI-Local.exe public/downloads/AegisAI-Local-Windows.exe

Write-Host ""
Write-Host "Build complete! The exe is in 'dist/' and 'public/downloads/AegisAI-Local-Windows.exe'." -ForegroundColor Green
Read-Host "Press Enter to exit"
