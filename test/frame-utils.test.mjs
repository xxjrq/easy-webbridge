import test from "node:test";
import assert from "node:assert/strict";
import { frameResult, publicFrames, scriptResult, scriptTarget } from "../extension/frame-utils.js";

test("keeps the default script target unchanged and supports a specific frame", () => {
  assert.deepEqual(scriptTarget(12), { tabId: 12 });
  assert.deepEqual(scriptTarget(12, 0), { tabId: 12, frameIds: [0] });
});

test("rejects invalid frame ids", () => {
  for (const frameId of [-1, 1.5, "2", Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => scriptTarget(12, frameId), /frameId must be a non-negative safe integer/);
  }
});

test("reports when Chrome injects into no frame", () => {
  assert.throws(() => scriptResult([]), /No frame was injected/);
  assert.equal(scriptResult([{ result: "ok" }]), "ok");
});

test("pairs snapshot results with their temporary frame ID", () => {
  assert.deepEqual(frameResult({ interactive: [{ ref: "@e1" }] }, 7), { interactive: [{ ref: "@e1" }], frameId: 7 });
  assert.deepEqual(frameResult({ interactive: [] }), { interactive: [], frameId: 0 });
  assert.throws(() => frameResult(null), /object result/);
});

test("returns only frame identity and safe origin, never frame URLs", () => {
  const result = publicFrames([
    { frameId: 0, parentFrameId: -1, url: "https://example.com/path?rpctoken=secret#state" },
    { frameId: 8, parentFrameId: 0, url: "http://localhost:3000/?token=secret" },
    { frameId: 9, parentFrameId: 0, url: "about:blank" },
  ]);
  assert.deepEqual(result, [
    { frameId: 0, parentFrameId: -1, origin: "https://example.com" },
    { frameId: 8, parentFrameId: 0, origin: "http://localhost:3000" },
    { frameId: 9, parentFrameId: 0, origin: null },
  ]);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});
