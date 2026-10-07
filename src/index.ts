#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — CLI Entry Point
// ─────────────────────────────────────────────────────────────

import { runPipeline } from "./orchestrator.js";
import { loadConfig } from "./config.js";

function printHelp(): void {
  console.log(`
Agent Software Factory — v0.1.0

USAGE:
  factory <feature-description>          Run pipeline with inline description
  factory --issue <url>                   Run pipeline from a GitHub issue
  factory --config <path>                 Specify config file location
  factory --dry-run                       Show what would happen without calling APIs
  factory --help                          Show this help

EXAMPLES:
  factory "Add OAuth login with Google"
  factory --issue https://github.com/org/repo/issues/42
  factory "Add buy-now button" --config ./path/to/.factory-config.yaml

ENVIRONMENT:
  OPENROUTER_API_KEY    Required. Get one at https://openrouter.ai/keys
`);
}

function parseArgs(): {
  featureText: string;
  issueUrl: string | null;
  configPath: string | null;
  dryRun: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2); // skip `tsx src/index.ts`
  const result = {
    featureText: "",
    issueUrl: null as string | null,
    configPath: null as string | null,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--help":
      case "-h":
        result.help = true;
        break;
      case "--issue":
        result.issueUrl = args[++i] ?? null;
        break;
      case "--config":
        result.configPath = args[++i] ?? null;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      default:
        if (result.featureText) result.featureText += " " + args[i];
        else result.featureText = args[i];
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help || (!args.featureText && !args.issueUrl)) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (!args.dryRun && !process.env["OPENROUTER_API_KEY"]) {
    console.error("❌ OPENROUTER_API_KEY is not set.");
    console.error("   Get a key at https://openrouter.ai/keys");
    console.error("   Then: export OPENROUTER_API_KEY=sk-or-v1-...");
    process.exit(1);
  }

  // Resolve feature input
  let featureInput = args.featureText;
  if (args.issueUrl) {
    console.log(`\n  Fetching GitHub issue: ${args.issueUrl}\n`);
    try {
      const match = args.issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
      if (!match) throw new Error("Invalid GitHub issue URL format");
      const [, owner, repo, issueNumber] = match;
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
        headers: { "User-Agent": "agent-software-factory" },
      });
      if (!resp.ok) throw new Error(`GitHub API returned ${resp.status}`);
      const issue = await resp.json() as { title: string; body: string };
      featureInput = `# ${issue.title}\n\n${issue.body ?? ""}`;
      console.log(`   → "${issue.title}"\n`);
    } catch (err) {
      console.error(`❌ Failed to fetch issue: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }

  // Load config
  const cwd = process.cwd();
  const configPath = args.configPath ?? cwd;
  const config = await loadConfig(configPath);

  if (config) {
    console.log(`  📋 Project: ${config.project.name}\n`);
  } else {
    console.log("  📋 No config found — using defaults\n");
  }

  if (args.dryRun) {
    console.log("  🏁 Dry run mode — no API calls will be made.\n");
    console.log("  Pipeline stages:");
    console.log("    [1/7] Feature Intake    → claude-haiku-5.5");
    console.log("    [2/7] Spec Generation   → claude-sonnet-5.5");
    console.log("    [3/7] Test Cases        → claude-sonnet-5.5");
    console.log("    [4/7] UX Workflow       → claude-sonnet-5.5");
    console.log("    [5/7] Security Review   → claude-sonnet-5.5");
    console.log("    [6/7] Algorithm Review  → claude-sonnet-5.5");
    console.log("    [7/7] Assembly          → deepseek-flash\n");
    console.log("  Output: factory-output/");
    console.log("  Config: .factory-config.yaml");
    process.exit(0);
  }

  // Run pipeline
  try {
    await runPipeline(featureInput, config);
  } catch (err) {
    console.error(`\n❌ Pipeline failed:`);
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

await main();