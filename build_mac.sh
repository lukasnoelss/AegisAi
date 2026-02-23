#!/bin/bash
echo "Setting up virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Building standalone Mac executable..."
python -m PyInstaller --onefile --log-level=WARN --paths src/gemma --name AegisAI-Local server.py

echo "Zipping for distribution..."
mkdir -p public/downloads
zip -j public/downloads/AegisAI-Local-Mac.zip dist/AegisAI-Local

echo "Build complete! Mac distribution zip is in 'public/downloads/AegisAI-Local-Mac.zip'."

