// ─────────────────────────────────────────────────────────────
//  Agent Software Factory — File I/O Utilities
// ─────────────────────────────────────────────────────────────

import { mkdir, readFile as fsRead, writeFile as fsWrite, stat } from "node:fs/promises";
import { join } from "node:path";

export { readFile, writeFile, mkdir, pathExists };

async function readFile(path: string): Promise<string> {
  return await fsRead(path, "utf-8");
}

async function writeFile(path: string, content: string): Promise<void> {
  await fsWrite(path, content, "utf-8");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function getOutputDir(base: string): string {
  return join(base, "factory-output");
}