
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types.ts";

/**
 * Utility to retry a function with exponential backoff on 429 errors.
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateWebsite = async (prompt: string, history: Message[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a world-class senior frontend developer, SEO specialist, and UI/UX designer.
    Your task is to generate a fully functional, beautiful, and responsive single-file website using HTML and Tailwind CSS.
    
    GUIDELINES:
    1. Always include the Tailwind CSS CDN script in the <head>.
    2. Use high-quality placeholders from picsum.photos for images.
    3. Ensure the design is modern, professional, and mobile-friendly.
    4. Provide the COMPLETE HTML code within a single response.
    5. Do not include markdown code blocks (like \`\`\`html) in the final output string, just the raw HTML code.
    6. If the user asks for changes, update the existing code to reflect those changes while keeping the overall structure.
    7. Use vibrant colors and clean typography.
    
    SEO & META DATA:
    8. DYNAMIC SEO: You MUST include highly optimized, content-specific meta tags in the <head>.
       - <title>: A unique, catchy title (60-70 chars) based on the site topic.
       - <meta name="description">: A compelling summary (150-160 chars) of the site.
       - <meta name="keywords">: 10-15 comma-separated keywords highly relevant to the specific prompt.
       - <meta name="viewport">: Always include content="width=device-width, initial-scale=1.0".
       - <meta name="author">: Set this to "Murodjon AI".
       - SOCIAL GRAPH: Include Open Graph tags (<meta property="og:title">, <meta property="og:description">, <meta property="og:type" content="website">) with values that match the page content.

    MANDATORY BRANDING (REKLAMA):
    9. You MUST include a professional "Creator: Murodjon AI" branding badge at the bottom of the generated website. 
       - It should be a fixed element (fixed bottom-4 right-4).
       - Use Tailwind for a "glassmorphism" style: bg-white/80 backdrop-blur-md, rounded-full, px-4, py-2, border border-slate-200 shadow-lg.
       - Use an SVG icon (like a lightning bolt or a chip) next to the text "Made with Murodjon AI".
       - Ensure it has a subtle hover animation (e.g., hover:scale-105).
       - This is a non-negotiable requirement for every site you build.
  `;

  const combinedPrompt = history.length > 0 
    ? `Previous History: ${JSON.stringify(history)}\n\nUser Request: ${prompt}`
    : prompt;

  const performRequest = async (modelName: string) => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: combinedPrompt }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });
    return response.text || '';
  };

  try {
    // Try with the primary high-reasoning model first with retries
    return await callWithRetry(() => performRequest('gemini-3-pro-preview'));
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuotaError) {
      console.warn("Pro model quota exhausted after retries. Falling back to Flash model...");
      try {
        // Fallback to Flash model which usually has higher limits
        return await performRequest('gemini-3-flash-preview');
      } catch (fallbackError) {
        console.error("Flash fallback also failed:", fallbackError);
        throw new Error("AI capacity reached. Please try again in a few minutes.");
      }
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateSEOfiles = async (html: string, baseUrl: string = "https://your-site.vercel.app"): Promise<{ robots: string, sitemap: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Based on the following website HTML, generate the content for a standard robots.txt and a sitemap.xml file. 
  The base URL is ${baseUrl}. 
  Return the result as a JSON object with keys "robots" and "sitemap".
  
  HTML:
  ${html.slice(0, 5000)}`;

  const performSeoRequest = async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            robots: { type: Type.STRING },
            sitemap: { type: Type.STRING }
          },
          required: ["robots", "sitemap"]
        }
      }
    });
    const text = response.text || '{"robots": "", "sitemap": ""}';
    return JSON.parse(text);
  };

  try {
    return await callWithRetry(() => performSeoRequest());
  } catch (error) {
    console.error("SEO Generation Error:", error);
    return {
      robots: "User-agent: *\nAllow: /",
      sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n  </url>\n</urlset>`
    };
  }
};
