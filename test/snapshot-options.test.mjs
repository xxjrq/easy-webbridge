import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSnapshotOptions } from "../extension/snapshot-options.js";

test("snapshot defaults prioritize visible elements and bounded output", () => {
  assert.deepEqual(normalizeSnapshotOptions(), {
    maxTextLength: 20_000,
    maxBytes: 500_000,
    maxElements: 200,
    offset: 0,
    visibility: "visible",
    scopeSelector: null,
    region: null,
    text: [],
    roles: [],
    textMode: "page",
    compact: false,
  });
});

test("compact snapshots suppress page text unless explicitly requested", () => {
  assert.equal(normalizeSnapshotOptions({ compact: true }).textMode, "none");
  assert.equal(normalizeSnapshotOptions({ compact: true, textMode: "matched" }).textMode, "matched");
  assert.equal(normalizeSnapshotOptions({ compact: true }).compact, true);
});

test("snapshot supports hidden elements, scopes, regions and filters", () => {
  assert.deepEqual(normalizeSnapshotOptions({
    visibility: "hidden",
    scope: "[role=dialog]",
    region: { x: 10, y: 20, width: 300, height: 200, mode: "contain" },
    text: ["确定", "保存"],
    role: ["Button", "LINK"],
    limit: 25,
    offset: 25,
    textMode: "matched",
    maxTextLength: 4_000,
    maxBytes: 500_000,
  }), {
    maxTextLength: 4_000,
    maxBytes: 500_000,
    maxElements: 25,
    offset: 25,
    visibility: "hidden",
    scopeSelector: "[role=dialog]",
    region: { x: 10, y: 20, width: 300, height: 200, mode: "contain" },
    text: ["确定", "保存"],
    roles: ["button", "link"],
    textMode: "matched",
    compact: false,
  });
});

test("snapshot supports viewport regions and the includeHidden compatibility flag", () => {
  const result = normalizeSnapshotOptions({ includeHidden: true, region: "viewport" });
  assert.equal(result.visibility, "all");
  assert.equal(result.region, "viewport");
});

test("snapshot rejects invalid bounds and filter values", () => {
  assert.throws(() => normalizeSnapshotOptions({ visibility: "maybe" }), /visibility/);
  assert.throws(() => normalizeSnapshotOptions({ maxElements: 0 }), /maxElements/);
  assert.throws(() => normalizeSnapshotOptions({ region: { x: 0, y: 0, width: 0, height: 20 } }), /greater than zero/);
  assert.throws(() => normalizeSnapshotOptions({ roles: [""] }), /must not be empty/);
});
