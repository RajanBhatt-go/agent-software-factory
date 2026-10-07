// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Raw Model Caller
//  Wraps the OpenRouter API with retry logic.
// ─────────────────────────────────────────────────────────────

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

const RETRY_LIMIT = 2;
const RETRY_DELAY_MS = 1000;

export interface ModelCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  responseFormat?: "text" | "json";
  stageName: string;
}

export interface ModelCallResult {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  durationMs: number;
}

const MODEL_COST: Record<string, { input: number; output: number }> = {
  "openrouter/anthropic/claude-haiku-5.5":  { input: 0.10,  output: 0.50 },
  "openrouter/anthropic/claude-sonnet-5.5": { input: 2.00,  output: 10.00 },
  "openrouter/anthropic/claude-opus-5.5":   { input: 4.00,  output: 20.00 },
  "openrouter/~deepseek/deepseek-flash-latest": { input: 0.025, output: 1.20 },
  "openrouter/openai/gpt-6.1-sol":          { input: 2.00,  output: 10.00 },
  "openrouter/openai/gpt-6-luna":           { input: 0.10,  output: 0.50 },
};

function getApiKey(): string {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required.\n" +
      "Get a key at https://openrouter.ai/keys and set it:\n" +
      "  export OPENROUTER_API_KEY=sk-or-v1-..."
    );
  }
  return key;
}

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const cost = MODEL_COST[model] ?? { input: 2.0, output: 10.0 };
  const inCost = (tokensIn / 1_000_000) * cost.input;
  const outCost = (tokensOut / 1_000_000) * cost.output;
  return inCost + outCost;
}

/**
 * Call a model via OpenRouter API with retry logic.
 */
export async function callModel(opts: ModelCallOptions): Promise<ModelCallResult> {
  const apiKey = getApiKey();
  const startTime = Date.now();

  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
    temperature: opts.temperature ?? 0.3,
    max_tokens: 4096,
  };

  if (opts.responseFormat === "json") {
    (body as Record<string, unknown>)["response_format"] = { type: "json_object" };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agent-software-factory.dev",
          "X-Title": "Agent Software Factory",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      const durationMs = Date.now() - startTime;
      const content = data.choices?.[0]?.message?.content ?? "";
      const tokensIn = data.usage?.prompt_tokens ?? 0;
      const tokensOut = data.usage?.completion_tokens ?? 0;
      const cost = estimateCost(opts.model, tokensIn, tokensOut);

      return {
        content,
        model: opts.model,
        tokensIn,
        tokensOut,
        cost,
        durationMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < RETRY_LIMIT) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(
    `[${opts.stageName}] Failed after ${RETRY_LIMIT} retries: ${lastError!.message}`
  );
}

/**
 * Call model and parse JSON response.
 */
export async function callModelJSON<T>(
  opts: ModelCallOptions
): Promise<{ result: T; meta: ModelCallResult }> {
  const meta = await callModel({ ...opts, responseFormat: "json" });

  let parsed: T;
  try {
    // Handle case where model wraps JSON in markdown code fences
    let clean = meta.content.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    parsed = JSON.parse(clean) as T;
  } catch {
    throw new Error(
      `[${opts.stageName}] Failed to parse JSON response.\n` +
      `Response preview: ${meta.content.slice(0, 500)}`
    );
  }

  return { result: parsed, meta };
}