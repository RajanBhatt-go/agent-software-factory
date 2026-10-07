// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Stage 4: UX Workflow Design
//  Designs user flows, states, and UI components.
// ─────────────────────────────────────────────────────────────

import { callModelJSON } from "../lib/model-caller.js";
import { resolveModel } from "../config.js";
import { buildProjectContextBlock, formatSpecForPrompt } from "../lib/prompt-builder.js";
import { FactoryContext, UXWorkflow, SpecDocument, ProjectConfig } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a UX designer specializing in workflow design.
Given a feature specification, design the user experience.
Focus on: user flows, states, UI components needed, and key UX decisions.
Return structured JSON.`;

export async function stageUX(
  spec: SpecDocument,
  config: ProjectConfig | null
): Promise<{ uxWorkflow: UXWorkflow; durationMs: number; cost: number; model: string }> {
  const model = resolveModel("ux", config);
  const frontendTech = config?.tech_stack?.frontend ?? "the project's frontend framework";

  const userPrompt = `
Design the UX workflow for this feature specification.

${buildProjectContextBlock(config)}

## Specification
${formatSpecForPrompt(spec)}

## Frontend Technology
Design for ${frontendTech}.

Return JSON:
{
  "userFlows": [
    {
      "actor": "who performs this flow (e.g., User, Admin)",
      "steps": [
        { "step": 1, "action": "what the user does", "expectedOutcome": "what happens" }
      ],
      "description": "overview of this flow"
    }
  ],
  "states": ["list of application states involved, e.g., 'Logged Out', 'Product Selected', 'Checkout Complete'"],
  "uiComponents": [
    { "name": "component name", "type": "button|form|modal|page|etc", "description": "what it does" }
  ],
  "decisions": ["key UX decisions made and why"],
  "notes": ["any additional UX considerations or open questions"]
}

Focus on:
- Primary user flow (happy path)
- Alternative flows (errors, edge cases)
- State transitions
- UI components needed (be specific about types)
`;

  const { result, meta } = await callModelJSON<UXWorkflow>({
    stageName: "ux",
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.4,
  });

  return {
    uxWorkflow: {
      userFlows: result.userFlows ?? [],
      states: result.states ?? [],
      uiComponents: result.uiComponents ?? [],
      decisions: result.decisions ?? [],
      notes: result.notes ?? [],
    },
    durationMs: meta.durationMs,
    cost: meta.cost,
    model: meta.model,
  };
}