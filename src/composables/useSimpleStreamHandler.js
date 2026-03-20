import { message } from 'ant-design-vue'
import { handleChatError } from '@/utils/errorHandler'
import { unref } from 'vue'

const processJsonLineStreamResponse = async (response, onChunk) => {
  if (!response || !response.body) {
    console.warn('Invalid response or missing body for stream processing')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let stopProcessing = false

  try {
    while (!stopProcessing) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        try {
          const chunk = JSON.parse(trimmedLine)
          if (onChunk && (await onChunk(chunk))) {
            stopProcessing = true
            break
          }
        } catch (e) {
          console.warn('Failed to parse stream chunk JSON:', e, 'Line:', trimmedLine)
        }
      }
    }

    if (!stopProcessing && buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer.trim())
        if (onChunk) {
          await onChunk(chunk)
        }
      } catch (e) {
        console.warn('Failed to parse final stream chunk JSON:', e)
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore
    }
  }
}

const parseSSEBlock = (block) => {
  if (!block) return null

  const dataLines = []
  let eventName = ''
  const lines = block.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) continue

    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (!dataLines.length) {
    return eventName ? { eventName, data: null } : null
  }

  const dataText = dataLines.join('\n').trim()
  if (!dataText || dataText === '[DONE]') {
    return { eventName: eventName || 'done', data: null }
  }

  try {
    return {
      eventName,
      data: JSON.parse(dataText)
    }
  } catch (e) {
    console.warn('Failed to parse SSE data JSON:', e, 'Data:', dataText)
    return null
  }
}

const processSSEStreamResponse = async (response, onEvent) => {
  if (!response || !response.body) {
    console.warn('Invalid response or missing body for SSE processing')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let stopProcessing = false

  try {
    while (!stopProcessing) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

      let boundaryIndex = buffer.indexOf('\n\n')
      while (boundaryIndex !== -1) {
        const block = buffer.slice(0, boundaryIndex).trim()
        buffer = buffer.slice(boundaryIndex + 2)

        if (block) {
          const packet = parseSSEBlock(block)
          if (packet && onEvent && (await onEvent(packet))) {
            stopProcessing = true
            break
          }
        }

        boundaryIndex = buffer.indexOf('\n\n')
      }
    }

    if (!stopProcessing && buffer.trim()) {
      const packet = parseSSEBlock(buffer.trim())
      if (packet && onEvent) {
        await onEvent(packet)
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // ignore
    }
  }
}

export function useSimpleStreamHandler({
  getThreadState,
  enableTypewriter = false,
  typewriterIntervalMs = 16,
  typewriterCharsPerTick = 4
}) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const appendLoadingChunk = async (threadState, msg) => {
    if (!msg?.id) return

    if (!threadState.onGoingConv.msgChunks[msg.id]) {
      threadState.onGoingConv.msgChunks[msg.id] = []
    }

    const content = typeof msg.content === 'string' ? msg.content : ''
    const shouldTypewriter =
      unref(enableTypewriter) && msg.type === 'AIMessageChunk' && content.length > typewriterCharsPerTick

    if (!shouldTypewriter) {
      threadState.onGoingConv.msgChunks[msg.id].push(msg)
      return
    }

    for (let start = 0; start < content.length; start += typewriterCharsPerTick) {
      threadState.onGoingConv.msgChunks[msg.id].push({
        ...msg,
        content: content.slice(start, start + typewriterCharsPerTick)
      })
      await sleep(typewriterIntervalMs)
    }
  }

  const ensureAssistantBucket = (threadState, messageId) => {
    if (!messageId) return null
    if (!threadState.onGoingConv.msgChunks[messageId]) {
      threadState.onGoingConv.msgChunks[messageId] = [
        {
          id: messageId,
          type: 'AIMessageChunk',
          content: ''
        }
      ]
    }
    return messageId
  }

  const handleLegacyStreamChunk = async (chunk, threadId) => {
    const { status, msg, request_id, message: chunkMessage } = chunk
    const threadState = getThreadState(threadId)
    if (!threadState) return false

    switch (status) {
      case 'init':
        threadState.onGoingConv.msgChunks[request_id] = [msg]
        return false

      case 'loading':
        await appendLoadingChunk(threadState, msg)
        return false

      case 'error':
        handleChatError({ message: chunkMessage }, 'stream')
        threadState.isStreaming = false
        if (threadState.streamAbortController) {
          threadState.streamAbortController.abort()
          threadState.streamAbortController = null
        }
        return true

      case 'human_approval_required':
        // 纯净版不进入审批流，直接结束本次流
        threadState.isStreaming = false
        message.info(chunkMessage || '检测到审批事件，纯对话模式已跳过')
        return true

      case 'finished':
        threadState.isStreaming = false
        return true

      case 'interrupted':
        threadState.isStreaming = false
        if (chunkMessage) {
          message.info(chunkMessage)
        }
        return true

      default:
        return false
    }
  }

  const handleDifyStreamEvent = async (packet, threadId) => {
    const threadState = getThreadState(threadId)
    if (!threadState) return false

    const { eventName = '', data } = packet || {}

    if (eventName === 'ping' && !data) {
      return false
    }

    if (!data || typeof data !== 'object') {
      return false
    }

    const event = String(data.event || eventName || '').trim()

    switch (event) {
      case 'workflow_started':
        if (data.message_id) {
          threadState.onGoingConv.currentAssistantKey = data.message_id
          ensureAssistantBucket(threadState, data.message_id)
        }
        return false

      case 'message': {
        const answerPiece = String(data.answer || '')
        if (!answerPiece) return false

        const messageId =
          data.id ||
          data.message_id ||
          threadState.onGoingConv.currentAssistantKey ||
          `dify-msg-${Date.now()}`

        threadState.onGoingConv.currentAssistantKey = messageId
        ensureAssistantBucket(threadState, messageId)

        await appendLoadingChunk(threadState, {
          id: messageId,
          type: 'AIMessageChunk',
          content: answerPiece,
          from_variable_selector: data.from_variable_selector
        })
        return false
      }

      case 'error':
        handleChatError({ message: data.message || 'Dify 流式返回错误' }, 'stream')
        threadState.isStreaming = false
        if (threadState.streamAbortController) {
          threadState.streamAbortController.abort()
          threadState.streamAbortController = null
        }
        return true

      case 'message_end':
      case 'workflow_finished':
        threadState.isStreaming = false
        return true

      default:
        // node_started / node_finished / workflow 中间事件在纯净聊天页中忽略
        return false
    }
  }

  const handleStreamChunk = async (chunk, threadId) => {
    if (chunk && typeof chunk === 'object' && 'status' in chunk) {
      return handleLegacyStreamChunk(chunk, threadId)
    }

    return handleDifyStreamEvent(chunk, threadId)
  }

  const handleStreamResponse = async (response, threadId, onChunk = null) => {
    const contentType = String(response?.headers?.get('content-type') || '').toLowerCase()
    const isSSE = contentType.includes('text/event-stream')

    if (isSSE) {
      await processSSEStreamResponse(response, async (packet) => {
        if (onChunk) onChunk(packet)
        return await handleDifyStreamEvent(packet, threadId)
      })
      return
    }

    await processJsonLineStreamResponse(response, async (chunk) => {
      if (onChunk) onChunk(chunk)
      return await handleLegacyStreamChunk(chunk, threadId)
    })
  }

  return {
    handleStreamChunk,
    handleStreamResponse
  }
}
