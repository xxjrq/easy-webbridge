import test from "node:test";
import assert from "node:assert/strict";
import { snapshotDocument } from "../extension/snapshot-document.js";
import { normalizeSnapshotOptions } from "../extension/snapshot-options.js";

function matches(element, selector) {
  return selector.split(",").some((part) => {
    const value = part.trim();
    if (value === "*") return true;
    if (value.startsWith(".")) return element.className.split(/\s+/).includes(value.slice(1));
    if (value.startsWith("#")) return element.getAttribute("id") === value.slice(1);
    const attribute = value.match(/^\[([^=\]]+)(?:=['"]?([^\]'\"]+)['"]?)?\]$/);
    if (attribute) return element.hasAttribute(attribute[1])
      && (attribute[2] === undefined || element.getAttribute(attribute[1]) === attribute[2]);
    return element.tagName.toLowerCase() === value.toLowerCase();
  });
}

class FakeElement {
  constructor(tagName, { text = "", attrs = {}, rect = { x: 10, y: 10, width: 40, height: 20 }, style = {}, className = "" } = {}) {
    this.tagName = tagName.toUpperCase();
    this.innerText = text;
    this.textContent = text;
    this.attrs = new Map(Object.entries(attrs));
    this.rect = rect;
    this.style = style;
    this.className = className;
    this.children = [];
    this.parentElement = null;
    this.disabled = false;
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
    return this;
  }

  matches(selector) { return matches(this, selector); }
  hasAttribute(name) { return this.attrs.has(name); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  removeAttribute(name) { this.attrs.delete(name); }
  getBoundingClientRect() {
    const { x, y, width, height } = this.rect;
    return { x, y, width, height, left: x, top: y, right: x + width, bottom: y + height };
  }
  contains(element) {
    return this.children.some((child) => child === element || child.contains(element));
  }
  getRootNode() {
    let root = this;
    while (root.parentElement) root = root.parentElement;
    return root;
  }
  querySelectorAll(selector) {
    const result = [];
    for (const child of this.children) {
      if (child.matches(selector)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
}

function installDom(body, { width = 100, height = 100 } = {}) {
  const documentElement = new FakeElement("html");
  documentElement.clientWidth = width;
  documentElement.clientHeight = height;
  const all = () => [body, ...body.querySelectorAll("a,button,input,textarea,select,[contenteditable='true'],[role],[tabindex],[data-agent-bridge-ref],.panel,#outside")];
  globalThis.document = {
    body,
    documentElement,
    title: "Test page",
    querySelectorAll(selector) {
      const elements = [body, ...body.querySelectorAll(selector)];
      return elements.filter((element) => element.matches(selector));
    },
    elementFromPoint(x, y) {
      return all().filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = globalThis.getComputedStyle(element);
        return rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom
          && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0;
      }).at(-1) || null;
    },
  };
  globalThis.innerWidth = width;
  globalThis.innerHeight = height;
  globalThis.location = { href: "https://example.test/page" };
  globalThis.getComputedStyle = (element) => ({ display: "block", visibility: "visible", opacity: "1", ...element.style });
}

function button(text, rect, style = {}, extra = {}) {
  return new FakeElement("button", { text, rect, style, ...extra });
}

test("visible is viewport and rendered visibility; hidden includes CSS-hidden and offscreen candidates", () => {
  const body = new FakeElement("body", { text: "Visible Hidden Offscreen" });
  body.append(
    button("Visible", { x: 10, y: 10, width: 20, height: 20 }),
    button("CSS hidden", { x: 10, y: 40, width: 20, height: 20 }, { display: "none" }),
    button("Offscreen", { x: 120, y: 10, width: 20, height: 20 }),
  );
  installDom(body);

  const visible = snapshotDocument(normalizeSnapshotOptions({ textMode: "none" }));
  assert.deepEqual(visible.interactive.map((item) => item.text), ["Visible"]);
  assert.equal(visible.interactive[0].visible, true);

  const hidden = snapshotDocument(normalizeSnapshotOptions({ visibility: "hidden", textMode: "none" }));
  assert.deepEqual(hidden.interactive.map((item) => item.text), ["CSS hidden", "Offscreen"]);
  assert.ok(hidden.interactive.every((item) => item.visible === false));
});

test("scope, text and role filters restrict candidates before selection", () => {
  const body = new FakeElement("body", { text: "Page text" });
  const panel = new FakeElement("section", { className: "panel", text: "Save Cancel Other" });
  panel.append(
    button("Save changes", { x: 10, y: 10, width: 20, height: 20 }),
    new FakeElement("a", { text: "Cancel", attrs: { href: "/cancel" }, rect: { x: 40, y: 10, width: 20, height: 20 } }),
    new FakeElement("div", { text: "Other", attrs: { role: "button" }, rect: { x: 70, y: 10, width: 20, height: 20 } }),
  );
  body.append(panel, button("Outside save", { x: 10, y: 50, width: 20, height: 20 }));
  installDom(body);

  const result = snapshotDocument(normalizeSnapshotOptions({
    scopeSelector: ".panel",
    text: ["save", "cancel"],
    roles: ["button"],
    textMode: "matched",
  }));
  assert.deepEqual(result.interactive.map((item) => [item.role, item.text]), [["button", "Save changes"]]);
  assert.equal(result.text, "Save changes");
  assert.deepEqual(result.counts, { candidates: 3, matched: 1, returned: 1, offset: 0 });
  assert.throws(() => snapshotDocument(normalizeSnapshotOptions({ scopeSelector: ".missing" })), /Scope not found/);
});

test("region intersect and contain honor rectangle edges", () => {
  const body = new FakeElement("body");
  body.append(
    button("Contained", { x: 20, y: 20, width: 10, height: 10 }),
    button("Partial", { x: 5, y: 20, width: 20, height: 10 }),
    button("Outside", { x: 0, y: 0, width: 4, height: 4 }),
  );
  installDom(body);
  const region = { x: 10, y: 10, width: 30, height: 30 };

  const intersect = snapshotDocument(normalizeSnapshotOptions({ visibility: "all", region, textMode: "none" }));
  assert.deepEqual(intersect.interactive.map((item) => item.text), ["Contained", "Partial"]);
  const contain = snapshotDocument(normalizeSnapshotOptions({ visibility: "all", region: { ...region, mode: "contain" }, textMode: "none" }));
  assert.deepEqual(contain.interactive.map((item) => item.text), ["Contained"]);
});

test("limit and offset assign returned refs and report counts and truncation", () => {
  const body = new FakeElement("body", { text: "All page text" });
  body.append(
    button("One", { x: 10, y: 10, width: 10, height: 10 }),
    button("Two", { x: 25, y: 10, width: 10, height: 10 }),
    button("Three", { x: 40, y: 10, width: 10, height: 10 }),
  );
  installDom(body);

  const result = snapshotDocument(normalizeSnapshotOptions({ maxElements: 1, offset: 1, textMode: "page", maxTextLength: 4 }));
  assert.deepEqual(result.interactive.map((item) => [item.ref, item.text]), [["@e1", "Two"]]);
  assert.equal(body.children[0].getAttribute("data-agent-bridge-ref"), null);
  assert.equal(body.children[1].getAttribute("data-agent-bridge-ref"), "e1");
  assert.equal(body.children[2].getAttribute("data-agent-bridge-ref"), null);
  assert.deepEqual(result.counts, { candidates: 3, matched: 3, returned: 1, offset: 1 });
  assert.equal(result.truncated, true);
  assert.equal(result.text, "All ");
  assert.equal(result.textTruncated, true);
});

test("discovers open shadow-root controls and returns compact output without page text or bounds", () => {
  const body = new FakeElement("body", { text: "Duplicate page text" });
  const host = new FakeElement("geo-panel");
  const shadowRoot = new FakeElement("shadow-root");
  const control = button("Save", { x: 10, y: 10, width: 30, height: 20 });
  shadowRoot.append(control);
  shadowRoot.host = host;
  host.shadowRoot = shadowRoot;
  host.querySelectorAll = FakeElement.prototype.querySelectorAll;
  body.append(host);
  installDom(body);

  const result = snapshotDocument(normalizeSnapshotOptions({ compact: true }));
  assert.equal(result.text, "");
  assert.equal(result.title, "Test page");
  assert.equal(result.url, "https://example.test/page");
  assert.equal(result.interactive[0].ref, "@e1");
  assert.equal(result.interactive[0].bounds, undefined);
  assert.equal(control.getAttribute("data-agent-bridge-ref"), "e1");
});

test("caps snapshot output with an explicit byte budget", () => {
  const result = snapshotDocument(normalizeSnapshotOptions({ maxBytes: 10_000, maxElements: 200, textMode: "page" }));
  assert.ok(JSON.stringify(result).length <= 10_000);
  assert.equal(typeof result.budgetTruncated, "boolean");
});
