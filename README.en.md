<div align="center">

<img src="extension/icons/icon.svg" width="96" height="96" alt="Easy WebBridge icon">

# Easy WebBridge

## Give AI control of your real, already logged-in browser

**No clean automation window. No repeated login.** Connect Claude Code, Codex, OpenCode, WorkBuddy, OpenClaw, Cursor, and other AI agents to the Chrome, Edge, QQ Browser, or Chromium session you already use. EasyBR multi-profile environments are supported too.

[简体中文](README.md) | [English](README.en.md)

</div>

## Why use it

Easy WebBridge gives each connected browser profile a distinct `browserId`, so an agent works in one explicitly selected environment without broadcasting commands. It keeps the authenticated browser session you already use, making it practical for authorized dashboard work, research, form filling, uploads, and real-time page analysis. Publishing, sending, payments, deletion, and account-security changes always require explicit user approval.

## What makes it different

Easy WebBridge is not another clean-room browser runner. It connects to the browser window and authenticated session you already have open.

| Capability | Easy WebBridge | Typical Playwright / Selenium setup |
| --- | --- | --- |
| Uses the current browser profile | Yes | Usually starts a separate instance |
| Keeps the existing login session | Yes | Often needs a configured profile or login flow |
| Built for AI-agent calls | Built-in Skill, CLI, and local HTTP API | Requires a wrapper |
| Best fit | Authenticated live-browser tasks | Repeatable isolated tests |

Playwright and Selenium are excellent for testing. Easy WebBridge is for AI agents that need to continue real work in the user's selected, logged-in browser.

## Tested browsers

- Google Chrome
- Microsoft Edge
- QQ Browser
- Chromium
- EasyBR Antidetect Browser, with automatic profile ID, name, and color detection

Other Chromium browsers can connect when they allow Manifest V3 extensions and the required CDP permissions. Firefox and Safari are not supported.

## Typical use cases

- Authenticated CMS, CRM, e-commerce, advertising, and SaaS dashboards
- App Store Connect and Google Play Console checks, form filling, and authorized uploads
- Live page research, DOM analysis, screenshots, network inspection, and document export
- Optional EasyBR multi-profile workflows, including account-specific creator-video and dashboard work

## Quick start

Requirements: Node.js 20+ and a Chromium-based browser.

```bash
git clone https://github.com/xxjrq/easy-webbridge.git
cd easy-webbridge
npm install
node cli/easy-webbridge.mjs start
```

Open `chrome://extensions` in each target browser or EasyBR profile, enable Developer mode, then load the repository's `extension/` directory. The local bridge listens only on `127.0.0.1:17777`, and each connected browser receives its own `browserId`.

```bash
node cli/easy-webbridge.mjs list
```

## Business Skill ecosystem

Install Easy WebBridge once, then add independent business Skills as needed. Every Skill connects to the same runtime at `127.0.0.1:17777` and checks the service, local token, and connected browsers before starting.

| Skill | Purpose | Repository |
| --- | --- | --- |
| Douyin Live Hot Free | Search current Douyin Selected content and export reports | [douyin-live-hot-free](https://github.com/xxjrq/douyin-live-hot-free) |
| easyAppStore | Build iOS apps and complete App Store Connect review releases | [easy-app-store](https://github.com/xxjrq/easy-app-store) |
| easyGooglePlay | Build Android AABs and complete Play Console Production releases | [easy-google-play](https://github.com/xxjrq/easy-google-play) |

Each business Skill is an independent repository with a standard root `SKILL.md`. It reuses the installed Easy WebBridge runtime instead of copying the browser extension or server.

## Ready-to-use prompts

```text
Use Easy WebBridge to list connected EasyBR profiles. Only report each profile name, browserId, and online status; do not open or modify pages.
```

```text
Use the EasyBR profile named “Creator Main” to inspect the creator dashboard and summarize incomplete video drafts. Do not publish or edit anything.
```

```text
Do not launch a new browser. Use my currently open, logged-in Chrome session to analyze this page; stop before any login, CAPTCHA, payment, sending, publishing, or deletion action.
```

```text
Use the logged-in App Store Connect session to identify missing version details and screenshots. Do not submit for review or bypass security checks.
```

## Agent Skill

Cross-agent installer:

```bash
npx skills add xxjrq/easy-webbridge
```

Universal manual location:

```bash
mkdir -p ~/.agents/skills
ln -s "$(pwd)/skills/easy-webbridge" ~/.agents/skills/easy-webbridge
```

Client-specific compatibility paths:

Codex:

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.codex/skills/easy-webbridge
```

Claude Code:

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.claude/skills/easy-webbridge
```

Read the full [Skill instructions](skills/easy-webbridge/SKILL.md) and [API reference](skills/easy-webbridge/references/api.md) before operating a browser.

## Security

Easy WebBridge has full browser access. Install it only in profiles you authorize an agent to use. Do not expose tokens, cookies, passwords, or session values. It does not bypass CAPTCHAs, access controls, platform review, or security mechanisms.

## License

MIT
