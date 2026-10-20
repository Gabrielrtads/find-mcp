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
    throw new Error(`Catálogo não encontrado em: ${catalogPath}`);
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
  const queryWords = query.split(/\s+/).filter(Boolean);
  const isContextMode = Boolean(options.context);
  const detectedStack = detectLocalStack(options.cwd || process.cwd());

  let scored = catalog.map((item) => {
    let queryScore = 0;
    let contextScore = 0;
    const matchReasons = [];

    // 1. Context matching (stack tags)
    if (item.stack && item.stack.length > 0) {
      for (const st of item.stack) {
        if (detectedStack.has(st.toLowerCase())) {
          contextScore += 40;
          matchReasons.push(`Detectado '${st}' no projeto atual`);
        }
      }
    }

    // 2. Query text matching
    if (query) {
      if (item.id.toLowerCase() === query) {
        queryScore += 100;
        matchReasons.push(`Correspondência exata de ID: ${item.id}`);
      } else if (item.name.toLowerCase().includes(query)) {
        queryScore += 60;
        matchReasons.push(`Nome corresponde: ${item.name}`);
      }

      // Check intents keywords with robust boundary & stem matching
      for (const intent of item.intents || []) {
        const intentLower = intent.toLowerCase();
        let matches = false;

        if (intentLower.includes(" ")) {
          if (query.includes(intentLower)) {
            matches = true;
          }
        } else if (intentLower.length <= 3) {
          if (queryWords.includes(intentLower)) {
            matches = true;
          }
        } else {
          if (query.includes(intentLower)) {
            matches = true;
          } else {
            for (const qw of queryWords) {
              if (qw.length >= 4 && (qw.startsWith(intentLower) || intentLower.startsWith(qw))) {
                matches = true;
                break;
              }
            }
          }
        }

        if (matches) {
          queryScore += 35;
          matchReasons.push(`Intenção mapeada: '${intent}'`);
        }
      }

      // Check description & tools
      if (item.description && item.description.toLowerCase().includes(query)) {
        queryScore += 20;
      }
      for (const tool of item.tools || []) {
        const toolLower = tool.toLowerCase();
        if (query.includes(toolLower) || queryWords.some((qw) => qw.length >= 4 && toolLower.includes(qw))) {
          queryScore += 30;
          matchReasons.push(`Ferramenta correspondente: '${tool}'`);
        }
      }
    }

    let finalScore = 0;
    if (query) {
      // If query was typed, require at least one query match before considering stack bonus
      if (queryScore > 0) {
        finalScore = queryScore + (contextScore > 0 ? 25 : 0);
      } else if (isContextMode) {
        finalScore = contextScore;
      }
    } else if (isContextMode) {
      finalScore = contextScore;
    }

    // Status in local config
    const isInstalled = installed.has(item.id.toLowerCase()) || installed.has(item.name.toLowerCase());
    const isDisabled = disabled.has(item.id.toLowerCase()) || disabled.has(item.name.toLowerCase());

    return {
      ...item,
      score: finalScore,
      matchReasons,
      isInstalled,
      isDisabled,
    };
  });

  // Filter and sort
  scored = scored.filter((item) => item.score > 0);
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
  const queryParts = [];
  let isContext = false;
  let isJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--context") isContext = true;
    else if (args[i] === "--json") isJson = true;
    else queryParts.push(args[i]);
  }

  const query = queryParts.join(" ").trim();
  const results = searchMCP({ query, context: isContext });

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  }

  if (results.length === 0) {
    console.log(`\n❌ Nenhum MCP encontrado para '${query}'. Tente outro termo ou consulte o awesome-mcp-servers.`);
    process.exit(0);
  }

  console.log(`\n🔍 --- MCPs Recomendados (Encontrados: ${results.length}) ---\n`);

  for (const item of results) {
    const statusBadge = item.isInstalled
      ? item.isDisabled
        ? "🟡 [INSTALADO MAS DESATIVADO]"
        : "🟢 [JÁ INSTALADO]"
      : "⚪ [NÃO INSTALADO]";

    console.log(`### 📦 ${item.name} (\`${item.id}\`) ${statusBadge}`);
    console.log(`⭐ **Estrelas:** ${item.stars} | **Repo:** \`${item.repo}\``);
    console.log(`📝 **Descrição:** ${item.description}`);
    console.log(`🛠️ **Ferramentas:** ${item.tools.map((t) => `\`${t}\``).join(", ")}`);
    if (item.matchReasons.length > 0) {
      console.log(`💡 **Por que faz sentido:** ${item.matchReasons.join("; ")}`);
    }

    console.log("\n📋 **Snippet para colar no `mcp_config.json`:**");
    console.log("```json");
    console.log(formatMCPConfigSnippet(item));
    console.log("```\n------------------------------------------------------------\n");
  }
}
