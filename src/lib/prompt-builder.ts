// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Prompt Builder
//  Injects project context into every stage prompt.
// ─────────────────────────────────────────────────────────────

import { ProjectConfig } from "./types.js";

/**
 * Build the shared project context block injected into every prompt.
 */
export function buildProjectContextBlock(config: ProjectConfig | null): string {
  if (!config) return "";

  const lines: string[] = [];
  lines.push("## Project Context");

  const stack = config.tech_stack;
  if (stack.language)   lines.push(`- Language: ${stack.language}`);
  if (stack.frontend)   lines.push(`- Frontend: ${stack.frontend}`);
  if (stack.backend)    lines.push(`- Backend: ${stack.backend}`);
  if (stack.database)   lines.push(`- Database: ${stack.database}`);
  if (stack.testing)    lines.push(`- Testing: ${stack.testing}`);
  if (stack.auth)       lines.push(`- Auth: ${stack.auth}`);
  if (stack.payments)   lines.push(`- Payments: ${stack.payments}`);
  if (stack.hosting)    lines.push(`- Hosting: ${stack.hosting}`);
  if (stack.ci)         lines.push(`- CI: ${stack.ci}`);

  if (config.conventions && config.conventions.length > 0) {
    lines.push("");
    lines.push("### Project Conventions");
    for (const c of config.conventions) {
      lines.push(`- ${c}`);
    }
  }

  if (config.security?.compliance && config.security.compliance.length > 0) {
    lines.push("");
    lines.push("### Compliance Requirements");
    for (const c of config.security.compliance) {
      lines.push(`- ${c}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Format a spec document into a text block for prompts.
 */
export function formatSpecForPrompt(spec: {
  title: string;
  overview: string;
  functionalRequirements: { id: string; description: string; priority: string }[];
  nonFunctionalRequirements: { id: string; description: string; priority: string }[];
  acceptanceCriteria: string[];
  components: { name: string; description: string }[];
}): string {
  const lines: string[] = [];

  lines.push(`# ${spec.title}`);
  lines.push("");
  lines.push(spec.overview);
  lines.push("");

  if (spec.functionalRequirements.length > 0) {
    lines.push("## Functional Requirements");
    for (const r of spec.functionalRequirements) {
      lines.push(`- [${r.priority}] ${r.id}: ${r.description}`);
    }
    lines.push("");
  }

  if (spec.nonFunctionalRequirements.length > 0) {
    lines.push("## Non-Functional Requirements");
    for (const r of spec.nonFunctionalRequirements) {
      lines.push(`- [${r.priority}] ${r.id}: ${r.description}`);
    }
    lines.push("");
  }

  if (spec.acceptanceCriteria.length > 0) {
    lines.push("## Acceptance Criteria");
    for (const c of spec.acceptanceCriteria) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  }

  if (spec.components.length > 0) {
    lines.push("## Components");
    for (const c of spec.components) {
      lines.push(`- ${c.name}: ${c.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}