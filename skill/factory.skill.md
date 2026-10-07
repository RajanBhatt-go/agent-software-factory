---
id: agent-software-factory
name: Agent Software Factory
description: >
  Takes a feature request and produces spec, test cases, UX workflow,
  security review, and algorithm review documents using a multi-agent
  pipeline with different models per stage.
---

# Agent Software Factory 🏭

## What it does

Given a feature description (text or GitHub issue), runs a multi-stage pipeline:

```
Feature → [Intake] → [Spec] → [Tests, UX, Security, Algo in parallel] → [Assembly]
```

Outputs 5 markdown documents into `factory-output/`:
- `SPEC.md` — Full feature specification
- `TEST_CASES.md` — Unit, integration, and edge-case tests
- `UX_WORKFLOW.md` — User flows, states, UI components
- `SECURITY_REVIEW.md` — STRIDE threat model with mitigations
- `ALGORITHM_REVIEW.md` — Complexity analysis and alternative evaluation

## Usage

```
@factory <feature description>
@factory --issue <github issue URL>
```

**Examples:**

```
@factory Add OAuth login with Google
@factory --issue https://github.com/org/repo/issues/42
```

## Configuration

Place a `.factory-config.yaml` in your project root:

```yaml
project:
  name: "My App"
tech_stack:
  frontend: "React 18"
  backend: "Node.js + Express"
  testing: "vitest"
conventions:
  - "Zod for validation"
```

If no config file is found, the factory uses auto-detection from your project files.

## Model Routing

| Stage | Model |
|-------|-------|
| Feature Intake | claude-haiku-5.5 |
| Spec Generation | claude-sonnet-5.5 |
| Test Cases | claude-sonnet-5.5 |
| UX Workflow | claude-sonnet-5.5 |
| Security Review | claude-sonnet-5.5 |
| Algorithm Review | claude-sonnet-5.5 |
| Assembly | deepseek-flash |

Override per stage in `.factory-config.yaml`:
```yaml
model_overrides:
  security: "claude-opus-5.5"
```

## Environment

Requires `OPENROUTER_API_KEY` environment variable.
Get one at https://openrouter.ai/keys

## Output

All files written to `factory-output/` in the workspace root.