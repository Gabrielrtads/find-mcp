#!/usr/bin/env node
/**
 * Search MCP Engine (scripts/search_mcp.mjs)
 * High-speed, context-aware MCP discovery and recommendation tool.
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

function loadCatalog() {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Catalog not found at: ${catalogPath}`);
  }
  return JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
}

function loadInstalledServers(configPath = defaultConfigPath) {
  if (!fs.existsSync(configPath)) {
    return { installed: new Set(), disabled: new Set() };
  }
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const servers = config.mcpServers || {};
    const installed = new Set();
    const disabled = new Set();

    for (const [key, value] of Object.entries(servers)) {
      installed.add(key.toLowerCase());
      if (value.disabled) {
        disabled.add(key.toLowerCase());
      }
    }
    return { installed, disabled };
  } catch {
    return { installed: new Set(), disabled: new Set() };
  }
}

function detectLocalStack(workDir = process.cwd()) {
  const stackMatches = new Set();
  const pkgPath = path.join(workDir, "package.json");

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      for (const dep of Object.keys(deps)) {
        stackMatches.add(dep.toLowerCase());
      }
    } catch {}
  }

  if (fs.existsSync(path.join(workDir, "docker-compose.yml")) || fs.existsSync(path.join(workDir, "Dockerfile"))) {
    stackMatches.add("docker-compose.yml");
    stackMatches.add("dockerfile");
  }

  if (fs.existsSync(path.join(workDir, ".git"))) {
    stackMatches.add(".git");
  }

  return stackMatches;
}

export function searchMCP(options = {}) {
  const catalog = loadCatalog();
  const { installed, disabled } = loadInstalledServers();
  const query = (options.query || "").toLowerCase().trim();
  const isContextMode = Boolean(options.context);
  const detectedStack = detectLocalStack(options.cwd || process.cwd());

  let scored = catalog.map((item) => {
    let score = 0;
    const matchReasons = [];

    // 1. Context matching (stack tags)
    if (item.stack && item.stack.length > 0) {
      for (const st of item.stack) {
        if (detectedStack.has(st.toLowerCase())) {
          score += 40;
          matchReasons.push(`Detected '${st}' in active project`);
        }
      }
    }

    // 2. Query text matching
    if (query) {
      if (item.id.toLowerCase() === query) {
        score += 100;
        matchReasons.push(`Exact ID match: ${item.id}`);
      } else if (item.name.toLowerCase().includes(query)) {
        score += 60;
        matchReasons.push(`Name matches: ${item.name}`);
      }

      // Check intents keywords
      for (const intent of item.intents || []) {
        if (query.includes(intent.toLowerCase()) || intent.toLowerCase().includes(query)) {
          score += 35;
          matchReasons.push(`Intent match: '${intent}'`);
        }
      }

      // Check description & tools
      if (item.description && item.description.toLowerCase().includes(query)) {
        score += 20;
      }
      for (const tool of item.tools || []) {
        if (tool.toLowerCase().includes(query)) {
          score += 30;
          matchReasons.push(`Exposed tool: '${tool}'`);
        }
      }
    }

    // Status in local config
    const isInstalled = installed.has(item.id.toLowerCase()) || installed.has(item.name.toLowerCase());
    const isDisabled = disabled.has(item.id.toLowerCase()) || disabled.has(item.name.toLowerCase());

    return {
      ...item,
      score,
      matchReasons,
      isInstalled,
      isDisabled,
    };
  });

  // Filter and sort
  if (query) {
    scored = scored.filter((item) => item.score > 0);
  } else if (isContextMode) {
    scored = scored.filter((item) => item.score >= 40);
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, options.limit || 3);
}

export function formatMCPConfigSnippet(mcp) {
  const config = {
    command: mcp.command,
    args: mcp.args,
    disabled: false,
  };

  if (mcp.env && Object.keys(mcp.env).length > 0) {
    config.env = mcp.env;
  }

  return JSON.stringify({ [mcp.id]: config }, null, 2);
}

// CLI Execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  let query = "";
  let isContext = false;
  let isJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--context") isContext = true;
    else if (args[i] === "--json") isJson = true;
    else if (!query) query = args[i];
  }

  const results = searchMCP({ query, context: isContext });

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }

  if (results.length === 0) {
    console.log(`\n❌ No MCP servers found matching '${query}'. Try searching awesome-mcp-servers.`);
    process.exit(0);
  }

  console.log(`\n🔍 --- Recommended MCP Servers (Found: ${results.length}) ---\n`);

  for (const item of results) {
    const statusBadge = item.isInstalled
      ? item.isDisabled
        ? "🟡 [INSTALLED BUT DISABLED]"
        : "🟢 [ALREADY INSTALLED]"
      : "⚪ [NOT INSTALLED]";

    console.log(`### 📦 ${item.name} (\`${item.id}\`) ${statusBadge}`);
    console.log(`⭐ **Stars:** ${item.stars} | **Repo:** \`${item.repo}\``);
    console.log(`📝 **Description:** ${item.description}`);
    console.log(`🛠️ **Tools:** ${item.tools.map((t) => `\`${t}\``).join(", ")}`);
    if (item.matchReasons.length > 0) {
      console.log(`💡 **Why it matches:** ${item.matchReasons.join("; ")}`);
    }

    console.log("\n📋 **Snippet for `mcp_config.json`:**");
    console.log("```json");
    console.log(formatMCPConfigSnippet(item));
    console.log("```\n------------------------------------------------------------\n");
  }
}
