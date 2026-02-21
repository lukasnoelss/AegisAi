# AEGIS AI — Hackathon Pitch Script

## HackEurope × BlueDot Impact Track (Defensive Acceleration)

### Format: 2 min pitch/demo (live) + 1 min Q&A

---

## SCRIPT (~2 minutes)

### HOOK — The Problem (20 sec)

> "Last month, a Samsung engineer accidentally pasted proprietary source code into ChatGPT. It's now part of OpenAI's training data. Forever.
>
> Every single day, millions of people paste confidential contracts, medical records, API keys, and personal data into AI chatbots — and every single one of those prompts leaves your device and hits a server you don't control.
>
> The AI safety community calls this **the prompt leakage problem**, and right now, nobody is solving it at the input layer."

---

### THE SOLUTION — What is Aegis? (25 sec)

> "We built **Aegis AI** — a privacy-first AI chat client that encrypts your sensitive information _before_ it ever leaves your machine.
>
> When you type a prompt, Aegis runs a local AI model — Gemma, running entirely on your device — that detects and strips every piece of sensitive data: names, addresses, bank accounts, API keys, credentials. It replaces them with encrypted placeholders.
>
> The sanitized prompt goes to the cloud AI. The AI responds using those same placeholders. Then Aegis reconstructs the real information locally, so you see the full answer — but the cloud model _never saw your data_."

---

### LIVE DEMO (40 sec)

> "Let me show you."

**[Screen share — Aegis AI open in browser]**

> "Here's a confidential board document from a fictional company — it contains names, financial figures, bank account numbers, and addresses."

**[Paste the Aurion settlement agreement, hit send with Privacy ON]**

> "Watch the status: 'Stripping sensitive info' — that's our local Gemma model running on-device. Now it sends the sanitized version to Gemini. And here's the response."

**[Click 'Privacy Pipeline' debug panel to expand]**

> "This is the transparency layer. You can see exactly what happened:
>
> - **Original prompt** — your full text with real data
> - **Desensitized** — what the AI actually received. Notice: names are gone, account numbers are gone, addresses are gone — replaced with `[NAME]`, `[ACCOUNT_NUMBER]`, `[ADDRESS]`
> - **AI response** — the model answered using placeholders
> - **Reconstructed** — the final answer with your real data restored, shown only to you
>
> The cloud AI never saw a single real name, address, or account number."

---

### TECHNICAL DEPTH (15 sec)

> "Under the hood, Aegis uses a three-layer extraction pipeline:
>
> 1. **Regex layer** — catches structured PII: emails, dates, IBANs, API keys, JWTs, connection strings
> 2. **Local LLM layer** — Gemma 3 1B catches unstructured PII: names, companies, addresses
> 3. **Context-aware detection** — pattern-matches `KEY = value` pairs for secrets and credentials
>
> All three run locally. Nothing leaves your machine until it's clean."

---

### WHY THIS MATTERS — BlueDot Track Fit (15 sec)

> "BlueDot's Defensive Acceleration philosophy says: the best response to AI risk is building defensive tools faster than offensive capabilities scale.
>
> Aegis is exactly that — a **defensive layer** that sits between humans and cloud AI, ensuring that the most powerful models in the world can help you without ever learning who you are.
>
> We're not restricting AI. We're making it safe to use."

---

### CLOSE — Startup Potential (10 sec)

> "Aegis can be an enterprise product tomorrow. Plug it into any company's AI workflow — Slack bots, internal copilots, customer support — and guarantee that proprietary data never leaves the building.
>
> **Aegis AI: Private. Intelligent. Yours.**"

---

## Q&A PREP (likely questions)

**Q: What if the local LLM misses something?**

> "We use a three-layer approach — regex catches structured patterns the LLM might miss, and vice versa. We also have a transparency panel so users can verify what was sent. It's defense in depth."

**Q: Why not just run the whole AI locally?**

> "Local models are getting better, but frontier models like GPT-4, Gemini, and Claude are still far more capable. Aegis gives you the power of cloud AI with the privacy of local AI — best of both worlds."

**Q: How fast is it?**

> "The local Gemma model adds 1-3 seconds. For enterprise use cases — legal docs, medical records, financial analysis — that's a trivial cost for guaranteed data protection."

**Q: What models do you support?**

> "Currently Gemini and Claude, but the architecture is model-agnostic. Any API-based LLM can be plugged in."

**Q: Could this be a browser extension?**

> "Absolutely — that's a natural next step. Imagine a Chrome extension that intercepts prompts to any AI chatbot and sanitizes them in real-time. Same pipeline, universal protection."

---

## JUDGING CRITERIA ALIGNMENT

| Criteria                 | How Aegis Scores                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Startup Potential**    | Clear enterprise market (compliance, legal, healthcare). Every company using AI needs this. Simple pricing model (per-seat SaaS).                           |
| **Technical Complexity** | Hybrid regex + local LLM pipeline, Express backend, real-time Firestore sync, multi-model support, chunked parallel processing for large documents.         |
| **Execution**            | Fully working product with live demo. Clean UI with model switching, privacy toggle, transparency panel. Not a mockup — real pipeline processing real data. |
