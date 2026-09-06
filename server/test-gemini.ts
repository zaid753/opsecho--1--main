import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log("Key:", GEMINI_API_KEY ? "Loaded" : "Missing");

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

async function run() {
  const prompt = `You are an AI Incident Commander... (test prompt)`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "The production website is down and returning 404.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            facts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } } }
          }
        }
      }
    });
    console.log("Raw text:");
    console.log(response.text);
    console.log("Parsed JSON:");
    console.log(JSON.parse(response.text));
  } catch (error) {
    console.error("Error:", error);
  }
}
run();
