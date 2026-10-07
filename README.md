<p align="center">
  <img src="https://img.shields.io/badge/status-alpha-yellow" alt="Status: Alpha">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT">
  <img src="https://img.shields.io/badge/node-%3E%3D18-green" alt="Node: >=18">
</p>

<h1 align="center">🏭 Agent Software Factory</h1>
<p align="center"><em>A multi-agent framework that takes a feature request and produces a spec, test cases, UX workflow, security review, and algorithm review — using different AI models for each stage.</em></p>

---

## ✨ What It Does

Describe a feature once. Get five well-structured documents back:

| # | Document | What's In It |
|---|----------|-------------|
| 1 | **SPEC.md** | Functional & non-functional requirements, components, data model |
| 2 | **TEST_CASES.md** | Unit, integration, edge-case tests with given/when/then |
| 3 | **UX_WORKFLOW.md** | User flows, states, UI components, key UX decisions |
| 4 | **SECURITY_REVIEW.md** | STRIDE threat model, mitigations, compliance implications |
| 5 | **ALGORITHM_REVIEW.md** | Complexity analysis, alternatives, performance considerations |

Your job: review the docs, then implement. No more blank page syndrome.

---

## 🚀 Quick Start

### 1. Install

```bash
git clone https://github.com/RajanBhatt-go/agent-software-factory.git
cd agent-software-factory
npm install
```

### 2. Set your API key

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

> Get a key at [openrouter.ai/keys](https://openrouter.ai/keys) (free credits included).

### 3. Run it

```bash
npx tsx src/index.ts "Add OAuth login with Google"
```

That's it. The output lands in **`factory-output/`**:

```
factory-output/
├── SPEC.md
├── TEST_CASES.md
├── UX_WORKFLOW.md
├── SECURITY_REVIEW.md
├── ALGORITHM_REVIEW.md
└── pipeline-summary.md
```

---

## 🔌 Using It In Your Project

### The One-Time Setup

The factory becomes **aware of your project's tech stack** via a config file. Create this in your project root:

```bash
cd my-project
npx tsx /path/to/agent-software-factory/src/index.ts --init
# or just create .factory-config.yaml manually
```

```yaml
# my-project/.factory-config.yaml
project:
  name: "Acme Shop"
  description: "E-commerce platform with multi-vendor support"

tech_stack:
  language: "TypeScript"
  frontend: "Next.js 14 + Tailwind CSS"
  backend: "Next.js API routes"
  database: "PostgreSQL + Prisma ORM"
  testing: "vitest + Playwright"
  auth: "next-auth"
  payments: "Stripe"
  hosting: "Vercel"

conventions:
  - "React Server Components over Client Components"
  - "Zod for API input validation"
  - "Repository pattern for database access"

security:
  compliance:
    - "GDPR"
    - "PCI-DSS"
  review_depth: "stride"
```

Once the config is in your project, **every feature request you run will produce output tailored to your stack**.

### Daily Use

```bash
# From inside your project directory
cd my-project

# Basic usage
npx tsx /path/to/agent-software-factory/src/index.ts "Add a buy-now button that skips cart"

# From a GitHub issue
npx tsx /path/to/agent-software-factory/src/index.ts --issue https://github.com/org/repo/issues/42

# Preview without making API calls
npx tsx /path/to/agent-software-factory/src/index.ts --dry-run "Add team invites"
```

---

## 📋 Examples By Project Type

### Example 1: E-commerce (Next.js + Stripe)

```bash
cd ~/code/acme-shop
npx tsx ~/code/agent-software-factory/src/index.ts "Implement buy-now button on product page that skips cart"
```

Because the config says `frontend: Next.js 14`, `payments: Stripe`, the generated **SPEC.md** will say:

> *"Create a Next.js Server Component on the product detail page. Add a Stripe Checkout Session endpoint. Create a Prisma migration for direct orders..."*

And the **SECURITY_REVIEW.md** will flag:

> *"Price manipulation in the direct-buy flow — mitigate by verifying the price server-side from the database, not from the request."*

### Example 2: Mobile App (React Native + Firebase)

```yaml
# .factory-config.yaml
tech_stack:
  frontend: "React Native"
  backend: "Firebase Functions"
  auth: "Firebase Auth"
  testing: "jest + detox"
```

```bash
npx tsx ~/code/agent-software-factory/src/index.ts "Add passwordless email login"
```

The **SPEC.md** will say:

> *"Add a Firebase Authentication sign-in with email link. Create a React Native screen for email entry. Handle redirect from magic link..."*

The **UX_WORKFLOW.md** will include:
> *"States: Idle → Email Sent → Link Clicked → Authenticated → Redirect to Dashboard"*

### Example 3: Data Pipeline (Python + BigQuery)

```yaml
# .factory-config.yaml
tech_stack:
  language: "Python"
  backend: "FastAPI"
  database: "BigQuery + dbt"
  testing: "pytest"
```

```bash
npx tsx ~/code/agent-software-factory/src/index.ts "Add daily revenue aggregation pipeline"
```

The **ALGORITHM_REVIEW.md** will focus on:
> *"Incremental vs full-refresh strategies. Consider partitioned scans to keep BigQuery costs under control."*

---

## 📐 Architecture

```
Feature Input (text / GitHub issue)
    │
    ▼
┌──────────────────┐
│  1. Feature      │  claude-haiku-5.5   (fast, cheap)
│     Intake       │  → structured { title, description }
└──────────────────┘
    │
    ▼
┌──────────────────┐
│  2. Spec         │  claude-sonnet-5.5  (strong reasoning)
│     Generation   │  → requirements, components, data model
└──────────────────┘
    │
    ├──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
    ▼                              ▼                              ▼                              ▼
┌──────────┐              ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ 3. Tests  │              │  4. UX        │              │  5. Security  │              │  6. Algorithm  │
│  sonnet   │              │  sonnet       │              │  sonnet/opus  │              │  sonnet/opus   │
└──────────┘              └──────────────┘              └──────────────┘              └──────────────┘
Stages 3–6 run in parallel ⚡
    │                              │                              │                              │
    └──────────────────────────────┼──────────────────────────────┼──────────────────────────────┘
                                   ▼
                        ┌──────────────────┐
                        │  7. Assembly     │  deepseek-flash  (cheapest)
                        │  → 5 markdown    │
                        │    files          │
                        └──────────────────┘
```

### Why Different Models?

| Stage | Model | Cost per run | Why this model |
|-------|-------|-------------|----------------|
| Intake | claude-haiku-5.5 | ~$0.001 | Just needs to parse text — no heavy reasoning |
| Spec | claude-sonnet-5.5 | ~$0.04 | Needs strong structured writing |
| Tests | claude-sonnet-5.5 | ~$0.03 | Edge-case reasoning matters |
| UX | claude-sonnet-5.5 | ~$0.02 | Design thinking |
| Security | claude-sonnet-5.5 | ~$0.03 | Or claude-opus-5.5 ($0.08) for compliance-heavy projects |
| Algorithm | claude-sonnet-5.5 | ~$0.02 | Analytical reasoning |
| Assembly | deepseek-flash | ~$0.001 | Just formatting — use cheapest |

**Typical cost per feature run: ~$0.10–0.50**

---

## ⚙️ Pipeline Configuration

### .factory-config.yaml Reference

```yaml
# ── Required ──────────────────────────────────────────────
project:
  name: "My App"                        # Used in document headers

# ── Tech stack (auto-injects into every prompt) ──────────
tech_stack:
  language: "TypeScript"
  frontend: "React 18"                  # Affects UX component suggestions
  backend: "Node.js + Express"          # Affects API spec details
  database: "PostgreSQL + Prisma"       # Affects data model suggestions
  testing: "vitest"                     # Affects test case format
  auth: "next-auth"                     # Security review checks auth patterns
  payments: "Stripe"                    # Security review checks payment flows
  hosting: "Vercel"                     # Deployment considerations
  ci: "GitHub Actions"                  # Test integration suggestions

# ── Conventions (free-form, injects into prompts) ────────
conventions:
  - "React Server Components only"
  - "Zod for validation"
  - "Repository pattern for data access"

# ── Security ─────────────────────────────────────────────
security:
  compliance:                           # Adds compliance checks
    - "GDPR"
    - "PCI-DSS"
  review_depth: "stride"                # checklist | stride | full

# ── Algorithm review ─────────────────────────────────────
algorithm:
  review_depth: "deep"                  # basic | deep

# ── Override models (optional) ──────────────────────────
model_overrides:
  security: "claude-opus-5.5"           # Use strongest model for security
```

---

## 🧪 Dry Run

Preview the pipeline without calling any APIs:

```bash
npx tsx src/index.ts --dry-run "Add OAuth login"

# Output:
#   📋 Project: My App
#
#   🏁 Dry run mode — no API calls will be made.
#
#   Pipeline stages:
#     [1/7] Feature Intake    → claude-haiku-5.5
#     [2/7] Spec Generation   → claude-sonnet-5.5
#     [3/7] Test Cases        → claude-sonnet-5.5
#     [4/7] UX Workflow       → claude-sonnet-5.5
#     [5/7] Security Review   → claude-sonnet-5.5
#     [6/7] Algorithm Review  → claude-sonnet-5.5
#     [7/7] Assembly          → deepseek-flash
#
#   Output: factory-output/
#   Config: .factory-config.yaml
```

---

## 📂 Output Example

Running `"Add OAuth login with Google"` with the e-commerce config above produces:

### `SPEC.md` — Feature Specification
```markdown
# OAuth Login with Google

Add Google as an OAuth provider so users can sign in without
creating a password.

## Functional Requirements
- 🔴 **FR-001**: User can click "Sign in with Google" on the login page
- 🔴 **FR-002**: System redirects to Google OAuth consent screen
- 🔴 **FR-003**: On successful auth, system creates or links user account
- 🟢 **FR-004**: First-time users see a welcome onboarding flow

## Acceptance Criteria
- [ ] New user flow: Login → Google → Consent → Redirect → Onboard
- [ ] Returning user flow: Login → Google → Redirect → Dashboard
```

### `SECURITY_REVIEW.md` — Threat Model
```markdown
| ID | Category | Risk | Component | Description |
|----|----------|------|-----------|-------------|
| T-001 | Spoofing | 🟠 High | OAuth callback | Attacker crafts fake OAuth callback |
| T-002 | Information Disclosure | 🟢 Low | Token storage | Access token in browser storage |
```

---

## 🧩 As an OpenCode Skill

If you use OpenCode, load the skill:

```
@factory "Add OAuth login with Google"
```

The skill reads `.factory-config.yaml` from your workspace, runs the pipeline, and drops the output into `factory-output/`.

---

## 📖 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Execution** | Raw model calls | 4–5× cheaper than sub-agents, faster, deterministic |
| **State passing** | In-memory context object | Typed, fast, testable |
| **Review loops** | Pure pipeline (no feedback) | Simple, parallelizable — two-pass planned for v2 |
| **Security depth** | STRIDE per component | Industry standard, catches design flaws |
| **Orchestration** | Parallel fan-out after spec | 3× faster wall-clock time than sequential |
| **Error handling** | Retry 2×, then fail | Handles transient model errors |
| **Model routing** | Hardcoded with config override | Predictable cost, flexible |

---

## 🗺️ Roadmap

- [x] v0.1 — MVP: pipeline runs, 5 documents generated
- [ ] v0.2 — Two-pass review (security/algo feedback → revised spec)
- [ ] v0.3 — OpenCode skill auto-installer
- [ ] v0.4 — Web UI for reviewing output before writing files
- [ ] v0.5 — CI integration (auto-run on PRs with `factory:pipeline` label)
- [ ] v1.0 — Plugin system for custom stages

---

## 📦 CLI Reference

```
factory <feature-description>          Run pipeline with inline description
factory --issue <url>                   Run pipeline from a GitHub issue
factory --config <path>                 Specify config file location
factory --dry-run                       Show what would happen without API calls
factory --help                          Show this help

Environment:
  OPENROUTER_API_KEY    Required. Get one at https://openrouter.ai/keys
```

---

<p align="center">
  <sub>Built with ❤️ — one agent at a time.</sub>
</p>