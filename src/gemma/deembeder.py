import subprocess
import json
import re
import sys

if len(sys.argv) > 1:
    phrase_to_edit = sys.argv[1]
else:
    phrase_to_edit = (
        "Hi, my name is Advik Sharma and I live at 14 Maple Street, Dublin. "
        "You can reach me at advik.sharma@gmail.com or call me on +353 87 123 4567. "
        "My bank account number is IE29AIBK93115212345678 and my salary is €75,000 per year."
    )

extract_prompt = (
    "You are a data extraction tool. Identify ALL sensitive information in the phrase below. "
    "Sensitive information includes: names, addresses, cities, countries, phone numbers, emails, "
    "financial details, ID numbers, dates of birth, passwords, usernames, company names, or any "
    "other personally identifiable information. "
    "Output ONLY lines in the format: PLACEHOLDER_KEY: actual_value "
    "where PLACEHOLDER_KEY is an uppercase descriptor (e.g. NAME, CITY, EMAIL) "
    "and actual_value is the exact sensitive text found in the phrase. "
    "One item per line. No extra text, no punctuation, no explanations. "
    f"Phrase: {phrase_to_edit}"
)

def run_ollama(prompt):
    result = subprocess.run(
        ["ollama", "run", "gemma3:1b", prompt],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

extract_output = run_ollama(extract_prompt)

sensitive_info = {}
key_counts = {}
for line in extract_output.splitlines():
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    if ":" in line:
        key, _, value = line.partition(":")
        key = key.strip().upper().replace(" ", "_")
        value = value.strip().strip("\"'")
        # skip lines where the value looks like a placeholder or is empty
        if key and value and not value.startswith("[") and len(value) > 1:
            if key in sensitive_info:
                key_counts[key] = key_counts.get(key, 1) + 1
                key = f"{key}_{key_counts[key]}"
            else:
                key_counts[key] = 1
            sensitive_info[key] = value

# build desensitized prompt in code: sort by length descending to replace longer matches first
desensitized_output = phrase_to_edit
for key, value in sorted(sensitive_info.items(), key=lambda x: len(x[1]), reverse=True):
    desensitized_output = re.sub(re.escape(value), f"[{key}]", desensitized_output, flags=re.IGNORECASE)

output = {
    "sensitive_info": sensitive_info,
    "desensitized_prompt": desensitized_output
}

print(json.dumps(output, indent=2))
