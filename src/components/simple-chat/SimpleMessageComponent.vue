<template>
  <div class="message-box" :class="[message.type, customClasses]">
    <div
      v-if="message.type === 'human'"
      class="message-copy-btn human-copy"
      @click="copyHumanContent"
      :class="{ 'is-copied': isHumanCopied }"
      title="复制"
    >
      <Check v-if="isHumanCopied" :size="14" />
      <Copy v-else :size="14" />
    </div>

    <p v-if="message.type === 'human'" class="message-text">{{ message.content }}</p>

    <p v-else-if="message.type === 'system'" class="message-text-system">{{ message.content }}</p>

    <div v-else-if="message.type === 'ai'" class="assistant-message">
      <div class="message-md markdown-body" @click="handleMarkdownClick" v-html="renderedContent"></div>
      <span v-if="isProcessing" class="typing-cursor" aria-hidden="true"></span>
    </div>

    <p v-else class="message-text">{{ message.content }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Copy, Check } from 'lucide-vue-next'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import 'github-markdown-css/github-markdown.css'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

const props = defineProps({
  message: { type: Object, required: true },
  isProcessing: { type: Boolean, default: false },
  customClasses: { type: Object, default: () => ({}) },
  showRefs: { type: [Array, Boolean], default: () => false },
  isLatestMessage: { type: Boolean, default: false },
  debugMode: { type: Boolean, default: false }
})

const isHumanCopied = ref(false)
const codeStore = ref(new Map())

const normalizeStreamingMarkdown = (text) => {
  if (!text) return ''
  return String(text).replace(/\r\n/g, '\n')
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true
})

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

const buildCodeBlockHtml = (code, lang, codeId) => {
  const language = (lang || '').trim().toLowerCase()
  const label = language || 'text'
  let highlighted = md.utils.escapeHtml(code)

  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value
    } catch {
      highlighted = md.utils.escapeHtml(code)
    }
  }

  return [
    '<div class="simple-code-block">',
    '  <div class="simple-code-header">',
    `    <span class="simple-code-lang">${md.utils.escapeHtml(label)}</span>`,
    `    <button class="simple-code-copy-btn" type="button" data-code-id="${codeId}">复制代码</button>`,
    '  </div>',
    `  <pre class="simple-code-pre"><code class="hljs">${highlighted}</code></pre>`,
    '</div>'
  ].join('\n')
}

const renderMarkdown = (content) => {
  const nextCodeStore = new Map()
  let codeIndex = 0
  const originFence = md.renderer.rules.fence

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = token.info || ''
    const lang = info.trim().split(/\s+/)[0]
    const code = token.content || ''
    const codeId = `code-${Date.now()}-${codeIndex++}`
    nextCodeStore.set(codeId, code)
    return buildCodeBlockHtml(code, lang, codeId)
  }

  let html = ''
  try {
    html = md.render(normalizeStreamingMarkdown(content))
  } finally {
    md.renderer.rules.fence = originFence
  }

  codeStore.value = nextCodeStore
  return html
}

const renderedContent = computed(() => {
  const content = props.message?.content || ''
  if (!content) return ''
  try {
    return renderMarkdown(content)
  } catch {
    return `<p>${md.utils.escapeHtml(String(content))}</p>`
  }
})

const copyText = async (text) => {
  const content = String(text || '')
  if (!content) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
      return true
    }
  } catch {
    // fallback
  }

  const textArea = document.createElement('textarea')
  textArea.value = content
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textArea)
  return ok
}

const copyHumanContent = async () => {
  const ok = await copyText(props.message?.content || '')
  if (!ok) return
  isHumanCopied.value = true
  setTimeout(() => {
    isHumanCopied.value = false
  }, 1500)
}

const handleMarkdownClick = async (event) => {
  const button = event?.target?.closest?.('.simple-code-copy-btn')
  if (!button) return

  const codeId = button.getAttribute('data-code-id')
  if (!codeId) return

  const rawCode = codeStore.value.get(codeId)
  if (typeof rawCode !== 'string') return

  const ok = await copyText(rawCode)
  if (!ok) return

  const oldText = button.textContent
  button.textContent = '已复制'
  button.classList.add('copied')
  window.setTimeout(() => {
    button.textContent = oldText || '复制代码'
    button.classList.remove('copied')
  }, 1200)
}

</script>

<style lang="less" scoped>
.message-box {
  display: inline-block;
  border-radius: 1.5rem;
  margin: 0.8rem 0;
  padding: 0.625rem 1.25rem;
  user-select: text;
  word-break: break-word;
  word-wrap: break-word;
  font-size: 15px;
  line-height: 24px;
  box-sizing: border-box;
  color: var(--gray-1000);
  max-width: 100%;
  position: relative;
  letter-spacing: 0.25px;

  &.human,
  &.sent {
    max-width: 95%;
    color: var(--gray-1000);
    background-color: var(--main-50);
    align-self: flex-end;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
  }

  &.assistant,
  &.received,
  &.ai {
    color: initial;
    width: 100%;
    text-align: left;
    margin: 0;
    padding: 0;
    background-color: transparent;
    border-radius: 0;
  }
}

.assistant-message {
  width: 100%;
}

.message-text {
  max-width: 100%;
  margin-bottom: 0;
  white-space: pre-line;
}

.message-text-system {
  max-width: 100%;
  margin-bottom: 0;
  white-space: pre-line;
  color: var(--gray-600);
  font-style: italic;
  font-size: 14px;
  padding: 8px 12px;
  background-color: var(--gray-50);
  border-left: 3px solid var(--gray-300);
  border-radius: 4px;
}

.message-copy-btn {
  cursor: pointer;
  color: var(--gray-400);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  flex-shrink: 0;

  &:hover {
    color: var(--main-color);
  }

  &.is-copied {
    color: var(--color-success-500);
    opacity: 1;
  }

  &.human-copy {
    position: absolute;
    left: -28px;
    bottom: 8px;
  }
}

.message-box:hover .message-copy-btn {
  opacity: 1;
}

.typing-cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  margin-left: 4px;
  vertical-align: -3px;
  background: var(--main-color);
  border-radius: 2px;
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

:deep(.markdown-body) {
  margin: 8px 0;
  color: var(--gray-1000);
  background: transparent !important;
}

:deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}

:deep(.markdown-body a) {
  color: var(--main-700);
}

:deep(.markdown-body code) {
  font-size: 13px;
  font-family:
    'Menlo', 'Monaco', 'Consolas', 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei',
    'Courier New', monospace;
}

:deep(.markdown-body .simple-code-block) {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--gray-200);
  margin: 14px 0;
}

:deep(.markdown-body .simple-code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
  padding: 6px 10px;
}

:deep(.markdown-body .simple-code-lang) {
  font-size: 12px;
  color: var(--gray-600);
}

:deep(.markdown-body .simple-code-copy-btn) {
  border: 1px solid var(--gray-250);
  background: var(--gray-0);
  color: var(--gray-700);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1;
  padding: 5px 8px;
  cursor: pointer;
}

:deep(.markdown-body .simple-code-copy-btn:hover) {
  border-color: var(--main-color);
  color: var(--main-color);
}

:deep(.markdown-body .simple-code-copy-btn.copied) {
  border-color: var(--color-success-500);
  color: var(--color-success-500);
}

:deep(.markdown-body .simple-code-pre) {
  margin: 0;
  border-radius: 0;
  background: #333;
  overflow-x: auto;
}

:deep(.markdown-body .simple-code-pre code.hljs) {
  background: transparent !important;
  display: block;
  padding: 12px 14px;
}

:deep(.markdown-body :not(.simple-code-block) pre) {
  background: var(--gray-25);
}
</style>
