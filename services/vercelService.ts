
import { VERCEL_TOKEN } from "../constants";

export const publishToVercel = async (html: string, projectName: string = "murodjon-ai-site"): Promise<string> => {
  // We sanitize the project name to be URL friendly
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 32) || "ai-generated-site";
  
  try {
    const response = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: safeName,
        files: [
          {
            file: "index.html",
            data: html,
          },
        ],
        projectSettings: {
          framework: null,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Vercel API Error Details:", errorData);
      throw new Error(errorData.error?.message || "Failed to publish to Vercel");
    }

    const data = await response.json();
    return `https://${data.url}`;
  } catch (error) {
    console.error("Vercel deployment failed:", error);
    throw error;
  }
};
