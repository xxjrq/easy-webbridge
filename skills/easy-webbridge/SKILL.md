---
name: easy-webbridge
description: Control one or more local Chrome, Edge, Chromium, or browser-profile instances through Easy WebBridge. Use when an agent needs to open URLs, inspect tabs, read page content, click or fill elements, take screenshots, upload files, manage cookies/downloads, execute page JavaScript, send Chrome DevTools Protocol commands, or route browser work to a specific named browser identity.
---

# Easy WebBridge

Use the bundled CLI to control browser profiles connected to the local bridge. Route every command to an explicit `browserId`; never broadcast commands.

## Connect

1. Start or check the bridge:

```bash
node scripts/easy-webbridge.mjs start
```

2. `start` is idempotent: it starts the local service only when unavailable. Do not expose its port beyond `127.0.0.1`.
3. Run the bundled script from this skill directory:

```bash
node scripts/easy-webbridge.mjs list
```

The script reads the token from `~/.easy-webbridge/bridge-token`. Override with `EASY_WEBBRIDGE_URL` and `EASY_WEBBRIDGE_TOKEN` only when the user has configured a different bridge.

## Select A Browser

- Match the user's requested browser name or `browserId` exactly.
- If exactly one browser is online and the user did not specify one, use it.
- If multiple browsers are online and the target is ambiguous, ask which browser to use before changing page state.
- Keep the same `browserId` throughout a task unless the user explicitly switches.

## Operate Pages

Start by listing tabs or opening the requested URL:

```bash
node scripts/easy-webbridge.mjs command <browserId> list_tabs '{}'
node scripts/easy-webbridge.mjs navigate <browserId> https://example.com --new-tab
```

Read a semantic snapshot before interacting:

```bash
node scripts/easy-webbridge.mjs snapshot <browserId> [tabId]
```

Use the returned `@e1`, `@e2` references for resilient interaction:

```bash
node scripts/easy-webbridge.mjs click <browserId> @e3 [tabId]
node scripts/easy-webbridge.mjs fill <browserId> @e4 "value" [tabId]
```

Take a screenshot when visual state matters:

```bash
node scripts/easy-webbridge.mjs screenshot <browserId> [tabId]
```

The command returns an absolute local image path. Inspect the image before claiming visual success.

## Use Full-Power Commands

Use the generic command form for advanced browser operations:

```bash
node scripts/easy-webbridge.mjs command <browserId> <action> '<args-json>'
```

Supported actions include:

- `activate_tab`, `close_tab`, `navigate`, `find_tab`, `close_session`, `scroll`
- `evaluate` with `code` and optional `world` (`MAIN` by default)
- `cdp` with `method`, `params`, and optional `tabId`
- `upload` with a file-input CSS `selector` and absolute `files`
- `get_cookies`, `set_cookie`, `remove_cookie`
- `download` with Chrome download options
- `reload_extension` to reload Easy WebBridge in the selected browser profile
- `network` with `start`, `stop`, `list` and `detail`
- `save_as_pdf` to render a page to a local PDF file

For task-scoped tabs, pass `session` and optional `groupTitle` in command args. The extension groups tabs with the same session name. It operates in the existing browser profile, so the user's current login state remains available.

For full payload shapes, read [references/api.md](references/api.md).

## Guardrails

- Treat the extension as full browser access: it can read authenticated pages, cookies and downloads.
- Never print bridge tokens, cookies, passwords, session values or personal data into chat or logs.
- Require explicit user authorization before purchases, publishing, deleting data, sending messages, changing account security or other consequential actions.
- Do not bypass CAPTCHAs, access controls or platform protections.
- Re-snapshot after navigation or major DOM changes because element references may change.
- Report actual command results. Do not equate a click with a completed submission unless the resulting page confirms it.
