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
                                │    ➔ Returns curated top 3 servers with star ratings
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
⭐ Stars: 3.5k | Repo: linear/mcp-server
📝 Description: Official Linear integration: manage issues, create tickets, move cards on kanban boards.
🛠️ Tools: list_issues, save_issue, get_issue, list_projects, list_teams
💡 Why it matches: Intent match: 'kanban'

📋 Snippet for mcp_config.json:
{
  "linear": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
    "disabled": false
  }
}
```

---

## 🛡️ Safe Configuration Injection (Fail-Closed)

`find-mcp` never mutates configuration files silently:
1. Always displays the exact JSON block with required environment keys;
2. Requires explicit user approval before saving;
3. Automatically creates a timestamped backup (`mcp_config.backup_<timestamp>.json`) before writing.

```bash
# Dry run verification
node scripts/configure_mcp.mjs --add youtube-transcript --dry-run

# Safe automated injection
node scripts/configure_mcp.mjs --add youtube-transcript
```

---

## 📄 License

MIT License — Created with ❤️ by [Gabriel Toledo (@Gabrielrtads)](https://github.com/Gabrielrtads).
