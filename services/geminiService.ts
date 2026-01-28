
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export const generateWebsite = async (prompt: string, history: Message[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a world-class senior frontend developer and UI/UX designer.
    Your task is to generate a fully functional, beautiful, and responsive single-file website using HTML and Tailwind CSS.
    
    GUIDELINES:
    1. Always include the Tailwind CSS CDN script in the <head>.
    2. Use high-quality placeholders from picsum.photos for images.
    3. Ensure the design is modern, professional, and mobile-friendly.
    4. Provide the COMPLETE HTML code within a single response.
    5. Do not include markdown code blocks (like \`\`\`html) in the final output string, just the raw HTML code.
    6. If the user asks for changes, update the existing code to reflect those changes while keeping the overall structure.
    7. Use vibrant colors and clean typography.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        { role: 'user', parts: [{ text: `Previous History: ${JSON.stringify(history)}` }] },
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate website content.");
  }
};
