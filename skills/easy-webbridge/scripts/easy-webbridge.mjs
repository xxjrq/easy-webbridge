#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

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

function usage() {
  console.error(`Usage:
  easy-webbridge list
  easy-webbridge command <browserId> <action> [args-json]
  easy-webbridge navigate <browserId> <url> [--new-tab]
  easy-webbridge snapshot <browserId> [tabId]
  easy-webbridge click <browserId> <selector> [tabId]
  easy-webbridge fill <browserId> <selector> <value> [tabId]
  easy-webbridge screenshot <browserId> [tabId]`);
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
  } else if (verb === "command") {
    const [browserId, action, argsJson = "{}"] = args;
    if (!browserId || !action) throw new Error("browserId and action are required");
    result = await command(browserId, action, JSON.parse(argsJson));
  } else if (verb === "navigate") {
    const [browserId, url] = args;
    if (!browserId || !url) throw new Error("browserId and url are required");
    result = await command(browserId, "navigate", { url, newTab: args.includes("--new-tab") });
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
