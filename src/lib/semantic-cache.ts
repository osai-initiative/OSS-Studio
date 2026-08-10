type Entry = { model: string; tokens: string[]; answer: string; createdAt: number; hits: number };

const entries: Entry[] = [];
const MAX_ENTRIES = 256;
const TTL_MS = 15 * 60_000;

function tokens(input: string): string[] {
  return [...new Set(input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((word) => word.length > 1))].slice(0, 80);
}

export function cacheablePrompt(input: string): boolean {
  if (input.length < 12 || input.length > 4_000) return false;
  // Do not share answers to prompts that look personal, private, or request-specific.
  return !/(\bmy\b|\bme\b|\bi\b|\bwe\b|\bour\b|@|https?:\/\/|www\.|\+?\d[\d ().-]{7,}\d|```)/i.test(input);
}

export function getSemanticCache(model: string, prompt: string): string | null {
  if (!cacheablePrompt(prompt)) return null;
  const wanted = tokens(prompt);
  if (wanted.length < 3) return null;
  const now = Date.now();
  let best: Entry | undefined;
  let bestScore = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (now - entry.createdAt > TTL_MS) { entries.splice(i, 1); continue; }
    if (entry.model !== model) continue;
    const set = new Set(entry.tokens);
    const overlap = wanted.filter((token) => set.has(token)).length;
    const score = overlap / new Set([...wanted, ...entry.tokens]).size;
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (!best || bestScore < 0.72) return null;
  best.hits += 1;
  return best.answer;
}

export function putSemanticCache(model: string, prompt: string, answer: string): void {
  if (!cacheablePrompt(prompt) || !answer.trim() || answer.length > 20_000) return;
  entries.push({ model, tokens: tokens(prompt), answer, createdAt: Date.now(), hits: 0 });
  while (entries.length > MAX_ENTRIES) entries.shift();
}

