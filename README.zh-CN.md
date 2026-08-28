<div align="center">

# Easy WebBridge

**让 Codex、Claude Code 和其他 AI Agent 精确控制多个本地浏览器环境。**

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

## 核心能力

- 一个 Agent 同时连接几十个 EasyBR、Chrome、Edge 或 Chromium 环境
- 每个环境使用独立 `browserId`、名称和颜色，命令不会广播
- 直接控制用户原来的浏览器环境，保留 Cookie、Local Storage 和账号登录状态
- EasyBR 自动识别环境 ID、环境名称和分组，无需手工复制 Token
- 打开、查找、切换、关闭标签页，并按任务自动建立标签组
- 读取页面语义快照，通过稳定的 `@e1` 引用点击和填写
- 执行页面 JavaScript、Chrome DevTools Protocol 和可信输入事件
- 截取当前视口、完整页面或单个元素
- 记录并查看网络请求、响应状态和响应正文
- 保存网页为 PDF，上传文件，管理 Cookie 和下载
- 远程重载指定环境中的扩展并自动重连
- 以 Agent Skill 形式供 Codex、Claude Code 等工具复用

## 为什么能保留登录状态

Easy WebBridge 不启动临时浏览器，也不会重新创建用户资料。扩展直接运行在你已经打开的浏览器环境中，因此该环境原有的登录 Cookie、Local Storage、IndexedDB 和页面标签仍然可用。

EasyBR 的每个环境本来就有独立的用户数据目录。Easy WebBridge 只为每个环境分配独立控制 ID，不会把不同环境的 Cookie 混在一起。

## 快速开始

```bash
git clone https://github.com/xxjrq/easy-webbridge.git
cd easy-webbridge
npm install
node cli/easy-webbridge.mjs start
```

然后打开 `chrome://extensions`：

1. 开启“开发者模式”。
2. 点击“加载未打包的扩展程序”。
3. 选择仓库内的 `extension/` 目录。
4. EasyBR 环境会自动显示自己的名称、颜色和连接状态。

查看所有在线环境：

```bash
node cli/easy-webbridge.mjs list
```

## 安装 Agent Skill

Codex：

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.codex/skills/easy-webbridge
```

Claude Code：

```bash
ln -s "$(pwd)/skills/easy-webbridge" ~/.claude/skills/easy-webbridge
```

安装后可以直接对 Agent 说：

> 使用 Easy WebBridge 操作名为“自媒体”的 EasyBR 环境，打开抖音创作者中心，读取作品数据，不要发布或修改内容。

## 文档

- [完整使用教程](docs/zh-CN/完整使用教程.md)
- [HTTP API 与命令参考](skills/easy-webbridge/references/api.md)
- [安全说明](SECURITY.md)

## 安全边界

扩展拥有较高浏览器权限，只应安装在允许 Agent 操作的浏览器环境中。Bridge 仅监听 `127.0.0.1`，所有请求都需要本地随机 Token，并且每条命令必须指定目标 `browserId`。

购买、支付、发布、删除数据、发送消息和修改账号安全设置等操作仍需用户明确授权。

## License

MIT
