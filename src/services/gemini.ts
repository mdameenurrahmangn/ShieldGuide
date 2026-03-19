import Groq from "groq-sdk";
import { Message } from "../types";

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || "",
  dangerouslyAllowBrowser: true
});

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
- Format: ALWAYS use standard Markdown for structure. 
  - Use **Bolding** for specific locations, landmarks, or key warnings.
  - Use Bulleted lists (using *) for all sets of suggestions, landmarks, or risk factors.
  - Do NOT just split text into lines; use proper list and paragraph structures.
  - If providing coordinates, format them clearly.`;

export async function chatWithShieldGuide(
  message: string,
  history: Message[],
  location: { latitude: number; longitude: number } | null
) {
  const model = "llama-3.3-70b-versatile"; 
  
  const messages: any[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
  ];

  // Add location context directly to the user's message if available
  const locationContext = location 
    ? `[CONTEXT: User's CURRENT LIVE GPS location is ${location.latitude}, ${location.longitude}. Use this for "nearby" or "here" queries. HOWEVER, if the user explicitly mentions a different city, landmark, or provides a link/address for a specific place, prioritize that manually specified location for your analysis.]\n`
    : `[CONTEXT: User's live location is NOT available. Rely entirely on the landmarks or addresses provided in their message.]\n`;

  messages.push({
    role: 'user',
    content: locationContext + message
  });

  try {
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1024,
    });

    return {
      text: response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.",
      groundingMetadata: undefined
    };
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
