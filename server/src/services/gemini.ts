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
    
    CRITICAL RULES TO AVOID HALLUCINATION:
    1. ONLY extract FACTS that are EXPLICITLY stated in the New Transcript. Do not invent, infer, or hallucinate any details.
    2. ONLY extract HYPOTHESES that are clearly stated as "I think", "maybe", or "possibly".
    3. ONLY identify DECISIONS if someone explicitly says they are doing it or a conclusion is reached.
    4. ONLY identify ACTION items if a clear task is assigned. Attempt to identify the OWNER (user name).
    5. Detect CONFLICTS if two people explicitly contradict each other.
    6. Identify MISSING INFORMATION only if it is explicitly asked for by the team.
    7. Identify RISKS to production stability only if explicitly mentioned or obviously implied by the exact words.
    
    If the transcript is just chatter, greetings, or non-incident related, DO NOT extract anything. Returns empty arrays.

    Current Incident Context:
    Title: ${context.title}
    Severity: ${context.severity}
    Existing Facts: ${JSON.stringify(context.existingFacts)}
    Existing Hypotheses: ${JSON.stringify(context.existingHypotheses)}

    Recent Conversation History:
    ${context.recentHistory}

    New Transcript (to analyze):
    "${transcript}"

    Return the result in JSON format. Do not return empty arrays if there are no new items, just omit them or leave them empty.
    
    TURN-TAKING RULES for aiResponse:
    - Only provide an aiResponse if a user directly addresses you (e.g., "OpsEcho, what do you think?"), if you detect a critical conflict that the humans missed, or if you need to announce a major finalized decision.
    - DO NOT provide an aiResponse just to say "I've noted that fact" or to acknowledge normal conversation.
    - Remain completely silent (omit aiResponse) unless your input adds significant tactical value to the incident response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

export const generateIncidentSummary = async (incident: any) => {
  if (!ai) {
    console.warn("[Gemini] API Key missing, skipping summary generation.");
    return "Summary generation skipped (no API key).";
  }

  const prompt = `
    You are an AI Incident Commander. The following incident has just been resolved.
    Generate a comprehensive Final Incident Summary for the dashboard.
    
    Format the summary in cleanly spaced Markdown. Include:
    - **Incident Overview** (1 paragraph)
    - **Confirmed Facts** (bullet points)
    - **Key Decisions** (bullet points)
    - **Actions Taken** (bullet points)
    - **Remaining Risks** (bullet points, if any)
    
    Incident Context:
    Title: ${incident.title}
    Severity: ${incident.severity}
    Facts: ${JSON.stringify(incident.facts)}
    Decisions: ${JSON.stringify(incident.decisions)}
    Actions: ${JSON.stringify(incident.actions)}
    Risks: ${JSON.stringify(incident.risks)}
    
    Respond only with the Markdown text of the summary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("[Gemini] Summary generation failed:", error);
    return "Failed to generate incident summary.";
  }
};
