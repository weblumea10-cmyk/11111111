
import { VERCEL_TOKEN } from "../constants.ts";

export const publishToVercel = async (
  html: string, 
  robots: string = "User-agent: *\nAllow: /", 
  sitemap: string = "", 
  projectName: string = "murodjon-ai-site"
): Promise<string> => {
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 32) || "ai-generated-site";
  
  const files = [
    {
      file: "index.html",
      data: html,
    },
    {
      file: "public/robots.txt",
      data: robots,
    }
  ];

  if (sitemap) {
    files.push({
      file: "public/sitemap.xml",
      data: sitemap,
    });
  }
  
  try {
    const response = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: safeName,
        files: files,
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
