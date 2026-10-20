---
name: find-mcp
version: 1.0.0
description: "Discovers, evaluates, and recommends curated Model Context Protocol (MCP) servers from awesome-mcp-servers, Glama, and Smithery. Context-aware, intent-driven, with safe config generation for mcp_config.json."
category: devops
tags: [mcp, model-context-protocol, find-mcp, discovery, tools, awesome-mcp-servers, smithery, glama]
---

# 🧭 Find MCP (`find-mcp`)

The smart, context-aware MCP discovery engine for **Claude Code**, **Cursor**, **OpenAI Codex**, and **Antigravity**.

Instead of manually browsing hundreds of GitHub repositories or guessing npm package arguments, `find-mcp` allows you and your AI agent to discover and configure the right MCP servers in seconds.

---

## ⚡ 3 Operational Modes

### 1. Intent-Driven Recommendation (Natural Language)
Describe what you want to achieve without knowing package names:
* *"I need to extract text and captions from YouTube videos"* ➔ Recommends `youtube-transcript`;
* *"I want the AI to manage team tasks on a kanban board"* ➔ Recommends `linear` or `clickup`;
* *"I need to query our PostgreSQL database"* ➔ Recommends `postgres` or `supabase`.

### 2. Direct Curated Search
Search directly by technology keyword:
```bash
node scripts/search_mcp.mjs postgres
node scripts/search_mcp.mjs docker
node scripts/search_mcp.mjs spotify
```

### 3. Project Context Audit (`--context`)
Scans your current workspace (`package.json`, `.env`, Dockerfile):
```bash
node scripts/search_mcp.mjs --context
```
- Matches your project dependencies (e.g. Next.js, Stripe, Supabase, Prisma, Docker);
- Checks your active `mcp_config.json` to prevent duplicate recommendations;
- Highlights missing architectural tooling.

---

## 🚀 Quick Install (Via skills.sh)

```bash
npx skills add Gabrielrtads/find-mcp
```

---

## 🛡️ Safe Configuration Injection (Fail-Closed)

`find-mcp` never mutates configuration files silently.
1. Generates the exact JSON block formatted for `mcp_config.json`;
2. Requires explicit user confirmation ("DE ACORDO") before saving;
3. Automatically creates a timestamped backup (`.backup_<timestamp>.json`) before writing.

```bash
# Safe dry-run
node scripts/configure_mcp.mjs --add youtube-transcript --dry-run

# Injection after approval
node scripts/configure_mcp.mjs --add youtube-transcript
```

---

## 📄 License

MIT License — Created with ❤️ by [Gabriel Toledo (@Gabrielrtads)](https://github.com/Gabrielrtads).
