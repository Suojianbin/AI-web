# AgentChatComponent：从接口数据到 DOM 渲染（完整链路）

本文基于以下代码：

- `src/components/AgentChatComponent.vue`
- `src/composables/useAgentStreamHandler.js`
- `src/composables/useApproval.js`
- `src/utils/messageProcessor.js`
- `src/components/AgentMessageComponent.vue`

目标：说明一条消息从“请求发出 -> 流式返回 -> 状态合并 -> 页面渲染”的全过程。

---

## 1. 页面最终渲染依赖的核心数据

在 `AgentChatComponent.vue` 中，真正用于 `v-for` 渲染的是 `conversations`。

模板入口：

```vue
<div class="conv-box" v-for="(conv, index) in conversations" :key="index">
  <AgentMessageComponent
    v-for="(message, msgIndex) in conv.messages"
    :message="message"
    :key="msgIndex"
  />
</div>
```

所以只要 `conversations` 变化，DOM 就会刷新。

---

## 2. 数据来源分两路：历史消息 + 流式增量消息

### 2.1 历史消息（完整、持久）

来源接口：

- `agentApi.getAgentHistory(agentId, threadId)`

落地位置：

- `threadMessages.value[threadId] = response.history || []`

历史消息通过 `MessageProcessor.convertServerHistoryToMessages` 转成会话结构：

```js
historyConversations = convertServerHistoryToMessages(currentThreadMessages)
```

### 2.2 流式消息（临时、正在生成）

来源接口：

- `agentApi.sendAgentMessage(...)` 返回 `fetch` 的 `Response.body` 流
- 审批恢复时 `agentApi.resumeAgentChat(...)` 也同样返回流

落地位置（每个线程独立）：

```js
chatState.threadStates[threadId].onGoingConv.msgChunks
```

结构示例：

```js
{
  "req-1": [/* init 的 human chunk */],
  "assistant-1": [/* loading chunk1 */, /* loading chunk2 */, ...]
}
```

---

## 3. 流式返回的数据格式（按行 JSON）

`useAgentStreamHandler.js` 里使用 `ReadableStream + TextDecoder`，按 `\n` 拆行后 `JSON.parse`。

常见 chunk 示例（来自本地 mock）：

```json
{"status":"init","request_id":"req-1","msg":{"id":"human-xxx","type":"human","content":"你好"}}
{"status":"loading","request_id":"req-1","msg":{"id":"assistant-1","type":"AIMessageChunk","content":"第一段"}}
{"status":"loading","request_id":"req-1","msg":{"id":"assistant-1","type":"AIMessageChunk","content":"第二段"}}
{"status":"agent_state","request_id":"req-1","agent_state":{"todos":[{"title":"识别问题意图","done":true}],"files":[{"result":{"name":"mock-answer.txt","path":"/mock-files/mock-answer.txt"}}]}}
{"status":"finished","request_id":"req-1"}
```

状态含义：

- `init`：初始化一次消息容器
- `loading`：持续增量 token/chunk
- `agent_state`：更新右上角状态面板数据（todo/files）
- `human_approval_required`：触发审批弹窗并暂停本次流
- `finished`：流式结束（但会先保留当前显示，随后再刷新历史）
- `error` / `interrupted`：停止流并提示

---

## 4. 发送消息到流处理：函数调用链

入口：

1. 输入区触发 `@send="handleSendOrStop"`
2. 如果当前在生成中，则走 `abort`
3. 否则调用 `handleSendMessage`

`handleSendMessage` 关键步骤：

1. 校验输入、确保 thread 存在（`ensureActiveThread`）
2. `threadState.isStreaming = true`
3. `resetOnGoingConv(threadId)` 清空本线程临时流数据
4. 创建 `AbortController`
5. 调用 `sendMessage(...)` 发请求
6. 调 `handleAgentResponse(response, threadId)` 逐 chunk 处理
7. finally 里异步 `fetchThreadMessages(..., delay: 500)` 拉正式历史并清空临时流

这一步保证了“边流式看 + 最后以服务端历史为准”。

---

## 5. 每个 chunk 如何写入状态

`useAgentStreamHandler.handleStreamChunk` 的核心逻辑：

- `init`：
  - `msgChunks[request_id] = [msg]`
- `loading`：
  - 用 `msg.id` 作为键，把 chunk push 到对应数组
- `agent_state`：
  - `threadState.agentState = chunk.agent_state`
- `human_approval_required`：
  - 调 `processApprovalInStream`，弹审批框并结束当前流
- `finished`：
  - `threadState.isStreaming = false`，返回 `true` 结束读取

---

## 6. chunk 合并成“可渲染消息”

`onGoingConvMessages` 计算属性：

1. `Object.values(msgChunks)` 拿到每组 chunk 数组
2. 每组走 `MessageProcessor.mergeMessageChunk(chunks)` 合并
3. 如果是 `AIMessageChunk`，转成 `type = 'ai'`
4. 合并 `content` / `reasoning_content` / `tool_call_chunks`
5. `convertToolResultToMessages` 把 tool result 合并到 `tool_calls`
6. 过滤 standalone `tool` 消息

结果就是可以直接喂给 `AgentMessageComponent` 的 message 对象。

---

## 7. conversations 如何拼成最终渲染源

`conversations` 计算属性逻辑：

```js
if (onGoingConvMessages.length > 0) {
  return [...historyConversations, { messages: onGoingConvMessages, status: 'streaming' }]
}
return historyConversations
```

这意味着：

- 历史消息永远在前
- 正在流式的临时消息作为“最后一个会话块”追加到列表末尾
- 模板里最后一条 AI 会收到 `is-processing=true`，显示生成态

---

## 8. 从 message 到具体 DOM 节点

`AgentMessageComponent.vue` 渲染规则：

- `message.type === 'human'`：纯文本 `<p>`
- `message.type === 'ai'`：`MdPreview` 渲染 Markdown
- 有 `reasoning_content`：显示“推理过程”折叠区
- 有 `tool_calls`：渲染 `ToolCallRenderer`
- 有 `message.image_content` 且 `message_type === 'multimodal_image'`：渲染 `<img>`

结论：

- 代码块由 Markdown 组件自动渲染（fenced code）
- Markdown 图片语法可渲染（取决于内容是否有可访问 URL 或 data URL）
- 数学公式是否显示，取决于 `MdPreview` 是否配置数学插件（当前文件未见额外数学插件注册代码）

---

## 9. 一次完整示例（时间顺序）

假设用户输入“写一个冒泡排序”：

1. `handleSendMessage` 发请求，`isStreaming=true`
2. 收到 `init`：先出现用户消息
3. 收到多个 `loading(AIMessageChunk)`：助手回答逐段 append
4. `onGoingConvMessages` 每次重算，DOM 每次增量刷新
5. 收到 `finished`：停止生成态
6. 500ms 后拉历史 `getAgentHistory`
7. `threadMessages` 更新，`historyConversations` 更新
8. 清空 `onGoingConv`，页面只保留正式历史记录

---

## 10. 关键设计点（为什么这样做）

- “临时流状态”与“正式历史状态”分离，避免半截消息污染历史数据
- 每线程独立 `threadState`，切换会话时可中断旧流、减少串流污染
- 最终以历史接口为准，保证刷新后数据一致性

---

## 11. 调试建议（定位“为什么没渲染/没流式”）

按顺序看：

1. `sendAgentMessage` 的响应是否是可读流（`response.body` 存在）
2. chunk 是否是“一行一个 JSON”
3. `status` 是否匹配处理分支（尤其 `loading`）
4. `msg.id` 是否稳定（同一助手消息应复用同一个 id）
5. `msg.type` 是否能被转成 `ai`（`AIMessageChunk` -> `ai`）
6. `onGoingConv.msgChunks` 是否持续增长
7. `conversations` 是否包含 `status: 'streaming'` 的尾会话
8. `AgentMessageComponent` 是否收到 `message.type === 'ai'` 且 `content` 非空

只要这 8 步全通，DOM 必定会实时流式更新。
