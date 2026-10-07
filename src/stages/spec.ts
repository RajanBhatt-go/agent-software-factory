// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Stage 2: Spec Generation
//  Produces a full feature specification.
// ─────────────────────────────────────────────────────────────

import { callModelJSON } from "../lib/model-caller.js";
import { resolveModel } from "../config.js";
import { buildProjectContextBlock } from "../lib/prompt-builder.js";
import { FactoryContext, SpecDocument, ProjectConfig, FeatureInput } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a senior software architect.
Given a feature description and project context, produce a detailed specification.
The spec must cover: functional requirements (what the system should do),
non-functional requirements (performance, security, scalability),
acceptance criteria, affected components, and data model changes.
Use clear, unambiguous language. Be specific about technologies when project context is provided.`;

const USER_PROMPT = (
  feature: FeatureInput,
  config: ProjectConfig | null
) => `
Create a detailed specification for this feature.

${buildProjectContextBlock(config)}

## Feature
**${feature.title}**
${feature.description}

Return JSON following this structure:
{
  "title": "Feature title",
  "overview": "Brief summary of what this feature does and why",
  "functionalRequirements": [
    { "id": "FR-001", "description": "description of requirement", "priority": "must|should|could|wont", "category": "functional" }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "description": "description", "priority": "must|should|could|wont", "category": "non-functional" }
  ],
  "acceptanceCriteria": ["criterion 1", "criterion 2"],
  "components": [
    { "name": "component name", "description": "what it does", "technology": "tech if known", "interactions": ["interacts with X", "interacts with Y"] }
  ],
  "dataModel": {
    "entities": [
      { "name": "EntityName", "fields": ["field1: type", "field2: type"], "description": "what this entity represents" }
    ],
    "relationships": ["Entity1 has many Entity2", "Entity2 belongs to Entity1"]
  }
}

Be specific about technologies, patterns, and implementation details based on the project context.
`;
export async function stageSpec(
  feature: FeatureInput,
  config: ProjectConfig | null
): Promise<{ spec: SpecDocument; durationMs: number; cost: number; model: string }> {
  const model = resolveModel("spec", config);

  const { result, meta } = await callModelJSON<SpecDocument>({
    stageName: "spec",
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT(feature, config),
    temperature: 0.3,
  });

  return {
    spec: {
      title: result.title || feature.title,
      overview: result.overview || "",
      functionalRequirements: result.functionalRequirements ?? [],
      nonFunctionalRequirements: result.nonFunctionalRequirements ?? [],
      acceptanceCriteria: result.acceptanceCriteria ?? [],
      components: result.components ?? [],
      dataModel: result.dataModel,
    },
    durationMs: meta.durationMs,
    cost: meta.cost,
    model: meta.model,
  };
}