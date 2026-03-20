<template>
  <div class="dify-page">
    <aside class="dify-sidebar">
      <div class="sidebar-head">
        <div class="brand">
          <span class="dot"></span>
          <span>Dify 对话</span>
        </div>
        <button class="config-btn" @click="configVisible = true">配置</button>
      </div>

      <button class="new-chat-btn" @click="createConversation()">+ 新对话</button>

      <div class="conversation-list">
        <button
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === activeConversationId }"
          @click="activeConversationId = conv.id"
        >
          {{ conv.title }}
        </button>
      </div>
    </aside>

    <main class="dify-main">
      <header class="main-head">
        <div class="head-title">Dify API 直连测试</div>
        <div class="head-meta">
          <span>{{ maskedBaseUrl }}</span>
        </div>
      </header>

      <section ref="messagesRef" class="message-list">
        <template v-if="activeConversation.messages.length">
          <div
            v-for="(msg, idx) in activeConversation.messages"
            :key="`${activeConversation.id}-${idx}`"
            class="message-row"
            :class="msg.role"
          >
            <div class="message-bubble">
              <div class="markdown-body" v-html="renderMessageContent(msg.content)"></div>
              <div v-if="msg.role === 'assistant' && msg.streamStats" class="stream-meta">
                <span class="meta-pill" :class="msg.streamStats.status">
                  {{ getStatusLabel(msg.streamStats.status) }}
                </span>
                <span v-if="msg.streamStats.totalTokens !== null">
                  Token {{ msg.streamStats.promptTokens ?? 0 }} / {{ msg.streamStats.completionTokens ?? 0 }} /
                  {{ msg.streamStats.totalTokens }}
                </span>
                <span v-if="msg.streamStats.ttfb !== null">
                  TTFB {{ formatSeconds(msg.streamStats.ttfb) }}
                </span>
                <span v-if="msg.streamStats.latency !== null">
                  生成耗时 {{ formatSeconds(msg.streamStats.latency) }}
                </span>
                <span v-if="msg.streamStats.totalTime !== null">
                  总耗时 {{ formatSeconds(msg.streamStats.totalTime) }}
                </span>
                <span v-if="msg.streamStats.totalPrice !== null">
                  费用 {{ formatPrice(msg.streamStats.totalPrice, msg.streamStats.currency) }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <h2>直接调用 Dify 接口</h2>
          <p>输入内容后会请求 `POST /chat-messages`（streaming 模式）。</p>
        </div>
      </section>

      <footer class="input-panel">
        <textarea
          v-model="userInput"
          :disabled="isSending"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          @keydown="handleInputKeydown"
        />
        <button
          class="send-btn"
          :class="{ stopping: isSending }"
          :disabled="!isSending && !userInput.trim()"
          @click="handleSendOrStop"
        >
          {{ isSending ? '停止' : '发送' }}
        </button>
      </footer>
    </main>

    <a-modal
      v-model:open="configVisible"
      title="Dify 连接配置"
      :footer="null"
      :maskClosable="false"
      width="620"
    >
      <div class="config-form">
        <label>Base URL</label>
        <a-input v-model:value="config.baseUrl" placeholder="/mock-dify/v1" />

        <label>API Key</label>
        <a-input-password v-model:value="config.apiKey" placeholder="app-xxxx" />

        <label>User ID</label>
        <a-input v-model:value="config.user" placeholder="ai-web-user" />

        <div class="form-actions">
          <a-button @click="configVisible = false">取消</a-button>
          <a-button type="primary" @click="saveConfig">保存</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

// ==================== 本地存储键 ====================
// 配置（Base URL / API Key / user）和会话历史都保存在 localStorage
const CONFIG_STORAGE_KEY = 'dify-chat-config-v1'
const CHAT_STORAGE_KEY = 'dify-chat-history-v1'
const TYPEWRITER_INTERVAL_MS = 16
const TYPEWRITER_CHARS_PER_TICK = 4
const DEFAULT_DIFY_BASE_URL = '/mock-dify/v1'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true
})

md.options.highlight = (code, lang) => {
  const language = (lang || '').trim().toLowerCase()
  if (language && hljs.getLanguage(language)) {
    try {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language, ignoreIllegals: true }).value}</code></pre>`
    } catch {
      // 走到兜底转义逻辑
    }
  }
  return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
}

md.use(texmath, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: {
    throwOnError: false,
    strict: 'ignore'
  }
})

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer nofollow')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

// ==================== 会话模型 ====================
// 这里维护的是“页面侧会话”，和 Dify conversation_id 是映射关系：
// - id: 前端本地会话 id（用于左侧列表）
// - conversationId: Dify 返回的 conversation_id（用于连续多轮对话）
const createConversationEntity = (title = '新对话') => ({
  id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title,
  conversationId: null,
  messages: [],
  updatedAt: Date.now()
})

// 从 localStorage 恢复 Dify 配置
const loadConfig = () => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) {
      return {
        baseUrl: DEFAULT_DIFY_BASE_URL,
        apiKey: '',
        user: 'ai-web-user'
      }
    }
    const parsed = JSON.parse(raw)
    const savedBaseUrl = (parsed.baseUrl || '').trim()
    const autoMigratedBaseUrl =
      !savedBaseUrl || /api\.dify\.ai\/v1/i.test(savedBaseUrl) ? DEFAULT_DIFY_BASE_URL : savedBaseUrl
    return {
      baseUrl: autoMigratedBaseUrl,
      apiKey: parsed.apiKey || '',
      user: parsed.user || 'ai-web-user'
    }
  } catch {
    return {
      baseUrl: DEFAULT_DIFY_BASE_URL,
      apiKey: '',
      user: 'ai-web-user'
    }
  }
}

// 从 localStorage 恢复聊天历史，保证至少有一个会话可用
const loadChatHistory = () => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return [createConversationEntity()]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : [createConversationEntity()]
  } catch {
    return [createConversationEntity()]
  }
}

// ==================== 响应式状态 ====================
const config = reactive(loadConfig())
const conversations = ref(loadChatHistory())
const activeConversationId = ref(conversations.value[0]?.id || '')
const userInput = ref('')
const isSending = ref(false)
const configVisible = ref(false)
const messagesRef = ref(null)
// 用于中断 fetch streaming（点击“停止”时 abort）
const streamController = ref(null)

// 将配置和会话落盘
const persistAll = () => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations.value))
}

// 当前激活会话；如果被删除或不存在则自动兜底创建一个
const activeConversation = computed(() => {
  const conv = conversations.value.find((item) => item.id === activeConversationId.value)
  if (conv) return conv
  const created = createConversationEntity()
  conversations.value.unshift(created)
  activeConversationId.value = created.id
  persistAll()
  return created
})

// 头部仅展示 URL 的可读形式（隐藏协议）
const maskedBaseUrl = computed(() => {
  if (!config.baseUrl) return '未配置 Base URL'
  return config.baseUrl.replace(/^https?:\/\//, '')
})

// 新建会话（不触发 Dify，仅本地开一个会话容器）
const createConversation = (title = '新对话') => {
  const created = createConversationEntity(title)
  conversations.value.unshift(created)
  activeConversationId.value = created.id
  persistAll()
}

// 保存配置并做基础校验
const saveConfig = () => {
  if (!config.baseUrl.trim()) {
    message.warning('请填写 Base URL')
    return
  }
  if (!config.apiKey.trim()) {
    message.warning('请填写 API Key')
    return
  }
  if (!config.user.trim()) {
    config.user = 'ai-web-user'
  }
  persistAll()
  configVisible.value = false
  message.success('Dify 配置已保存')
}

// 将滚动条推进到底部，确保增量输出可见
const scrollToBottom = async () => {
  await nextTick()
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const toNumberOrNull = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const createStreamStats = () => ({
  status: 'streaming',
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  ttfb: null,
  latency: null,
  totalTime: null,
  totalPrice: null,
  currency: null
})

const getStatusLabel = (status) => {
  if (status === 'streaming') return '生成中'
  if (status === 'finished') return '已完成'
  if (status === 'stopped') return '已停止'
  if (status === 'error') return '失败'
  return '未知'
}

const formatSeconds = (value) => {
  const n = toNumberOrNull(value)
  if (n === null) return '-'
  return `${n.toFixed(3)}s`
}

const formatPrice = (price, currency) => {
  if (price === null || price === undefined || price === '') return '-'
  const n = toNumberOrNull(price)
  const shown = n === null ? String(price) : n.toFixed(6)
  return `${shown} ${currency || ''}`.trim()
}

const normalizeStreamingMarkdown = (text) => {
  const fenceCount = (text.match(/```/g) || []).length
  // 流式生成时若代码围栏尚未闭合，临时补一个，避免整段退化成普通文本
  if (fenceCount % 2 === 1) {
    return `${text}\n\`\`\``
  }
  return text
}

const renderMessageContent = (content) => {
  const text = normalizeStreamingMarkdown(content || '')
  try {
    return md.render(text)
  } catch {
    return `<p>${md.utils.escapeHtml(text)}</p>`
  }
}

const applyUsageToStats = (stats, usage) => {
  if (!usage) return
  const promptTokens = toNumberOrNull(usage.prompt_tokens)
  const completionTokens = toNumberOrNull(usage.completion_tokens)
  const totalTokens = toNumberOrNull(usage.total_tokens)
  const ttfb = toNumberOrNull(usage.time_to_first_token)
  const latency = toNumberOrNull(usage.latency)
  const totalPrice = toNumberOrNull(usage.total_price)

  if (promptTokens !== null) stats.promptTokens = promptTokens
  if (completionTokens !== null) stats.completionTokens = completionTokens
  if (totalTokens !== null) stats.totalTokens = totalTokens
  if (ttfb !== null) stats.ttfb = ttfb
  if (latency !== null) stats.latency = latency
  if (totalPrice !== null) stats.totalPrice = totalPrice
  if (usage.currency) stats.currency = usage.currency
}

const applyStreamEvent = (
  streamData,
  targetConversation,
  assistantMessage,
  appendAssistantText,
  persistProgress
) => {
  if (streamData.conversation_id) {
    targetConversation.conversationId = streamData.conversation_id || targetConversation.conversationId
  }

  if (streamData.event === 'message') {
    const answerPiece = streamData.answer || ''
    if (answerPiece) {
      appendAssistantText(answerPiece)
      targetConversation.updatedAt = Date.now()
      persistProgress()
    }
    return
  }

  if (streamData.event === 'message_end') {
    applyUsageToStats(assistantMessage.streamStats, streamData.metadata?.usage)
    assistantMessage.streamStats.status = 'finished'
    targetConversation.updatedAt = Date.now()
    persistAll()
    return
  }

  if (streamData.event === 'workflow_finished') {
    const totalTime = toNumberOrNull(streamData.data?.elapsed_time)
    const workflowTotalTokens = toNumberOrNull(streamData.data?.total_tokens)
    if (totalTime !== null) {
      assistantMessage.streamStats.totalTime = totalTime
    }
    if (workflowTotalTokens !== null && assistantMessage.streamStats.totalTokens === null) {
      assistantMessage.streamStats.totalTokens = workflowTotalTokens
    }
    if (assistantMessage.streamStats.status === 'streaming') {
      assistantMessage.streamStats.status = 'finished'
    }
    targetConversation.updatedAt = Date.now()
    persistAll()
    return
  }

  if (streamData.event === 'error') {
    throw new Error(streamData.message || 'Dify 流式返回错误')
  }
}

// ==================== SSE 解析 ====================
// Dify streaming 返回 text/event-stream：
// - 一个事件块由若干行组成（例如 event:/data:），块与块之间是空行分隔
// - 我们只关心 data: 行，把它们拼起来再 JSON.parse
// 返回值：解析成功的对象；失败/null 返回 null（忽略该块）
const parseSSEBlock = (block) => {
  const dataLines = []
  const lines = block.split('\n')
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (!dataLines.length) return null

  const dataText = dataLines.join('\n').trim()
  if (!dataText || dataText === '[DONE]') return null

  try {
    return JSON.parse(dataText)
  } catch {
    return null
  }
}

// 主动中止流（按钮“停止”触发）
const stopStreaming = () => {
  if (streamController.value) {
    streamController.value.abort()
  }
}

// ==================== 发送消息（流式） ====================
// 核心流程：
// 1) 先插入用户消息 + 占位助手消息（空字符串）
// 2) 发起 streaming 请求
// 3) 边读流边解析 SSE，把 event=message 的 answer 分片 append 到助手消息
// 4) message_end / stream done 后结束，持久化并回到底部
const sendMessage = async () => {
  const text = userInput.value.trim()
  if (!text || isSending.value) return

  const isLocalMockDify = /^\/mock-dify(\/|$)/.test(config.baseUrl.trim()) || config.baseUrl.trim() === '/v1'
  if (!config.apiKey.trim() && !isLocalMockDify) {
    message.warning('请先在配置里填写 API Key')
    configVisible.value = true
    return
  }

  const targetConversation = activeConversation.value
  targetConversation.messages.push({ role: 'user', content: text })
  targetConversation.updatedAt = Date.now()
  if (targetConversation.title === '新对话') {
    targetConversation.title = text.slice(0, 18) || '新对话'
  }
  userInput.value = ''
  isSending.value = true
  streamController.value = new AbortController()
  persistAll()
  scrollToBottom()

  targetConversation.messages.push({
    role: 'assistant',
    content: '',
    streamStats: createStreamStats()
  })
  // 必须取回数组里的代理对象再改值，否则会出现“最后一次性渲染”问题
  const assistantMessage = targetConversation.messages[targetConversation.messages.length - 1]

  // 打字机队列：即使后端一次性返回大块数据，也能前端逐字输出
  let typewriterBuffer = ''
  let typewriterTimer = null
  const drainResolvers = []
  let persistTimer = null

  const resolveDrain = () => {
    while (drainResolvers.length) {
      const resolve = drainResolvers.shift()
      if (resolve) resolve()
    }
  }

  const persistProgress = () => {
    if (persistTimer !== null) return
    persistTimer = window.setTimeout(() => {
      persistTimer = null
      persistAll()
    }, 300)
  }

  const flushPersist = () => {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    persistAll()
  }

  const scrollToBottomFast = () => {
    const el = messagesRef.value
    if (el) el.scrollTop = el.scrollHeight
  }

  const stopTypewriterTimer = () => {
    if (typewriterTimer !== null) {
      clearInterval(typewriterTimer)
      typewriterTimer = null
    }
  }

  const appendAssistantText = (text) => {
    if (!text) return
    typewriterBuffer += text

    if (typewriterTimer !== null) return
    typewriterTimer = window.setInterval(() => {
      if (!typewriterBuffer.length) {
        stopTypewriterTimer()
        resolveDrain()
        return
      }

      const take = Math.min(TYPEWRITER_CHARS_PER_TICK, typewriterBuffer.length)
      assistantMessage.content += typewriterBuffer.slice(0, take)
      typewriterBuffer = typewriterBuffer.slice(take)
      targetConversation.updatedAt = Date.now()
      persistProgress()
      scrollToBottomFast()

      if (!typewriterBuffer.length) {
        stopTypewriterTimer()
        resolveDrain()
      }
    }, TYPEWRITER_INTERVAL_MS)
  }

  const waitTypewriterDrain = () => {
    if (!typewriterBuffer.length && typewriterTimer === null) return Promise.resolve()
    return new Promise((resolve) => drainResolvers.push(resolve))
  }

  const flushTypewriter = () => {
    stopTypewriterTimer()
    if (typewriterBuffer.length) {
      assistantMessage.content += typewriterBuffer
      typewriterBuffer = ''
      targetConversation.updatedAt = Date.now()
      persistProgress()
      scrollToBottomFast()
    }
    resolveDrain()
  }

  const payload = {
    inputs: {},
    query: text,
    response_mode: 'streaming',
    user: config.user
  }

  if (targetConversation.conversationId) {
    payload.conversation_id = targetConversation.conversationId
  }

  try {
    const resp = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey.trim() || 'app-local-mock-key'}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify(payload),
      signal: streamController.value.signal
    })

    if (!resp.ok) {
      const raw = await resp.text()
      throw new Error(raw || `HTTP ${resp.status}`)
    }
    if (!resp.body) {
      throw new Error('Dify 返回为空流')
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder('utf-8')
    // buffer 用来处理“半包”问题：
    // 一次 read() 可能拿到半个事件块，必须和下次拼起来再解析
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      // SSE 以空行分隔事件块；循环尽可能多地消费完整块
      let boundaryIndex = buffer.indexOf('\n\n')
      while (boundaryIndex !== -1) {
        const block = buffer.slice(0, boundaryIndex).trim()
        buffer = buffer.slice(boundaryIndex + 2)

        if (block) {
          const streamData = parseSSEBlock(block)
          if (streamData) {
            applyStreamEvent(
              streamData,
              targetConversation,
              assistantMessage,
              appendAssistantText,
              persistProgress
            )
          }
        }

        boundaryIndex = buffer.indexOf('\n\n')
      }
    }

    // 处理尾包：循环结束时 buffer 里可能还有最后一个未消费的事件块
    const tailData = parseSSEBlock(buffer.trim())
    if (tailData) {
      applyStreamEvent(
        tailData,
        targetConversation,
        assistantMessage,
        appendAssistantText,
        persistProgress
      )
    }

    await waitTypewriterDrain()

    if (!assistantMessage.content.trim()) {
      assistantMessage.content = 'Dify 返回为空'
    }
    if (assistantMessage.streamStats.status === 'streaming') {
      assistantMessage.streamStats.status = 'finished'
    }

    targetConversation.updatedAt = Date.now()
    flushPersist()
    scrollToBottom()
  } catch (error) {
    flushTypewriter()

    // AbortError 来自“手动停止”，不是异常场景
    if (error?.name === 'AbortError') {
      if (!assistantMessage.content.trim()) {
        assistantMessage.content = '已停止生成'
      }
      assistantMessage.streamStats.status = 'stopped'
      message.info('已停止生成')
    } else {
      const errText = `请求失败：${error.message || String(error)}`
      if (assistantMessage.content.trim()) {
        assistantMessage.content += `\n\n${errText}`
      } else {
        assistantMessage.content = errText
      }
      assistantMessage.streamStats.status = 'error'
      message.error('请求 Dify 流式失败，请检查配置或网络')
    }

    targetConversation.updatedAt = Date.now()
    flushPersist()
    scrollToBottom()
  } finally {
    flushTypewriter()
    flushPersist()
    isSending.value = false
    streamController.value = null
  }
}

// 发送/停止复用一个按钮
const handleSendOrStop = () => {
  if (isSending.value) {
    stopStreaming()
    return
  }
  sendMessage()
}

// Enter 发送，Shift+Enter 换行
const handleInputKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendOrStop()
  }
}
</script>

<style lang="less" scoped>
.dify-page {
  height: 100vh;
  display: flex;
  background: #f8fafc;
}

.dify-sidebar {
  width: 260px;
  border-right: 1px solid rgba(148, 163, 184, 0.28);
  background:
    radial-gradient(circle at 10% -10%, rgba(15, 118, 110, 0.08), transparent 40%),
    #f8fafc;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .sidebar-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 10px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #0f172a;
    font-size: 14px;
    font-weight: 600;
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0d9488, #0284c7);
  }

  .config-btn,
  .new-chat-btn {
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: #ffffff;
    color: #0f172a;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 13px;
    font-weight: 600;
  }

  .config-btn {
    padding: 4px 10px;
  }

  .new-chat-btn {
    padding: 9px 10px;

    &:hover {
      border-color: rgba(13, 148, 136, 0.35);
      box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
    }
  }

  .conversation-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: auto;
  }

  .conversation-item {
    text-align: left;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 10px;
    padding: 9px 10px;
    color: #334155;
    cursor: pointer;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      background: #eef2f7;
      border-color: rgba(148, 163, 184, 0.3);
    }

    &.active {
      background: #e2f4f3;
      border-color: rgba(15, 118, 110, 0.3);
      color: #115e59;
      font-weight: 600;
    }
  }
}

.dify-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 85% -20%, rgba(14, 116, 144, 0.08), transparent 35%),
    #f8fafc;
}

.main-head {
  height: 58px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: rgba(248, 250, 252, 0.82);
  backdrop-filter: blur(10px);

  .head-title {
    color: #0f172a;
    font-weight: 700;
  }

  .head-meta {
    color: #64748b;
    font-size: 12px;
  }
}

.message-list {
  flex: 1;
  overflow: auto;
  padding: 24px 24px 160px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;

  &.user {
    justify-content: flex-end;
  }

  &.assistant {
    justify-content: flex-start;
  }
}

.message-bubble {
  max-width: min(84%, 840px);
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: #ffffff;
  padding: 10px 12px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);

  .markdown-body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: #1e293b;
    font-size: 14px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }

  :deep(.markdown-body > :first-child) {
    margin-top: 0 !important;
  }

  :deep(.markdown-body > :last-child) {
    margin-bottom: 0 !important;
  }

  :deep(.markdown-body img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    display: block;
  }

  :deep(.markdown-body pre) {
    max-width: 100%;
    overflow: auto;
    border-radius: 8px;
  }

  :deep(.markdown-body code) {
    white-space: pre-wrap;
    word-break: break-word;
  }

  :deep(.markdown-body pre code) {
    white-space: pre;
    word-break: normal;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
  }

  :deep(.markdown-body pre.hljs) {
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.25);
    padding: 12px 14px;
  }

  :deep(.markdown-body .katex-display) {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 4px 0;
  }

  .stream-meta {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed rgba(148, 163, 184, 0.35);
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 12px;
    color: #64748b;

    .meta-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 54px;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
      background: #e2e8f0;
      color: #334155;
      border: 1px solid rgba(148, 163, 184, 0.4);

      &.streaming {
        background: #e0f2fe;
        color: #075985;
        border-color: rgba(2, 132, 199, 0.4);
      }

      &.finished {
        background: #dcfce7;
        color: #166534;
        border-color: rgba(34, 197, 94, 0.4);
      }

      &.stopped {
        background: #fee2e2;
        color: #991b1b;
        border-color: rgba(239, 68, 68, 0.4);
      }

      &.error {
        background: #ffe4e6;
        color: #9f1239;
        border-color: rgba(244, 63, 94, 0.4);
      }
    }
  }
}

.message-row.user .message-bubble {
  background: linear-gradient(180deg, #f8fbff, #f1f5f9);
}

.empty-state {
  margin-top: 60px;
  text-align: center;

  h2 {
    font-size: 30px;
    color: #0f172a;
    margin: 0 0 10px;
  }

  p {
    margin: 0;
    color: #64748b;
  }
}

.input-panel {
  position: sticky;
  bottom: 0;
  padding: 12px 24px 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0) 0%, #f8fafc 42%, #f8fafc 100%);
  display: flex;
  align-items: flex-end;
  gap: 10px;

  textarea {
    flex: 1;
    min-height: 56px;
    max-height: 180px;
    resize: vertical;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 22px rgba(15, 23, 42, 0.08);
    padding: 14px;
    font-size: 14px;
    color: #0f172a;
    outline: none;
  }

  .send-btn {
    height: 44px;
    min-width: 82px;
    border: none;
    border-radius: 12px;
    background: #0f172a;
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: #020617;
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    &.stopping {
      background: #b91c1c;

      &:hover:not(:disabled) {
        background: #991b1b;
      }
    }
  }
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;

  label {
    font-size: 13px;
    color: #334155;
    font-weight: 600;
    margin-top: 4px;
  }

  .form-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}

@media (max-width: 900px) {
  .dify-page {
    flex-direction: column;
  }

  .dify-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.28);
    max-height: 210px;
  }

  .message-list {
    padding: 14px 12px 150px;
  }

  .input-panel {
    padding: 10px 12px 12px;
  }
}
</style>
