// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Stage 5: Security Review
//  STRIDE threat modeling per component.
// ─────────────────────────────────────────────────────────────

import { callModelJSON } from "../lib/model-caller.js";
import { resolveModel } from "../config.js";
import { buildProjectContextBlock, formatSpecForPrompt } from "../lib/prompt-builder.js";
import { FactoryContext, SecurityReview, SpecDocument, ProjectConfig } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a security engineer performing threat modeling.
Use the STRIDE methodology: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege.
For each component in the spec, identify threats and propose mitigations.
Return structured JSON.`;

export async function stageSecurity(
  spec: SpecDocument,
  config: ProjectConfig | null
): Promise<{
  securityReview: SecurityReview;
  durationMs: number;
  cost: number;
  model: string;
}> {
  const model = resolveModel("security", config);
  const compliance = config?.security?.compliance ?? [];
  const depth = config?.security?.review_depth ?? "stride";

  const complianceStr = compliance.length > 0
    ? `\n## Compliance Requirements\n${compliance.map((c) => `- ${c}`).join("\n")}`
    : "\n## Compliance\nNo specific compliance requirements identified.";

  const userPrompt = `
Perform a STRIDE threat model for this feature specification.

${buildProjectContextBlock(config)}

## Specification
${formatSpecForPrompt(spec)}

${complianceStr}

## Review Depth
${depth}

Return JSON:
{
  "threatModel": [
    {
      "id": "T-001",
      "category": "Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege",
      "description": "detailed description of the threat",
      "risk": "low | medium | high | critical",
      "affectedComponent": "which component is affected"
    }
  ],
  "mitigations": [
    {
      "threatId": "T-001",
      "description": "specific mitigation strategy",
      "effort": "low | medium | high"
    }
  ],
  "overallRisk": "low | medium | high | critical",
  "compliance": ["compliance implications identified"],
  "recommendations": ["key security recommendations"]
}

For each component in the spec, consider all 6 STRIDE categories.
Be specific about attack vectors. Don't just say "authenticate" — say *how*.
`;

  const { result, meta } = await callModelJSON<SecurityReview>({
    stageName: "security",
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });

  return {
    securityReview: {
      threatModel: result.threatModel ?? [],
      mitigations: result.mitigations ?? [],
      overallRisk: result.overallRisk ?? "medium",
      compliance: result.compliance ?? [],
      recommendations: result.recommendations ?? [],
    },
    durationMs: meta.durationMs,
    cost: meta.cost,
    model: meta.model,
  };
}