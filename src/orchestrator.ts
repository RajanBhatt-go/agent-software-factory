// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Orchestrator
//  Runs the pipeline: intake → spec → [tests, UX, security, algorithm] → assembly
// ─────────────────────────────────────────────────────────────

import { FactoryContext, ProjectConfig } from "./lib/types.js";
import { stageIntake } from "./stages/intake.js";
import { stageSpec } from "./stages/spec.js";
import { stageTests } from "./stages/tests.js";
import { stageUX } from "./stages/ux.js";
import { stageSecurity } from "./stages/security.js";
import { stageAlgorithm } from "./stages/algorithm.js";
import { stageAssembly } from "./stages/assembly.js";

export interface PipelineResult {
  feature: string;
  totalDurationMs: number;
  totalCost: number;
  stages: Record<string, { durationMs: number; cost: number; model: string }>;
}

export async function runPipeline(
  featureInput: string,
  config: ProjectConfig | null
): Promise<PipelineResult> {
  const timings: Record<string, { durationMs: number; cost: number; model: string }> = {};
  const ctx: FactoryContext = {
    feature: { title: "", description: "", source: "text" },
    config,
    spec: null,
    testCases: null,
    uxWorkflow: null,
    securityReview: null,
    algorithmReview: null,
  };

  console.log("");
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║       Agent Software Factory                      ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log("");

  // ── Stage 1: Intake ─────────────────────────────────────
  logStage(1, "Parsing feature...");
  const intakeResult = await stageIntake(featureInput, config);
  ctx.feature = intakeResult.feature;
  timings["intake"] = {
    durationMs: intakeResult.durationMs,
    cost: intakeResult.cost,
    model: intakeResult.model,
  };
  logDone(intakeResult.durationMs, intakeResult.cost, intakeResult.model);
  console.log(`   → ${ctx.feature.title}`);

  // ── Stage 2: Spec ───────────────────────────────────────
  logStage(2, "Generating specification...");
  const specResult = await stageSpec(ctx.feature, config);
  ctx.spec = specResult.spec;
  timings["spec"] = {
    durationMs: specResult.durationMs,
    cost: specResult.cost,
    model: specResult.model,
  };
  logDone(specResult.durationMs, specResult.cost, specResult.model);

  // ── Stages 3-6: Parallel ────────────────────────────────
  console.log("");
  console.log("   ── Running parallel stages ──");
  console.log("");

  logStage(3, "Generating test cases...     ", false);
  logStage(4, "Designing UX workflow...     ", false);
  logStage(5, "Reviewing security...        ", false);
  logStage(6, "Reviewing algorithms...      ", false);
  process.stdout.write("\x1B[4A"); // Move up 4 lines

  const parallelStart = Date.now();

  const [testsResult, uxResult, securityResult, algorithmResult] = await Promise.all([
    stageTests(ctx.spec!, config),
    stageUX(ctx.spec!, config),
    stageSecurity(ctx.spec!, config),
    stageAlgorithm(ctx.spec!, config),
  ]);

  ctx.testCases = testsResult.testCases;
  ctx.uxWorkflow = uxResult.uxWorkflow;
  ctx.securityReview = securityResult.securityReview;
  ctx.algorithmReview = algorithmResult.algorithmReview;

  timings["tests"]    = { durationMs: testsResult.durationMs,    cost: testsResult.cost,    model: testsResult.model };
  timings["ux"]       = { durationMs: uxResult.durationMs,       cost: uxResult.cost,       model: uxResult.model };
  timings["security"] = { durationMs: securityResult.durationMs,  cost: securityResult.cost,  model: securityResult.model };
  timings["algorithm"]= { durationMs: algorithmResult.durationMs, cost: algorithmResult.cost, model: algorithmResult.model };

  // Print parallel results
  process.stdout.write("\x1B[4B"); // Move down 4 lines
  logDone(testsResult.durationMs, testsResult.cost, testsResult.model, "3");
  logDone(uxResult.durationMs, uxResult.cost, uxResult.model, "4");
  logDone(securityResult.durationMs, securityResult.cost, securityResult.model, "5");
  logDone(algorithmResult.durationMs, algorithmResult.cost, algorithmResult.model, "6");

  const parallelDuration = Date.now() - parallelStart;
  console.log(`   (parallel window: ${fmtTime(parallelDuration)})`);

  // ── Stage 7: Assembly ───────────────────────────────────
  console.log("");
  logStage(7, "Assembling documents...");
  const assemblyStart = Date.now();
  await stageAssembly(ctx, timings);
  const assemblyDuration = Date.now() - assemblyStart;
  timings["assembly"] = {
    durationMs: assemblyDuration,
    cost: 0,
    model: "local",
  };

  // ── Summary ─────────────────────────────────────────────
  const totalDuration = Object.values(timings).reduce((s, t) => s + t.durationMs, 0);
  const totalCost = Object.values(timings).reduce((s, t) => s + t.cost, 0);

  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  Summary                                          ║");
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log(`║  Feature: ${ctx.feature.title.padEnd(42)}║`);
  console.log(`║  Duration: ${fmtTime(totalDuration).padEnd(41)}║`);
  console.log(`║  Cost:    ${fmtCost(totalCost).padEnd(41)}║`);
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log("");

  return {
    feature: ctx.feature.title,
    totalDurationMs: totalDuration,
    totalCost,
    stages: timings,
  };
}

// ── Helpers ──────────────────────────────────────────────

function fmtTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtCost(cost: number): string {
  if (cost < 0.01) return `${(cost * 1000).toFixed(2)}m¢`;
  return `$${cost.toFixed(4)}`;
}

function logStage(num: number, label: string, newline = true): void {
  process.stdout.write(`  [${num}/7] ${label}`);
  if (newline) process.stdout.write("\n");
}

function logDone(durationMs: number, cost: number, model: string, prefix?: string): void {
  const pfx = prefix ? `  [${prefix}/7]` : "        ";
  const modelShort = model.split("/").pop() ?? model;
  process.stdout.write(
    `${pfx} ✓  ${fmtTime(durationMs).padStart(8)}  ${fmtCost(cost).padStart(8)}  ${modelShort}\n`
  );
}