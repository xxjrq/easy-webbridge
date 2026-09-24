export const COMMANDS = new Set([
  "list_tabs",
  "find_tab",
  "activate_tab",
  "close_tab",
  "close_session",
  "navigate",
  "snapshot",
  "list_frames",
  "wait_for",
  "capabilities",
  "click",
  "fill",
  "scroll",
  "screenshot",
  "evaluate",
  "cdp",
  "upload",
  "get_cookies",
  "set_cookie",
  "remove_cookie",
  "download",
  "reload_extension",
  "extension_identity",
  "extension_message",
  "network",
  "save_as_pdf",
  "batch",
  "press_key",
  "key_combo",
  "environment_info",
  "browser_profile",
]);

const BATCH_ACTIONS = new Set(["click", "fill", "scroll", "wait_for", "press_key", "key_combo"]);

function normalizeKeyInput(action, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error(`${action} args must be an object`);
  if (action === "press_key" && (typeof args.key !== "string" || !args.key.trim())) throw new Error("press_key.key is required");
  if (action === "key_combo" && (!Array.isArray(args.keys) || !args.keys.length || args.keys.length > 4 || args.keys.some((key) => typeof key !== "string" || !key.trim()))) throw new Error("key_combo.keys must contain 1 to 4 key names");
  if (args.frameId != null && Number(args.frameId) !== 0) throw new Error("keyboard input supports only the top frame");
}

function normalizeEnvironmentInfo(args) {
  const forbidden = ["userAgent", "user_agent", "platform", "language", "languages", "locale", "timezone", "timeZone", "hardwareConcurrency", "deviceMemory", "screen", "dpr", "webdriver", "override", "overrides", "inject"];
  const requested = forbidden.filter((key) => Object.hasOwn(args || {}, key));
  if (requested.length) throw new Error(`environment_info is read-only; override fields are not accepted: ${requested.join(", ")}`);
  if (args?.frameId != null && Number(args.frameId) !== 0) throw new Error("environment_info supports only the top frame");
}

function normalizeResultBudget(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("resultBudget must be an object");
  }
  const maxBytes = Number(value.maxBytes ?? 200_000);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1_000 || maxBytes > 2_000_000) {
    throw new Error("resultBudget.maxBytes must be an integer between 1000 and 2000000");
  }
  const mode = value.mode || "summary";
  if (!["summary", "truncate"].includes(mode)) throw new Error("resultBudget.mode must be summary or truncate");
  return { maxBytes, mode };
}

function normalizeBatch(args) {
  if (!Array.isArray(args.actions) || !args.actions.length) throw new Error("batch.actions must be a non-empty array");
  if (args.actions.length > 20) throw new Error("batch.actions accepts at most 20 actions");
  const maxDurationMs = Number(args.maxDurationMs ?? 30_000);
  if (!Number.isSafeInteger(maxDurationMs) || maxDurationMs < 500 || maxDurationMs > 120_000) throw new Error("batch.maxDurationMs must be an integer between 500 and 120000");
  const actions = args.actions.map((step, index) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) throw new Error(`batch action ${index} must be an object`);
    const action = String(step.action || "").trim();
    if (!BATCH_ACTIONS.has(action)) throw new Error(`batch action ${index} is not allowed: ${action || "<empty>"}`);
    const stepArgs = step.args == null ? {} : step.args;
    if (!stepArgs || typeof stepArgs !== "object" || Array.isArray(stepArgs)) throw new Error(`batch action ${index}.args must be an object`);
    if (["press_key", "key_combo"].includes(action)) normalizeKeyInput(action, stepArgs);
    const assertion = step.assert == null ? null : step.assert;
    if (assertion !== null && (!assertion || typeof assertion !== "object" || Array.isArray(assertion))) throw new Error(`batch action ${index}.assert must be an object`);
    return { action, args: stepArgs, ...(assertion ? { assert: assertion } : {}) };
  });
  return { actions, maxDurationMs };
}

export function normalizeCommand(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Command body must be a JSON object");
  }

  const action = String(body.action || "").trim();
  if (!COMMANDS.has(action)) {
    throw new Error(`Unsupported action: ${action || "<empty>"}`);
  }

  const args = body.args == null ? {} : body.args;
  if (typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Command args must be a JSON object");
  }

  const timeoutMs = Number(body.timeoutMs || 15_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 500 || timeoutMs > 120_000) {
    throw new Error("timeoutMs must be between 500 and 120000");
  }

  const normalizedArgs = { ...args };
  if (action === "batch") {
    const batch = normalizeBatch(args);
    normalizedArgs.actions = batch.actions;
    normalizedArgs.maxDurationMs = batch.maxDurationMs;
  }
  if (["press_key", "key_combo"].includes(action)) normalizeKeyInput(action, normalizedArgs);
  if (["environment_info", "browser_profile"].includes(action)) normalizeEnvironmentInfo(normalizedArgs);
  if (Object.hasOwn(normalizedArgs, "resultBudget")) normalizedArgs.resultBudget = normalizeResultBudget(normalizedArgs.resultBudget);
  return { action, args: normalizedArgs, timeoutMs };
}

export function summarizeResult(result) {
  if (Array.isArray(result)) return { type: "array", count: result.length };
  if (result && typeof result === "object") return { type: "object", keys: Object.keys(result).slice(0, 100) };
  return { type: typeof result };
}

export function isExtensionOrigin(origin) {
  return typeof origin === "string" && (
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://")
  );
}
