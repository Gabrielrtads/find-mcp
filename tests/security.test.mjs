import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { addServerToConfig } from "../scripts/configure_mcp.mjs";
import { formatMCPConfigSnippet } from "../scripts/search_mcp.mjs";

const catalog = JSON.parse(fs.readFileSync(new URL("../references/catalog-curated.json", import.meta.url)));

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(process.cwd(), ".test-config-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const configPath = path.join(dir, "mcp_config.json");
  const original = JSON.stringify({ other: true, mcpServers: { existing: { command: "local" } } });
  fs.writeFileSync(configPath, original);
  return { dir, configPath, original };
}

test("all generated snippets and default dry runs are disabled", (t) => {
  const { configPath } = fixture(t);
  for (const item of catalog) {
    assert.equal(JSON.parse(formatMCPConfigSnippet(item))[item.id].disabled, true);
    assert.equal(addServerToConfig(item.id, { configPath, dryRun: true }).serverBlock.disabled, true);
  }
});

test("writes disabled by default, preserves config and backs up original", (t) => {
  const { configPath, original } = fixture(t);
  const result = addServerToConfig("docker", { configPath });
  const saved = JSON.parse(fs.readFileSync(configPath));
  assert.equal(saved.mcpServers.docker.disabled, true);
  assert.deepEqual(saved.mcpServers.existing, { command: "local" });
  assert.equal(saved.other, true);
  assert.equal(fs.readFileSync(result.backupPath, "utf8"), original);
});

test("activation requires literal boolean confirmation, including overwrites", (t) => {
  const { configPath } = fixture(t);
  addServerToConfig("docker", { configPath, confirmar: true });
  assert.equal(JSON.parse(fs.readFileSync(configPath)).mcpServers.docker.disabled, false);
  for (const confirmar of [undefined, false, "true", "false", 1]) {
    const result = addServerToConfig("docker", { configPath, confirmar, dryRun: true });
    assert.equal(result.serverBlock.disabled, true);
  }
  addServerToConfig("docker", { configPath });
  assert.equal(JSON.parse(fs.readFileSync(configPath)).mcpServers.docker.disabled, true);
});

test("confirmed dry run previews activation without writing or backups", (t) => {
  const { dir, configPath, original } = fixture(t);
  const result = addServerToConfig("docker", { configPath, confirmar: true, dryRun: true });
  assert.equal(result.serverBlock.disabled, false);
  assert.equal(fs.readFileSync(configPath, "utf8"), original);
  assert.deepEqual(fs.readdirSync(dir), ["mcp_config.json"]);
});

test("CLI activates only with exact --confirmar flag", (t) => {
  const { dir } = fixture(t);
  fs.mkdirSync(path.join(dir, ".gemini", "config"), { recursive: true });
  const configPath = path.join(dir, ".gemini", "config", "mcp_config.json");
  for (const [flags, disabled] of [[[], true], [["--confirmar=false"], true], [["--confirmar"], false]]) {
    fs.writeFileSync(configPath, "{}");
    const run = spawnSync(process.execPath, ["scripts/configure_mcp.mjs", "--add", "docker", ...flags], {
      encoding: "utf8", env: { ...process.env, USERPROFILE: dir, HOME: dir },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(JSON.parse(fs.readFileSync(configPath)).mcpServers.docker.disabled, disabled);
  }
});

test("questioned catalog provenance is explicit and stars have evidence", () => {
  for (const id of ["docker", "linear", "clickup", "spotify", "playwright", "figma", "n8n"]) {
    const item = catalog.find((entry) => entry.id === id);
    assert.equal(typeof item.procedencia_verificada, "boolean", id);
    if (item.procedencia_verificada) {
      assert.ok(item.procedencia_fonte, id);
      assert.match(item.procedencia_data, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
  assert.equal(catalog.find((item) => item.id === "docker").repo, "ckreiling/mcp-server-docker");
  assert.equal(catalog.find((item) => item.id === "playwright").repo, "microsoft/playwright-mcp");
  assert.equal(catalog.find((item) => item.id === "figma").repo, "GLips/Figma-Context-MCP");
  for (const item of catalog) {
    if (item.stars != null) {
      assert.ok(item.stars_fonte, item.id);
      assert.ok(item.stars_data, item.id);
    }
  }
});

test("Playwright uses a numeric pinned version instead of a floating tag", () => {
  assert.match(catalog.find((item) => item.id === "playwright").args[1], /^@playwright\/mcp@\d+\.\d+\.\d+$/);
  assert.equal(catalog.find((item) => item.id === "docker").args[0], "mcp-server-docker==0.3.0");
});

test("search preserves recommendations and shows unverified provenance without invented stars", () => {
  const run = spawnSync(process.execPath, ["scripts/search_mcp.mjs", "clickup"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /ClickUp/);
  assert.match(run.stdout, /não verificada/);
  assert.doesNotMatch(run.stdout, /Estrelas|undefined/);
});
