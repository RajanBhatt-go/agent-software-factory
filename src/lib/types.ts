// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Core Type Definitions
// ─────────────────────────────────────────────────────────────

// ── Input ─────────────────────────────────────────────────

export interface FeatureInput {
  title: string;
  description: string;
  source: "text" | "github";
  url?: string;
}

// ── Project Config ────────────────────────────────────────

export interface ProjectConfig {
  project: {
    name: string;
    description: string;
    url?: string;
  };
  tech_stack: {
    language?: string;
    frontend?: string;
    backend?: string;
    database?: string;
    testing?: string;
    ci?: string;
    hosting?: string;
    auth?: string;
    payments?: string;
  };
  conventions?: string[];
  security?: {
    compliance?: string[];
    review_depth?: "checklist" | "stride" | "full";
  };
  algorithm?: {
    review_depth?: "basic" | "deep";
  };
  model_overrides?: Record<string, string>;
}

// ── Spec ──────────────────────────────────────────────────

export interface Requirement {
  id: string;
  description: string;
  priority: "must" | "should" | "could" | "wont";
  category: "functional" | "non-functional";
}

export interface Component {
  name: string;
  description: string;
  technology?: string;
  interactions: string[];
}

export interface DataModel {
  entities: Entity[];
  relationships: string[];
}

export interface Entity {
  name: string;
  fields: string[];
  description: string;
}

export interface SpecDocument {
  title: string;
  overview: string;
  functionalRequirements: Requirement[];
  nonFunctionalRequirements: Requirement[];
  acceptanceCriteria: string[];
  components: Component[];
  dataModel?: DataModel;
}

// ── Test Cases ────────────────────────────────────────────

export interface TestCase {
  name: string;
  type: "unit" | "integration" | "e2e";
  scenario: string;
  given: string;
  when: string;
  then: string;
  edgeCase: boolean;
}

// ── UX Workflow ──────────────────────────────────────────

export interface UserFlow {
  actor: string;
  steps: FlowStep[];
  description: string;
}

export interface FlowStep {
  step: number;
  action: string;
  expectedOutcome: string;
}

export interface UIComponent {
  name: string;
  type: string;
  description: string;
}

export interface UXWorkflow {
  userFlows: UserFlow[];
  states: string[];
  uiComponents: UIComponent[];
  decisions: string[];
  notes: string[];
}

// ── Security Review ───────────────────────────────────────

export interface Threat {
  id: string;
  category: "Spoofing" | "Tampering" | "Repudiation" | "Information Disclosure" | "Denial of Service" | "Elevation of Privilege";
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  affectedComponent: string;
}

export interface Mitigation {
  threatId: string;
  description: string;
  effort: "low" | "medium" | "high";
}

export interface SecurityReview {
  threatModel: Threat[];
  mitigations: Mitigation[];
  overallRisk: "low" | "medium" | "high" | "critical";
  compliance: string[];
  recommendations: string[];
}

// ── Algorithm Review ──────────────────────────────────────

export interface ComplexityAnalysis {
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}

export interface Alternative {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

export interface AlgorithmReview {
  complexityAnalysis: ComplexityAnalysis[];
  alternatives: Alternative[];
  recommendation: string;
  performanceConsiderations: string[];
}

// ── Pipeline Context ──────────────────────────────────────

export interface FactoryContext {
  feature: FeatureInput;
  config: ProjectConfig | null;
  spec: SpecDocument | null;
  testCases: TestCase[] | null;
  uxWorkflow: UXWorkflow | null;
  securityReview: SecurityReview | null;
  algorithmReview: AlgorithmReview | null;
}

// ── Model Map ─────────────────────────────────────────────

export type StageName =
  | "intake"
  | "spec"
  | "tests"
  | "ux"
  | "security"
  | "algorithm"
  | "assembly";

export const MODEL_MAP: Record<StageName, string> = {
  intake:   "openrouter/anthropic/claude-haiku-5.5",
  spec:     "openrouter/anthropic/claude-sonnet-5.5",
  tests:    "openrouter/anthropic/claude-sonnet-5.5",
  ux:       "openrouter/anthropic/claude-sonnet-5.5",
  security: "openrouter/anthropic/claude-sonnet-5.5",
  algorithm:"openrouter/anthropic/claude-sonnet-5.5",
  assembly: "openrouter/~deepseek/deepseek-flash-latest",
};

export const MODEL_COST: Record<string, { input: number; output: number }> = {
  "openrouter/anthropic/claude-haiku-5.5":             { input: 0.10,  output: 0.50 },
  "openrouter/anthropic/claude-sonnet-5.5":            { input: 2.00,  output: 10.00 },
  "openrouter/anthropic/claude-opus-5.5":              { input: 4.00,  output: 20.00 },
  "openrouter/~deepseek/deepseek-flash-latest":         { input: 0.025, output: 1.20 },
  "openrouter/openai/gpt-6.1-sol":                     { input: 2.00,  output: 10.00 },
};