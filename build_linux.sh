#!/bin/bash
echo "Setting up local environment for Linux..."
python3 -m venv venv
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Building standalone Linux executable..."
python -m PyInstaller --onefile --log-level=WARN --paths aegis_local/gemma --name AegisAI-Local aegis_local/server.py

echo "Bundling for distribution..."
mkdir -p public/downloads
tar -czvf public/downloads/AegisAI-Local-Linux.tar.gz -C dist AegisAI-Local

echo "Build complete! Linux distribution archive is in 'public/downloads/AegisAI-Local-Linux.tar.gz'."
