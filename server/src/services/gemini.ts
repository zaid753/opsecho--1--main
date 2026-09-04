import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

export const analyzeTranscript = async (transcript: string, context: any) => {
  if (!ai) {
    console.warn("[Gemini] API Key missing, skipping analysis.");
    return null;
  }

  const prompt = `
    You are an AI Incident Commander assisting a team during a technical outage.
    Analyze the following transcript chunk and extract structured information.
    
    CRITICAL RULES:
    1. Only extract FACTS that are confirmed.
    2. Only extract HYPOTHESES that are clearly stated as "I think", "maybe", "possibly".
    3. Identify DECISIONS made by the team.
    4. Identify ACTION items and attempt to identify the OWNER (user name).
    5. Detect CONFLICTS if two people say different things about the same fact.
    6. Identify MISSING INFORMATION that would be helpful.
    7. Identify RISKS to production stability.

    Current Incident Context:
    ${JSON.stringify(context)}

    New Transcript:
    "${transcript}"

    Return the result in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            facts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } } },
            hypotheses: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, proposer: { type: Type.STRING } } } },
            decisions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, decider: { type: Type.STRING } } } },
            actions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, owner: { type: Type.STRING }, isCritical: { type: Type.BOOLEAN } } } },
            conflicts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } } },
            risks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING } } } },
            summary: { type: Type.STRING },
            aiResponse: { type: Type.STRING, description: "A concise, conversational response from the AI Incident Commander acknowledging the transcript, confirming extracted info, or asking for clarifications." }
          }
        }
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("[Gemini] Analysis failed:", error);
    return null;
  }
};
