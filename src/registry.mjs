import { randomUUID } from "node:crypto";

export class BrowserRegistry {
  constructor() {
    this.browsers = new Map();
    this.pending = new Map();
  }

  register(socket, hello) {
    const browserId = String(hello.browserId || "").trim();
    if (!browserId) throw new Error("browserId is required");

    const previous = this.browsers.get(browserId);
    if (previous?.socket && previous.socket !== socket) {
      previous.socket.close(4001, "Replaced by a newer connection");
    }

    const record = {
      browserId,
      displayName: String(hello.displayName || browserId),
      color: String(hello.color || "blue"),
      browser: String(hello.browser || "Chromium"),
      platform: String(hello.platform || "unknown"),
      extensionVersion: String(hello.extensionVersion || "unknown"),
      connectedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      online: true,
      socket,
    };
    this.browsers.set(browserId, record);
    return this.publicRecord(record);
  }

  touch(browserId) {
    const record = this.browsers.get(browserId);
    if (record) record.lastSeen = new Date().toISOString();
  }

  disconnect(socket) {
    for (const record of this.browsers.values()) {
      if (record.socket === socket) {
        record.online = false;
        record.socket = null;
        record.lastSeen = new Date().toISOString();
      }
    }
  }

  list() {
    return [...this.browsers.values()]
      .map((record) => this.publicRecord(record))
      .sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));
  }

  publicRecord(record) {
    const { socket: _socket, ...publicFields } = record;
    return publicFields;
  }

  async command(browserId, action, args, timeoutMs) {
    const record = this.browsers.get(browserId);
    if (!record?.online || !record.socket || record.socket.readyState !== 1) {
      throw new Error(`Browser is offline or unknown: ${browserId}`);
    }

    const commandId = randomUUID();
    const message = JSON.stringify({ type: "command", commandId, action, args });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(commandId);
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(commandId, {
        browserId,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      record.socket.send(message, (error) => {
        if (!error) return;
        const pending = this.pending.get(commandId);
        this.pending.delete(commandId);
        pending?.reject(error);
      });
    });
  }

  resolveResult(message) {
    const pending = this.pending.get(message.commandId);
    if (!pending) return false;
    this.pending.delete(message.commandId);

    if (message.ok) {
      pending.resolve(message.result);
    } else {
      pending.reject(new Error(message.error || "Browser command failed"));
    }
    return true;
  }
}
