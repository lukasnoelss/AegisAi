import json
import re
import sys

if len(sys.argv) < 2:
    print("Usage: python reconstructor.py '<json_string>'  OR  python reconstructor.py path/to/file.json", file=sys.stderr)
    sys.exit(1)

arg = sys.argv[1]

try:
    # Try parsing directly as a JSON string
    data = json.loads(arg)
except json.JSONDecodeError:
    # Fall back to treating it as a file path
    with open(arg, "r") as f:
        data = json.load(f)

sensitive_info = data["sensitive_info"]
desensitized = data["desensitized_prompt"]
# Sort by key length descending so longer placeholders (e.g. STREET_ADDRESS)
# are restored before shorter overlapping ones (e.g. ADDRESS).
reconstructed = desensitized
for key, value in sorted(sensitive_info.items(), key=lambda x: len(x[0]), reverse=True):
    placeholder = f"[{key}]"
    reconstructed = reconstructed.replace(placeholder, value)

# Warn about any placeholders that were not resolved
remaining = re.findall(r'\[[A-Z_0-9]+\]', reconstructed)
if remaining:
    print(f"Warning: unresolved placeholders: {remaining}", file=sys.stderr)

print(reconstructed)
