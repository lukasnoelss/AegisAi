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
│              │  │  PHASE 1: Regex Detection (fast)         │   │     │
│              │  │    • Structured PII: emails, phones,     │   │     │
│              │  │      IBANs, SSNs, cards, VAT, postcodes  │   │     │
│              │  │    • Addresses, PO Boxes, signatures     │   │     │
│              │  │    • Company names, passwords, secrets   │   │     │
│              │  │    • Names via salutations & labels      │   │     │
│              │  │                                          │   │     │
│              │  │  PHASE 2: Gemma3 240M LLM (semantic)     │   │     │
│              │  │    • Deep contextual name/company detect │   │     │
│              │  │    • Catches PII that regex cannot       │   │     │
│              │  │                                          │   │     │
│              │  │  PHASE 3: Replacement engine              │   │     │
│              │  │    • Whitespace-flexible substitution    │   │     │
│              │  │    • Cascading root-word replacement     │   │     │
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
| Local LLM | Ollama — Gemma3 240M (runs entirely on-device) |
| Cloud LLMs | Google Gemini (`gemini-2.5-flash`), Anthropic Claude |

## Privacy Pipeline — Detection Categories

The deembeder uses a **two-layer approach**: regex for structured/patterned PII, then **Gemma3 240M** (via Ollama) for semantic, context-dependent detection that regex cannot catch.

| Layer | What it catches |
|-------|----------------|
| **Regex** — Identifiers | Emails, phone numbers, IBANs, credit/debit cards, SSNs (incl. masked), VAT numbers, account numbers |
| **Regex** — Locations | Street addresses, PO Boxes, postcodes (UK/US/IE), country names |
| **Regex** — Names | Salutation names (`Dear X`), field labels (`Borrowers: X`), middle initials, capitalized word heuristic, signature blocks |
| **Regex** — Credentials | Passwords & alphanumeric tokens, API keys, env vars, secrets |
| **Regex** — Companies | Legal suffix patterns (`Ltd`, `Inc`, `LLC`), CamelCase brands (`MediMatch`, `PayPal`) |
| **Gemma3 LLM** — Semantic | Person names in natural context, organization names without suffixes, and any remaining PII the regex layer missed — uses a focused prompt for thorough, context-aware extraction |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Ollama** — [install from ollama.ai](https://ollama.ai) with the Gemma3 240M model pulled
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
