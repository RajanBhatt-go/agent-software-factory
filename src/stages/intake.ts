// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Stage 1: Feature Intake
//  Parses raw text or GitHub issue into structured feature.
// ─────────────────────────────────────────────────────────────

import { callModelJSON } from "../lib/model-caller.js";
import { resolveModel } from "../config.js";
import { buildProjectContextBlock } from "../lib/prompt-builder.js";
import { FactoryContext, FeatureInput, ProjectConfig } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a product manager specializing in requirements engineering.
Parse the user's feature request into a structured format.
Extract the core idea, the problem being solved, and expected behavior.
Return JSON with: title (string), description (string), source ("text" or "github"), url (string | null).`;

const USER_PROMPT = (input: string, config: ProjectConfig | null) => `
Parse this feature request into a structured feature description.

${buildProjectContextBlock(config)}

## Feature Request
${input}

Return JSON:
{
  "title": "short feature title",
  "description": "detailed feature description covering what, why, and expected behavior",
  "source": "text",
  "url": null
}

Focus on extracting the core intent. Be specific but don't add requirements that aren't implied.
`;

export async function stageIntake(
  input: string,
  config: ProjectConfig | null
): Promise<{ feature: FeatureInput; durationMs: number; cost: number; model: string }> {
  const model = resolveModel("intake", config);

  const { result, meta } = await callModelJSON<FeatureInput>({
    stageName: "intake",
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT(input, config),
    temperature: 0.2,
  });

  return {
    feature: {
      title: result.title || "Untitled Feature",
      description: result.description || input,
      source: "text",
      url: result.url ?? null,
    },
    durationMs: meta.durationMs,
    cost: meta.cost,
    model: meta.model,
  };
}