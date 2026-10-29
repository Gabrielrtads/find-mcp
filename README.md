# 🧭 Find MCP (`find-mcp`)

[![skills.sh compatible](https://img.shields.io/badge/skills.sh-compatible-6366f1?style=for-the-badge)](https://skills.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Zero-Dependency](https://img.shields.io/badge/Dependencies-Zero-emerald?style=for-the-badge)](#)
[![Sources](https://img.shields.io/badge/Sources-awesome--mcp--servers_|_Glama_|_Smithery-orange?style=for-the-badge)](#)

> **Discover, evaluate, and install Model Context Protocol (MCP) servers in seconds.**  
> An intelligent discovery engine and configurator for **Claude Code**, **Cursor**, **OpenAI Codex**, and **Antigravity**.  
> Features **intent-driven semantic search**, **project context auditing**, and **safe config injection** with automatic backups.

---

## ⚡ The Problem: MCP Discovery is Broken

Today, connecting an MCP server to an AI coding assistant requires:
1. Digging through 500+ unvetted GitHub repositories on `awesome-mcp-servers`;
2. Guessing whether to use `npx`, `uvx`, Python, or Docker;
3. Figuring out required environment variables (`API_KEY`);
4. Manually editing `mcp_config.json` or `claude_desktop_config.json` with a high risk of JSON syntax errors.

---

## 💡 The Solution: 3 Intelligent Modes

```
                                ┌──> 1. Intent Search ("I need to manage team tasks on kanban")
                                │    ➔ Recommends Linear or ClickUp with tool breakdown
                                │
[User Request / Project Goal] ──┼──> 2. Direct Search ("youtube", "postgres", "docker")
                                │    ➔ Returns curated top 3 servers with provenance status
                                │
                                └──> 3. Context Audit (--context)
                                     ➔ Scans package.json & Dockerfile; flags missing MCPs
```

---

## 🚀 Quick Install (Via skills.sh)

Install this skill directly into your AI coding assistant:

```bash
npx skills add Gabrielrtads/find-mcp
```

Or run via `npx`:

```bash
# Direct search
npx find-mcp postgres

# Intent search
npx find-mcp kanban

# Project context audit
npx find-mcp --context
```

---

## 💻 Sample Output

```text
🔍 --- Recommended MCP Servers (Found: 2) ---

### 📦 Linear (`linear`) 🟢 [ALREADY INSTALLED]
📚 Repo: linear/mcp-server | Provenance: unverified
📝 Description: Official Linear integration: manage issues, create tickets, move cards on kanban boards.
🛠️ Tools: list_issues, save_issue, get_issue, list_projects, list_teams
💡 Why it matches: Intent match: 'kanban'

📋 Snippet for mcp_config.json:
{
  "linear": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
    "disabled": true
  }
}
```

---

## 🛡️ Safe Configuration Injection (Fail-Closed)

`find-mcp` writes servers **disabled by default**, including copyable search snippets:
1. Preview the exact JSON block with required environment keys using `--dry-run`;
2. Activation requires explicit user approval and the `--confirmar` flag;
3. Automatically creates a timestamped backup (`mcp_config.backup_<timestamp>.json`) before writing.

```bash
# Dry run verification
node scripts/configure_mcp.mjs --add youtube-transcript --dry-run

# Save disabled (does not authorize execution)
node scripts/configure_mcp.mjs --add youtube-transcript

# Only after the user explicitly approves running this server
node scripts/configure_mcp.mjs --add youtube-transcript --confirmar
```

The exported `addServerToConfig` API activates only with `{ confirmar: true }`.
Confirmation allows the MCP client to execute third-party code on its next load.
Use a client that honors `disabled`; review the package, permissions, environment
and version before confirming. Catalog inclusion is not a security audit or an
integrity check. Most commands still resolve unpinned packages; numeric pins do
not lock transitive dependencies or verify hashes. Existing configurations are
not migrated automatically.

### Catalog provenance

`procedencia_verificada: true` means registry ownership and repository metadata
were checked, not that the executable is safe. Missing or false means unverified.
Unsourced star counts have been removed.

Checks on 2026-10-29:

| Entry | Evidence and limits |
| --- | --- |
| Docker | [PyPI metadata](https://pypi.org/pypi/mcp-server-docker/json) identifies owner `ckreiling`, repository `ckreiling/mcp-server-docker`, and version `0.3.0`; command pinned. |
| Playwright | [Project package.json](https://raw.githubusercontent.com/microsoft/playwright-mcp/main/package.json) declares `@playwright/mcp`, author Microsoft and `microsoft/playwright-mcp`. Pinned to the known [v0.0.83 release](https://github.com/microsoft/playwright-mcp/releases/tag/v0.0.83). npm publisher/metadata could not be checked, so provenance remains unverified. |
| Figma | [Project package.json](https://raw.githubusercontent.com/GLips/Figma-Context-MCP/main/package.json) declares `figma-developer-mcp` and `GLips/Figma-Context-MCP`. npm publisher/metadata could not be checked; unverified. |
| ClickUp, Spotify, n8n, Linear | npm registry requests failed (DNS unavailable from the shell; browser access denied/unavailable). Existing repository hints are unverified; no package ownership claim is made. Linear runs `mcp-remote`, whose publisher also remains unverified. |

---

## 📄 License

MIT License — Created with ❤️ by [Gabriel Toledo (@Gabrielrtads)](https://github.com/Gabrielrtads).
