import { apiDelete } from './base'
import { useUserStore } from '@/stores/user'

const DEFAULT_DIFY_BASE_URL = import.meta.env.VITE_SIMPLE_DIFY_BASE_URL || '/mock-dify/v1'
const DEFAULT_DIFY_API_KEY =
  import.meta.env.VITE_SIMPLE_DIFY_API_KEY || import.meta.env.VITE_DIFY_API_KEY || 'app-local-mock-key'
const DEFAULT_DIFY_USER = import.meta.env.VITE_SIMPLE_DIFY_USER || 'simple-chat-user'

const normalizeBaseUrl = (baseUrl) => String(baseUrl || '').replace(/\/$/, '')

export const simpleChatApi = {
  /**
   * 发送 Dify 风格流式消息（SSE）
   * @param {string} assistantId
   * @param {Object} data
   * @param {Object} options
   * @returns {Promise<Response>}
   */
  sendMessage: (assistantId, data, options = {}) => {
    const { signal, headers: extraHeaders, ...restOptions } = options || {}

    const conversationId = data?.conversation_id || data?.config?.thread_id || data?.thread_id || ''
    const inputs = {
      ...(data?.inputs || {})
    }

    if (data?.image_content && !inputs.image_content) {
      inputs.image_content = data.image_content
    }

    const payload = {
      inputs,
      query: String(data?.query || ''),
      response_mode: String(data?.response_mode || 'streaming'),
      user: String(data?.user || (assistantId ? `simple-${assistantId}` : DEFAULT_DIFY_USER))
    }

    if (conversationId) {
      payload.conversation_id = conversationId
    }

    if (Array.isArray(data?.files) && data.files.length > 0) {
      payload.files = data.files
    }

    const baseUrl = normalizeBaseUrl(data?.base_url || DEFAULT_DIFY_BASE_URL)
    const endpoint = data?.endpoint || `${baseUrl}/chat-messages`
    const apiKey = String(data?.api_key || DEFAULT_DIFY_API_KEY || 'app-local-mock-key')

    const baseHeaders = {
      ...useUserStore().getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${apiKey}`
    }

    return fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
      headers: {
        ...baseHeaders,
        ...(extraHeaders || {})
      },
      ...restOptions
    })
  },

  /**
   * 获取会话历史（纯对话包装）
   * @param {string} assistantId
   * @param {string} threadId
   * @returns {Promise<any>}
   */
  getHistory: async (assistantId, threadId) => {
    const headers = useUserStore().getAuthHeaders()
    const resp = await fetch(`/api/chat/agent/${assistantId}/history?thread_id=${threadId}`, {
      method: 'GET',
      headers
    })
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`)
    }
    return resp.json()
  },

  /**
   * 删除会话中的指定消息
   * @param {string} threadId
   * @param {string[]} messageIds
   * @returns {Promise}
   */
  deleteThreadMessages: (threadId, messageIds = []) =>
    apiDelete(`/api/chat/thread/${threadId}/messages`, {
      body: JSON.stringify({
        message_ids: Array.isArray(messageIds) ? messageIds : []
      })
    })
}
