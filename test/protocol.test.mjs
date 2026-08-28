import test from "node:test";
import assert from "node:assert/strict";
import { isExtensionOrigin, normalizeCommand } from "../src/protocol.mjs";

test("normalizes supported high-permission commands", () => {
  assert.deepEqual(normalizeCommand({ action: "cdp", args: { method: "Page.reload" } }), {
    action: "cdp",
    args: { method: "Page.reload" },
    timeoutMs: 15_000,
  });
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
