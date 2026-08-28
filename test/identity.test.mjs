import test from "node:test";
import assert from "node:assert/strict";
import { easyBrProfileId, identityColor } from "../extension/identity.js";

test("recognizes an EasyBR profile identity from its local start page", () => {
  const profileId = "6a7bdf989d46d015154d2aef";
  assert.equal(easyBrProfileId(`http://localhost:3001/help/eindex.html?id=${profileId}`), profileId);
  assert.equal(easyBrProfileId(`http://127.0.0.1:3001/help/eindex.html?id=${profileId}`), profileId);
  assert.equal(easyBrProfileId(`https://example.com/help/eindex.html?id=${profileId}`), "");
  assert.equal(easyBrProfileId("http://localhost:3001/help/eindex.html?id=bad!"), "");
});

test("derives a stable profile color", () => {
  const profileId = "6a7bdf989d46d015154d2aef";
  assert.equal(identityColor(profileId), identityColor(profileId));
  assert.match(identityColor(profileId), /^#[0-9a-f]{6}$/);
});
