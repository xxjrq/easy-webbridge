import test from "node:test";
import assert from "node:assert/strict";
import { isExtensionOrigin, normalizeCommand } from "../src/protocol.mjs";

test("normalizes supported high-permission commands", () => {
  assert.deepEqual(normalizeCommand({ action: "cdp", args: { method: "Page.reload" } }), {
    action: "cdp",
    args: { method: "Page.reload" },
    timeoutMs: 15_000,
  });
  assert.deepEqual(normalizeCommand({ action: "reload_extension" }), {
    action: "reload_extension",
    args: {},
    timeoutMs: 15_000,
  });
  for (const action of ["find_tab", "close_session", "list_frames", "wait_for", "capabilities", "extension_identity", "extension_message", "network", "save_as_pdf", "environment_info", "browser_profile"]) {
    assert.equal(normalizeCommand({ action }).action, action);
  }
  const batch = normalizeCommand({ action: "batch", args: { maxDurationMs: 5_000, actions: [{ action: "click", args: { selector: "#go" }, assert: { text: "Done", timeoutMs: 1000 } }] } });
  assert.equal(batch.args.actions[0].action, "click");
  assert.equal(batch.args.maxDurationMs, 5_000);
  assert.throws(() => normalizeCommand({ action: "batch", args: { actions: [{ action: "evaluate", args: {} }] } }), /not allowed/);
  assert.throws(() => normalizeCommand({ action: "snapshot", args: { resultBudget: { maxBytes: 500 } } }), /maxBytes/);
  assert.deepEqual(normalizeCommand({ action: "key_combo", args: { keys: ["CTRL", "A"] } }).args.keys, ["CTRL", "A"]);
  assert.throws(() => normalizeCommand({ action: "press_key", args: {} }), /key is required/);
  assert.throws(() => normalizeCommand({ action: "press_key", args: { key: "Enter", frameId: 2 } }), /top frame/);
  assert.throws(() => normalizeCommand({ action: "environment_info", args: { frameId: 3 } }), /top frame/);
  assert.throws(() => normalizeCommand({ action: "environment_info", args: { timezone: "UTC" } }), /read-only/);
});

test("rejects unsupported actions and invalid timeouts", () => {
  assert.throws(() => normalizeCommand({ action: "unknown" }), /Unsupported action/);
  assert.throws(() => normalizeCommand({ action: "snapshot", timeoutMs: 10 }), /timeoutMs/);
});

test("accepts extension origins only", () => {
  assert.equal(isExtensionOrigin("chrome-extension://abcdefghijklmnop"), true);
  assert.equal(isExtensionOrigin("moz-extension://abcdefghijklmnop"), true);
  assert.equal(isExtensionOrigin("https://example.com"), false);
});
