<template>
  <MessageInputComponent
    ref="inputRef"
    :model-value="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    :is-loading="isLoading"
    :disabled="disabled"
    :send-button-disabled="actualSendButtonDisabled"
    :placeholder="placeholder"
    @send="handleSend"
    @keydown="emit('keydown', $event)"
  >
    <template #top>
      <div v-if="pendingFiles.length > 0" class="pending-files">
        <div v-for="file in pendingFiles" :key="file.id" class="file-pill">
          <FileText :size="14" />
          <span class="name" :title="file.name">{{ file.name }}</span>
          <span class="size">{{ formatSize(file.size) }}</span>
          <button class="remove" type="button" @click.stop="removeFile(file.id)">
            <X :size="12" />
          </button>
        </div>
      </div>
    </template>

    <template #options-left v-if="supportsFileUpload">
      <label class="file-option" :class="{ disabled }">
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept=".txt,.md,.markdown,.json,.js,.ts,.vue,.html,.htm,.csv,.xml,.yml,.yaml,.pdf,.doc,.docx"
          :disabled="disabled"
          @change="handleFileChange"
          style="display: none"
        />
        <FileText :size="16" />
        <span>上传文件</span>
      </label>
    </template>
  </MessageInputComponent>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { FileText, X } from 'lucide-vue-next'
import MessageInputComponent from '@/components/MessageInputComponent.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  sendButtonDisabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '输入问题...' },
  supportsFileUpload: { type: Boolean, default: false },
  assistantId: { type: String, default: '' },
  threadId: { type: String, default: null },
  ensureThread: { type: Function, required: true }
})

const emit = defineEmits(['update:modelValue', 'send', 'keydown'])

const inputRef = ref(null)
const fileInputRef = ref(null)
const pendingFiles = ref([])

const actualSendButtonDisabled = computed(() => {
  if (props.disabled) return true
  if (props.isLoading) return false
  const hasText = !!String(props.modelValue || '').trim()
  const hasFiles = pendingFiles.value.length > 0
  return !(hasText || hasFiles)
})

const textExtensions = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'js',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'html',
  'htm',
  'csv',
  'xml',
  'yml',
  'yaml'
])

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const getFileExt = (name) => {
  const idx = String(name || '').lastIndexOf('.')
  if (idx < 0) return ''
  return String(name).slice(idx + 1).toLowerCase()
}

const isTextLikeFile = (file) => {
  if (String(file?.type || '').startsWith('text/')) return true
  return textExtensions.has(getFileExt(file?.name || ''))
}

const formatSize = (size) => {
  if (!Number.isFinite(size)) return '--'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const normalizeFilePayload = async (file) => {
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error(`文件 ${file.name} 超过 5MB 限制`)
  }

  let textExcerpt = ''
  if (isTextLikeFile(file)) {
    try {
      textExcerpt = (await file.text()).slice(0, 8000)
    } catch {
      textExcerpt = ''
    }
  }

  return {
    id: createLocalId(),
    name: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
    extension: getFileExt(file.name),
    text_excerpt: textExcerpt,
    type: 'document'
  }
}

const handleFileChange = async (event) => {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return

  const normalized = []
  for (const file of files) {
    try {
      const payload = await normalizeFilePayload(file)
      normalized.push(payload)
    } catch (error) {
      message.warning(error.message || `文件 ${file.name} 处理失败`)
    }
  }

  if (!normalized.length) return

  pendingFiles.value = [...pendingFiles.value, ...normalized]
  message.success(`已添加 ${normalized.length} 个文件`)
  inputRef.value?.closeOptions?.()
}

const removeFile = (fileId) => {
  pendingFiles.value = pendingFiles.value.filter((item) => item.id !== fileId)
}

const handleSend = async () => {
  if (!props.disabled && pendingFiles.value.length > 0 && !props.threadId) {
    await props.ensureThread(pendingFiles.value[0]?.name || '新的对话')
  }

  emit('send', {
    files: pendingFiles.value.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      mime_type: item.mime_type,
      extension: item.extension,
      text_excerpt: item.text_excerpt,
      type: item.type
    }))
  })

  pendingFiles.value = []
}

defineExpose({
  focus: () => inputRef.value?.focus?.(),
  closeOptions: () => inputRef.value?.closeOptions?.()
})
</script>

<style scoped lang="less">
.pending-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.file-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: 999px;
  padding: 4px 8px;
  max-width: 100%;

  .name {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--gray-800);
  }

  .size {
    font-size: 11px;
    color: var(--gray-500);
  }

  .remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--gray-500);
    cursor: pointer;
    padding: 0;
  }
}

.file-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--gray-700);
  cursor: pointer;

  &:hover {
    background: var(--gray-50);
    color: var(--main-color);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
