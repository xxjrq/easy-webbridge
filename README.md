<div align="center">

# Agent Browser Bridge

**Open local browser control for Codex, Claude Code and other AI agents.**

One bridge, many Chromium browsers. Each browser profile keeps an independent ID, name and color.

</div>

## What it does

Agent Browser Bridge is a self-hosted alternative to single-browser bridge extensions. It contains:

- A high-permission Manifest V3 extension for Chrome, Edge and Chromium browsers
- A localhost bridge that multiplexes multiple browser profiles
- A stable HTTP API and CLI for AI agents
- A portable Agent Skill under `skills/agent-browser-bridge`

```text
Codex / Claude Code / Agent
             |
       HTTP on localhost
             |
      Agent Browser Bridge
       /        |        \
  Browser A  Browser B  Browser C
   blue ID    green ID   orange ID
```

## Capabilities

- List and select connected browsers by `browserId`
- List, open, activate and close tabs
- Read a semantic page snapshot with stable `@e1` element references
- Click, fill, scroll and execute JavaScript in the page main world
- Capture screenshots to a local file
- Send raw Chrome DevTools Protocol commands
- Upload local files through CDP
- Read, set and remove cookies
- Start browser downloads

The extension requests broad permissions intentionally. Install it only in browser profiles you want an AI agent to control.

Unlike bridges tied to a Chrome Web Store extension ID, this bridge authenticates the local token and the per-profile `browserId`. An unpacked development build therefore remains usable even when its Chrome extension ID differs between installations.

## Quick start

Requirements: Node.js 20+ and a Chromium-based browser.

```bash
npm install
npm start
```

The bridge listens on `127.0.0.1:17777` and creates a token at:

```text
~/.agent-browser-bridge/bridge-token
```

On macOS, copy it without displaying it in terminal:

```bash
pbcopy < ~/.agent-browser-bridge/bridge-token
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select the `extension/` directory.
4. Open the extension Settings page.
5. Paste the bridge token, assign a browser name and color, then save.
6. Repeat in every browser or profile you want to control.

Chrome may show a persistent debugging notice after the first raw CDP command. This is expected for extensions using the `debugger` permission.

## Agent CLI

```bash
node cli/agent-browser.mjs list
node cli/agent-browser.mjs navigate <browserId> https://example.com --new-tab
node cli/agent-browser.mjs snapshot <browserId>
node cli/agent-browser.mjs click <browserId> @e3
node cli/agent-browser.mjs fill <browserId> @e4 "hello"
node cli/agent-browser.mjs screenshot <browserId>
node cli/agent-browser.mjs command <browserId> cdp '{"method":"Page.reload","params":{}}'
```

Set `AGENT_BROWSER_URL` and `AGENT_BROWSER_TOKEN` to override the defaults.

## Install the Agent Skill

Codex:

```bash
ln -s "$(pwd)/skills/agent-browser-bridge" ~/.codex/skills/agent-browser-bridge
```

Claude Code:

```bash
ln -s "$(pwd)/skills/agent-browser-bridge" ~/.claude/skills/agent-browser-bridge
```

Other agents can read `skills/agent-browser-bridge/SKILL.md` and call the same CLI or HTTP API.

## Security model

- The bridge binds to `127.0.0.1`, not the LAN.
- HTTP and WebSocket requests require a 256-bit local token.
- WebSocket connections accept browser-extension origins only.
- Every browser profile receives an independent UUID.
- Agents must name the target `browserId`; commands are never broadcast.
- Screenshots are saved under `~/.agent-browser-bridge/screenshots` with user-only permissions.

The extension can access all websites, cookies, downloads and CDP. Use a separate browser profile for sensitive accounts and revoke access by removing the extension or rotating the token.

## Development

```bash
npm test
npm run check
```

## License

MIT
