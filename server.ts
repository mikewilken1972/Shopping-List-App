import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = new Resend(process.env.RESEND_API_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // API routes
  app.post("/api/analyze-image", async (req, res) => {
    const { imageBase64, mimeType, categories, historyContext, pastImages } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptText = `Analyze the FINAL image and identify the main product. I want to add it to my shopping list.
Return ONLY a JSON object with:
"text": string (name of item, very concise, e.g. "Mælk", "Banan", "Opvaskemiddel"),
"quantity": string or null (e.g., "1 liter", "500g" if visible, otherwise null),
"category": string (must be one of the provided categories, try to match history context if provided),
"store": string (if identifiable brand or store logo is visible, otherwise empty string).

Available categories: ${categories?.join(', ') || ''}
${historyContext ? `\nHere is some context of what the user has previously added and how they categorize items:\n${historyContext}\nLearn from this history to categorize similarly if applicable.` : ''}
${pastImages && pastImages.length > 0 ? `\nThe user has also previously scanned some images. I have provided them as examples before the final image you need to analyze.` : ''}`;

      const parts: any[] = [];

      if (pastImages && Array.isArray(pastImages)) {
        for (const past of pastImages) {
          if (!past.imageUrl) continue;
          
          const match = past.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
            parts.push({
              text: `Example previously identified by user:\n{"text": "${past.text}", "category": "${past.category}", "store": "${past.store}"}`
            });
          }
        }
      }

      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/jpeg"
        }
      });
      parts.push({
        text: promptText
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts
        },
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const resultText = response.text || "{}";
      res.json(JSON.parse(resultText));
    } catch (error) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY is not configured" });
    }

    try {
      const data = await resend.emails.send({
        from: "Shopping List <onboarding@resend.dev>",
        to,
        subject,
        html,
      });
      res.json(data);
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
