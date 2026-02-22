# Aegis AI — Privacy-First Chat Interface

Aegis AI is a privacy-first chat application that **de-identifies sensitive information** before sending prompts to cloud-based LLMs (Gemini / Claude), then **reconstructs** the original data into the response — ensuring PII never leaves your device.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER (React + Vite)                                              │
│                                                                      │
│  User types prompt ──► ChatInput ──► Index.tsx handleSendMessage     │
│                                            │                         │
│                                            ▼                         │
│                                  ┌─────────────────┐                 │
│                                  │ Privacy Pipeline │                 │
│                                  │ (localhost:3001) │                 │
│                                  └────────┬────────┘                 │
│                                           │                          │
│              ┌────────────────────────────┼────────────────────┐     │
│              │  LOCAL PROCESSING ONLY     │                    │     │
│              │                            ▼                    │     │
│              │  ┌──────────────────────────────────────────┐   │     │
│              │  │  deembeder.py                            │   │     │
│              │  │                                          │   │     │
│              │  │  PHASE 1: Regex Detection                │   │     │
│              │  │    • Emails, phones, IBANs, SSNs         │   │     │
│              │  │    • Credit cards, VAT numbers           │   │     │
│              │  │    • Addresses, PO Boxes, postcodes      │   │     │
│              │  │    • Company names (suffix + CamelCase)  │   │     │
│              │  │    • Passwords (alphanumeric detection)   │   │     │
│              │  │    • Names (salutations, field labels,   │   │     │
│              │  │      middle initials, heuristic)         │   │     │
│              │  │    • Signature blocks, country names     │   │     │
│              │  │    • Secrets (API keys, env vars, URLs)  │   │     │
│              │  │                                          │   │     │
│              │  │  PHASE 2a: Focused LLM Pass (Ollama)     │   │     │
│              │  │    • Names + company names combined      │   │     │
│              │  │                                          │   │     │
│              │  │  PHASE 2b: Broad LLM Pass (Ollama)       │   │     │
│              │  │    • All remaining PII categories        │   │     │
│              │  │                                          │   │     │
│              │  │  PHASE 3: Replacement                    │   │     │
│              │  │    • Whitespace-flexible substitution    │   │     │
│              │  │    • Cascading root-word replacement     │   │     │
│              │  │    • Partial company name variants       │   │     │
│              │  │    • Name word cascading                 │   │     │
│              │  └──────────────────────────────────────────┘   │     │
│              └─────────────────────────────────────────────────┘     │
│                                           │                          │
│                    sensitive_info map + desensitized_prompt           │
│                                           │                          │
│                                           ▼                          │
│                              ┌──────────────────────┐                │
│                              │  Cloud LLM (Gemini   │                │
│                              │  or Claude) receives  │    SAFE       │
│                              │  ONLY [NAME_1],       │◄── No PII    │
│                              │  [ADDRESS_1], etc.    │    leaves     │
│                              └──────────┬───────────┘                │
│                                         │                            │
│                                         ▼                            │
│                              ┌──────────────────────┐                │
│                              │  reconstructor.py     │                │
│                              │  Restores [NAME_1]    │                │
│                              │  → real values back   │                │
│                              │  into LLM response    │                │
│                              └──────────┬───────────┘                │
│                                         │                            │
│                                         ▼                            │
│                              Final response shown to user            │
│                              (with real names, addresses, etc.)      │
└──────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Tailwind CSS, Framer Motion |
| Markdown | react-markdown |
| Auth & Database | Firebase (Auth + Firestore) |
| Privacy Pipeline | Node.js Express server (port 3001) |
| Local LLM | Ollama (`gemma3:270m`) |
| Cloud LLMs | Google Gemini (`gemini-2.5-flash`), Anthropic Claude |

## Privacy Pipeline — Detection Categories

The deembeder uses a **layered approach** — fast regex first, then LLM passes for context-dependent detection:

| Category | Detection Method | Examples |
|----------|-----------------|----------|
| Emails | Regex | `user@example.com` |
| Phone Numbers | Regex | `+353 87 123 4567` |
| IBAN | Regex | `GB29NWBK60161331926819` |
| Credit/Debit Cards | Regex | `4242 4242 4242 4242` |
| SSN (incl. masked) | Regex | `XXX-XX-4928` |
| VAT Numbers | Regex | `VAT No.: GB 123 4567 89` |
| Postcodes | Regex | `WC2A 1AP`, `D02 Y006`, `98101` |
| Passwords | Regex | `Hunter2`, `P4ssw0rd`, `password is X` |
| PO Box Addresses | Regex | `PO Box 9948, Bellevue, WA` |
| Street Addresses | Regex | `54 Olmer Road, Dublin` |
| Company Names (suffix) | Regex | `JJ Solicitors and Sons` |
| Company Names (CamelCase) | Regex | `MediMatch`, `PayPal` |
| Country Names | Regex | `United Kingdom`, `Ireland` |
| API Keys & Secrets | Regex | `OPENAI_API_KEY=sk-...` |
| Names (salutations) | Regex | `Dear Advik`, `My dearest Elara` |
| Names (field labels) | Regex | `Borrowers: Jonathan H. Sterling` |
| Names (middle initials) | Regex | `Eleanor V. Sterling` |
| Names (heuristic) | Regex | Two+ capitalized words |
| Signature Blocks | Regex | Everything after `Sincerely,` etc. |
| Person Names | LLM (Ollama) | Context-dependent name detection |
| Organization Names | LLM (Ollama) | Context-dependent company detection |
| All Other PII | LLM (Ollama) | Medical, legal, financial info |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Ollama** — [install from ollama.ai](https://ollama.ai) with `gemma3:270m` model pulled
- **Firebase** project with Firestore and Authentication enabled
- **API Keys** for Gemini and/or Claude

### Installation

```sh
# Clone the repository
git clone https://github.com/lukasnoelss/chatty-front.git
cd chatty-front

# Install dependencies
npm install

# Pull the Ollama model
ollama pull gemma3:270m
```

### Environment Setup

Create a `.env` file (see `.env.example`):

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_CLAUDE_API_KEY=your_claude_api_key
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running

```sh
# Terminal 1: Start the privacy pipeline server
npm run server

# Terminal 2: Start the frontend dev server
npm run dev
```

The app will be available at `http://localhost:8080`.

## Project Structure

```
chatty-front/
├── server/
│   └── index.js              # Express server — routes /deembed and /reconstruct
├── src/
│   ├── components/
│   │   └── chat/
│   │       ├── ChatInput.tsx     # Message input with privacy status
│   │       ├── ChatMessage.tsx   # Message bubble with copy/rerun buttons
│   │       ├── PrivacyDebugPanel.tsx  # Expandable pipeline visualization
│   │       ├── Sidebar.tsx       # Conversation history sidebar
│   │       ├── TypingIndicator.tsx
│   │       └── WelcomeScreen.tsx
│   ├── gemma/
│   │   ├── deembeder.py         # PII detection and replacement (Python)
│   │   └── reconstructor.py     # PII restoration (Python)
│   ├── hooks/
│   │   ├── useAuth.ts           # Firebase authentication hook
│   │   └── useChat.ts           # Firestore chat persistence hook
│   ├── lib/
│   │   ├── gemini.ts            # Gemini API client
│   │   ├── claude.ts            # Claude API client
│   │   ├── privacyPipeline.ts   # Frontend API calls to privacy server
│   │   └── firebase.ts          # Firebase configuration
│   ├── pages/
│   │   └── Index.tsx            # Main chat page — orchestrates pipeline
│   └── types/
│       └── chat.ts              # Message and Conversation types
└── package.json
```

## How It Works

1. **User types a prompt** → saved to Firestore as-is
2. **Deembeder** strips all sensitive data locally (regex + Ollama), producing a sanitized prompt and a `sensitive_info` map
3. **Sanitized prompt** is sent to the cloud LLM (Gemini or Claude) — no PII leaves the device
4. **LLM responds** using placeholders like `[NAME_1]`, `[ADDRESS_1]`
5. **Reconstructor** swaps placeholders back to real values
6. **Final response** is shown to the user with all personal data intact

## License

MIT
