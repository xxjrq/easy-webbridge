#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.EASY_WEBBRIDGE_URL || "http://127.0.0.1:17777";

async function token() {
  if (process.env.EASY_WEBBRIDGE_TOKEN) return process.env.EASY_WEBBRIDGE_TOKEN;
  return (await readFile(join(homedir(), ".easy-webbridge", "bridge-token"), "utf8")).trim();
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${await token()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function health() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function startBridge() {
  const running = await health();
  if (running) return { ...running, started: false, url: baseUrl };
  const serverPath = fileURLToPath(new URL("../../../src/server.mjs", import.meta.url));
  spawn(process.execPath, [serverPath], { detached: true, stdio: "ignore" }).unref();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const ready = await health();
    if (ready) return { ...ready, started: true, url: baseUrl };
  }
  throw new Error("Easy WebBridge did not become ready");
}

function usage() {
  console.error(`Usage:
  easy-webbridge list
  easy-webbridge start
  easy-webbridge status
  easy-webbridge command <browserId> <action> [args-json]
  easy-webbridge navigate <browserId> <url> [--new-tab] [--session <name>] [--group-title <title>] [--ungrouped]
  easy-webbridge snapshot <browserId> [tabId]
  easy-webbridge click <browserId> <selector> [tabId]
  easy-webbridge fill <browserId> <selector> <value> [tabId]
  easy-webbridge screenshot <browserId> [tabId]`);
}

function navigateArgs(url, flags) {
  const options = { url, newTab: flags.includes("--new-tab") };
  const valueAfter = (name) => {
    const index = flags.indexOf(name);
    if (index < 0) return null;
    const value = flags[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    return value;
  };
  const requestedSession = valueAfter("--session");
  const requestedTitle = valueAfter("--group-title");
  if (options.newTab && !flags.includes("--ungrouped")) {
    const hostname = new URL(url).hostname;
    options.session = (requestedSession || `easy-webbridge:${hostname}`).slice(0, 120);
    options.groupTitle = (requestedTitle || hostname).slice(0, 80);
  } else if (requestedSession) {
    options.session = requestedSession;
    if (requestedTitle) options.groupTitle = requestedTitle;
  }
  return options;
}

async function command(browserId, action, args = {}) {
  return request(`/v1/browsers/${encodeURIComponent(browserId)}/commands`, {
    method: "POST",
    body: JSON.stringify({ action, args }),
  });
}

async function main() {
  const [verb, ...args] = process.argv.slice(2);
  let result;
  if (verb === "list") {
    result = await request("/v1/browsers");
  } else if (verb === "start") {
    result = await startBridge();
  } else if (verb === "status") {
    result = await health() || { ok: false, service: "easy-webbridge", online: false, url: baseUrl };
  } else if (verb === "command") {
    const [browserId, action, argsJson = "{}"] = args;
    if (!browserId || !action) throw new Error("browserId and action are required");
    result = await command(browserId, action, JSON.parse(argsJson));
  } else if (verb === "navigate") {
    const [browserId, url, ...flags] = args;
    if (!browserId || !url) throw new Error("browserId and url are required");
    result = await command(browserId, "navigate", navigateArgs(url, flags));
  } else if (["snapshot", "screenshot"].includes(verb)) {
    const [browserId, tabId] = args;
    if (!browserId) throw new Error("browserId is required");
    result = await command(browserId, verb, tabId ? { tabId: Number(tabId) } : {});
  } else if (verb === "click") {
    const [browserId, selector, tabId] = args;
    if (!browserId || !selector) throw new Error("browserId and selector are required");
    result = await command(browserId, "click", { selector, ...(tabId ? { tabId: Number(tabId) } : {}) });
  } else if (verb === "fill") {
    const [browserId, selector, value, tabId] = args;
    if (!browserId || !selector || value == null) throw new Error("browserId, selector and value are required");
    result = await command(browserId, "fill", { selector, value, ...(tabId ? { tabId: Number(tabId) } : {}) });
  } else {
    usage();
    process.exitCode = 2;
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
