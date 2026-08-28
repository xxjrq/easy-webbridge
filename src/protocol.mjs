export const COMMANDS = new Set([
  "list_tabs",
  "activate_tab",
  "close_tab",
  "navigate",
  "snapshot",
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
]);

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

  return { action, args, timeoutMs };
}

export function isExtensionOrigin(origin) {
  return typeof origin === "string" && (
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://")
  );
}
