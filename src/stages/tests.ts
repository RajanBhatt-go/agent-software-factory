// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Stage 3: Test Case Generation
//  Generates comprehensive tests from the spec.
// ─────────────────────────────────────────────────────────────

import { callModelJSON } from "../lib/model-caller.js";
import { resolveModel } from "../config.js";
import { buildProjectContextBlock, formatSpecForPrompt } from "../lib/prompt-builder.js";
import { FactoryContext, TestCase, SpecDocument, ProjectConfig } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a senior QA engineer specializing in test design.
Given a feature specification and project context, generate comprehensive test cases.
Cover: unit tests, integration tests, end-to-end flows, edge cases, and error conditions.
Return a JSON array of test cases.`;

export async function stageTests(
  spec: SpecDocument,
  config: ProjectConfig | null
): Promise<{ testCases: TestCase[]; durationMs: number; cost: number; model: string }> {
  const model = resolveModel("tests", config);
  const testingFramework = config?.tech_stack?.testing ?? "the project's testing framework";

  const userPrompt = `
Generate comprehensive test cases for this feature specification.

${buildProjectContextBlock(config)}

## Specification
${formatSpecForPrompt(spec)}

## Testing Framework
Use ${testingFramework} conventions for test structure.

Return a JSON array of test cases where each object has:
{
  "name": "descriptive test name",
  "type": "unit | integration | e2e",
  "scenario": "what scenario is being tested",
  "given": "precondition",
  "when": "action performed",
  "then": "expected outcome",
  "edgeCase": true | false
}

Include at least:
- Happy path tests
- Error/exception handling tests
- Edge cases (empty values, boundary conditions, invalid input)
- Integration tests for component interactions
`;

  const { result, meta } = await callModelJSON<TestCase[]>({
    stageName: "tests",
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
  });

  return {
    testCases: Array.isArray(result) ? result : [],
    durationMs: meta.durationMs,
    cost: meta.cost,
    model: meta.model,
  };
}