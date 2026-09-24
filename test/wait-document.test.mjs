import test from "node:test";
import assert from "node:assert/strict";
import { waitForDocument } from "../extension/wait-document.js";

function installPage({ url = "https://example.test/current", nodes = [] } = {}) {
  globalThis.location = { href: url };
  globalThis.document = {
    querySelectorAll(selector) {
      if (selector === "body *") return nodes;
      if (selector === "*") return [];
      return nodes.filter((node) => node.selector === selector);
    },
  };
  globalThis.getComputedStyle = (node) => node.style;
}

function node({ text = "", selector = "", hidden = false } = {}) {
  return {
    innerText: text,
    selector,
    style: { display: hidden ? "none" : "block", visibility: "visible", opacity: "1" },
    getBoundingClientRect: () => ({ width: 20, height: 10 }),
  };
}

test("waits for URL presence or absence according to the requested state", () => {
  installPage();
  assert.equal(waitForDocument({ url: "/current", state: "visible" }), true);
  assert.equal(waitForDocument({ url: "/next", state: "visible" }), false);
  assert.equal(waitForDocument({ url: "/next", state: "hidden" }), true);
  assert.equal(waitForDocument({ url: "/current", state: "detached" }), false);
});

test("text waiting uses rendered innerText, not hidden descendants' textContent", () => {
  const panel = node({ text: "Visible panel" });
  const hidden = node({ text: "secret", hidden: true });
  hidden.textContent = "secret";
  installPage({ nodes: [panel, hidden] });
  assert.equal(waitForDocument({ text: "secret", state: "visible" }), false);
  assert.equal(waitForDocument({ text: "secret", state: "hidden" }), true);
  assert.equal(waitForDocument({ text: "Visible", state: "visible" }), true);
});
