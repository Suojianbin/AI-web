<template>
  <div class="chat-container">
    <ChatSidebarComponent
      :current-chat-id="currentChatId"
      :chats-list="chatsList"
      :is-sidebar-open="chatUIStore.isSidebarOpen"
      :is-initial-render="localUIState.isInitialRender"
      :single-mode="true"
      :agents="[]"
      :is-creating-new-chat="chatUIStore.creatingNewChat"
      @create-chat="createNewChat"
      @select-chat="selectChat"
      @delete-chat="deleteChat"
      @rename-chat="renameChat"
      @toggle-sidebar="toggleSidebar"
      :class="{
        'sidebar-open': chatUIStore.isSidebarOpen,
        'no-transition': localUIState.isInitialRender
      }"
    />

    <div class="chat">
      <div class="chat-header">
        <div class="header__left">
          <div type="button" class="agent-nav-btn" v-if="!chatUIStore.isSidebarOpen" @click="toggleSidebar">
            <PanelLeftOpen class="nav-btn-icon" size="18" />
          </div>
          <div
            type="button"
            class="agent-nav-btn"
            v-if="!chatUIStore.isSidebarOpen"
            :class="{ 'is-disabled': chatUIStore.creatingNewChat }"
            @click="createNewChat"
          >
            <LoaderCircle
              v-if="chatUIStore.creatingNewChat"
              class="nav-btn-icon loading-icon"
              size="18"
            />
            <MessageCirclePlus v-else class="nav-btn-icon" size="18" />
            <span class="text">新对话</span>
          </div>
          <div class="agent-nav-btn">
            <span class="text">{{ assistantName }}</span>
          </div>
        </div>
        <div class="header__right">
          <slot name="header-right"></slot>
        </div>
      </div>

      <div v-if="isLoadingMessages" class="chat-loading">
        <div class="loading-spinner"></div>
        <span>正在加载消息...</span>
      </div>

      <div v-else-if="!conversations.length" class="chat-examples">
        <div style="margin-bottom: 150px"></div>
        <h1>您好，我是{{ assistantName }}！</h1>
      </div>

      <div class="chat-box">
        <div class="conv-box" v-for="(conv, index) in conversations" :key="index">
          <SimpleMessageComponent
            v-for="(message, msgIndex) in conv.messages"
            :message="message"
            :key="msgIndex"
            :is-processing="
              isProcessing && conv.status === 'streaming' && msgIndex === conv.messages.length - 1
            "
            :show-refs="false"
            @retry="retryMessage(message)"
          />

          <div
            v-if="enableConversationActions && conv.status !== 'streaming'"
            class="conversation-actions"
          >
            <button class="conversation-action-btn" @click="copyConversation(conv)">
              <Copy size="14" />
              复制问答
            </button>
            <button class="conversation-action-btn danger" @click="deleteConversationByMessages(conv)">
              <Trash2 size="14" />
              删除问答
            </button>
          </div>
        </div>

        <div class="generating-status" v-if="isProcessing && conversations.length > 0">
          <div class="generating-indicator">
            <div class="loading-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <span class="generating-text">正在生成回复...</span>
          </div>
        </div>
      </div>

      <div class="bottom" :class="{ 'start-screen': !conversations.length }">
        <div class="message-input-wrapper">
          <SimpleInputArea
            ref="messageInputRef"
            v-model="userInput"
            :is-loading="isProcessing"
            :disabled="false"
            :send-button-disabled="!isProcessing && !userInput.trim()"
            placeholder="输入问题..."
            :supports-file-upload="supportsFileUpload"
            :assistant-id="currentAssistantId"
            :thread-id="currentChatId"
            :ensure-thread="ensureActiveThread"
            @send="handleSendOrStop"
          />

          <div class="example-questions" v-if="!conversations.length && exampleQuestions.length > 0">
            <div class="example-chips">
              <div
                v-for="question in exampleQuestions"
                :key="question.id"
                class="example-chip"
                @click="handleExampleClick(question.text)"
              >
                {{ question.text }}
              </div>
            </div>
          </div>

          <div class="bottom-actions" v-else>
            <p class="note">请注意辨别内容的可靠性</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick, computed, onUnmounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import SimpleInputArea from '@/components/simple-chat/SimpleInputArea.vue'
import SimpleMessageComponent from '@/components/simple-chat/SimpleMessageComponent.vue'
import ChatSidebarComponent from '@/components/ChatSidebarComponent.vue'
import { PanelLeftOpen, MessageCirclePlus, LoaderCircle, Copy, Trash2 } from 'lucide-vue-next'
import { handleChatError } from '@/utils/errorHandler'
import { ScrollController } from '@/utils/scrollController'
import { useChatUIStore } from '@/stores/chatUI'
import { MessageProcessor } from '@/utils/messageProcessor'
import { threadApi } from '@/apis'
import { simpleChatApi } from '@/apis/simple_chat_api'
import { useSimpleStreamHandler } from '@/composables/useSimpleStreamHandler'

const props = defineProps({
  assistantId: { type: String, default: 'simple-chat-assistant' },
  assistantName: { type: String, default: 'AI助手' },
  enableTypewriter: { type: Boolean, default: true },
  supportsFileUpload: { type: Boolean, default: true },
  enableConversationActions: { type: Boolean, default: true },
  exampleQuestions: {
    type: Array,
    default: () => []
  }
})

const chatUIStore = useChatUIStore()

const userInput = ref('')
const messageInputRef = ref(null)

const currentAssistantId = computed(() => props.assistantId || 'simple-chat-assistant')

const createOnGoingConvState = () => ({
  msgChunks: {},
  currentRequestKey: null,
  currentAssistantKey: null,
  toolCallBuffers: {}
})

const chatState = reactive({
  currentThreadId: null,
  threadStates: {}
})

const threads = ref([])
const threadMessages = ref({})

const localUIState = reactive({
  isInitialRender: true
})

const chatsList = computed(() => threads.value || [])
const currentChatId = computed(() => chatState.currentThreadId)
const currentThreadMessages = computed(() => threadMessages.value[currentChatId.value] || [])

const getThreadState = (threadId) => {
  if (!threadId) return null
  if (!chatState.threadStates[threadId]) {
    chatState.threadStates[threadId] = {
      isStreaming: false,
      streamAbortController: null,
      onGoingConv: createOnGoingConvState()
    }
  }
  return chatState.threadStates[threadId]
}

const cleanupThreadState = (threadId) => {
  if (!threadId) return
  const threadState = chatState.threadStates[threadId]
  if (!threadState) return

  if (threadState.streamAbortController) {
    threadState.streamAbortController.abort()
  }
  delete chatState.threadStates[threadId]
}

const currentThreadState = computed(() => getThreadState(currentChatId.value))

const onGoingConvMessages = computed(() => {
  const threadState = currentThreadState.value
  if (!threadState || !threadState.onGoingConv) return []

  const msgs = Object.values(threadState.onGoingConv.msgChunks).map(MessageProcessor.mergeMessageChunk)
  return msgs.length > 0
    ? MessageProcessor.convertToolResultToMessages(msgs).filter((msg) => msg.type !== 'tool')
    : []
})

const historyConversations = computed(() => {
  return MessageProcessor.convertServerHistoryToMessages(currentThreadMessages.value)
})

const conversations = computed(() => {
  const historyConvs = historyConversations.value
  if (onGoingConvMessages.value.length > 0) {
    return [
      ...historyConvs,
      {
        messages: onGoingConvMessages.value,
        status: 'streaming'
      }
    ]
  }
  return historyConvs
})

const isLoadingMessages = computed(() => chatUIStore.isLoadingMessages)
const isStreaming = computed(() => currentThreadState.value?.isStreaming || false)
const isProcessing = computed(() => isStreaming.value)

const scrollController = new ScrollController('.chat')

onMounted(async () => {
  nextTick(() => {
    const chatContainer = document.querySelector('.chat')
    if (chatContainer) {
      chatContainer.addEventListener('scroll', scrollController.handleScroll, { passive: true })
    }
  })
  setTimeout(() => {
    localUIState.isInitialRender = false
  }, 300)

  await loadChatsList()
  scrollController.enableAutoScroll()
})

onUnmounted(() => {
  scrollController.cleanup()
  resetOnGoingConv()
})

const { handleStreamResponse } = useSimpleStreamHandler({
  getThreadState,
  enableTypewriter: computed(() => props.enableTypewriter)
})

const resetOnGoingConv = (threadId = null) => {
  const targetThreadId = threadId || currentChatId.value
  if (targetThreadId) {
    const threadState = getThreadState(targetThreadId)
    if (threadState) {
      if (threadState.streamAbortController) {
        threadState.streamAbortController.abort()
        threadState.streamAbortController = null
      }
      threadState.onGoingConv = createOnGoingConvState()
    }
    return
  }

  Object.keys(chatState.threadStates).forEach((tid) => {
    cleanupThreadState(tid)
  })
}

const fetchThreads = async (assistantId = null) => {
  const targetAssistantId = assistantId || currentAssistantId.value
  if (!targetAssistantId) return

  chatUIStore.isLoadingThreads = true
  try {
    const fetchedThreads = await threadApi.getThreads(targetAssistantId)
    threads.value = fetchedThreads || []
  } catch (error) {
    handleChatError(error, 'fetch')
    throw error
  } finally {
    chatUIStore.isLoadingThreads = false
  }
}

const createThread = async (assistantId, title = '新的对话') => {
  if (!assistantId) return null
  try {
    const thread = await threadApi.createThread(assistantId, title)
    if (thread) {
      threads.value.unshift(thread)
      threadMessages.value[thread.id] = []
    }
    return thread
  } catch (error) {
    handleChatError(error, 'create')
    throw error
  }
}

const deleteThread = async (threadId) => {
  if (!threadId) return
  try {
    await threadApi.deleteThread(threadId)
    threads.value = threads.value.filter((thread) => thread.id !== threadId)
    delete threadMessages.value[threadId]
    if (chatState.currentThreadId === threadId) {
      chatState.currentThreadId = null
    }
  } catch (error) {
    handleChatError(error, 'delete')
    throw error
  }
}

const updateThread = async (threadId, title) => {
  if (!threadId || !title) return
  try {
    await threadApi.updateThread(threadId, title)
    const thread = threads.value.find((t) => t.id === threadId)
    if (thread) thread.title = title
  } catch (error) {
    handleChatError(error, 'update')
    throw error
  }
}

const fetchThreadMessages = async ({ assistantId, threadId, delay = 0 }) => {
  if (!threadId || !assistantId) return
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  try {
    const response = await simpleChatApi.getHistory(assistantId, threadId)
    threadMessages.value[threadId] = response.history || []
  } catch (error) {
    handleChatError(error, 'load')
    throw error
  }
}

const ensureActiveThread = async (title = '新的对话') => {
  if (currentChatId.value) return currentChatId.value
  const newThread = await createThread(currentAssistantId.value, title || '新的对话')
  if (!newThread) return null
  chatState.currentThreadId = newThread.id
  return newThread.id
}

const createLocalMessageId = (prefix = 'msg') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const seedOnGoingConversation = (threadId, promptText) => {
  const threadState = getThreadState(threadId)
  if (!threadState) return null

  const userMessageId = createLocalMessageId('human')
  const assistantMessageId = createLocalMessageId('ai')

  threadState.onGoingConv.msgChunks[userMessageId] = [
    {
      id: userMessageId,
      type: 'human',
      content: promptText
    }
  ]

  threadState.onGoingConv.currentAssistantKey = assistantMessageId
  threadState.onGoingConv.msgChunks[assistantMessageId] = [
    {
      id: assistantMessageId,
      type: 'AIMessageChunk',
      content: ''
    }
  ]

  return { userMessageId, assistantMessageId }
}

const sendMessage = async ({
  assistantId,
  threadId,
  text,
  signal = undefined,
  files = []
}) => {
  if (!assistantId || !threadId || (!text && !files?.length)) {
    const error = new Error('Missing required parameters')
    handleChatError(error, 'send')
    return Promise.reject(error)
  }

  if ((threadMessages.value[threadId] || []).length === 0 && text) {
    updateThread(threadId, text)
  }

  const requestData = {
    query: text || '',
    conversation_id: threadId,
    user: `simple-${assistantId || 'assistant'}`,
    inputs: {}
  }

  if (Array.isArray(files) && files.length > 0) {
    requestData.files = files
  }

  try {
    return await simpleChatApi.sendMessage(assistantId, requestData, signal ? { signal } : undefined)
  } catch (error) {
    handleChatError(error, 'send')
    throw error
  }
}

const isFirstChatEmpty = () => {
  if (threads.value.length === 0) return false
  const firstThread = threads.value[0]
  const firstThreadMessages = threadMessages.value[firstThread.id] || []
  return firstThreadMessages.length === 0
}

const switchToFirstChatIfEmpty = async () => {
  if (threads.value.length > 0 && isFirstChatEmpty()) {
    await selectChat(threads.value[0].id)
    return true
  }
  return false
}

const createNewChat = async () => {
  if (chatUIStore.creatingNewChat) return
  if (await switchToFirstChatIfEmpty()) return

  const currentThreadIndex = threads.value.findIndex((thread) => thread.id === currentChatId.value)
  if (currentChatId.value && conversations.value.length === 0 && currentThreadIndex === 0) return

  chatUIStore.creatingNewChat = true
  try {
    const newThread = await createThread(currentAssistantId.value, '新的对话')
    if (newThread) {
      const previousThreadId = chatState.currentThreadId
      if (previousThreadId) {
        const previousThreadState = getThreadState(previousThreadId)
        if (previousThreadState?.isStreaming && previousThreadState.streamAbortController) {
          previousThreadState.streamAbortController.abort()
          previousThreadState.isStreaming = false
          previousThreadState.streamAbortController = null
        }
      }
      chatState.currentThreadId = newThread.id
    }
  } finally {
    chatUIStore.creatingNewChat = false
  }
}

const selectChat = async (chatId) => {
  const previousThreadId = chatState.currentThreadId
  if (previousThreadId && previousThreadId !== chatId) {
    const previousThreadState = getThreadState(previousThreadId)
    if (previousThreadState?.isStreaming && previousThreadState.streamAbortController) {
      previousThreadState.streamAbortController.abort()
      previousThreadState.isStreaming = false
      previousThreadState.streamAbortController = null
    }
  }

  chatState.currentThreadId = chatId
  chatUIStore.isLoadingMessages = true
  try {
    await fetchThreadMessages({ assistantId: currentAssistantId.value, threadId: chatId })
  } catch (error) {
    handleChatError(error, 'load')
  } finally {
    chatUIStore.isLoadingMessages = false
  }

  await nextTick()
  scrollController.scrollToBottomStaticForce()
}

const deleteChat = async (chatId) => {
  try {
    await deleteThread(chatId)
    if (chatState.currentThreadId === chatId) {
      chatState.currentThreadId = null
      await createNewChat()
    } else if (chatsList.value.length > 0) {
      await selectChat(chatsList.value[0].id)
    }
  } catch (error) {
    handleChatError(error, 'delete')
  }
}

const renameChat = async (data) => {
  let { chatId, title } = data
  if (!chatId || !title) return
  if (title.length > 30) title = title.slice(0, 30)
  try {
    await updateThread(chatId, title)
  } catch (error) {
    handleChatError(error, 'rename')
  }
}

const handleSendMessage = async ({ files = [] } = {}) => {
  const text = userInput.value.trim()
  const uploadFiles = Array.isArray(files) ? files : []
  const hasFiles = uploadFiles.length > 0
  if ((!text && !hasFiles) || isProcessing.value) return

  const promptText = text || `请结合上传的 ${uploadFiles.length} 个文件进行解析`
  let threadId = currentChatId.value
  if (!threadId) {
    threadId = await ensureActiveThread(promptText || '新的对话')
    if (!threadId) {
      message.error('创建对话失败，请重试')
      return
    }
  }

  userInput.value = ''
  await nextTick()
  scrollController.scrollToBottom(true)

  const threadState = getThreadState(threadId)
  if (!threadState) return

  threadState.isStreaming = true
  resetOnGoingConv(threadId)
  seedOnGoingConversation(threadId, promptText)
  threadState.streamAbortController = new AbortController()

  try {
    const response = await sendMessage({
      assistantId: currentAssistantId.value,
      threadId,
      text: promptText,
      signal: threadState.streamAbortController?.signal,
      files: uploadFiles
    })
    await handleStreamResponse(response, threadId)
  } catch (error) {
    const assistantKey = threadState.onGoingConv.currentAssistantKey
    if (assistantKey) {
      if (!threadState.onGoingConv.msgChunks[assistantKey]) {
        threadState.onGoingConv.msgChunks[assistantKey] = [
          { id: assistantKey, type: 'AIMessageChunk', content: '' }
        ]
      }
      if (error.name === 'AbortError') {
        threadState.onGoingConv.msgChunks[assistantKey].push({
          id: assistantKey,
          type: 'AIMessageChunk',
          content: '已停止生成'
        })
      } else {
        threadState.onGoingConv.msgChunks[assistantKey].push({
          id: assistantKey,
          type: 'AIMessageChunk',
          content: `请求失败：${error?.message || String(error)}`
        })
      }
    }

    if (error.name !== 'AbortError') {
      handleChatError(error, 'send')
    }
    threadState.isStreaming = false
  } finally {
    threadState.streamAbortController = null
    threadState.isStreaming = false
    try {
      await fetchThreadMessages({ assistantId: currentAssistantId.value, threadId, delay: 120 })
    } catch {
      // 保持流式显示结果，不额外做前端拼装
    }
    resetOnGoingConv(threadId)
    await nextTick()
    scrollController.scrollToBottom()
  }
}

const handleSendOrStop = async (payload) => {
  const threadId = currentChatId.value
  const threadState = getThreadState(threadId)
  if (isProcessing.value && threadState && threadState.streamAbortController) {
    threadState.streamAbortController.abort()
    message.info('已中断对话生成')
    return
  }
  await handleSendMessage(payload)
}

const handleExampleClick = (questionText) => {
  userInput.value = questionText
  nextTick(() => {
    handleSendMessage()
  })
}

const retryMessage = (targetMessage) => {
  const conv = conversations.value.find((item) =>
    Array.isArray(item.messages) ? item.messages.includes(targetMessage) : false
  )
  const humanMessage = conv?.messages?.find((item) => item.type === 'human')
  if (!humanMessage?.content) {
    message.warning('未找到可重试的问题内容')
    return
  }
  userInput.value = humanMessage.content
  nextTick(() => {
    handleSendMessage()
  })
}

const buildConversationPlainText = (conv) => {
  const humanMessages = (conv?.messages || []).filter((item) => item.type === 'human')
  const aiMessages = (conv?.messages || []).filter((item) => item.type === 'ai')
  const qText = humanMessages.map((item) => item.content || '').join('\n')
  const aText = aiMessages.map((item) => item.content || '').join('\n')
  return `问题：\n${qText || '（空）'}\n\n回答：\n${aText || '（空）'}`
}

const copyTextToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
      return
    }
  } catch {}

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    const successful = document.execCommand('copy')
    if (successful) message.success('已复制到剪贴板')
    else message.error('复制失败，请手动复制')
  } finally {
    document.body.removeChild(textArea)
  }
}

const copyConversation = async (conv) => {
  await copyTextToClipboard(buildConversationPlainText(conv))
}

const deleteConversationByMessages = async (conv) => {
  const threadId = currentChatId.value
  if (!threadId || !conv?.messages?.length) return

  const messageIds = conv.messages.map((item) => item.id).filter(Boolean)
  if (!messageIds.length) {
    message.warning('当前问答缺少消息ID，无法删除')
    return
  }

  Modal.confirm({
    title: '删除这组问答？',
    content: '删除后将从当前会话历史移除，操作不可恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await simpleChatApi.deleteThreadMessages(threadId, messageIds)
        await fetchThreadMessages({ assistantId: currentAssistantId.value, threadId })
        message.success('问答已删除')
      } catch (error) {
        const idSet = new Set(messageIds)
        threadMessages.value[threadId] = (threadMessages.value[threadId] || []).filter(
          (item) => !idSet.has(item.id)
        )
        message.warning('后端暂不支持删除接口，已在当前页面移除')
        console.warn('Delete conversation fallback to local remove:', error)
      }
    }
  })
}

const loadChatsList = async () => {
  const assistantId = currentAssistantId.value
  if (!assistantId) {
    threads.value = []
    chatState.currentThreadId = null
    return
  }

  try {
    await fetchThreads(assistantId)
    if (
      chatState.currentThreadId &&
      !threads.value.find((t) => t.id === chatState.currentThreadId)
    ) {
      chatState.currentThreadId = null
    }
    if (threads.value.length > 0 && !chatState.currentThreadId) {
      await selectChat(threads.value[0].id)
    }
  } catch (error) {
    handleChatError(error, 'load')
  }
}

watch(
  currentAssistantId,
  async () => {
    chatState.currentThreadId = null
    threadMessages.value = {}
    resetOnGoingConv()
    await loadChatsList()
  },
  { immediate: true }
)

watch(
  conversations,
  () => {
    if (isProcessing.value) {
      scrollController.scrollToBottom()
    }
  },
  { deep: true, flush: 'post' }
)

const toggleSidebar = () => {
  chatUIStore.toggleSidebar()
}

const buildExportPayload = () => ({
  chatTitle: threads.value.find((item) => item.id === currentChatId.value)?.title || '新对话',
  agentName: props.assistantName,
  agentDescription: '',
  messages: conversations.value ? JSON.parse(JSON.stringify(conversations.value)) : [],
  onGoingMessages: onGoingConvMessages.value
    ? JSON.parse(JSON.stringify(onGoingConvMessages.value))
    : []
})

defineExpose({
  getExportPayload: buildExportPayload
})
</script>

<style lang="less" scoped>
@import '@/assets/css/main.css';
@import '@/assets/css/animations.less';

.chat-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.chat {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-sizing: border-box;
  overflow-y: scroll;
  transition: all 0.3s ease;

  .chat-header {
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 10;
    height: var(--header-height);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 8px;

    .header__left,
    .header__right {
      display: flex;
      align-items: center;
    }
  }
}

.chat-examples {
  padding: 0 50px;
  text-align: center;
  position: absolute;
  bottom: 65%;
  width: 100%;
  z-index: 9;
  animation: slideInUp 0.5s ease-out;

  h1 {
    margin-bottom: 20px;
    font-size: 1.3rem;
    color: var(--gray-1000);
  }
}

.example-questions {
  margin-top: 16px;
  text-align: center;

  .example-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .example-chip {
    padding: 6px 12px;
    background: var(--gray-25);
    border-radius: 16px;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--gray-700);
    transition: all 0.15s ease;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.chat-loading {
  padding: 0 50px;
  text-align: center;
  position: absolute;
  top: 20%;
  width: 100%;
  z-index: 9;
  animation: slideInUp 0.5s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  span {
    color: var(--gray-700);
    font-size: 14px;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--gray-200);
    border-top-color: var(--main-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

.chat-box {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  flex-grow: 1;
  padding: 1rem 2rem;
  display: flex;
  flex-direction: column;
}

.conv-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-actions {
  display: flex;
  gap: 8px;
  margin: 4px 0 14px;

  .conversation-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--gray-200);
    background: var(--gray-0);
    color: var(--gray-700);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--gray-50);
      border-color: var(--gray-300);
    }

    &.danger {
      color: var(--color-error-600);
      border-color: var(--color-error-200);

      &:hover {
        background: var(--color-error-50);
        border-color: var(--color-error-300);
      }
    }
  }
}

.bottom {
  position: sticky;
  bottom: 0;
  width: 100%;
  margin: 0 auto;
  padding: 4px 2rem 0 2rem;
  background: var(--gray-0);
  z-index: 1000;

  .message-input-wrapper {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;

    .bottom-actions {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .note {
      font-size: small;
      color: var(--gray-300);
      margin: 4px 0;
      user-select: none;
    }
  }

  &.start-screen {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    bottom: auto;
    max-width: 800px;
    width: 90%;
    background: transparent;
    padding: 0;
    border-top: none;
    z-index: 100;
  }
}

.loading-dots {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.loading-dots div {
  width: 6px;
  height: 6px;
  background: linear-gradient(135deg, var(--main-color), var(--main-700));
  border-radius: 50%;
  animation: dotPulse 1.4s infinite ease-in-out both;
}

.loading-dots div:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots div:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots div:nth-child(3) {
  animation-delay: 0s;
}

.generating-status {
  display: flex;
  justify-content: flex-start;
  padding: 1rem 0;
  animation: fadeInUp 0.4s ease-out;
  transition: all 0.2s;
}

.generating-indicator {
  display: flex;
  align-items: center;
  padding: 0.75rem 0rem;

  .generating-text {
    margin-left: 12px;
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
