import json
import re
import sys
import urllib.request

# ──────────────────────────────────────────────
# PHASE 1: Regex-based extraction (reliable)
# ──────────────────────────────────────────────
def run_deembeder(phrase_to_edit):
    global sensitive_info, key_counts
    sensitive_info = {}
    key_counts = {}
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

        # VAT numbers (EU/UK formats: GB 123 4567 89, IE1234567T, DE123456789, etc.)
        (r'\bVAT\s*(?:No\.?|Number|#|Reg\.?)?\s*:?\s*[A-Z]{2}\s*\d[\d\s]{5,12}\w?\b', "VAT_NUMBER"),
        (r'\b[A-Z]{2}\d{7,12}\w?\b', "VAT_NUMBER"),

        # Postcodes / Zip codes
        # UK postcodes (SW1A 1AA, EC2R 8AH, WC2A 1AP)
        (r'\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b', "POSTCODE"),
        # Irish Eircodes (D02 Y006, T12 AB34)
        (r'\b[A-Z]\d{2}\s*[A-Z0-9]{4}\b', "POSTCODE"),
        # US zip codes (handled by ACCOUNT_NUMBER already but explicit)
        (r'\b\d{5}(?:-\d{4})?\b', "POSTCODE"),

        # Country names
        (r'\b(?:United Kingdom|United States|United Arab Emirates|Ireland|England|Scotland|Wales|Northern Ireland|France|Germany|Spain|Italy|Netherlands|Belgium|Switzerland|Austria|Portugal|Sweden|Norway|Denmark|Finland|Poland|Czech Republic|Hungary|Romania|Bulgaria|Greece|Turkey|Russia|China|Japan|South Korea|India|Pakistan|Bangladesh|Sri Lanka|Australia|New Zealand|Canada|Mexico|Brazil|Argentina|Colombia|South Africa|Nigeria|Kenya|Egypt|Saudi Arabia|Israel|Singapore|Malaysia|Indonesia|Philippines|Thailand|Vietnam)\b', "COUNTRY"),

        # Passwords: "password is Hunter2", "passcode: abc123", "pin is 1234"
        (r'(?:password|passcode|passphrase|pin|secret|pwd)\s*(?:is|was|:|=)\s*(\S+)', "PASSWORD"),

        # Alphanumeric strings (mix of letters AND digits, 4+ chars) — likely passwords/tokens
        # Must contain at least one letter AND one digit to qualify
        (r'\b(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[A-Za-z\d!@#$%^&*]{4,}\b', "PASSWORD"),

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

    # PO Box addresses: "PO Box 9948, Bellevue, WA"
    po_box_pattern = r'\bP\.?O\.?\s*Box\s+\d+(?:[,\s]+[A-Z][a-zA-Z\s]+)*(?:[,\s]+[A-Z]{2})?\b'
    for match in re.finditer(po_box_pattern, phrase_to_edit, re.IGNORECASE):
        add_sensitive("ADDRESS", match.group(0).strip().rstrip(","))

    # Masked SSNs: "XXX-XX-4928", "***-**-1234"
    masked_ssn_pattern = r'[X*]{3}[-\s]?[X*]{2}[-\s]?\d{4}'
    for match in re.finditer(masked_ssn_pattern, phrase_to_edit, re.IGNORECASE):
        add_sensitive("SSN", match.group(0))

    # Names with middle initials: "Jonathan H. Sterling", "Eleanor V. Sterling"
    middle_initial_name = r'\b([A-Z][a-z]{2,})\s+[A-Z]\.?\s+([A-Z][a-z]{2,})\b'
    for match in re.finditer(middle_initial_name, phrase_to_edit):
        full = match.group(0)
        add_sensitive("NAME", full)

    # Names after field labels: "Borrowers: Jonathan", "Client: John Smith", "Name: Jane"
    label_name_pattern = r'(?:Borrowers?|Clients?|Name|Tenant|Landlord|Applicant|Patient|Employee|Employer|Plaintiff|Defendant|Owner|Seller|Buyer|Lessee|Lessor|Guarantor|Insured|Beneficiary|Applicant|Recipient|Sender|Author|Contact)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)?(?:\s*(?:&|and)\s*[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)?)*)'
    for match in re.finditer(label_name_pattern, phrase_to_edit):
        add_sensitive("NAME", match.group(1).strip())

    # General addresses: number + street name + (optional city)
    # Catches "54 Olmer road, Dublin", "14 Maple Street", etc.
    general_address_pattern = r'\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(?:Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Road|Rd|Terrace|Ter|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl|Close|Crescent|Cres|Park|Gardens|Gdn|Square|Sq|Row|Walk|Hill|Mount|View|Green|Rise|Grove|Mews)(?:\b[,\s]+[A-Z][a-zA-Z\s]+)?'
    for match in re.finditer(general_address_pattern, phrase_to_edit, re.IGNORECASE):
        add_sensitive("ADDRESS", match.group(0).strip().rstrip(","))

    # Company/organization names with legal entity suffixes
    # Catches "JJ Solicitors", "AURION SYSTEMS INC.", "Acme Ltd", etc.
    company_pattern = r'\b([A-Z][A-Za-z&]+(?:\s+[A-Z][A-Za-z&]+){0,3})\s+(?i:Solicitors?|Attorneys|Law\s+Firm|LLP|LLC|Ltd|Limited|Inc|Incorporated|Corp|Corporation|Associates|Partners|Group|Holdings|Consulting|Services|Solutions|Agency|Bank|Insurance|Trust|Foundation)(?:\s+and\s+(?:Sons|Co|Associates|Partners|Family))?\.?\b'
    for match in re.finditer(company_pattern, phrase_to_edit):
        add_sensitive("COMPANY_NAME", match.group(0).strip())

    # CamelCase/PascalCase brand names: "MediMatch", "PayPal", "OpenAI", "HealthSync", etc.
    # Words with non-consecutive capitals are almost always brand/company names
    camelcase_pattern = r'\b[A-Z][a-z]+(?:[A-Z][a-z]*)+\b'
    for match in re.finditer(camelcase_pattern, phrase_to_edit):
        word = match.group(0)
        # Skip common English words that happen to look camelCase-ish
        if word.lower() not in COMMON_WORDS:
            add_sensitive("COMPANY_NAME", word)

    # Names after salutations: "Dear Advik", "My dearest Elara", "Respected Mr. Singh", etc.
    salutation_pattern = r'(?i:(?:My\s+)?(?:Dear|Dearest|Respected|Beloved|Hi|Hello|Hey|Attn|Attention))\s+(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?|Sir|Madam|Miss)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})'
    for match in re.finditer(salutation_pattern, phrase_to_edit):
        name = match.group(1).strip()
        if name.lower() not in COMMON_WORDS:
            add_sensitive("NAME", name)

    # Signature block detection: everything after closing phrases
    # Catches "Sincerely, Advik Bahadur\nCEO, Aurion Systems"
    signature_closings = (
        r'(?:Sincerely|Regards|Best\s+regards|Kind\s+regards|Warm\s+regards|'
        r'Yours\s+(?:sincerely|faithfully|truly)|Best\s+wishes|'
        r'Thank\s+you|Thanks|Respectfully|Cordially|Cheers|'
        r'With\s+(?:thanks|appreciation|gratitude))'
    )
    sig_pattern = signature_closings + r'[,.]?\s*\n([\s\S]+)$'
    sig_match = re.search(sig_pattern, phrase_to_edit, re.IGNORECASE | re.MULTILINE)
    if sig_match:
        sig_block = sig_match.group(1).strip()
        if sig_block:
            # Redact each non-empty line in the signature block
            for line in sig_block.split('\n'):
                line = line.strip()
                if line and len(line) > 1:
                    add_sensitive("SIGNATURE", line)

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
            "model": "gemma3:270m",
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

    # ──────────────────────────────────────────────
    # PHASE 2a: Names + Companies focused LLM pass
    # ──────────────────────────────────────────────
    def build_names_and_companies_prompt(text_chunk):
        """Focused prompt for person names AND company/org names."""
        return (
            "List every person's name AND every company/organization/business name "
            "in this text. Extract the EXACT text as written.\n\n"
            "For people: include first names, last names, full names, nicknames.\n"
            "For companies: include the full name (e.g. 'Aurion Systems Inc'), "
            "and any short/abbreviated versions used.\n\n"
            "Format: one per line:\n"
            "NAME: person name\n"
            "COMPANY_NAME: company or org name\n"
            "If nothing found, respond with: NONE\n\n"
            f"Text: {text_chunk}"
        )

    # Run combined name + company extraction
    chunks = chunk_text(phrase_to_edit)
    for chunk in chunks:
        prompt = build_names_and_companies_prompt(chunk)
        output = run_ollama(prompt)
        parse_llm_output(output, phrase_to_edit)

    # ──────────────────────────────────────────────
    # PHASE 2b: Broad LLM extraction (everything else)
    # ──────────────────────────────────────────────
    for chunk in chunks:
        extract_prompt = build_extract_prompt(chunk)
        llm_output = run_ollama(extract_prompt)
        parse_llm_output(llm_output, phrase_to_edit)

    # ──────────────────────────────────────────────
    # PHASE 3: Build desensitized prompt
    # ──────────────────────────────────────────────

    # Common suffixes/words that should NOT be matched standalone
    COMPANY_SUFFIX_WORDS = {
        "inc", "inc.", "llc", "ltd", "limited", "corp", "corporation", "co", "co.",
        "llp", "plc", "group", "holdings", "services", "solutions", "consulting",
        "associates", "partners", "agency", "bank", "insurance", "trust",
        "foundation", "solicitors", "solicitor", "attorneys", "systems", "system",
        "technologies", "technology", "tech", "digital", "global", "international",
        "capital", "ventures", "labs", "studio", "studios", "media", "network",
        "networks", "platform", "software", "data", "cloud", "ai", "sons",
        # Common English words / conjunctions / prepositions
        "and", "the", "of", "for", "in", "on", "at", "to", "by", "with",
        "our", "its", "his", "her", "not", "all", "new", "one", "two",
        "first", "last", "best", "top", "pro", "big", "old", "real",
        "family", "management", "enterprise", "united", "general", "national",
    }

    # Collect root words from company names for cascading replacement
    company_roots = {}  # maps root_word -> placeholder_key
    company_variants = []  # list of (variant_text, placeholder_key)
    for key, value in sensitive_info.items():
        if "COMPANY" in key:
            words = value.split()
            for word in words:
                clean = word.strip(".,;:!?\"'()").lower()
                # Skip if it's a common suffix/generic word or single char
                if clean in COMPANY_SUFFIX_WORDS or len(clean) < 2:
                    continue
                company_roots[clean] = key
            # Generate partial variants: "JJ Solicitors" from "JJ Solicitors and Sons"
            # Strip trailing "and X" pattern
            stripped = re.sub(r'\s+and\s+\w+$', '', value, flags=re.IGNORECASE).strip()
            if stripped != value and len(stripped) > 2:
                company_variants.append((stripped, key))

    # Helper: make whitespace-flexible regex from a literal string
    # "JJ Solicitors and Sons" -> r"JJ\s+Solicitors\s+and\s+Sons"
    def flex_ws_pattern(text):
        return r'\s+'.join(re.escape(w) for w in text.split())

    # Sort by value length descending to replace longer matches first
    desensitized_output = phrase_to_edit
    for key, value in sorted(sensitive_info.items(), key=lambda x: len(x[1]), reverse=True):
        # Use whitespace-flexible pattern so newlines/extra spaces don't break matching
        pattern = flex_ws_pattern(value)
        desensitized_output = re.sub(pattern, f"[{key}]", desensitized_output, flags=re.IGNORECASE)

    # Replace partial company variants (e.g. "JJ Solicitors" without "and Sons")
    for variant, placeholder_key in company_variants:
        pattern = flex_ws_pattern(variant)
        desensitized_output = re.sub(pattern, f"[{placeholder_key}]", desensitized_output, flags=re.IGNORECASE)

    # Cascading: replace any remaining standalone mentions of company root words
    for root_word, placeholder_key in company_roots.items():
        pattern = r'\b' + re.escape(root_word) + r'\b'
        desensitized_output = re.sub(pattern, f"[{placeholder_key}]", desensitized_output, flags=re.IGNORECASE)

    # Cascading: replace any remaining standalone mentions of NAME words
    NAME_SKIP_WORDS = {"mr", "mrs", "ms", "dr", "prof", "sir", "madam", "miss", "the", "and", "of"}
    for key, value in sensitive_info.items():
        if "NAME" in key and "COMPANY" not in key:
            for word in value.split():
                clean = word.strip(".,;:!?\"'()")
                if len(clean) < 3 or clean.lower() in NAME_SKIP_WORDS:
                    continue
                pattern = r'\b' + re.escape(clean) + r'\b'
                desensitized_output = re.sub(pattern, f"[{key}]", desensitized_output, flags=re.IGNORECASE)

    # Final sweep: re-check all values one more time
    for key, value in sorted(sensitive_info.items(), key=lambda x: len(x[1]), reverse=True):
        pattern = flex_ws_pattern(value)
        desensitized_output = re.sub(pattern, f"[{key}]", desensitized_output, flags=re.IGNORECASE)

    output = {
        "sensitive_info": sensitive_info,
        "desensitized_prompt": desensitized_output
    }

    return output

if __name__ == '__main__':
    if len(sys.argv) > 1:
        print(json.dumps(run_deembeder(sys.argv[1]), indent=2))

