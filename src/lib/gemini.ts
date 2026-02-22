import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error("VITE_GEMINI_API_KEY is missing from environment variables!");
}

// Initializing Gemini
const genAI = new GoogleGenerativeAI(API_KEY || "");

export const getGeminiResponse = async (prompt: string, history: { role: string; parts: { text: string }[] }[] = []) => {
  try {
    console.log("Calling Gemini API...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Gemini Response received successfully");
    return text;
  } catch (error: any) {
    console.error("Gemini API Full Error:", error);
    // Specifically check for API key issues
    if (error?.message?.includes("API_KEY_INVALID")) {
      return "Error: Your Gemini API key is invalid. Please check your .env file.";
    }
    return `Sorry, I encountered an error: ${error.message || "Unknown error"}`;
  }
};
