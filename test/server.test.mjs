import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import WebSocket from "ws";
import { createBridgeServer } from "../src/server.mjs";

async function connectExtension(url, token, hello, onCommand) {
  const socket = new WebSocket(`${url.replace("http", "ws")}/extension?token=${token}`, {
    headers: { Origin: "chrome-extension://agentbrowserbridgetest" },
  });
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.send(JSON.stringify({ type: "hello", ...hello }));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("hello timeout")), 1_000);
    socket.on("message", (buffer) => {
      const message = JSON.parse(buffer.toString());
      if (message.type === "hello_ack") {
        clearTimeout(timer);
        resolve();
      }
      if (message.type === "command") onCommand?.(socket, message);
    });
  });
  return socket;
}

test("routes commands to the selected browser instance", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "easy-webbridge-"));
  const bridge = await createBridgeServer({ port: 0, token: "test-token", dataDir });
  const url = `http://${bridge.host}:${bridge.port}`;
  const received = [];
  const sockets = [];

  try {
    sockets.push(await connectExtension(url, bridge.token, { browserId: "browser-a", displayName: "Blue" }, (socket, message) => {
      received.push(["browser-a", message.action]);
      socket.send(JSON.stringify({ type: "result", commandId: message.commandId, ok: true, result: { from: "browser-a" } }));
    }));
    sockets.push(await connectExtension(url, bridge.token, { browserId: "browser-b", displayName: "Green" }, (socket, message) => {
      received.push(["browser-b", message.action]);
      socket.send(JSON.stringify({ type: "result", commandId: message.commandId, ok: true, result: { from: "browser-b" } }));
    }));

    const listResponse = await fetch(`${url}/v1/browsers`, { headers: { Authorization: `Bearer ${bridge.token}` } });
    const list = await listResponse.json();
    assert.equal(list.browsers.length, 2);
    assert.equal(list.browsers.every((item) => item.online), true);

    const commandResponse = await fetch(`${url}/v1/browsers/browser-b/commands`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bridge.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snapshot", args: {} }),
    });
    const command = await commandResponse.json();
    assert.deepEqual(command.result, { from: "browser-b" });
    assert.deepEqual(received, [["browser-b", "snapshot"]]);
  } finally {
    for (const socket of sockets) socket.close();
    await bridge.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("rejects HTTP and WebSocket clients without the token", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "easy-webbridge-"));
  const bridge = await createBridgeServer({ port: 0, token: "test-token", dataDir });
  try {
    const response = await fetch(`http://${bridge.host}:${bridge.port}/v1/browsers`);
    assert.equal(response.status, 401);
  } finally {
    await bridge.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("pairs local browser extensions without manual token entry", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "easy-webbridge-"));
  const bridge = await createBridgeServer({ port: 0, token: "test-token", dataDir });
  const url = `http://${bridge.host}:${bridge.port}`;
  try {
    const pairedResponse = await fetch(`${url}/pair`, {
      method: "POST",
      headers: { Origin: "chrome-extension://agentbrowserbridgetest" },
    });
    const paired = await pairedResponse.json();
    assert.equal(pairedResponse.status, 200);
    assert.equal(paired.token, bridge.token);
    assert.equal(pairedResponse.headers.get("access-control-allow-origin"), "chrome-extension://agentbrowserbridgetest");

    const rejectedResponse = await fetch(`${url}/pair`, {
      method: "POST",
      headers: { Origin: "https://example.com" },
    });
    assert.equal(rejectedResponse.status, 403);
  } finally {
    await bridge.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("persists screenshots and PDFs returned by an extension", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "easy-webbridge-"));
  const bridge = await createBridgeServer({ port: 0, token: "test-token", dataDir });
  const url = `http://${bridge.host}:${bridge.port}`;
  const customPdfPath = join(dataDir, "custom", "page.pdf");
  const socket = await connectExtension(url, bridge.token, { browserId: "browser-files" }, (client, message) => {
    const isPdf = message.action === "save_as_pdf";
    const mime = isPdf ? "application/pdf" : "image/png";
    const data = Buffer.from(isPdf ? "%PDF-test" : "png-test").toString("base64");
    client.send(JSON.stringify({
      type: "result",
      commandId: message.commandId,
      ok: true,
      result: { dataUrl: `data:${mime};base64,${data}`, requestedPath: isPdf ? customPdfPath : "" },
    }));
  });

  try {
    for (const action of ["screenshot", "save_as_pdf"]) {
      const response = await fetch(`${url}/v1/browsers/browser-files/commands`, {
        method: "POST",
        headers: { Authorization: `Bearer ${bridge.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, args: {} }),
      });
      const payload = await response.json();
      assert.equal(response.status, 200);
      assert.equal(payload.result.path.endsWith(action === "save_as_pdf" ? ".pdf" : ".png"), true);
      if (action === "save_as_pdf") assert.equal(payload.result.path, customPdfPath);
      assert.equal((await readFile(payload.result.path)).length > 0, true);
    }
  } finally {
    socket.close();
    await bridge.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
