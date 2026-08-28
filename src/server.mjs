#!/usr/bin/env node
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { BrowserRegistry } from "./registry.mjs";
import { isExtensionOrigin, normalizeCommand } from "./protocol.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 17_777;

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request, limit = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function loadOrCreateToken(dataDir) {
  await mkdir(dataDir, { recursive: true });
  const tokenPath = join(dataDir, "bridge-token");
  try {
    return { token: (await readFile(tokenPath, "utf8")).trim(), tokenPath };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const token = randomBytes(32).toString("hex");
    await writeFile(tokenPath, `${token}\n`, { mode: 0o600 });
    await chmod(tokenPath, 0o600);
    return { token, tokenPath };
  }
}

function bearerToken(request) {
  const header = String(request.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function persistScreenshot(result, dataDir, browserId) {
  if (!result?.dataUrl || !String(result.dataUrl).startsWith("data:image/")) return result;
  const match = String(result.dataUrl).match(/^data:image\/(png|jpeg);base64,(.+)$/s);
  if (!match) throw new Error("Unsupported screenshot encoding");
  const extension = match[1] === "jpeg" ? "jpg" : "png";
  const screenshotDir = join(dataDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });
  const filename = `${browserId}-${Date.now()}.${extension}`;
  const outputPath = join(screenshotDir, filename);
  await writeFile(outputPath, Buffer.from(match[2], "base64"), { mode: 0o600 });
  const { dataUrl: _dataUrl, ...rest } = result;
  return { ...rest, path: outputPath };
}

export async function createBridgeServer(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port ?? DEFAULT_PORT);
  const dataDir = resolve(options.dataDir || process.env.EASY_WEBBRIDGE_DATA_DIR || join(homedir(), ".easy-webbridge"));
  const auth = options.token
    ? { token: options.token, tokenPath: null }
    : await loadOrCreateToken(dataDir);
  const registry = new BrowserRegistry();
  const pairingEnabled = ["127.0.0.1", "::1", "localhost"].includes(host);

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
      if (request.method === "GET" && url.pathname === "/health") {
        return json(response, 200, { ok: true, service: "easy-webbridge", browsers: registry.list().filter((item) => item.online).length });
      }

      if (request.method === "POST" && url.pathname === "/pair") {
        const origin = String(request.headers.origin || "");
        if (!pairingEnabled || !isExtensionOrigin(origin)) {
          return json(response, 403, { ok: false, error: "Extension pairing is not allowed" });
        }
        return json(response, 200, { ok: true, token: auth.token }, { "Access-Control-Allow-Origin": origin });
      }

      if (bearerToken(request) !== auth.token) {
        return json(response, 401, { ok: false, error: "Unauthorized" });
      }

      if (request.method === "GET" && url.pathname === "/v1/browsers") {
        return json(response, 200, { ok: true, browsers: registry.list() });
      }

      const commandMatch = url.pathname.match(/^\/v1\/browsers\/([^/]+)\/commands$/);
      if (request.method === "POST" && commandMatch) {
        const browserId = decodeURIComponent(commandMatch[1]);
        const command = normalizeCommand(await readJson(request));
        const rawResult = await registry.command(browserId, command.action, command.args, command.timeoutMs);
        const result = command.action === "screenshot"
          ? await persistScreenshot(rawResult, dataDir, browserId)
          : rawResult;
        return json(response, 200, { ok: true, browserId, action: command.action, result });
      }

      return json(response, 404, { ok: false, error: "Not found" });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : 422;
      return json(response, status, { ok: false, error: error.message });
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 20 * 1024 * 1024 });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
    const originAllowed = options.allowAnyExtensionOrigin || isExtensionOrigin(request.headers.origin);
    if (url.pathname !== "/extension" || url.searchParams.get("token") !== auth.token || !originAllowed) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
  });

  wss.on("connection", (socket) => {
    let browserId = null;
    socket.on("message", (buffer) => {
      try {
        const message = JSON.parse(buffer.toString("utf8"));
        if (message.type === "hello") {
          const record = registry.register(socket, message);
          browserId = record.browserId;
          socket.send(JSON.stringify({ type: "hello_ack", browserId, serverTime: new Date().toISOString() }));
          return;
        }
        if (!browserId) throw new Error("hello is required before other messages");
        registry.touch(browserId);
        if (message.type === "result") registry.resolveResult(message);
        if (message.type === "ping") socket.send(JSON.stringify({ type: "pong", time: Date.now() }));
      } catch (error) {
        socket.send(JSON.stringify({ type: "protocol_error", error: error.message }));
      }
    });
    socket.on("close", () => registry.disconnect(socket));
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });

  const address = server.address();
  return {
    host,
    port: typeof address === "object" && address ? address.port : port,
    token: auth.token,
    tokenPath: auth.tokenPath,
    dataDir,
    registry,
    close: () => new Promise((resolveClose, rejectClose) => {
      for (const client of wss.clients) client.terminate();
      wss.close();
      server.close((error) => error ? rejectClose(error) : resolveClose());
    }),
  };
}

async function main() {
  const bridge = await createBridgeServer({
    host: process.env.EASY_WEBBRIDGE_HOST || DEFAULT_HOST,
    port: Number(process.env.EASY_WEBBRIDGE_PORT || DEFAULT_PORT),
    token: process.env.EASY_WEBBRIDGE_TOKEN || undefined,
  });
  console.log(`Easy WebBridge listening on http://${bridge.host}:${bridge.port}`);
  if (bridge.tokenPath) console.log(`Bridge token: ${bridge.tokenPath}`);
  console.log("Load extension/ as an unpacked extension. It will pair with this local service automatically.");

  const shutdown = async () => {
    await bridge.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
