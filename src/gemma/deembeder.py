import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

if len(sys.argv) > 1:
    phrase_to_edit = sys.argv[1]
else:
    phrase_to_edit = (
        "Hi, my name is Advik Sharma and I live at 14 Maple Street, Dublin. "
        "You can reach me at advik.sharma@gmail.com or call me on +353 87 123 4567. "
        "My bank account number is IE29AIBK93115212345678 and my salary is €75,000 per year."
    )

# ──────────────────────────────────────────────
# PHASE 1: Regex-based extraction (reliable)
# ──────────────────────────────────────────────
regex_patterns = [
    # Email addresses
    (r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b', "EMAIL"),
    # Phone numbers (international and local formats)
    (r'(?:\+\d{1,4}[\s\-]?)(?:\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4}\b', "PHONE_NUMBER"),
    # IBAN
    (r'\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b', "IBAN"),
    # Transaction/reference IDs (digit-dash patterns like 9920-551-0082)
    (r'\b\d{3,5}[\-]\d{3,5}[\-]\d{3,5}\b', "REFERENCE_ID"),
    # SSN
    (r'\b\d{3}-\d{2}-\d{4}\b', "SSN"),
    # Dates (various formats)
    (r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b', "DATE"),
    (r'\b\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s+\d{4}\b', "DATE"),
    (r'\b\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b', "DATE"),

    # ── Secrets & Credentials ──

    # Google API keys (AIzaSy...)
    (r'\bAIza[A-Za-z0-9_\-]{35}\b', "API_KEY"),
    # OpenAI / Anthropic keys (sk-...)
    (r'\bsk-[A-Za-z0-9\-]{20,}\b', "API_KEY"),
    # GitHub PATs (ghp_, gho_, ghs_, ghr_)
    (r'\b(?:ghp|gho|ghs|ghr)_[A-Za-z0-9]{36,}\b', "API_KEY"),
    # AWS Access Key IDs (AKIA...)
    (r'\bAKIA[0-9A-Z]{16}\b', "AWS_ACCESS_KEY"),
    # Generic long hex/base64 tokens (32+ chars of hex or alphanumeric that look like secrets)
    (r'\b[A-Fa-f0-9]{32,}\b', "HEX_TOKEN"),

    # JWT tokens (eyJ...eyJ...signature)
    (r'\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]+\b', "JWT_TOKEN"),

    # Connection strings (mongodb://, postgres://, mysql://, redis://)
    (r'(?:mongodb|postgres|postgresql|mysql|redis|amqp)://[^\s\'"]+', "CONNECTION_STRING"),

    # Account/routing numbers (6-18 digit sequences) — keep last to avoid over-matching
    (r'\b\d{6,18}\b', "ACCOUNT_NUMBER"),
]

# Context-aware secret detector: catches KEY = "value" patterns where
# the variable name suggests it holds a secret.
SECRET_NAME_PATTERN = re.compile(
    r'(?i)([\w]*(?:key|secret|token|password|passwd|api|auth|credential|signing|encrypt|cert|private)[\w]*)'
    r'\s*[=:]\s*["\']([^"\']{4,})["\']'
)

# Also catch unquoted values: SOME_SECRET_KEY = someValue123
SECRET_NAME_UNQUOTED = re.compile(
    r'(?i)([\w]*(?:key|secret|token|password|passwd|api|auth|credential|signing|encrypt|cert|private)[\w]*)'
    r'\s*[=:]\s*([^\s,;"\'{}\[\]]{8,})'
)

sensitive_info = {}
key_counts = {}

def add_sensitive(key, value):
    """Add a sensitive item with deduplication and numbering."""
    global sensitive_info, key_counts
    value = value.strip()
    if not value or len(value) < 2:
        return
    # Skip if this exact value is already captured
    if value in sensitive_info.values():
        return
    if key in sensitive_info:
        key_counts[key] = key_counts.get(key, 1) + 1
        key = f"{key}_{key_counts[key]}"
    else:
        key_counts[key] = 1
    sensitive_info[key] = value

# Run regex extraction first
for pattern, label in regex_patterns:
    for match in re.finditer(pattern, phrase_to_edit, re.IGNORECASE):
        matched_text = match.group(0)
        add_sensitive(label, matched_text)

# Run context-aware secret detection (KEY = "value" patterns)
for pattern in [SECRET_NAME_PATTERN, SECRET_NAME_UNQUOTED]:
    for match in pattern.finditer(phrase_to_edit):
        var_name = match.group(1).strip()
        var_value = match.group(2).strip()
        # Skip if the value is too short or looks like a common non-secret
        if len(var_value) < 4:
            continue
        if var_value.lower() in ("true", "false", "none", "null", "yes", "no"):
            continue
        # Skip purely numeric values that are likely config numbers, not secrets
        if re.match(r'^\d+$', var_value) and len(var_value) < 10:
            continue
        add_sensitive("SECRET_VALUE", var_value)

# Also extract address-like patterns (number + street + city + state + zip)
address_pattern = r'\b\d{1,5}\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Road|Rd|Terrace|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl|Suite\s+\d+)[,.\\s]+[A-Z][a-zA-Z\s]+,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b'
for match in re.finditer(address_pattern, phrase_to_edit):
    add_sensitive("ADDRESS", match.group(0))

# ──────────────────────────────────────────────
# PHASE 2: LLM-based extraction (names, addresses, companies)
# ──────────────────────────────────────────────

# Chunking for large prompts: split into manageable pieces for Ollama
MAX_CHUNK_SIZE = 500
OVERLAP = 100
MAX_PARALLEL_WORKERS = 3

def chunk_text(text, max_size=MAX_CHUNK_SIZE, overlap=OVERLAP):
    """Split text into overlapping chunks for LLM processing."""
    if len(text) <= max_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_size, len(text))
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks

def build_extract_prompt(text_chunk):
    """Build the LLM extraction prompt — adapts for short vs long inputs."""
    if len(text_chunk) < 100:
        # Short prompt: use a simpler, more direct extraction
        return (
            "Extract ALL personal or sensitive information from this short text.\n"
            "Include any names (even first names only), locations, or identifiers.\n\n"
            "Format: one per line as KEY: value\n"
            "NAME: person's name\n"
            "COMPANY_NAME: company or org name\n"
            "ADDRESS: street address or location\n\n"
            f"Text: {text_chunk}"
        )
    else:
        return (
            "List every person name, company name, street address, "
            "API key, secret, token, password, and credential in this text.\n"
            "Include ALL of them, not just the first one.\n"
            "Include names that appear with titles like CEO, President, etc.\n"
            "\n"
            "Format: one per line, exactly as written in the text:\n"
            "NAME: first and last name\n"
            "COMPANY_NAME: company or organization name\n"
            "ADDRESS: full street address\n"
            "API_KEY: any API key or access key\n"
            "SECRET: any secret, token, or password value\n"
            "\n"
            f"Text: {text_chunk}"
        )

def run_ollama(prompt):
    """Use Ollama HTTP API."""
    payload = json.dumps({
        "model": "gemma3:1b",
        "prompt": prompt,
        "stream": False
    }).encode("utf-8")
    
    req = urllib.request.Request(
        "http://localhost:11434/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("response", "").strip()
    except Exception as e:
        print(f"Warning: Ollama error: {e}", file=sys.stderr)
        return ""

def parse_llm_output(llm_output, source_text):
    """Parse LLM extraction output and add to sensitive_info."""
    for line in llm_output.splitlines():
        line = line.strip().lstrip("- •*")
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip().upper().replace(" ", "_")
            value = value.strip().strip("\"'.,")
            
            # Normalize key names
            if key in ("FULL_NAME", "PERSON_NAME", "PERSON"):
                key = "NAME"
            if key in ("ORGANIZATION", "ORG", "COMPANY"):
                key = "COMPANY_NAME"
            if key in ("STREET_ADDRESS", "LOCATION", "ADDR"):
                key = "ADDRESS"
            if key in ("TOKEN", "ACCESS_KEY", "AUTH_TOKEN", "BEARER"):
                key = "SECRET"
            
            # Accept known keys
            if key in ("NAME", "COMPANY_NAME", "ADDRESS", "USERNAME", "PASSWORD",
                        "API_KEY", "SECRET", "TOKEN", "CREDENTIAL", "SECRET_VALUE"):
                # Validate: value should exist in the original text
                if not value or len(value) < 2:
                    continue
                
                # Case-insensitive check: find the value in the source text
                value_lower = value.lower()
                source_lower = source_text.lower()
                if value_lower not in source_lower:
                    continue
                
                # Use the original casing from the source text
                idx = source_lower.index(value_lower)
                value = source_text[idx:idx + len(value)]
                
                # Reject values containing digits for NAME/COMPANY (those are regex catches)
                if key == "NAME" and re.search(r'\d', value):
                    continue
                if key == "COMPANY_NAME" and re.search(r'\d{4,}', value):
                    continue
                # Reject if value contains a colon (LLM merged label + value)
                if ":" in value:
                    continue
                # Reject overly long values (>80 chars) - LLM likely merged fields
                if len(value) > 80:
                    continue
                add_sensitive(key, value)

# Process chunks through LLM — in parallel for speed
def process_chunk(chunk):
    """Process a single chunk: build prompt, call Ollama, return raw output."""
    prompt = build_extract_prompt(chunk)
    return run_ollama(prompt)

chunks = chunk_text(phrase_to_edit)
if len(chunks) == 1:
    # Single chunk — no threading overhead needed
    llm_output = process_chunk(chunks[0])
    parse_llm_output(llm_output, phrase_to_edit)
else:
    # Multiple chunks — run in parallel
    with ThreadPoolExecutor(max_workers=min(MAX_PARALLEL_WORKERS, len(chunks))) as executor:
        futures = {executor.submit(process_chunk, chunk): i for i, chunk in enumerate(chunks)}
        for future in as_completed(futures):
            try:
                llm_output = future.result()
                parse_llm_output(llm_output, phrase_to_edit)
            except Exception as e:
                print(f"Warning: chunk processing error: {e}", file=sys.stderr)

# ──────────────────────────────────────────────
# PHASE 3: Build desensitized prompt
# ──────────────────────────────────────────────
# Sort by value length descending to replace longer matches first
desensitized_output = phrase_to_edit
for key, value in sorted(sensitive_info.items(), key=lambda x: len(x[1]), reverse=True):
    desensitized_output = re.sub(re.escape(value), f"[{key}]", desensitized_output, flags=re.IGNORECASE)

output = {
    "sensitive_info": sensitive_info,
    "desensitized_prompt": desensitized_output
}

print(json.dumps(output, indent=2))
