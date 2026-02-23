import sys
import os

def patch_deembeder():
    file_path = "src/gemma/deembeder.py"
    with open(file_path, "r") as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    
    in_func = False
    logic_ended = False
    
    for line in lines:
        if line == "# ──────────────────────────────────────────────":
            pass # Keep it
            
        if line.startswith("if len(sys.argv) > 1:"):
            # Start injecting the function wrapper before the sys.argv block
            new_lines.append("def run_deembeder(phrase_to_edit):")
            new_lines.append("    global sensitive_info, key_counts")
            new_lines.append("    sensitive_info = {}")
            new_lines.append("    key_counts = {}")
            in_func = True
            continue
            
        if line.startswith("else:") or line.startswith("    phrase_to_edit = sys.argv[1]") or line == '    phrase_to_edit = ""':
            if in_func and not logic_ended:
                continue # Skip old phrase_to_edit assignments
                
        if line == "sensitive_info = {}" or line == "key_counts = {}":
            if in_func and not logic_ended:
                continue # Skip old global reset
                
        if line == "output = {":
            if in_func and not logic_ended:
                new_lines.append("    output = {")
                logic_ended = True # Reached the end
                continue
                
        if logic_ended and line.startswith("print(json.dumps(output, indent=2))"):
            new_lines.append("    return output")
            new_lines.append("")
            new_lines.append("if __name__ == '__main__':")
            new_lines.append("    if len(sys.argv) > 1:")
            new_lines.append("        print(json.dumps(run_deembeder(sys.argv[1]), indent=2))")
            in_func = False
            continue
            
        if in_func:
            if line.strip() == "":
                new_lines.append("")
            else:
                new_lines.append("    " + line)
        else:
            new_lines.append(line)

    with open(file_path, "w") as f:
        f.write('\n'.join(new_lines))

if __name__ == "__main__":
    patch_deembeder()
    print("Patch applied to deembeder.py")
