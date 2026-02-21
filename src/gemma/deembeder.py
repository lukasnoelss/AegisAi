import json
import re
import sys
import urllib.request

# ──────────────────────────────────────────────
# PHASE 1: Regex-based extraction (reliable)
# ──────────────────────────────────────────────
if len(sys.argv) > 1:
    phrase_to_edit = sys.argv[1]
else:
    phrase_to_edit = ""
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

    # Credit/debit card numbers (4 groups of 4 digits)
    (r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b', "CARD_NUMBER"),
    # "credit card" or "debit card" followed by any number/identifier
    (r'(?:credit|debit)\s+card\s*(?:#|number|no\.?)?\s*:?\s*\S+', "CARD_INFO"),

    # Account/routing numbers (6-18 digit sequences) — keep last to avoid over-matching
    (r'\b\d{6,18}\b', "ACCOUNT_NUMBER"),
]

# Lines containing • (masked/redacted card numbers like •••• 4242)
# Redact the entire line content
bullet_pattern = re.compile(r'[^\n]*\u2022[^\n]*')


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

# Redact any line containing • (masked card numbers like •••• 4242)
for match in bullet_pattern.finditer(phrase_to_edit):
    add_sensitive("MASKED_INFO", match.group(0).strip())

# Heuristic name detection: sequences of 2+ capitalized words that aren't common English
COMMON_WORDS = {
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her",
    "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its",
    "may", "new", "now", "old", "see", "way", "who", "did", "let", "say", "she",
    "too", "use", "been", "call", "come", "each", "find", "from", "give", "good",
    "have", "help", "here", "high", "just", "keep", "know", "last", "long", "look",
    "make", "many", "more", "most", "much", "must", "name", "need", "next", "only",
    "over", "part", "some", "such", "take", "tell", "than", "that", "them", "then",
    "they", "this", "time", "very", "want", "well", "went", "what", "when", "will",
    "with", "work", "year", "your", "also", "back", "been", "before", "being",
    "between", "both", "change", "could", "does", "down", "even", "first", "into",
    "just", "like", "made", "might", "move", "never", "next", "number", "other",
    "over", "right", "same", "should", "still", "think", "three", "through",
    "under", "water", "where", "which", "world", "would", "write", "about",
    "after", "again", "because", "before", "below", "between", "both", "came",
    "could", "different", "does", "during", "each", "every", "found", "great",
    "house", "large", "line", "little", "live", "place", "point", "small",
    "start", "still", "these", "those", "until", "while", "above", "important",
    "dear", "sir", "madam", "sincerely", "regards", "please", "thank", "thanks",
    "hello", "dear", "subject", "date", "from", "further", "furthermore",
    "however", "therefore", "regarding", "kindly", "note", "action", "legal",
    "matter", "issue", "account", "number", "address", "contact", "phone",
    "email", "write", "letter", "complaint", "request", "response", "reply",
    "urgent", "immediate", "attention", "add", "remove", "update", "edit",
    "delete", "create", "send", "receive", "input", "output", "data",
    "information", "details", "personal", "private", "public", "secure",
    "privacy", "security", "encrypted", "channel", "message", "chat",
    "solicitors", "solicitor", "ltd", "limited", "inc", "corp", "llp",
    "bank", "insurance", "trust", "group", "services", "associates",
}
# Match 2-4 consecutive capitalized words (potential person names)
name_candidate_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b'
for match in re.finditer(name_candidate_pattern, phrase_to_edit):
    candidate = match.group(1)
    words = candidate.split()
    # Check that at least 2 words and none are common english words
    if len(words) >= 2 and all(w.lower() not in COMMON_WORDS for w in words):
        add_sensitive("NAME", candidate)

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

# Also extract address-like patterns
# US-style: number + street + city + state + zip
us_address_pattern = r'\b\d{1,5}\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Road|Rd|Terrace|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl|Suite\s+\d+)[,.\s]+[A-Z][a-zA-Z\s]+,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b'
for match in re.finditer(us_address_pattern, phrase_to_edit):
    add_sensitive("ADDRESS", match.group(0))

# General addresses: number + street name + (optional city)
# Catches "54 Olmer road, Dublin", "14 Maple Street", etc.
general_address_pattern = r'\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Road|Rd|Terrace|Ter|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl|Close|Crescent|Cres|Park|Gardens|Gdn|Square|Sq|Row|Walk|Hill|Mount|View|Green|Rise|Grove|Mews)(?:\b[,\s]+[A-Z][a-zA-Z\s]+)?'
for match in re.finditer(general_address_pattern, phrase_to_edit, re.IGNORECASE):
    add_sensitive("ADDRESS", match.group(0).strip().rstrip(","))

# Company/organization names with legal entity suffixes
# Catches "JJ Solicitors", "Acme Ltd", "Smith & Co", etc.
company_pattern = r'\b([A-Z][a-zA-Z&]+(?:\s+[A-Z][a-zA-Z&]+){0,3})\s+(Solicitors|Solicitor|Attorneys|Law\s+Firm|LLP|LLC|Ltd|Limited|Inc|Incorporated|Corp|Corporation|Associates|Partners|Group|Holdings|Consulting|Services|Solutions|Agency|Bank|Insurance|Trust|Foundation)\b'
for match in re.finditer(company_pattern, phrase_to_edit):
    add_sensitive("COMPANY_NAME", match.group(0).strip())

# ──────────────────────────────────────────────
# PHASE 2: LLM-based extraction (names, addresses, companies)
# ──────────────────────────────────────────────

# Chunking for large prompts: split into manageable pieces for Ollama
MAX_CHUNK_SIZE = 1500
OVERLAP = 200

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
        return (
            "You are a privacy-protection AI. Your job is to find ALL, be conservative and extract, if even slightly unsure remove it.   sensitive or personally "
            "identifiable information in the text below. Be aggressive — if in doubt, flag it.\n\n"
            "Sensitive information includes but is NOT limited to:\n"
            "- Names of people (first, last, full, nicknames, usernames, ANY NAMES)\n"
            "- Names of companies, law firms, organizations, schools, hospitals\n"
            "- Addresses, streets, cities, postcodes, locations\n"
            "- Phone numbers, emails, account numbers, reference numbers\n"
            "- Dates of birth, ages tied to individuals\n"
            "- Financial info: bank names, sort codes, IBANs, amounts tied to individuals\n"
            "- Any code, password, API key, token, or credential\n\n"
            "Format: one item per line as CATEGORY: exact_value\n"
            "Categories: NAME, COMPANY_NAME, ADDRESS, PHONE, EMAIL, DOB, "
            "ACCOUNT_NUMBER, FINANCIAL_INFO, SECRET, OTHER_PII\n\n"
            f"Text: {text_chunk}"
        )
    else:
        return (
            "You are a privacy-protection AI performing sensitive data extraction. "
            "Your task is to identify and list EVERY piece of sensitive, private, or "
            "personally identifiable information, even if slightly unsure remove it. in the text below.\n\n"
            "USE YOUR SEMANTIC JUDGMENT. If something could identify a person, organization, "
            "location, or reveal private details — extract it. When in doubt, be conservative and extract it.\n\n"
            "Categories of sensitive information to look for:\n"
            "- NAME: people's names (first, last, full, whatever make sure you remove NAMES), nicknames, usernames, social handles\n"
            "- COMPANY_NAME: businesses, law firms, solicitors, agencies, institutions, schools, hospitals, banks\n"
            "- ADDRESS: street addresses, postcodes/zip codes, city+country combos, specific locations\n"
            "- PHONE: phone numbers, fax numbers in any format\n"
            "- EMAIL: email addresses\n"
            "- DOB: dates of birth, ages when tied to a specific person\n"
            "- ACCOUNT_NUMBER: bank account numbers, sort codes, IBANs, customer/reference IDs\n"
            "- FINANCIAL_INFO: salary amounts, debts, loan values when tied to a person\n"
            "- MEDICAL_INFO: health conditions, medications, diagnoses tied to a person\n"
            "- LEGAL_INFO: case numbers, court names, solicitor references\n"
            "- SECRET: API keys, passwords, tokens, credentials, private keys\n"
            "- OTHER_PII: anything else that could identify or compromise someone's privacy\n\n"
            "Rules:\n"
            "1. Extract the EXACT text as it appears — do not paraphrase\n"
            "2. Include ALL instances, not just the first one\n"
            "3. One item per line in format: CATEGORY: exact_value\n"
            "4. If no sensitive data found, respond with: NONE\n\n"
            f"Text:\n{text_chunk}"
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
            if key in ("PHONE_NUMBER", "TELEPHONE", "FAX", "MOBILE"):
                key = "PHONE"
            if key in ("EMAIL_ADDRESS", "MAIL"):
                key = "EMAIL"
            if key in ("DATE_OF_BIRTH", "BIRTHDAY", "AGE"):
                key = "DOB"
            if key in ("BANK_ACCOUNT", "IBAN", "SORT_CODE", "REFERENCE", "CUSTOMER_ID", "REF"):
                key = "ACCOUNT_NUMBER"
            if key in ("SALARY", "INCOME", "DEBT", "LOAN"):
                key = "FINANCIAL_INFO"
            if key in ("HEALTH", "DIAGNOSIS", "MEDICATION", "CONDITION"):
                key = "MEDICAL_INFO"
            if key in ("CASE_NUMBER", "COURT", "SOLICITOR_REF"):
                key = "LEGAL_INFO"
            if key in ("PII", "SENSITIVE", "PRIVATE"):
                key = "OTHER_PII"
            
            # Accept known keys
            if key in ("NAME", "COMPANY_NAME", "ADDRESS", "USERNAME", "PASSWORD",
                        "API_KEY", "SECRET", "TOKEN", "CREDENTIAL", "SECRET_VALUE",
                        "PHONE", "EMAIL", "DOB", "ACCOUNT_NUMBER", "FINANCIAL_INFO",
                        "MEDICAL_INFO", "LEGAL_INFO", "OTHER_PII"):
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

# Process chunks through LLM
chunks = chunk_text(phrase_to_edit)
for chunk in chunks:
    extract_prompt = build_extract_prompt(chunk)
    llm_output = run_ollama(extract_prompt)
    parse_llm_output(llm_output, phrase_to_edit)

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
