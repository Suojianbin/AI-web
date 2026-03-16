# Web 独立运行改造记录

## 目标

让 `web` 目录在不依赖 Docker 后端的情况下，也能直接通过 `pnpm install` 和 `pnpm dev` 启动，并且首页、登录、智能体、知识库、图谱、仪表盘、系统设置等基础功能可用。

本次实现遵循“源码能不改就不改”：

- 不改现有前端业务页面和 API 调用方式
- 只在 Vite 开发链路注入 mock 服务
- 仍保留原 Docker 模式下通过 `VITE_API_URL` 代理真实后端的能力

## 当前可访问地址

- 本地开发地址：`http://localhost:5173`
- `pnpm dev` 启动目录：`/Users/suojianbin/Documents/suojianbin/未命名文件夹/Ai-Know/web`

## 本次补充

- 补充时间：`2026-03-10`
- 已再次确认文档内容已写入本地文件，不是空文件
- 已重新启动 `web` 开发服务，页面可直接通过 `http://localhost:5173` 访问
- 当前默认走开发期 mock，不依赖 Docker 后端

## pnpm 安装情况

- 已安装 `pnpm@10.11.0`
- 可执行路径：`/Users/suojianbin/Documents/suojianbin/openclawbot/npm-global/bin/pnpm`
- 现在可以直接执行 `pnpm install`、`pnpm build`、`pnpm dev`

## 启动方式

在 `web` 目录下执行：

```bash
pnpm install
pnpm dev
```

如果本机还没有全局 `pnpm`，可使用：

```bash
corepack pnpm install
corepack pnpm dev
```

## 变更统计

- 修改文件：1 个
- 新增运行文件：1 个
- 新增说明文档：1 个
- 与本任务直接相关的总文件数：3 个

## 文件清单

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | `/Users/suojianbin/Documents/suojianbin/未命名文件夹/Ai-Know/web/vite.config.js` | 增加“独立开发走 mock、Docker 环境走真实后端代理”的条件切换 |
| 新增 | `/Users/suojianbin/Documents/suojianbin/未命名文件夹/Ai-Know/web/mock/devServer.js` | Vite 开发期 mock 服务，覆盖登录、聊天、知识库、图谱、仪表盘、设置页等基础接口 |
| 新增 | `/Users/suojianbin/Documents/suojianbin/未命名文件夹/Ai-Know/docs/vibe/web-standalone-mock-report.md` | 本次改动说明与文件统计 |

## 基础功能可用范围

已保证以下基础流程在独立前端模式下可直接体验：

- 登录页健康检查、登录、用户态恢复
- 首页品牌信息展示
- 智能体列表、默认智能体、对话线程、流式回复、消息反馈、附件列表
- 知识库列表、知识库详情、上传文件、建文件夹、解析、入库、检索测试、示例问题、思维导图
- 图谱列表、子图查询、Neo4j 信息、上传导入、添加索引
- 仪表盘基础统计、调用趋势、反馈弹窗
- 任务中心列表
- 系统设置中的模型供应商、自定义供应商、用户管理、部门管理、MCP 管理

## 独立模式实现方式

- 开发模式下，如果没有提供 `VITE_API_URL`，`web/vite.config.js` 会直接注册本地 mock 中间件
- 如果提供了 `VITE_API_URL`，则继续走原来的代理逻辑，不影响 Docker 开发方式
- mock 数据保存在 `web/mock/devServer.js` 的内存状态里，支持基础增删改查和流式聊天响应
- 前端业务页面、store、API 调用方式基本保持原样，没有改成另一套 mock 调用写法

## Mock 覆盖范围

- 登录与用户态
- 首页品牌信息
- 智能体列表、默认智能体、线程管理、流式聊天、反馈、附件
- 知识库列表、详情、文件上传、文件夹、解析、入库、检索测试、示例问题、思维导图
- 图谱列表、子图、Neo4j 信息、导入、索引
- 仪表盘统计、调用趋势、反馈详情
- 任务中心
- 系统设置里的模型配置、自定义供应商、用户管理、部门管理、MCP 管理

## 验证记录

已在 `web` 目录完成以下验证：

```bash
corepack pnpm install
corepack pnpm exec eslint vite.config.js mock/devServer.js
corepack pnpm build
corepack pnpm dev
```

之后又补做了一轮“纯 `pnpm`”验证：

```bash
pnpm --version
pnpm install
pnpm build
pnpm dev
```

另外已通过实际请求验证以下链路：

- `/api/system/health`
- `/api/system/info`
- `/api/auth/token`
- `/api/chat/agent`
- `/api/knowledge/databases`
- `/api/graph/list`
- `/api/dashboard/stats`
- 创建线程并完成一次流式聊天

实际冒烟结果：

- 健康检查返回 `{"status":"ok","message":"mock server ready"}`
- 登录账号可用：`admin / admin123`
- 当前 mock 数据包含 3 个智能体
- 当前 mock 数据包含 2 个知识库
- 当前 mock 图谱列表包含 3 个图源
- 流式聊天已验证可返回 5 段数据块并落历史记录

## 备注

- 当前 mock 只在开发模式且未提供 `VITE_API_URL` 时自动启用。
- 如果后续要重新接真实后端，本次实现不需要再改前端页面代码，只需提供 `VITE_API_URL` 即可。
- `docs/vibe` 在仓库 `.gitignore` 中，所以这份文档不会显示在 `git status` 里，但文件内容已经实际写入本地。
