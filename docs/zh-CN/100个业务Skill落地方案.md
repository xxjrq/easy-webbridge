# Easy WebBridge 业务 Skill 规模化方案

目标：在不重复维护浏览器运行时的前提下，建立 100 个可独立安装、独立搜索、独立发布的业务 Skill。

## 一句话结构

```text
一个 Easy WebBridge 运行时
        +
一个统一的 Skill 模板和注册表
        +
多个独立业务 Skill 仓库
```

## 仓库分工

### 1. easy-webbridge

唯一运行时核心，负责：

- 本机 `127.0.0.1:17777` 服务。
- 浏览器扩展、Token、`browserId` 和标签组。
- 点击、填写、上传、截图、网络和 CDP 等通用能力。
- 公共 API、CLI、兼容版本和能力清单。

业务 Skill 不复制服务端或扩展代码。

### 2. 独立业务 Skill

每个仓库只负责一个用户能直接理解的结果，例如：

- `douyin-live-hot-free`：搜索抖音当前内容并生成报告。
- `easy-app-store`：把 iOS App 带到 App Store 审核和上架状态。
- `easy-google-play`：把 Android App 带到 Google Play Production 审核和发布状态。

每个业务仓库必须能单独被 GitHub、skills.sh、SkillHub 和 Agent 识别。

### 3. easy-webbridge-skills

达到 10 个以上业务 Skill 后，建立中央管理仓库，作为唯一配置源：

```text
easy-webbridge-skills/
├── registry.yaml
├── templates/business-skill/
├── skills/<slug>/
├── scripts/create-skill.mjs
├── scripts/validate-all.mjs
└── .github/workflows/publish.yml
```

- `registry.yaml` 保存名称、仓库、分类、关键词、运行时版本、图标和发布状态。
- `templates/business-skill/` 保存公共目录结构与浏览器客户端。
- `create-skill.mjs` 用一份配置生成新 Skill，避免手工复制。
- 独立 GitHub 仓库由中央仓库单向同步，镜像仓库不直接改公共文件。

## 每个业务仓库的固定合同

```text
<skill>/
├── SKILL.md
├── README.md
├── README.en.md
├── LICENSE
├── manifest.yaml
├── package.json
├── agents/openai.yaml
├── assets/
│   ├── icon-source.png
│   ├── icon-512.png
│   └── icon-128.png
└── scripts/
    └── easy-webbridge-client.mjs
```

- `SKILL.md` 是 Claude Code、Codex、OpenCode、WorkBuddy 等 Agent 的公共入口。
- `README.md` 和 `README.en.md` 服务 GitHub 搜索、安装和人类阅读。
- `agents/openai.yaml` 只负责 Codex 展示，不是运行依赖。
- `easy-webbridge-client.mjs` 是无第三方依赖的公共客户端，由模板自动同步。
- App 构建命令由 Agent 读取具体项目后决定，不在模板里硬编码 Xcode 或 Gradle 流程。

## 依赖如何落地

Agent Skills 规范没有通用的 Skill-to-Skill 自动依赖字段，因此使用三层保证：

1. `SKILL.md` 的 `metadata.runtime` 记录 Easy WebBridge 最低版本。
2. README 第一条安装步骤明确“先安装一次 Easy WebBridge”。
3. 每次任务先运行 `preflight`，检查 Node.js、服务、Token 和在线浏览器。

后续提供统一安装器：

```bash
npx easy-webbridge-skills install easy-app-store --agent '*'
```

安装器负责下载 Easy WebBridge、安装核心 Skill 和业务 Skill、启动服务并运行自检。浏览器首次加载扩展仍由用户完成，因为浏览器不会允许普通脚本静默启用高权限扩展。

## SEO 固定规则

每个仓库发布时必须完成：

- 仓库名使用明确的英文短名。
- GitHub Description 同时出现结果、平台名和 `Agent Skill`。
- Topics 保留 `agent-skill`、业务平台、核心能力、`easy-webbridge` 和主要 Agent 名称。
- README 首屏出现产品名、用户结果、核心平台关键词和中英文切换。
- 使用真实 GitHub Star 与 skills.sh 安装量徽章，不手写热度数字。
- 核心仓库链接业务仓库，业务仓库反向链接核心仓库。

## 自动验收

每个 Skill 的 CI 必须通过：

```text
Agent Skills 官方规范校验
SKILL.md 名称、描述和触发词校验
Node.js 脚本语法与测试
Easy WebBridge 正常和缺失两种 preflight 测试
README 中英文与关键安装命令检查
128×128、512×512 图标尺寸检查
绝对路径、Token、Cookie 和密钥扫描
manifest、package.json、openai.yaml 解析
GitHub Description、Topics 和默认分支检查
skills.sh --list 远端识别检查
```

任何一项失败，都不发布版本、不推送镜像仓库、不提交 SkillHub。

## 建立一个新 Skill

新增 Skill 时只填写一份配置：

```yaml
slug: easy-example
display_name: easyExample
result: 用一句话说明用户最后得到什么
category: browser-business
runtime: easy-webbridge >=0.3.2
keywords:
  - 平台名
  - 具体业务动作
  - agent-skill
```

生成器负责目录、双语 README、manifest、图标占位、公共客户端、测试和 CI。Agent 只补业务步骤、页面字段、完成标准和真实图标。

## 分阶段执行

1. 用 `easy-app-store`、`easy-google-play`、`douyin-live-hot-free` 作为前三个标准样板。
2. 建立 `easy-webbridge-skills` 中央注册表和生成器。
3. 连续生成并验收 10 个 Skill，确认模板稳定。
4. 上线统一安装器与 skills.sh Pack。
5. 扩展到 100 个仓库，并让 SkillSearch 网站直接读取 `registry.yaml`。

先把模板、注册表、验收和同步链路在 10 个 Skill 内跑稳，再扩大到 100 个仓库。
