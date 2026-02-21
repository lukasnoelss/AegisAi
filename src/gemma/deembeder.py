import json
import re
import sys
import urllib.request

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
    # Account/routing numbers (6-18 digit sequences)
    (r'\b\d{6,18}\b', "ACCOUNT_NUMBER"),
]

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

# Also extract address-like patterns (number + street + city + state + zip)
address_pattern = r'\b\d{1,5}\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Road|Rd|Terrace|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl|Suite\s+\d+)[,.\s]+[A-Z][a-zA-Z\s]+,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b'
for match in re.finditer(address_pattern, phrase_to_edit):
    add_sensitive("ADDRESS", match.group(0))

# ──────────────────────────────────────────────
# PHASE 2: LLM-based extraction (names, addresses, companies)
# ──────────────────────────────────────────────
extract_prompt = (
    "List every person name, company name, and street address in this text.\n"
    "Include ALL of them, not just the first one.\n"
    "Include names that appear with titles like CEO, President, etc.\n"
    "\n"
    "Format: one per line, exactly as written in the text:\n"
    "NAME: first and last name\n"
    "COMPANY_NAME: company or organization name\n"
    "ADDRESS: full street address\n"
    "\n"
    f"Text: {phrase_to_edit}"
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("response", "").strip()
    except Exception as e:
        print(f"Warning: Ollama error: {e}", file=sys.stderr)
        return ""

llm_output = run_ollama(extract_prompt)

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
        
        # Only accept known keys
        if key in ("NAME", "COMPANY_NAME", "ADDRESS", "USERNAME", "PASSWORD"):
            # Validate: value should exist in the original text
            if not value or len(value) < 2:
                continue
            if value not in phrase_to_edit:
                continue
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
