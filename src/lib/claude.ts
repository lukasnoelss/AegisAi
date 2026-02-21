import Anthropic from "@anthropic-ai/sdk";

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

const anthropic = new Anthropic({
  apiKey: API_KEY || "",
  dangerouslyAllowBrowser: true // Required for frontend-only apps
});

export const getClaudeResponse = async (prompt: string, history: any[] = []) => {
  try {
    // Conv history conversion to Anthropic format
    const messages = history.map(h => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.parts[0].text
    }));

    // Add current message
    messages.push({ role: "user", content: prompt });

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: messages as any,
    });

    // Extract text from response
    if (response.content[0].type === 'text') {
        return response.content[0].text;
    }
    return "Error: Unsupported response format from Claude.";
  } catch (error: any) {
    console.error("Claude API Error:", error);
    return `Sorry, I encountered an error with Claude: ${error.message}`;
  }
};
