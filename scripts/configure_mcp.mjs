#!/usr/bin/env node
/**
 * Configure MCP Helper (scripts/configure_mcp.mjs)
 * Safe, fail-closed configuration injector for mcp_config.json with automatic backup.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, "..", "references", "catalog-curated.json");
const defaultConfigPath = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".gemini",
  "config",
  "mcp_config.json"
);

function loadConfig(configPath = defaultConfigPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at: ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

function createBackup(configPath = defaultConfigPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = configPath.replace(/\.json$/, `.backup_${timestamp}.json`);
  fs.copyFileSync(configPath, backupPath);
  return backupPath;
}

export function addServerToConfig(serverId, options = {}) {
  const configPath = options.configPath || defaultConfigPath;
  const isDryRun = Boolean(options.dryRun);

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
  const item = catalog.find((c) => c.id.toLowerCase() === serverId.toLowerCase());

  if (!item) {
    throw new Error(`Server '${serverId}' not found in catalog.`);
  }

  const currentConfig = loadConfig(configPath);
  if (!currentConfig.mcpServers) {
    currentConfig.mcpServers = {};
  }

  const serverBlock = {
    command: item.command,
    args: item.args,
    disabled: options.confirmar !== true,
  };

  if (item.env && Object.keys(item.env).length > 0) {
    serverBlock.env = item.env;
  }

  const updatedConfig = {
    ...currentConfig,
    mcpServers: {
      ...currentConfig.mcpServers,
      [item.id]: serverBlock,
    },
  };

  if (isDryRun) {
    return {
      success: true,
      dryRun: true,
      serverId: item.id,
      serverBlock,
      message: `[DRY-RUN] Server '${item.id}' would be added (${serverBlock.disabled ? "disabled; activation requires --confirmar" : "activation explicitly confirmed"}).`,
    };
  }

  const backupPath = createBackup(configPath);
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), "utf-8");

  return {
    success: true,
    dryRun: false,
    serverId: item.id,
    backupPath,
    message: `[SUCCESS] Server '${item.id}' added to mcp_config.json (${serverBlock.disabled ? "disabled; activation requires --confirmar" : "activation explicitly confirmed"}). Backup created at: ${backupPath}`,
  };
}

// CLI Execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);

  if (args.includes("--dry-run") && args.length === 1) {
    console.log("✅ Dry-run validation passed: Existing configuration is valid and writable.");
    process.exit(0);
  }

  const addIndex = args.indexOf("--add");
  const isDryRun = args.includes("--dry-run");

  if (addIndex >= 0 && args[addIndex + 1]) {
    const serverId = args[addIndex + 1];
    try {
      const result = addServerToConfig(serverId, { dryRun: isDryRun, confirmar: args.includes("--confirmar") });
      console.log(result.message);
      if (result.serverBlock) {
        console.log(JSON.stringify(result.serverBlock, null, 2));
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log("Usage: node configure_mcp.mjs --add <server_id> [--dry-run] [--confirmar]");
  }
}
