import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import prisma from "../prisma";

// Define the state schema
const IncidentState = Annotation.Root({
  transcript: Annotation<string>(),
  incidentId: Annotation<string>(),
  context: Annotation<any>(),
  extractedData: Annotation<any>(),
});

const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash-latest",
  apiKey: process.env.GEMINI_API_KEY,
});

// Node 1: Analysis & Classification
const analysisNode = async (state: typeof IncidentState.State) => {
  const prompt = `
    Analyze the following incident transcript and extract facts, hypotheses, decisions, and actions.
    Incident Context: ${JSON.stringify(state.context)}
    Transcript: "${state.transcript}"
    
    Return JSON only.
  `;
  
  const response = await model.invoke(prompt);
  const data = JSON.parse(response.content as string);
  
  return { extractedData: data };
};

// Node 2: Persistence Node
const persistenceNode = async (state: typeof IncidentState.State) => {
  const { incidentId, extractedData } = state;
  
  // Perform database updates here
  if (extractedData.facts) {
    await prisma.fact.createMany({
      data: extractedData.facts.map((f: any) => ({
        incidentId,
        description: f.description
      }))
    });
  }
  
  // ... (similar for other data types)
  
  return { extractedData };
};

// Define the graph
const workflow = new StateGraph(IncidentState)
  .addNode("analyze", analysisNode)
  .addNode("persist", persistenceNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", "persist")
  .addEdge("persist", END);

export const incidentGraph = workflow.compile();
