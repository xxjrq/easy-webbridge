<div align="center">

<img src="extension/icons/icon.svg" width="96" height="96" alt="Easy WebBridge icon">

# Easy WebBridge

**Let an AI agent use the browser profiles you already have open.**

[简体中文](README.md) | [English](README.en.md)

![EasyBR](https://img.shields.io/badge/EasyBR-supported-2563EB?style=flat-square&logo=chromium&logoColor=white)
![Google Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Microsoft Edge](https://img.shields.io/badge/Edge-supported-0A66C2?style=flat-square&logo=microsoftedge&logoColor=white)
![Brave](https://img.shields.io/badge/Brave-supported-FB542B?style=flat-square&logo=brave&logoColor=white)
![Opera](https://img.shields.io/badge/Opera-supported-FF1B2D?style=flat-square&logo=opera&logoColor=white)
![Vivaldi](https://img.shields.io/badge/Vivaldi-supported-EF3939?style=flat-square&logo=vivaldi&logoColor=white)

Keep your logins, choose the exact profile, and control several browsers through one local bridge.

</div>

## What it does

Most browser bridges attach to one browser. Easy WebBridge can connect several Chrome, Edge, Chromium or EasyBR profiles at the same time. The agent names the profile it wants to use; commands are never sent to every browser.

Everything runs locally:

- a Manifest V3 extension inside each browser profile;
- a bridge on `127.0.0.1` that routes commands;
- an HTTP API and CLI for agents;
- a reusable Agent Skill in `skills/easy-webbridge`.

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

## What an agent can do

- Choose one connected browser by `browserId`.
- Open, find, switch and close tabs, with a tab group for each task.
- Use a tab you already have open without moving it into the agent's group.
- Read the page, click, type, scroll and run async JavaScript.
- Take viewport, full-page or element screenshots, including background tabs.
- Inspect network requests and response bodies, or save a page as PDF.
- Upload files, manage cookies, start downloads and send raw CDP commands.
- Reload Easy WebBridge in one profile and reconnect automatically.

The agent works in the profile that is already open. It does not launch a clean temporary browser, so your cookies, local storage and logged-in sessions are still there. EasyBR profiles remain isolated because each one keeps its own user-data directory and gets a different `browserId`.

The extension has broad browser permissions. Only install it in profiles you are willing to let an agent use.

## Browser compatibility

Easy WebBridge targets Chromium and works with **12+ desktop browsers**. EasyBR and Chromium 146 are tested directly. Chrome, Edge, Brave, Opera, Vivaldi, Arc, Yandex Browser, Naver Whale, QQ Browser, 360 Browser, Cốc Cốc, Thorium and ungoogled-chromium should work when they allow unpacked Manifest V3 extensions.

Network capture, PDF export, element screenshots and raw CDP also require access to `chrome.debugger`. Firefox and Safari use different extension APIs and are not currently supported.

## Quick start

Requirements: Node.js 20+ and a Chromium-based browser.

```bash
npm install
node cli/easy-webbridge.mjs start
```

The bridge listens on `127.0.0.1:17777`. The extension pairs with it automatically. The CLI reads the same local token from:

```text
~/.easy-webbridge/bridge-token
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select the `extension/` directory.
4. The extension connects automatically. Optionally assign a clearer browser name and color in Settings.
5. Repeat in every browser or profile you want to control.

You can also download the packaged [Easy WebBridge 0.3.0 CRX](dist/easy-webbridge-0.3.0.crx). It works in EasyBR, custom Chromium builds and browsers that allow local CRX installation. Official Chrome and Edge builds may reject extensions installed outside their stores; use **Load unpacked** in that case.

Inside EasyBR, the extension reads the environment ID and name from the default `localhost:3001/help/eindex.html?id=...` start page. You can still set a different name and color yourself.

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

Other agents can read `skills/easy-webbridge/SKILL.md` and use the same CLI or HTTP API.

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

## Using it with EasyBR

Already using [EasyBR](https://www.ebrower.com/)? EasyBR keeps accounts in separate local browser profiles. Easy WebBridge lets an agent find and operate the profile you name.

## License

MIT
