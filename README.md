<div align="center">

<img src="extension/icons/icon.svg" width="96" height="96" alt="Easy WebBridge 图标">

# Easy WebBridge

**让 AI Agent 直接使用你已经打开、已经登录的浏览器。**

[简体中文](README.md) | [English](README.en.md)

![EasyBR](https://img.shields.io/badge/EasyBR-支持-2563EB?style=flat-square&logo=chromium&logoColor=white)
![Google Chrome](https://img.shields.io/badge/Chrome-支持-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Microsoft Edge](https://img.shields.io/badge/Edge-支持-0A66C2?style=flat-square&logo=microsoftedge&logoColor=white)
![Brave](https://img.shields.io/badge/Brave-支持-FB542B?style=flat-square&logo=brave&logoColor=white)
![Opera](https://img.shields.io/badge/Opera-支持-FF1B2D?style=flat-square&logo=opera&logoColor=white)
![Vivaldi](https://img.shields.io/badge/Vivaldi-支持-EF3939?style=flat-square&logo=vivaldi&logoColor=white)

</div>

## 它能做什么

很多浏览器桥接工具一次只能连一个浏览器。Easy WebBridge 可以同时连接多个 EasyBR、Chrome、Edge 或 Chromium 环境。Agent 每次都要指定 `browserId`，不会一条命令发给所有浏览器。

- 继续使用原环境里的 Cookie、Local Storage 和登录状态
- 自动识别 EasyBR 的环境 ID、名称和颜色，不用手工填 Token
- 打开、查找、切换和关闭标签页，同一任务的页面放进一个标签组
- 读取页面，点击、填写、滚动，运行异步 JavaScript
- 截取当前画面、完整网页、后台标签或某个页面元素
- 查看网络请求和响应正文，把网页保存成 PDF
- 上传文件、管理 Cookie、开始下载，或者直接调用 CDP
- 远程刷新某个环境里的扩展，刷新后会自己连回来

## 登录状态会不会丢

不会。Easy WebBridge 不会另开一个空白浏览器，它操作的就是你已经打开的那个环境。只要网站登录没过期，Agent 看到的也是登录后的页面。

EasyBR 的环境本来就是分开的。每个环境有自己的用户数据目录和 `browserId`，Cookie 不会混到其他环境里。

## 兼容哪些浏览器

Easy WebBridge 面向 Chromium 内核，支持 **12+ 主流浏览器**。当前已经在 EasyBR 和 Chromium 146 上实测；下面这些浏览器只要允许加载 Manifest V3 扩展，通常都能直接使用：

| 类型 | 浏览器 |
| --- | --- |
| 已实测 | EasyBR、Chromium |
| 主流桌面浏览器 | Google Chrome、Microsoft Edge、Brave、Opera、Vivaldi、Arc |
| 其他 Chromium 浏览器 | Yandex Browser、Naver Whale、QQ 浏览器、360 浏览器、Cốc Cốc、Thorium、ungoogled-chromium |

普通的打开网页、读取、点击和填写依赖标准扩展 API。网络抓包、PDF、元素截图和 CDP 还要求浏览器开放 `chrome.debugger` 权限。Firefox 和 Safari 使用不同的扩展接口，目前不兼容。

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
4. 扩展会自动显示当前 EasyBR 环境的名称、颜色和连接状态。

也可以下载打包好的 [Easy WebBridge 0.3.0 CRX](dist/easy-webbridge-0.3.0.crx)。EasyBR、自编译 Chromium 和允许本地安装 CRX 的浏览器可以直接使用；官方 Chrome、Edge 可能会拦截非应用商店扩展，遇到这种情况就用上面的“加载未打包扩展程序”。

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

## 使用前先说明

这个扩展能读取网页、Cookie、下载和网络请求，权限不小。只装到你愿意交给 Agent 操作的浏览器环境里。

Bridge 只监听本机 `127.0.0.1`，请求需要本地 Token，每条命令也必须写明目标 `browserId`。购买、支付、发布、删除、发消息和修改账号安全设置，仍然要由用户明确同意。

## 配合 EasyBR 使用

如果你本来就在用 [EasyBR 指纹浏览器](https://www.ebrower.com/)，两者正好搭配：EasyBR 负责把账号环境分开，并把登录信息留在本地；Easy WebBridge 负责让 Agent 找到并操作你指定的环境。

## License

MIT
