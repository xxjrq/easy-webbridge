---
name: easy-webbridge
description: 让 AI Agent 直接操作已经登录的真实浏览器，保留现有登录态，按 browserId 精确控制 Chrome、Edge、QQ 浏览器和 Chromium 实例。Use when an agent needs browser automation, authenticated admin work, web research, file upload, screenshots, DOM/page inspection, or CDP commands in an existing browser session. Also supports EasyBR multi-profile environments.
---

# Easy WebBridge Browser

> 让 AI 接管你已经登录的真实浏览器。

无需新开自动化窗口，无需重复登录。Easy WebBridge 将 Codex、Claude Code、OpenClaw、Cursor 等 AI Agent 连接到你当前使用的浏览器和已有登录态。

## 首先理解它适合什么

这是给已登录后台、网页研究、表单填写、文件上传和实时页面分析准备的浏览器控制 Skill。每个已连接浏览器都有独立的 `browserId`；Agent 必须选择明确目标，绝不会把命令广播给所有浏览器。

## 已实测浏览器

- Google Chrome
- Microsoft Edge
- QQ 浏览器
- Chromium
- EasyBR 指纹浏览器（自动识别环境 ID、名称和颜色）

其他允许安装 Manifest V3 扩展并开放所需 CDP 权限的 Chromium 浏览器也可接入。Firefox 和 Safari 的扩展接口不同，当前不支持。

## 能做什么

- 复用已登录页面、Cookie 和 Local Storage，不启动干净的临时浏览器。
- 打开、读取、分析、点击、填写、滚动和执行页面 JavaScript。
- 截图、读取 DOM/语义快照、检查页面状态、抓取网络请求、导出 PDF。
- 上传文件、触发下载、管理 Cookie，以及发送受控 CDP 命令。
- 为一个任务创建浏览器标签组，在多个已连接浏览器中精确路由操作。

## 可直接交给 Agent 的 Prompt

```text
使用 Easy WebBridge 列出已连接浏览器；先只告诉我每个环境的名称、browserId 和在线状态，不要打开或修改页面。
```

```text
使用当前已经登录的浏览器打开创作者后台，检查视频草稿状态并总结还缺什么；不要发布或修改内容。
```

```text
使用当前已经登录的浏览器读取后台通知并单独汇总；不要发送消息或改变账号设置。
```

```text
使用当前 Chrome，不要启动新的浏览器。分析这个已登录后台的页面结构、可填写字段和下一步操作，但先不要提交。
```

```text
使用当前 Edge 打开指定网页，检查 SEO Title、Description、H1、Schema 和主要内容结构，给出问题清单。
```

```text
使用 QQ 浏览器中已经登录的页面，读取当前表单状态并填写我提供的资料；填写完停在提交前，等待我确认。
```

```text
在已登录的 App Store Connect 中检查当前版本缺失的资料和截图；不要提交审核，不要尝试绕过验证码或安全验证。
```

```text
在已登录的 Google Play Console 中查看有哪些 Draft Release，列出差异；不要创建或发布 Release。
```

```text
使用 Easy WebBridge 打开指定 EasyBR 环境中的内容后台，上传我明确指定的视频文件和封面，上传完成后停在发布前让我检查。
```

```text
不要启动新的 Chrome。使用我现在打开并登录好的浏览器完成网页研究；遇到登录、验证码、付款、发布或发送动作时停下来问我。
```

## EasyBR 多开环境

EasyBR 是可选的兼容集成场景。每个多开环境保留独立 Cookie、Local Storage 和账号登录态；Easy WebBridge 会识别环境名称、颜色和 `browserId`。这适合用户在自己已授权的多个账号环境中，分别完成后台检查、内容研究或上传准备。

每次仍必须先确认目标账号和操作范围。发布、发送、支付、删除、账号安全修改等后果性动作必须得到用户当次明确授权。

## Connect

1. Start or check the local bridge:

```bash
node scripts/easy-webbridge.mjs start
```

2. `start` is idempotent: it starts the local service only when unavailable. Do not expose its port beyond `127.0.0.1`.
3. Run the bundled script from this skill directory:

```bash
node scripts/easy-webbridge.mjs list
```

The script reads the token from `~/.easy-webbridge/bridge-token`. Override with `EASY_WEBBRIDGE_URL` and `EASY_WEBBRIDGE_TOKEN` only when the user has configured a different bridge.

## Select a browser

- Match the user's requested browser name or `browserId` exactly.
- If exactly one browser is online and the user did not specify one, use it.
- If multiple browsers are online and the target is ambiguous, ask which browser to use before changing page state.
- Keep the same `browserId` throughout a task unless the user explicitly switches.

## Default to one task group

- Treat grouping as the default for every workflow that opens pages. Create one stable `session` per task and one short human-readable `groupTitle`.
- Reuse the session's current tab for sequential steps. Open extra tabs only when the task genuinely needs parallel pages, and put them in the same session.
- Keep different business Skills in different sessions. Use a namespaced value such as `<skill-slug>-<run-id>` so concurrent projects cannot close one another's tabs.
- Close only the owned session when the task finishes. Never close the user's pre-existing tabs.
- Read-only browser discovery (`list`) does not create a group. Use an ungrouped new tab only when the user explicitly requests it.

## Operate pages

Start by listing tabs or opening the requested URL:

```bash
node scripts/easy-webbridge.mjs command <browserId> list_tabs '{}'
node scripts/easy-webbridge.mjs navigate <browserId> https://example.com \
  --new-tab --session research-123 --group-title "网页研究"
```

When `navigate --new-tab` omits `--session`, the CLI automatically groups the tab by site. Business Skills must still pass their own namespaced session explicitly.

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

## Use full-power commands

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

Close the task-owned group after success or failure:

```bash
node scripts/easy-webbridge.mjs command <browserId> close_session \
  '{"session":"research-123"}'
```

## Business Skill integration contract

Use this contract for independent browser business repositories:

1. Keep each business Skill in its own repository and declare Easy WebBridge as a runtime prerequisite.
2. Call `GET /v1/browsers` and `POST /v1/browsers/{browserId}/commands` through `http://127.0.0.1:17777`; do not import Easy WebBridge by repository-relative path.
3. Select exactly one online browser and keep that `browserId` for the run.
4. Create one namespaced task session, reuse its tab, group any necessary extra tabs, and close only that session in `finally`.
5. Keep tokens, cookies, browser IDs, session state, and account data out of generated artifacts.
6. Stop on login, CAPTCHA, payment, publishing, deletion, or other consequential gates unless the user explicitly authorizes the action.

For full payload shapes, read [references/api.md](references/api.md).

## Guardrails

- Treat the extension as full browser access: it can read authenticated pages, cookies and downloads.
- Never print bridge tokens, cookies, passwords, session values or personal data into chat or logs.
- Require explicit user authorization before purchases, publishing, deleting data, sending messages, changing account security or other consequential actions.
- Do not bypass CAPTCHAs, access controls or platform protections.
- Re-snapshot after navigation or major DOM changes because element references may change.
- Report actual command results. Do not equate a click with a completed submission unless the resulting page confirms it.
