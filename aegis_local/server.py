from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

from .gemma.deembeder import run_deembeder
from .gemma.reconstructor import run_reconstructor

app = Flask(__name__)
CORS(app)

@app.route("/api/deembed", methods=["POST"])
def deembed():
    data = request.json
    if not data or "prompt" not in data:
        return jsonify({"error": "Missing 'prompt' field"}), 400
    try:
        result = run_deembeder(data["prompt"])
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/reconstruct", methods=["POST"])
def reconstruct():
    data = request.json
    if not data or "sensitive_info" not in data or "desensitized_prompt" not in data:
        return jsonify({"error": "Missing 'sensitive_info' or 'desensitized_prompt'"}), 400
    try:
        result = run_reconstructor(data["sensitive_info"], data["desensitized_prompt"])
        return jsonify({"reconstructed": result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

def main():
    port = int(os.environ.get("PORT", 3001))
    print(f"AegisAI Local Server running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port)

if __name__ == "__main__":
    main()
