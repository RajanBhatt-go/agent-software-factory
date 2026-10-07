// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — Configuration Loader
// ─────────────────────────────────────────────────────────────

import { readFile, pathExists } from "./lib/io.js";
import { ProjectConfig, MODEL_MAP, StageName } from "./lib/types.js";
import yaml from "js-yaml";

const CONFIG_FILENAME = ".factory-config.yaml";

/**
 * Find and load .factory-config.yaml from cwd or parent directories.
 * Returns null if none found.
 */
export async function loadConfig(startDir: string): Promise<ProjectConfig | null> {
  let dir = startDir;

  while (true) {
    const path = `${dir}/${CONFIG_FILENAME}`;
    if (await pathExists(path)) {
      const raw = await readFile(path);
      const parsed = yaml.load(raw) as ProjectConfig;
      if (parsed?.project?.name) {
        return parsed;
      }
      return null;
    }

    const parent = dir.substring(0, dir.lastIndexOf("/"));
    if (parent === dir || parent.length === 0) break;
    dir = parent;
  }

  return null;
}

/**
 * Resolve the model for a stage, respecting config overrides.
 */
export function resolveModel(stage: StageName, config: ProjectConfig | null): string {
  if (config?.model_overrides?.[stage]) {
    const overridden = config.model_overrides[stage];
    // The override could be a friendly name like "claude-opus-5.5"
    // Map it to the full path
    const friendlyToFull: Record<string, string> = {
      "claude-haiku-5.5":  "openrouter/anthropic/claude-haiku-5.5",
      "claude-sonnet-5.5": "openrouter/anthropic/claude-sonnet-5.5",
      "claude-opus-5.5":   "openrouter/anthropic/claude-opus-5.5",
      "deepseek-flash":    "openrouter/~deepseek/deepseek-flash-latest",
      "gpt-6.1-sol":       "openrouter/openai/gpt-6.1-sol",
      "gpt-6-luna":        "openrouter/openai/gpt-6-luna",
    };
    return friendlyToFull[overridden] ?? overridden;
  }
  return MODEL_MAP[stage];
}