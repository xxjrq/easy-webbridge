---
name: easy-webbridge
description: 让 AI Agent 直接操作已经登录的真实浏览器，保留现有登录态，按 browserId 精确控制 Chrome、Edge、QQ 浏览器和 Chromium 实例；所有需要打开页面的任务默认创建独立标签组并复用组内页面，避免散落大量标签页。Use when an agent needs browser automation, authenticated admin work, web research, file upload, screenshots, DOM/page inspection, or CDP commands in an existing browser session. Also supports EasyBR multi-profile environments.
---

# Easy WebBridge Browser

> 让 AI 接管你已经登录的真实浏览器。

无需新开自动化窗口，无需重复登录。Easy WebBridge 将 Codex、Claude Code、OpenClaw、Cursor 等 AI Agent 连接到你当前使用的浏览器和已有登录态。

## 首先理解它适合什么

这是给已登录后台、网页研究、表单填写、文件上传和实时页面分析准备的浏览器控制 Skill。每个已连接浏览器都有独立的 `browserId`；Agent 必须选择明确目标，绝不会把命令广播给所有浏览器。

## 默认工作方式

凡是需要打开或跳转网页的任务，默认创建一个任务专属标签组，不把页面散落在浏览器各处：

1. 为本次任务创建一个稳定、带业务前缀的 `session`，并设置简短可读的 `groupTitle`。
2. 第一次进入任务时只新开一个标签页；后续连续步骤复用组内当前标签页。
3. 只有确实需要同时对照多个页面时才新开标签页，并继续放进同一个任务组。
4. 任务结束或失败时只执行 `close_session` 关闭本任务创建的组；不得关闭用户原有标签页或其他任务组。

只有只读的浏览器列表检查不会建组；只有用户明确要求使用未分组页面时才允许 `--ungrouped`。用户明确要求操作当前已有标签页时，可以借用该页，但不得把它登记为任务资产后误关。

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

### 获取并安装扩展

扩展源码和图标都在公开仓库的 `extension/` 目录。GitHub 是主仓库，Gitee 是备用镜像；如果 GitHub 访问不稳定，可以从 Gitee 下载同一份源码：

1. 优先从 <https://github.com/xxjrq/easy-webbridge> 下载或克隆；备用地址是 <https://gitee.com/xxjrq/easy-webbridge>，也可以直接下载 <https://gitee.com/xxjrq/easy-webbridge/repository/archive/main.zip>。
2. 解压下载的文件（如果下载的是 ZIP），找到里面的 `extension/` 文件夹。
3. 在目标 Chrome、Edge、QQ 浏览器或 Chromium 中打开 `chrome://extensions`。
4. 打开“开发者模式”，选择“加载未打包的扩展程序”，选仓库里的 `extension/` 目录。
5. 每个需要控制的浏览器 Profile 都要单独加载一次；扩展不会复制或清空登录数据。

如果仓库提供 Release/CRX，可从同一仓库的 Releases 页面下载；官方 Chrome、Edge 拦截外部 CRX 时，仍使用上面的 `extension/` 源码加载方式。安装后打开扩展设置页，看到“已连接”并能读到 `browserId`，才算连接完成。

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

### 是否需要开机启动（可选）

默认不需要。业务 Skill 执行前运行 `start` 即可；它会检查服务是否已在运行，已运行时不会重复启动。只有希望电脑登录后始终保持 Bridge 在线时，才配置系统登录项。

- **macOS**：使用“系统设置 → 通用 → 登录项”添加一个启动脚本，脚本内容为 `cd /绝对路径/easy-webbridge && exec node src/server.mjs`。启用“后台运行”后重新登录，用 `node cli/easy-webbridge.mjs status` 验证。不要把 `bridge-token` 写进脚本或日志。
- **Windows**：在“任务计划程序”新建“登录时运行”任务，程序填写 Node.js 的完整路径，参数填写 `src/server.mjs`，起始位置填写 Easy WebBridge 仓库目录；用 `node cli/easy-webbridge.mjs status` 验证。
- **关闭**：删除对应的登录项/计划任务即可。关闭开机启动不会卸载扩展，也不会删除登录态或 Token。

浏览器扩展不能绕过操作系统权限自动启动本机 Node 服务；是否开机启动应由用户自行选择。无论是否开机启动，Bridge 都只监听 `127.0.0.1`。

## Select a browser

- Match the user's requested browser name or `browserId` exactly.
- If exactly one browser is online and the user did not specify one, use it.
- If multiple browsers are online and the target is ambiguous, ask which browser to use before changing page state.
- Keep the same `browserId` throughout a task unless the user explicitly switches.

## 按任务分组执行

- 将分组视为打开页面类工作流的默认行为，而不是可选优化。
- 使用 `<skill-slug>-<run-id>` 形式的 `session`，保证不同业务 Skill、不同运行批次互不干扰。
- 同一个任务始终复用同一 `browserId`、`session` 和 `groupTitle`。
- 不为每一步都创建新标签页；顺序步骤使用相同 `session` 且不传 `--new-tab`。
- 需要并行对照时才传 `--new-tab`，并继续使用同一个 `session`。
- 在 `finally` 中关闭本任务拥有的 `session`；借用的用户标签页和其他任务组必须保留。

标准执行顺序：

```bash
# 首次打开：创建任务组和第一个标签页
node scripts/easy-webbridge.mjs navigate <browserId> https://example.com \
  --new-tab --session <skill-slug>-<run-id> --group-title "任务名称"

# 后续顺序步骤：复用组内当前标签页
node scripts/easy-webbridge.mjs navigate <browserId> https://example.com/next \
  --session <skill-slug>-<run-id>

# 只有需要同时保留页面时才在同组增加标签页
node scripts/easy-webbridge.mjs navigate <browserId> https://example.org \
  --new-tab --session <skill-slug>-<run-id> --group-title "任务名称"
```

## Operate pages

Start by listing tabs or opening the requested URL:

```bash
node scripts/easy-webbridge.mjs command <browserId> list_tabs '{}'
node scripts/easy-webbridge.mjs navigate <browserId> https://example.com \
  --new-tab --session research-123 --group-title "网页研究"
```

When `navigate --new-tab` omits `--session`, the CLI automatically groups the tab by site. Business Skills must still pass their own namespaced session explicitly so all pages from one run remain in one task group.

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

## 某些特殊流程

- 在任务内部将敏感权限、后台运行、网络连接、付款、发布和审核等差异化业务统一称为“某些特殊流程”，保持通用 Skill 不绑定具体产品名称。
- 进入第三方平台的真实表单后，必须按实际产品、权限和数据行为填写；通用称呼不能用于隐瞒、替代或弱化平台要求的真实申报。
- 对国家/地区、审核状态、提交状态等外部结果，以页面当前显示为准；不要把“已选择”或“已保存”写成“已发布”。
