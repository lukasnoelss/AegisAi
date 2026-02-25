# Aegis AI — Privacy-First Chat Interface

Aegis AI is a privacy-first chat application that **de-identifies sensitive information** before sending prompts to cloud-based LLMs (like Gemini or Claude), then **reconstructs** the original data into the response — ensuring your Personally Identifiable Information (PII) never leaves your device.

## Why Aegis AI?

When you chat with standard AI models, your private data—names, addresses, financial details, and company information—is often sent directly to cloud servers. Aegis AI introduces a **Local Privacy Shield** that intercepts your message, removes the sensitive data, and replaces it with secure placeholders before it ever hits the internet. When the AI responds, Aegis restores your data locally, giving you a seamless, private experience.

## Getting Started

Aegis AI relies on a secure local server running on your machine to process text and protect your privacy.

There are two ways to run the Aegis Privacy Server:

### Option 1: Standard Python Installation (Recommended)

If you have Python installed, you can simply install our secure local package from PyPI.

```sh
# 1. Install the official PyPI package (this automates pulling the necessary local models)
pip install aegis-local

# 2. Start the local server
aegis-server
```
The server will boot up and securely listen on port 3001.

### Option 2: Standalone Executable

If you do not have Python installed or prefer not to use the terminal, download the standalone binary (available for macOS, Windows, and Linux). Once downloaded, simply execute the file and the server will run in the background.

## Usage

Once the local privacy server is running (`aegis-server`), open the Aegis AI web interface. The interface will automatically connect to your local server on port 3001, enabling the Privacy Shield for all your conversations.

The web app is accessible at: `https://chatty-aegis.com` *(example URL)*

## How It Works (High Level)

1. **You type a prompt.**
2. **Local Shield:** The Aegis local server automatically detects and strips sensitive data (names, addresses, IDs).
3. **Cloud Processing:** A sanitized prompt is sent to the cloud LLM (Gemini or Claude). No PII leaves your device.
4. **Local Restoration:** The AI responds with placeholders, and the Aegis local server swaps them back to your real, private values.
5. **Final Output:** You see the normal, helpful response with your data intact.

## Support

If you need help setting up your local Aegis server, please contact support.

## License

This software is provided under a proprietary license for use with the Aegis AI platform. All rights reserved.
