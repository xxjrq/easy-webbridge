# Easy WebBridge 0.5.0 对标与下一版路线图

本文区分当前源码/测试/受控浏览器实测与下一版建议；参考竞品的公开源码不等于本机安装版，也不构成对其完整度的背书。0.5.0 未增加绕过验证码、账号安全检查、指纹伪装或站点访问限制的能力。

## 0.5.0 已交付

证据：`extension/service-worker.js`、`extension/snapshot-document.js`、`extension/snapshot-options.js`、`extension/wait-document.js`、`extension/frame-utils.js`；`test/` 下相应单元测试；主代理受控 Edge 实测。

- 元素发现支持 `visible / hidden / all`、scope/region/filter/paging，并遍历开放 Shadow DOM；closed Shadow DOM 不可访问。`@e` 引用可用于开放根内点击/填写，歧义 CSS selector 会拒绝盲选。
- `list_frames` 输出 frameId、父子关系和脱敏 origin，不输出 frame URL。snapshot/click/fill/scroll/evaluate/wait_for 可指定 frameId；快照结果携带 frameId，供后续引用配对。frame ID 只对当前导航态有效。
- `wait_for` 支持 selector/text/url 与 attached/detached/visible/hidden，限定 100-30000ms。等待只轮询状态，不产生页面动作。CLI 外层等待超时会覆盖内部截止时间。
- 显式 `compact` 保留 title、URL 和必要的引用/角色/标签信息；省略查询元数据、边界框、值和 href，缩短标签文本，默认不重复输出整页文本。非 compact API 响应保持兼容。
- 有界 `batch` 只允许 `click`、`fill`、`scroll`、`wait_for`，最多 20 步并有总时限；每步可选 selector/text/url 状态断言，失败带出步骤索引。它减少往返，但不跳过唯一性、可操作性或授权检查。
- 快照支持 `maxBytes` 硬预算；任意命令可设置 `resultBudget`，超预算对象/数组只返回类型、键名和大小等结构摘要，不回显原始敏感值。
- `capabilities` 只报告 manifest 声明、浏览器授予的权限及功能边界，不申请新权限。可选 native click 仅限顶层 frame，执行命中测试并将 CDP 按下/抬起配对；默认 DOM click 仍是合成 DOM 事件，不是可信用户输入。
- 自动化检查为 26 项测试通过。主代理的受控 Edge 页面通过跨站 iframe 定向快照、点击、填写、文本等待与状态回读；开放 Shadow DOM 操作、顶层配对 CDP 点击及约 2.7 秒延迟等待通过。一个受控 JSON 快照从 14.1KB 降至 1.15KB（字节数，不是 token 测量）。这不是 Stitch 页或所有站点的通用兼容证明。

尚未验证：Stitch 使用的真实 OOPIF 场景、iframe 文件上传、所有浏览器对 `chrome.permissions.getAll()` 的返回差异。扩展目前仍声明 `<all_urls>` 和 debugger 等高权限。

## 对标观察

| 参考 | 可借鉴 | 限制与对 Easy WebBridge 的含义 |
| --- | --- | --- |
| [Playwright frames](https://playwright.dev/docs/frames) 与 [locators](https://playwright.dev/docs/locators) | FrameLocator 作用域；按 role/label/text/test id 定位；定位器重解析而非永久 DOM 节点引用 | closed Shadow DOM 不支持；Easy WebBridge 要先做唯一匹配、stale-ref 失效与 frame 作用域，再谈稳定语义定位 |
| [Playwright actionability](https://playwright.dev/docs/actionability)、[Trace Viewer](https://playwright.dev/docs/trace-viewer-intro)、[network](https://playwright.dev/docs/network) | 点击前检查唯一、可见、稳定、无遮挡、enabled；动作前后时间线及 DOM/网络证据；可观察请求失败 | 这些不是一次 click 就成功的承诺；先实现有界、可回读的动作证据，不默认开放流量拦截 |
| [Browser Use 开源配置](https://docs.browser-use.com/open-source/customize/agent/all-parameters.md)、[Fast agent](https://docs.browser-use.com/open-source/examples/templates/fast-agent.md)、[工具结果记忆](https://docs.browser-use.com/open-source/customize/tools/response.md) | 每步动作上限、快速确定性路径、有限历史、分离页面文本抽取；大结果仅返回一次并以后续摘要/记忆续读 | 这是 Agent 编排/模型策略，不是 Bridge 的浏览器权限或无损加速。只把“轻量/完整模式、限制重复回显、分页/游标”借入，不可把所有验证永久关闭。Browser Use 开源 Agent 与其 Cloud SDK 是不同产品，不能把 Cloud 的 stealth/CAPTCHA 能力移植为目标 |
| [Kimi WebBridge community v2 源码快照](https://github.com/efrg123/kimi-webbridge/tree/32f3a50c130178bb821d205c5caa7881bb89d611) | 源码中可见 key_combo/press_key、select/form、WeakRef+generation 引用注册、actionability、前后状态断言、8K 分块全文与 cursor、trace/redaction/policy 模块 | 仅审阅公开 community commit，未运行；README、TODO 与 commit 对完成度描述相互矛盾。键盘实现派发合成 KeyboardEvent，不等于可信原生按键；submit 有邻近按钮启发式风险；rollback 是 best-effort；`request_user_approval` handler 未实现，manifest 仍有 `<all_urls>`。**本机旧 Kimi 版本及其能力未核验**，本任务未启动旧 Kimi |

来源补充：[Browser Use OSS/Cloud 区分](https://docs.browser-use.com/llms.txt)、[复用已登录 Chrome](https://docs.browser-use.com/open-source/customize/browser/real-browser.md)。Browser Use 的 `max_actions_per_step`、`flash_mode`、`max_history_items`、`page_extraction_llm` 及 result memory 适合作为任务效率/输出预算的参考，不应描述为 Easy WebBridge 已有能力。

## 下一版优先级

1. **P0：Stitch OOPIF 与 iframe 上传边界。** 先用真实 Stitch 页面复测 frame tree、注入、坐标/viewport 与文件 input 路径；区分 Chrome 能力限制和实现缺口。无法稳定支持时返回明确 capability/error，不猜坐标、不宣称兼容。受控跨站 iframe 成功不等于真实 OOPIF 成功。
2. **P1：语义定位与引用新鲜度。** 增加 role/name/label/placeholder/text/test-id 定位器，统一严格唯一性和 actionability 检查；导航、frame 变化或重渲染后让旧引用明确失效，避免 WeakRef/fallback 静默点错。
3. **P1：通用动作差异与状态证据。** 在现有 batch 断言之外，为 click/fill 等返回动作前后摘要/差异、DOM quiet wait 和 element-gone 条件，并报告超时原因。命令接受不等于页面结果成功。
4. **P1：输入原语与批量动作。** 加有界 key press/key combo、select option、显式 form submit 和 pointer/text cursor 分页。区分 DOM 合成事件与 CDP/native input；提交控件要求唯一目标和风险/授权门槛。支持少量确定性动作组合以减少往返，但每项仍保留 actionability 与可选验证。
5. **P2：脱敏 trace。** 记录命令耗时、frame、重试、错误、动作前后 DOM 摘要和用户选择的截图/网络片段；默认脱敏 URL query、表单值、cookie、token 与响应体，并设置保留期/大小上限。网络记录默认观察，不默认拦截/改写。
6. **P2：权限收敛与可审计策略。** 先列出各命令的 host/debugger/cookie/download 权限依赖，再设计按站点授权、可见授权状态、审计与撤销。不能只新增 approval UI：policy 必须覆盖 click/fill、CDP、cookie、upload、download 等副作用面。暂不以权限扩张作为能力提升。

**效率与 token 验收建议：** 对同一固定页面比较默认/compact 的输出字节和实际模型 token；至少覆盖表单、长文、iframe、Shadow DOM。衡量 snapshot->action 往返数、总耗时、失败后恢复步数和动作后正确率。fast path 只跳过可省略的模型回合，不跳过唯一性、目标检查和任务所需的状态回读。
