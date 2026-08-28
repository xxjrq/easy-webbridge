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
  for (const action of ["find_tab", "close_session", "network", "save_as_pdf"]) {
    assert.equal(normalizeCommand({ action }).action, action);
  }
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
