# Agent Software Factory

> A multi-agent orchestration pipeline that takes a feature request and produces a spec, test cases, UI/UX workflow, security review, and algorithm review — using different models for different agents.

**Session:** Oct 7, 2026
**Status:** Design phase (pre-MVP)

---

## 📋 The Vision

Take a **feature description** (plain text or GitHub issue) and automatically produce:

| # | Document | Description |
|---|----------|-------------|
| 1 | `SPEC.md` | Full feature specification (functional + non-functional) |
| 2 | `TEST_CASES.md` | Unit, integration, and edge-case tests |
| 3 | `UX_WORKFLOW.md` | User flows, states, interface decisions |
| 4 | `SECURITY_REVIEW.md` | Threat model, attack surface, mitigations |
| 5 | `ALGORITHM_REVIEW.md` | Complexity analysis, alternative evaluation |

**Priority:** Correctness & safety

---

## 🏗️ Architecture

### Pipeline Overview

```
Feature Input (text / GitHub issue)
    │
    ▼
┌─────────────────────────────────────────────────┐
│          1. Feature Intake & Parsing             │
│     (Extract title, context, requirements)       │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│             2. Spec Generation                    │
│   (Functional + Non-functional requirements)     │
└─────────────────────────────────────────────────┘
    │
    ├──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
    ▼                              ▼                              ▼                              ▼
┌──────────┐              ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ 3. Tests  │              │  4. UI/UX    │              │  5. Security │              │  6. Algorithm│
│  (unit,   │              │  (workflow,  │              │    Review    │              │    Review    │
│  integ.,  │              │  wireframes) │              │              │              │              │
│  e2e)     │              └──────────────┘              └──────────────┘              └──────────────┘
└──────────┘
    │                              │                              │                              │
    └──────────────────────────────┼──────────────────────────────┼──────────────────────────────┘
                                   ▼
                        ┌──────────────────┐
                        │   7. Assembly    │
                        │  (consolidate    │
                        │   into docs)     │
                        └──────────────────┘
```

Stages 3–6 run **in parallel** after Spec is complete.

---

## 🧠 Design Decisions (with Pros/Cons)

### Decision 1: Sub-Agent vs. Raw Model Call per Stage

**Recommended: Raw model calls (upgrade to sub-agents later)**

| Option | Pros | Cons |
|--------|------|------|
| **A: OpenCode Sub-Agent** | ✅ File read/write access | ❌ Higher latency |
| | ✅ Can use browser/web search | ❌ Harder to control model selection |
| | ✅ Self-correcting, can ask questions | ❌ More token waste |
| | ✅ Natural for assembly stage | ❌ Less deterministic |
| **B: Raw Model Call** | ✅ Cheap — no agent overhead | ❌ No tool access |
| | ✅ Fast — sub-second per stage | ❌ Can't self-correct |
| | ✅ Full control over model | ❌ Orchestrator manages all state |
| | ✅ Easy to parallelize | ❌ Structured output parsing can fail |

---

### Decision 2: State Passing Between Stages

**Recommended: In-memory context object**

| Option | Pros | Cons |
|--------|------|------|
| **A: File-based** | ✅ Simple, debuggable | ❌ No type safety |
| | ✅ Persists across crashes | ❌ Stale reads possible |
| | ✅ Works with both sub-agents and raw calls | ❌ Needs naming conventions |
| **B: In-memory object** | ✅ Typed, validated | ❌ Lost on crash |
| | ✅ Fast, no file I/O | ❌ Must serialize/deserialize for model calls |
| | ✅ Natural for code | |
| **C: Hybrid (Recommended)** | ✅ Best of both | ❌ More code |
| | ✅ Typed + periodic snapshots | |

---

### Decision 3: Review Loops (Feedback Cycles)

**Recommended: Pure pipeline for MVP → two-pass later**

| Option | Pros | Cons |
|--------|------|------|
| **A: Pure Pipeline** | ✅ Simple, parallelizable | ❌ Spec frozen despite findings |
| | ✅ Predictable cost/timing | ❌ Misses improvement cycles |
| **B: Two-Pass** | ✅ Higher quality | ❌ 2x cost |
| | ✅ Findings inform revised spec | ❌ Still linear |
| **C: Full DAG** | ✅ Most realistic | ❌ Complex orchestration |
| | ✅ Highest quality | ❌ Unbounded loops possible |

---

### Decision 4: Security Review Depth

**Recommended: STRIDE per component**

| Option | Pros | Cons |
|--------|------|------|
| **A: Checklist (OWASP Top 10)** | ✅ Fast, cheap | ❌ Shallow, false sense of security |
| | ✅ Reproducible | ❌ Misses design-level flaws |
| **B: STRIDE per Component** | ✅ Systematic, covers all angles | ❌ 2-3x checklist cost |
| | ✅ Industry standard | ❌ Need component decomposition |
| | ✅ Catches design flaws | |
| **C: Full Attack Trees** | ✅ Deepest analysis | ❌ 5-10x cost |
| | ✅ Finds multi-step attacks | ❌ Model may hallucinate paths |

---

### Decision 5: Packaging & Invocation

**Recommended: CLI script + Skill file**

| Option | Pros | Cons |
|--------|------|------|
| **A: OpenCode Skill only** | ✅ Native environment | ❌ Can't control model routing |
| | ✅ Easy to iterate | ❌ Logic lives in script anyway |
| **B: CLI + Skill (Recommended)** | ✅ Full control over parallelism/models | ❌ More code to write |
| | ✅ Testable | ❌ Need API key management |
| | ✅ Usable outside OpenCode | |
| **C: Agent with Custom Tool** | ✅ Most flexible | ❌ Unpredictable behavior |
| | ✅ Handles edge cases naturally | ❌ Cost varies wildly |

---

### Decision 6: Orchestration Pattern

**Recommended: Parallel fan-out after spec**

| Option | Pros | Cons |
|--------|------|------|
| **Sequential pipeline** | ✅ Simplest, easy to debug | ❌ Slow (sum of all stages) |
| **Parallel fan-out** | ✅ Fast (stages run simultaneously) | ❌ Stages can't depend on each other |
| | ✅ Matches architecture well | ✅ (Not a con for this design) |

---

### Decision 7: Error Handling & Retry

**Recommended: Retry 2×, then human-in-the-loop**

| Option | Pros | Cons |
|--------|------|------|
| **Fail-fast** | ✅ Simple | ❌ Wastes prior work |
| **Retry with backoff** | ✅ Resilient to stochastic failures | ❌ Each retry burns tokens |
| **Human-in-the-loop** | ✅ Highest quality | ❌ Breaks automation |

---

### Decision 8: Model Routing Strategy

**Recommended: Hardcoded with override flag**

| Option | Pros | Cons |
|--------|------|------|
| **Hardcoded** | ✅ Predictable cost, easy to understand | ❌ Can't adapt to availability |
| **Feature-size adaptive** | ✅ Cost-efficient | ❌ Needs complexity heuristic |
| **Dynamic (model selects next)** | ✅ Most adaptive | ❌ Hard to cost-estimate |

---

## 🤖 Model Recommendations

Based on models available via OpenRouter:

### MVP Model Assignment

| Stage | Model | Cost (input/output per M tokens) | Rationale |
|-------|-------|----------------------------------|-----------|
| **1. Feature Intake** | `claude-haiku-5.5` | $0.10 / $0.50 | Fast, cheap parsing — just restructuring input |
| **2. Spec Generation** | `claude-sonnet-5.5` | $2.00 / $10.00 | Best structured reasoning/writing balance |
| **3. Test Cases** | `claude-sonnet-5.5` | $2.00 / $10.00 | Needs strong reasoning for boundary/edge cases |
| **4. UI/UX Workflow** | `claude-sonnet-5.5` | $2.00 / $10.00 | (or `gpt-6.1-sol`) Good design thinking |
| **5. Security Review** | `claude-sonnet-5.5` | $2.00 / $10.00 | Use `claude-opus-5.5` ($4/$20) for high-risk features |
| **6. Algorithm Review** | `claude-sonnet-5.5` | $2.00 / $10.00 | Strong analytical reasoning |
| **7. Assembly** | `deepseek-flash` | $0.025 / $1.20 | Just formatting — use cheapest |

**Estimated cost per run:** ~$1–3 (sonnet-heavy), ~$5–8 (with opus for security)

### Available Models (all via OpenRouter)

| Tier | Model | Cost (in/out per M) |
|------|-------|---------------------|
| **Cheap** | `deepseek-flash` | $0.025 / $1.20 |
| | `upstage/solar-mini4` | $0.05 / $0.20 |
| | `claude-haiku-5.5` | $0.10 / $0.50 |
| | `gpt-6-luna` | $0.10 / $0.50 |
| **Mid** | `mistral-large-4` | $0.68 / $2.09 |
| | `claude-sonnet-5.5` | $2.00 / $10.00 |
| | `gpt-6.1-sol` | $2.00 / $10.00 |
| | `grok-4.7` | $2.00 / $6.00 |
| **Premium** | `claude-opus-5.5` | $4.00 / $20.00 |
| | `qwen3.8-max-prime` | $4.00 / $12.00 |
| | `gpt-astra` | $10.00 / $50.00 |

---

## 🔧 Integration Model: How Any Project Leverages This

### Level 1: Standalone CLI (Zero Config)

```bash
npx agent-software-factory "Add OAuth login with Google"
```
- Generic output, no project context
- Best for greenfield projects, feature prototyping

### Level 2: Project-Configured (Config File)

```yaml
# .factory-config.yaml
project:
  name: "MyApp"
  tech_stack:
    frontend: "React 18 + TypeScript"
    backend: "Node.js + Express + PostgreSQL"
    testing: "vitest + Playwright"
  conventions:
    - "React function components, not classes"
    - "Zod for validation"
  security:
    compliance: ["GDPR"]
    review_depth: "stride"
```

```bash
npx agent-software-factory "Add OAuth" --config .factory-config.yaml
```
- Output tailored to project's tech stack, conventions, compliance needs

### Level 3: Workspace-Aware (Auto-Detected)

The CLI auto-discovers context from the project:
- `package.json` → detects framework, language
- `tsconfig.json` → detects TypeScript strict mode
- Existing test files → detects testing framework
- Directory structure → understands monorepo vs single-app

### Installation Options

| Method | Command | Pros | Cons |
|--------|---------|------|------|
| **Global CLI** | `npm install -g @agent-software-factory/cli` | One install, all projects | Version conflicts |
| **Per-project dev dep** | `npm install --save-dev @agent-software-factory/cli` | Versioned, CI-friendly | Per-project install |
| **OpenCode Skill** | Load skill in workspace | Native workflow | OpenCode-only |

---

## 🗺️ Recommended MVP Stack

| Decision | Choice | Why |
|----------|--------|-----|
| **Execution** | Raw model calls | Cheaper, faster, more controllable |
| **State passing** | In-memory context object | Clean, typed, fast |
| **Review loops** | Pure pipeline (no feedback) | Simple, parallelizable |
| **Security depth** | STRIDE per component | Sweet spot for correctness & safety |
| **Packaging** | TypeScript CLI + skill file | Full control, testable, usable anywhere |
| **Orchestration** | Parallel fan-out after spec | Fastest time-to-result |
| **Error handling** | Retry 2×, then human | Automated + safety net |
| **Model routing** | Hardcoded with override flag | Predictable + flexible |

### MVP Architecture Sketch

```
┌─────────────────────────────────────────────────┐
│  CLI Entry Point (parse args, read config)       │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Orchestrator (manages pipeline, state, retry)  │
└─────────────────────────────────────────────────┘
    │
    ├──► Stage 1: Feature Intake (haiku-5.5)
    │
    ├──► Stage 2: Spec Generation (sonnet-5.5)
    │
    ├──► Stage 3: Test Cases (sonnet-5.5) ──────┐
    ├──► Stage 4: UI/UX Workflow (sonnet-5.5) ──┤
    ├──► Stage 5: Security Review (sonnet-5.5) ──┤──► Parallel
    ├──► Stage 6: Algorithm Review (sonnet-5.5) ─┘
    │
    └──► Stage 7: Assembly (deepseek-flash)
              │
              ▼
        factory-output/
          ├── SPEC.md
          ├── TEST_CASES.md
          ├── UX_WORKFLOW.md
          ├── SECURITY_REVIEW.md
          └── ALGORITHM_REVIEW.md
```

---

## 💡 Key Takeaways

1. **The ASF is a multiplier on project context** — more context in = more relevant output out
2. **Different models for different stages** — cheap models for parsing/formatting, premium models for reasoning/security
3. **Parallelism is free** — tests, UX, security, and algorithm reviews don't depend on each other
4. **Correctness & safety first** — STRIDE security, retry logic, human-in-the-loop fallback
5. **Config file is the enabler** — a single `.factory-config.yaml` makes the ASF work for any project
6. **MVP can be built in days** — a TypeScript CLI taking a feature description and dropping 5 markdown files

---

## 🔜 Next Steps (Resume Point)

When resuming this session, the next logical steps are:

1. [ ] **Design the config schema** — finalize `.factory-config.yaml` fields
2. [ ] **Set up the project structure** — monorepo with CLI package
3. [ ] **Implement the orchestrator** — the core pipeline engine
4. [ ] **Implement stage prompts** — one prompt template per stage
5. [ ] **Implement model routing** — the model selection per stage
6. [ ] **Implement the skill file** — OpenCode skill instructions
7. [ ] **Add GitHub issue input support** — parse issues as feature input
8. [ ] **Add two-pass review** — allow security/algo findings to revise spec
9. [ ] **Add auto-detection** — workspace-aware project context

---

*Brainstorming session: Oct 7, 2026*