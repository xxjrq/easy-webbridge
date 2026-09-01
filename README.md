<div align="center">

<img src="extension/icons/icon.svg" width="96" height="96" alt="Easy WebBridge 图标">

# Easy WebBridge

## 让 AI 接管你已经登录的真实浏览器

**不新开浏览器，不重复登录。** 让 Claude Code、Codex、OpenCode、WorkBuddy、OpenClaw、Cursor 等 AI Agent 直接操作已经登录的 Chrome、Edge、QQ 浏览器和 Chromium 环境；也支持 EasyBR 多开环境。

[简体中文](README.md) | [English](README.en.md)

![Browser](https://img.shields.io/badge/Chrome%20%2F%20Edge%20%2F%20QQ-%E5%B7%B2%E5%AE%9E%E6%B5%8B-0F766E?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-16A34A?style=flat-square)

</div>

## 为什么装它

Easy WebBridge 让 AI 操作你已经打开、已经登录的浏览器。账号的 Cookie、Local Storage 和登录态继续保留在本地；每个已连接浏览器都有独立 `browserId`，一条命令只会发给你指定的目标。

```text
Codex / Claude Code / AI Agent
                |
       Easy WebBridge（本机 127.0.0.1）
          /             |             \
 Chrome Profile A   Edge Profile B      QQ / Chromium
 独立 browserId     独立 browserId      当前登录会话
```

- **不操作错目标**：每个已连接浏览器都有独立 `browserId`；一条命令只会发给指定环境。
- **继续已有登录态**：不用启动空白自动化浏览器，不用再次登录后台。
- **适合真实网页工作**：AI 可研究页面、读取后台状态、整理资料、填写表单和上传文件；发布、发送、支付、删除等动作始终由你当次明确确认。

这不是让 AI 盲目批量操作的工具，而是让它在**你选定的已授权浏览器环境**中，把重复网页工作做得更稳、更省事。

## 它解决的不是“能不能点网页”

普通自动化通常会新开浏览器或准备独立 Profile。Easy WebBridge 的重点是连接你正在使用的浏览器：AI 能看到你已经登录后的真实页面，并在一个明确的浏览器环境中继续任务。

| 能力 | Easy WebBridge | 普通 Playwright / Selenium |
| --- | --- | --- |
| 直接使用当前浏览器环境 | 是 | 通常会启动独立实例 |
| 复用现有登录态 | 是 | 常需另行配置 Profile 或登录 |
| 管理多个已连接浏览器 | 是 | 通常按独立会话管理 |
| AI Agent 调用 | 自带 CLI、HTTP API 和 Skill | 需自行封装 |
| 适合场景 | 已登录后台、真实网页任务 | 可重复的测试与隔离自动化 |

Playwright 和 Selenium 很适合测试、回归和可重复环境。Easy WebBridge 专注解决另一个问题：让 AI 在用户现有的浏览器和登录会话里可靠地继续工作。

## 已实测浏览器

| 浏览器 | 状态 | 说明 |
| --- | --- | --- |
| Google Chrome | 已实测 | 加载扩展后连接当前 Profile |
| Microsoft Edge | 已实测 | 加载扩展后连接当前 Profile |
| QQ 浏览器 | 已实测 | 加载扩展后连接当前 Profile |
| Chromium | 已实测 | 支持本地 Chromium 环境 |
| 其他 Chromium 浏览器 | 可接入 | 需允许 Manifest V3 扩展与所需 CDP 权限 |
| EasyBR 指纹浏览器 | 已实测 | 可识别环境 ID、名称、颜色和独立 `browserId` |
| Firefox / Safari | 不支持 | 扩展接口不同 |

## 典型场景

### 1. 已登录的后台系统

Shopify、WordPress、广告后台、CMS、CRM、SaaS 管理台等页面，用户登录一次后即可让 AI 阅读、分析、填写和执行重复网页操作。遇到提交、发布、发送、付款或删除时，Agent 必须停下确认。

### 2. App Store Connect 与 Google Play Console

AI 可以在已登录的控制台中检查待补资料、版本信息、截图、草稿 Release 和表单字段，并按明确授权填写或上传。它不绕过验证码、访问控制、审核规则，也不会替用户做最终提交。

### 3. 网页研究与实时页面分析

读取真实 DOM、语义快照、当前页面状态和截图；分析 SEO、表单、页面内容、后台状态或数据差异，再根据实际页面继续完成下一步。

### 4. EasyBR 多开环境

EasyBR 是可选的兼容集成场景。每个多开环境保留独立 Cookie、Local Storage 和账号登录态，Easy WebBridge 会识别对应的名称、颜色和 `browserId`。适合用户在自己已授权的多账号环境中分别完成内容研究、后台检查、草稿梳理、视频和封面上传准备，以及信息汇总。

## 快速开始

前提：Node.js 20+，以及一个 Chromium 内核浏览器。

```bash
git clone https://github.com/xxjrq/easy-webbridge.git
cd easy-webbridge
npm install
node cli/easy-webbridge.mjs start
```

然后在目标浏览器中打开 `chrome://extensions`：

1. 开启“开发者模式”。
2. 点击“加载未打包的扩展程序”。
3. 选择仓库中的 `extension/` 目录。
4. 扩展自动连接本机 Bridge；每个浏览器环境都有独立 `browserId`，EasyBR 环境还会自动识别名称和颜色。
5. 需要连接多个账号或浏览器时，在每个目标环境中重复加载扩展。

当前版本直接在 `chrome://extensions` 中使用“加载未打包的扩展程序”选择仓库里的 `extension/` 目录即可。`dist/` 中保留的 `0.3.0` CRX 是历史安装包；本次仅更新 Skill、文档、图标和扩展元数据，不重新打包 CRX。

### 要不要开机启动

默认不用开机启动。业务 Skill 开始工作时运行 `node cli/easy-webbridge.mjs start` 即可，已运行的服务不会重复启动。若希望电脑登录后 Bridge 一直在线，可由用户在系统登录项中添加 `node src/server.mjs`：macOS 用“系统设置 → 通用 → 登录项”，Windows 用“任务计划程序 → 登录时运行”。扩展本身不能绕过操作系统权限启动 Node 服务；关闭登录项即可恢复按需启动。

查看在线环境：

```bash
node cli/easy-webbridge.mjs list
```

## 业务 Skill 生态

Easy WebBridge 只需安装一次。之后按业务需要安装独立 Skill，每个 Skill 都通过 `127.0.0.1:17777` 连接同一套运行时，并在开始工作前自动检查服务、Token 和在线浏览器。

| Skill | 用途 | 仓库 |
| --- | --- | --- |
| 抖音实时热点免费版 | 搜索抖音精选当前内容并导出报告 | [douyin-live-hot-free](https://github.com/xxjrq/douyin-live-hot-free) |
| easyAppStore | iOS 构建、App Store Connect 资料和审核上架 | [easy-app-store](https://github.com/xxjrq/easy-app-store) |
| easyGooglePlay | Android AAB、Play Console 表单和 Production 上架 | [easy-google-play](https://github.com/xxjrq/easy-google-play) |

这些业务仓库互相独立，根目录都使用标准 `SKILL.md`。安装一个业务 Skill 不会复制浏览器扩展或服务端；它只复用已经安装好的 Easy WebBridge。

## 给 AI 的可复制 Prompt

```text
使用 Easy WebBridge 列出已连接浏览器；先只告诉我名称、browserId 和在线状态，不要打开或修改页面。
```

```text
使用当前已经登录的浏览器打开创作者后台，检查视频草稿状态并总结还缺什么；不要发布或修改内容。
```

```text
使用我当前已经登录的浏览器读取后台通知并单独汇总；不要发送消息或改变账号设置。
```

```text
使用 Easy WebBridge 在指定 EasyBR 环境上传我明确给出的成片和封面；上传完成后停在发布前，让我检查。
```

```text
不要启动新的 Chrome。使用我现在已经打开并登录好的浏览器完成网页研究；遇到登录、验证码、付款、发布或发送动作时停下来问我。
```

```text
使用当前 Edge 打开这个网站，分析 SEO Title、Description、H1、Schema 和主要内容结构，给我一份问题清单。
```

```text
使用 QQ 浏览器中已经登录的页面，读取当前表单状态并填写我提供的资料；填写完停在提交前等待确认。
```

```text
在已经登录的 App Store Connect 中检查当前版本缺少什么资料和截图；不要提交审核，也不要绕过任何安全验证。
```

```text
在已登录的 Google Play Console 中查看有哪些 Draft Release，列出每个版本还缺什么；不要创建或发布 Release。
```

## Agent Skill 安装

跨 Agent 安装器：

```bash
npx skills add xxjrq/easy-webbridge
```

通用手动安装位置：

```bash
mkdir -p ~/.agents/skills
ln -s "$(pwd)/skills/easy-webbridge" ~/.agents/skills/easy-webbridge
```

以下是客户端专用目录的兼容方式：

Codex：

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.codex/skills/easy-webbridge
```

Claude Code：

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.claude/skills/easy-webbridge
```

安装后，Agent 会读取 [SKILL.md](skills/easy-webbridge/SKILL.md)，先选择明确的 `browserId`，再用 CLI 控制对应浏览器。

## 技术能力

- 标签页：打开、查找、切换、关闭，按任务分组。
- 页面：语义快照、DOM 读取、点击、填写、滚动和 JavaScript。
- 证据：当前视口、整页或元素截图；网络请求和响应正文；导出 PDF。
- 文件：上传、下载和 Cookie 管理。
- 深度控制：受控 CDP 命令、单环境扩展刷新。

完整命令和参数见 [HTTP API 与命令参考](skills/easy-webbridge/references/api.md)。

## 安全与权限

这是一项完整浏览器控制能力。扩展可访问登录后的网页、Cookie、下载和 CDP；只应安装在你愿意授权给 Agent 的浏览器环境里。

- Bridge 只监听本机 `127.0.0.1`。
- 请求需要本地 Token，且每次命令都必须指定目标 `browserId`。
- 不会绕过 CAPTCHA、访问控制、平台审核或安全验证。
- 支付、发布、发送、删除、账号安全修改等后果性动作，必须取得用户当次明确授权。

## FAQ

### Easy WebBridge 和 Playwright 有什么区别？

Playwright 更适合隔离、可重复的测试环境；Easy WebBridge 让 AI 接管用户已经登录、正在使用的真实浏览器和 EasyBR 多开环境。

### 会重新启动 Chrome 吗？

不会。它在安装了扩展并已连接 Bridge 的现有浏览器环境中工作。

### 可以使用已经登录的网站吗？

可以。只要该浏览器 Profile 的登录没有过期，Agent 看到的就是对应账号的已登录页面。

### 支持 Chrome、Edge、QQ 浏览器和 EasyBR 吗？

支持，以上浏览器均已实测。每个已连接环境都有独立 `browserId`；EasyBR 多开环境还可识别环境身份，多账号操作前应先确认目标环境。

### Codex、Claude Code、OpenClaw 和 Cursor 能用吗？

可以。它们可通过本项目的 Agent Skill、CLI 或本机 HTTP API 连接 Easy WebBridge。

### 能自动操作 App Store Connect 或 Google Play Console 吗？

可以在你已登录并授权的控制台中辅助检查、填写和上传；不会绕过安全机制，也不会替你进行最终发布或提交。

## 文档

- [完整中文使用教程](docs/zh-CN/完整使用教程.md)
- [100 个业务 Skill 落地方案](docs/zh-CN/100个业务Skill落地方案.md)
- [HTTP API 与命令参考](skills/easy-webbridge/references/api.md)
- [安全说明](SECURITY.md)

## License

MIT
