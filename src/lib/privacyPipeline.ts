const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

interface DeembedResult {
  sensitive_info: Record<string, string>;
  desensitized_prompt: string;
}

interface ReconstructResult {
  reconstructed: string;
}

/**
 * Send a raw user prompt to the local privacy server.
 * The server runs deembeder.py (which uses local Ollama/gemma3:1b)
 * to strip PII and return placeholders + a mapping.
 */
export const deembed = async (prompt: string): Promise<DeembedResult> => {
  const response = await fetch(`${BACKEND_URL}/api/deembed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Deembed failed: ${err.error}`);
  }

  return response.json();
};

/**
 * Send the LLM response (which contains [PLACEHOLDER] tokens)
 * along with the sensitive_info mapping to the local server.
 * The server runs reconstructor.py to restore real values.
 */
export const reconstruct = async (
  sensitive_info: Record<string, string>,
  desensitized_prompt: string
): Promise<string> => {
  const response = await fetch(`${BACKEND_URL}/api/reconstruct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sensitive_info, desensitized_prompt }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Reconstruct failed: ${err.error}`);
  }

  const data: ReconstructResult = await response.json();
  return data.reconstructed;
};

/**
 * Check if the privacy backend server is running.
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
};
