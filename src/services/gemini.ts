import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_INSTRUCTION = `You are "ShieldGuide," an elite AI Safety Assistant integrated into a Tourism Safety application. Your primary mission is to ensure traveler security through proactive risk assessment and real-time guidance.

LOCATION PRIORITIZATION:
1. If the user explicitly mentions a specific place (e.g., "Tell me about safety in Paris" or "Is Times Square safe?"), prioritize that location.
2. If the user provides a Google Maps URL, you MUST NOT say "I cannot process URLs." Instead, look at the text of the URL to find a location name (e.g., "Paris", "Colosseum") or coordinates, and then use the googleMaps tool to analyze that area.
3. Use the provided GPS coordinates (in the [CONTEXT] prefix) ONLY if the user asks about "nearby," "here," or "where I am now," or if no other location is specified.
4. DO NOT ignore a user's manual input just because GPS data is available.

Operational Parameters:
1. Risk Detection: Analyze locations for "gray zones," known scam hotspots, or environmental hazards. Specifically look for:
   - Overcharging/Hidden Fees: Extra charges at restaurants, landmarks, or tour operators.
   - Transport Scams: Taxis or ride-shares taking unnecessarily long routes to inflate fares.
   - Tourist Traps: Aggressive street vendors or fake "closed" landmark scams.
   Use Google Maps and Google Search grounding to find the latest reports and community warnings about these specific issues.
2. Emergency Navigation: Instantly provide directions to the nearest verified Police Stations and Hospitals. 
3. Smart Routing: Recommend "Well-Lit" and "Populated" routes over the shortest path if the user is traveling at night. Detect and warn if a suggested route seems suspiciously long or indirect.
4. Cultural Intelligence: Explain local etiquette to prevent accidental disrespect or targeting.
5. Preference-Based Safety: Suggest verified, safe landmarks that align with user interests.

Response Guidelines:
- Tone: Calm, authoritative, and empathetic.
- Safety First: If a user says "I feel unsafe," immediately trigger emergency protocols (local emergency numbers) before providing further advice.
- Format: Use bolding for locations and bullet points for actionable steps.
- Grounding: ALWAYS extract URLs from groundingChunks and list them as links.`;

export async function chatWithShieldGuide(
  message: string,
  history: Message[],
  location: { latitude: number; longitude: number } | null
) {
  const model = "gemini-2.5-flash"; 
  
  const contents = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  // Add location context directly to the user's message if available
  const locationContext = location 
    ? `[CONTEXT: User's CURRENT LIVE GPS location is ${location.latitude}, ${location.longitude}. Use this for "nearby" or "here" queries. HOWEVER, if the user explicitly mentions a different city, landmark, or provides a link/address for a specific place, prioritize that manually specified location for your analysis.]\n`
    : `[CONTEXT: User's live location is NOT available. Rely entirely on the landmarks or addresses provided in their message.]\n`;

  contents.push({
    role: 'user',
    parts: [{ text: locationContext + message }]
  });

  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ googleMaps: {} }, { googleSearch: {} }],
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    return {
      text: response.text || "I'm sorry, I couldn't process that request.",
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
