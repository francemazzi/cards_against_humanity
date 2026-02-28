// LLM integration for AI players
// Supports OpenAI (cloud) or Ollama (local) as backend
import OpenAI from "openai";
import type { BlackCard, WhiteCard, Persona } from "../core/types.js";

// Get dev API key from env (optional fallback)
const DEV_API_KEY = process.env.OPENAI_API_KEY;

// Ollama configuration (local LLM - no API key needed)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

/**
 * Create LLM client.
 * If an OpenAI API key is available, use OpenAI cloud.
 * Otherwise, fall back to local Ollama (no key needed).
 */
function createClient(userApiKey?: string): { client: OpenAI; model: string } {
  const apiKey = userApiKey || DEV_API_KEY;

  if (apiKey) {
    return {
      client: new OpenAI({ apiKey, timeout: 10000 }),
      model: "gpt-4o-mini",
    };
  }

  // Fallback to local Ollama
  return {
    client: new OpenAI({
      baseURL: OLLAMA_BASE_URL,
      apiKey: "ollama", // Ollama ignores this but the SDK requires it
      timeout: 30000, // Local models on RPi may be slower
    }),
    model: OLLAMA_MODEL,
  };
}

/**
 * Ask an AI agent to pick a card from their hand
 */
export async function pickCard(
  persona: Persona,
  hand: WhiteCard[],
  blackCard: BlackCard,
  userApiKey?: string
): Promise<number> {
  const { client, model } = createClient(userApiKey);
  const prompt = buildPickCardPrompt(hand, blackCard);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: persona.systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0.9,
    max_tokens: 10,
  });

  const answer = response.choices[0]?.message?.content?.trim() || "0";
  const index = parseInt(answer, 10);

  // Validate index
  if (isNaN(index) || index < 0 || index >= hand.length) {
    console.warn(`AI returned invalid index "${answer}", defaulting to 0`);
    return 0;
  }

  return index;
}

/**
 * Ask an AI agent (as Czar) to judge the winner
 */
export async function judgeCards(
  persona: Persona,
  blackCard: BlackCard,
  submissions: WhiteCard[][],
  userApiKey?: string
): Promise<number> {
  const { client, model } = createClient(userApiKey);
  const prompt = buildJudgePrompt(blackCard, submissions);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: persona.systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0.9,
    max_tokens: 10,
  });

  const answer = response.choices[0]?.message?.content?.trim() || "0";
  const index = parseInt(answer, 10);

  // Validate index
  if (isNaN(index) || index < 0 || index >= submissions.length) {
    console.warn(`AI Czar returned invalid index "${answer}", defaulting to 0`);
    return 0;
  }

  return index;
}

/**
 * Validate an OpenAI API key by making a minimal request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey, timeout: 10000 });
    await openai.models.list();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the local Ollama backend is reachable
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const ollama = new OpenAI({
      baseURL: OLLAMA_BASE_URL,
      apiKey: "ollama",
      timeout: 5000,
    });
    await ollama.models.list();
    return true;
  } catch {
    return false;
  }
}

// --- Prompt Builders ---

function buildPickCardPrompt(hand: WhiteCard[], blackCard: BlackCard): string {
  const cardsRequired = blackCard.pick || 1;

  let prompt = `You are playing Cards Against Humanity.\n\n`;
  prompt += `The BLACK CARD is: "${blackCard.text}"\n`;
  prompt += `(This card requires ${cardsRequired} white card${cardsRequired > 1 ? "s" : ""} to complete)\n\n`;
  prompt += `Your HAND:\n`;

  hand.forEach((card, i) => {
    prompt += `${i}: "${card.text}"\n`;
  });

  prompt += `\nPick the card that would be the FUNNIEST answer based on your personality.\n`;
  prompt += `Respond with ONLY the index number (0-${hand.length - 1}). No explanation.`;

  return prompt;
}

function buildJudgePrompt(
  blackCard: BlackCard,
  submissions: WhiteCard[][]
): string {
  let prompt = `You are the Card Czar in Cards Against Humanity.\n\n`;
  prompt += `The BLACK CARD is: "${blackCard.text}"\n\n`;
  prompt += `The SUBMISSIONS are:\n`;

  submissions.forEach((cards, i) => {
    const combined = cards.map((c) => c.text).join(" + ");
    prompt += `${i}: ${combined}\n`;
  });

  prompt += `\nPick the FUNNIEST submission based on your personality and sense of humor.\n`;
  prompt += `Respond with ONLY the index number (0-${submissions.length - 1}). No explanation.`;

  return prompt;
}
