<div align="center">

# Easy WebBridge

**Open local browser control for Codex, Claude Code and other AI agents.**

[English](README.md) | [简体中文](README.zh-CN.md)

One bridge, many Chromium browsers. Each browser profile keeps an independent ID, name and color.

</div>

## What it does

Easy WebBridge is a self-hosted alternative to single-browser bridge extensions. It contains:

- A high-permission Manifest V3 extension for Chrome, Edge and Chromium browsers
- A localhost bridge that multiplexes multiple browser profiles
- A stable HTTP API and CLI for AI agents
- A portable Agent Skill under `skills/easy-webbridge`

```text
Codex / Claude Code / Agent
             |
       HTTP on localhost
             |
         Easy WebBridge
       /        |        \
  Browser A  Browser B  Browser C
   blue ID    green ID   orange ID
```

## Capabilities

- List and select connected browsers by `browserId`
- List, open, activate and close tabs
- Organize each agent task into a named browser tab group
- Find a session tab, borrow the user's active tab, or close a whole task session
- Read a semantic page snapshot with stable `@e1` element references
- Click, fill, scroll and execute JavaScript in the page main world
- Capture viewport, full-page or element-only screenshots to a local file
- Record, filter and inspect browser network requests and response bodies
- Save the current page as PDF
- Send raw Chrome DevTools Protocol commands
- Upload local files through CDP
- Read, set and remove cookies
- Start browser downloads
- Reload a selected profile's Easy WebBridge extension and reconnect automatically

The extension requests broad permissions intentionally. Install it only in browser profiles you want an AI agent to control.

Easy WebBridge controls the browser profile that is already open. It does not create a temporary profile, so existing cookies, local storage and login sessions remain available. Each EasyBR environment keeps its own isolated user-data directory and receives a different `browserId`.

Unlike bridges tied to a Chrome Web Store extension ID, this bridge authenticates the local token and the per-profile `browserId`. An unpacked development build therefore remains usable even when its Chrome extension ID differs between installations.

## Quick start

Requirements: Node.js 20+ and a Chromium-based browser.

```bash
npm install
node cli/easy-webbridge.mjs start
```

The bridge listens on `127.0.0.1:17777`. The extension pairs with the local service automatically and stores its generated token in the browser profile. The token is also available to the CLI at:

```text
~/.easy-webbridge/bridge-token
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select the `extension/` directory.
4. The extension connects automatically. Optionally assign a clearer browser name and color in Settings.
5. Repeat in every browser or profile you want to control.

Inside EasyBR, the extension also recognizes the default `localhost:3001/help/eindex.html?id=...` start page. On first use it adopts that environment's stable ID, name and a deterministic color. Manual identity settings always take precedence and are never overwritten.

Chrome may show a persistent debugging notice after the first raw CDP command. This is expected for extensions using the `debugger` permission.

## Agent CLI

```bash
node cli/easy-webbridge.mjs list
node cli/easy-webbridge.mjs navigate <browserId> https://example.com --new-tab
node cli/easy-webbridge.mjs snapshot <browserId>
node cli/easy-webbridge.mjs click <browserId> @e3
node cli/easy-webbridge.mjs fill <browserId> @e4 "hello"
node cli/easy-webbridge.mjs screenshot <browserId>
node cli/easy-webbridge.mjs command <browserId> navigate '{"url":"https://example.com","newTab":true,"session":"research","groupTitle":"Research"}'
node cli/easy-webbridge.mjs command <browserId> network '{"cmd":"start","tabId":123}'
node cli/easy-webbridge.mjs command <browserId> save_as_pdf '{"tabId":123,"paper_format":"a4"}'
node cli/easy-webbridge.mjs command <browserId> reload_extension '{}'
node cli/easy-webbridge.mjs command <browserId> cdp '{"method":"Page.reload","params":{}}'
```

Set `EASY_WEBBRIDGE_URL` and `EASY_WEBBRIDGE_TOKEN` to override the defaults.

## Install the Agent Skill

Codex:

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.codex/skills/easy-webbridge
```

Claude Code:

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.claude/skills/easy-webbridge
```

Other agents can read `skills/easy-webbridge/SKILL.md` and call the same CLI or HTTP API.

## Tutorials

- [Chinese complete tutorial](docs/zh-CN/完整使用教程.md)
- [HTTP API reference](skills/easy-webbridge/references/api.md)

## Security model

- The bridge binds to `127.0.0.1`, not the LAN.
- HTTP and WebSocket requests require a 256-bit local token.
- WebSocket connections accept browser-extension origins only.
- Every browser profile receives an independent UUID.
- Agents must name the target `browserId`; commands are never broadcast.
- Screenshots are saved under `~/.easy-webbridge/screenshots` with user-only permissions.

The extension can access all websites, cookies, downloads and CDP. Use a separate browser profile for sensitive accounts and revoke access by removing the extension or rotating the token.

## Development

```bash
npm test
npm run check
```

## License

MIT
