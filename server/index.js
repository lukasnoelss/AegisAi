import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Resolve paths to Python scripts
const DEEMBEDER_PATH = path.resolve(__dirname, "../src/gemma/deembeder.py");
const RECONSTRUCTOR_PATH = path.resolve(__dirname, "../src/gemma/reconstructor.py");

/**
 * Run a Python script with arguments and return stdout as a string.
 * Uses a 45-second timeout to prevent hanging.
 */
function runPython(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [scriptPath, ...args], {
      timeout: 60000, // 60 second timeout for chunked processing
    });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python exited with code ${code}: ${stderr || "timeout"}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });

    // Hard timeout fallback
    setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Timeout: deembeder took longer than 60 seconds. Ollama may be overloaded."));
    }, 60000);
  });
}

/**
 * POST /api/deembed
 * Body: { prompt: string }
 * Returns: { sensitive_info: Record<string, string>, desensitized_prompt: string }
 */
app.post("/api/deembed", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'prompt' field" });
  }

  try {
    console.log("[deembed] Processing prompt...");
    const output = await runPython(DEEMBEDER_PATH, [prompt]);
    const parsed = JSON.parse(output);
    console.log("[deembed] Found", Object.keys(parsed.sensitive_info).length, "sensitive items");
    res.json(parsed);
  } catch (err) {
    console.error("[deembed] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/reconstruct
 * Body: { sensitive_info: Record<string, string>, desensitized_prompt: string }
 * Returns: { reconstructed: string }
 */
app.post("/api/reconstruct", async (req, res) => {
  const { sensitive_info, desensitized_prompt } = req.body;

  if (!sensitive_info || !desensitized_prompt) {
    return res.status(400).json({ error: "Missing 'sensitive_info' or 'desensitized_prompt'" });
  }

  try {
    console.log("[reconstruct] Restoring placeholders...");
    const inputJson = JSON.stringify({ sensitive_info, desensitized_prompt });
    const output = await runPython(RECONSTRUCTOR_PATH, [inputJson]);
    console.log("[reconstruct] Done");
    res.json({ reconstructed: output });
  } catch (err) {
    console.error("[reconstruct] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Privacy pipeline server running on http://localhost:${PORT}`);
});
