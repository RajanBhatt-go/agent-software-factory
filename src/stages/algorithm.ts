// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Stage 6: Algorithm Review
//  Analyzes algorithmic complexity and suggests alternatives.
// ─────────────────────────────────────────────────────────────

import { callModelJSON } from "../lib/model-caller.js";
import { resolveModel } from "../config.js";
import { buildProjectContextBlock, formatSpecForPrompt } from "../lib/prompt-builder.js";
import { FactoryContext, AlgorithmReview, SpecDocument, ProjectConfig } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a senior software engineer specialized in algorithms and performance optimization.
Given a feature specification, identify the key algorithms and data structures involved.
Analyze their time and space complexity, suggest alternatives, and recommend the best approach.`;

export async function stageAlgorithm(
  spec: SpecDocument,
  config: ProjectConfig | null
): Promise<{
  algorithmReview: AlgorithmReview;
  durationMs: number;
  cost: number;
  model: string;
}> {
  const model = resolveModel("algorithm", config);
  const depth = config?.algorithm?.review_depth ?? "basic";

  const userPrompt = `
Review the algorithmic design for this feature specification.

${buildProjectContextBlock(config)}

## Specification
${formatSpecForPrompt(spec)}

## Review Depth
${depth}

Return JSON:
{
  "complexityAnalysis": [
    {
      "timeComplexity": "O(n) or similar",
      "spaceComplexity": "O(n) or similar",
      "explanation": "why this complexity applies to this component/operation"
    }
  ],
  "alternatives": [
    {
      "name": "alternative approach name",
      "description": "how this alternative works",
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["disadvantage 1", "disadvantage 2"]
    }
  ],
  "recommendation": "recommended approach and reasoning",
  "performanceConsiderations": ["key perf consideration 1", "key perf consideration 2"]
}

Focus on:
- Data structures implied by the spec
- Algorithmic complexity of key operations
- Database query patterns and their complexity
- Caching opportunities
- Bottlenecks in the proposed design
`;

  const { result, meta } = await callModelJSON<AlgorithmReview>({
    stageName: "algorithm",
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });

  return {
    algorithmReview: {
      complexityAnalysis: result.complexityAnalysis ?? [],
      alternatives: result.alternatives ?? [],
      recommendation: result.recommendation ?? "",
      performanceConsiderations: result.performanceConsiderations ?? [],
    },
    durationMs: meta.durationMs,
    cost: meta.cost,
    model: meta.model,
  };
}