<template>
  <div class="chat">
    <!-- 加载状态：加载消息 -->
      <div v-if="isLoadingMessages" class="chat-loading">
        <div class="loading-spinner"></div>
        <span>正在加载消息...</span>
      </div>

      <div v-else-if="!conversations.length" class="chat-examples">
        <div style="margin-bottom: 150px"></div>
        <h1>您好，我是{{ currentAgentName }}！</h1>
      </div>
      <div class="chat-box" ref="messagesContainer">
        <div class="conv-box" v-for="(conv, index) in conversations" :key="index">
          <AgentMessageComponent
            v-for="(message, msgIndex) in conv.messages"
            :message="message"
            :key="msgIndex"
            :is-processing="
              isProcessing && conv.status === 'streaming' && msgIndex === conv.messages.length - 1
            "
            :show-refs="true"
            @retry="retryMessage(message)"
          >
          </AgentMessageComponent>
          <!-- 显示对话最后一个消息使用的模型 -->
          <RefsComponent
            v-if="shouldShowRefs(conv)"
            :message="getLastMessage(conv)"
            :show-refs="['model', 'copy']"
            :is-latest-message="false"
          />
        </div>

        <!-- 生成中的加载状态 - 增强条件支持主聊天和resume流程 -->
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
          <AgentInputArea
            ref="messageInputRef"
            v-model="userInput"
            :is-loading="isProcessing"
            :disabled="!currentAgent"
            :send-button-disabled="(!userInput || !currentAgent) && !isProcessing"
            placeholder="输入问题..."
            :supports-file-upload="supportsFileUpload"
            :agent-id="currentAgentId"
            :thread-id="currentChatId"
            :ensure-thread="ensureActiveThread"
            @send="handleSendOrStop"
          />

          <!-- 示例问题 -->
          <div
            class="example-questions"
            v-if="!conversations.length && exampleQuestions.length > 0"
          >
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
</template>
<script setup>  
import { message } from 'ant-design-vue'
import RefsComponent from '@/components/RefsComponent.vue'
import AgentInputArea from '@/components/AgentInputArea.vue'
import AgentMessageComponent from '@/components/AgentMessageComponent.vue'
import { ref,computed } from 'vue'

const currentAgent = ref(true) // 模拟当前有可用的智能助手
const currentAgentId = ref(null)
const currentChatId = ref(null)
const ensureActiveThread = ref(true)
const supportsFileUpload = ref(false)
const isLoadingMessages = ref(false)
const conversations = ref([{messages: [
        {
            "id": "human-739023d3",
            "type": "human",
            "content": "fgd",
            "created_at": "2026-03-13T08:07:49.893Z"
        },
        {
            "id": "ai-9fd57635",
            "type": "ai",
            "content": "这是来自 report-writer 的 mock 回复：已收到你的问题“fgd”，当前前端运行在独立演示模式。",
            "created_at": "2026-03-13T08:07:49.893Z",
            "tool_calls": []
        },
        {
            "id": "human-705ab91c",
            "type": "human",
            "content": "fgdgfdgfdgfd",
            "created_at": "2026-03-13T08:52:02.216Z"
        },
        {
            "id": "ai-bb86c1a0",
            "type": "ai",
            "content": "这是来自 report-writer 的 mock 回复：已收到你的问题“fgdgfdgfdgfd”，当前前端运行在独立演示模式。",
            "created_at": "2026-03-13T08:52:02.216Z",
            "tool_calls": []
        },
        {
            "id": "human-50d88d6e",
            "type": "human",
            "content": "fgfdgfdgfdg",
            "created_at": "2026-03-13T08:52:05.726Z"
        },
        {
            "id": "ai-27f67f26",
            "type": "ai",
            "content": "这是来自 report-writer 的 mock 回复：已收到你的问题“fgfdgfdgfdg”，当前前端运行在独立演示模式。",
            "created_at": "2026-03-13T08:52:05.726Z",
            "tool_calls": []
        }
    ]}])
const userInput = ref('')
const isProcessing = ref(false)
const approvalState = ref({
  showModal: false,
  question: '',
  operation: ''
})
const currentAgentName = ref('智能助手')
const exampleQuestions = ref([
  { id: 1, text: '今天天气怎么样？' },
  { id: 2, text: '帮我写一封邮件给老板请假。' },
  { id: 3, text: '解释一下量子计算的基本原理。' }
])

// 计算是否显示Refs组件的条件
const shouldShowRefs = computed(() => {
  return (conv) => {
    return (
      getLastMessage(conv) &&
      conv.status !== 'streaming' &&
      !approvalState.showModal &&
      !(isProcessing.value && conv.status === 'streaming')
    )
  }
})
const getLastMessage = (conv) => {
  if (!conv?.messages?.length) return null
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].type === 'ai') return conv.messages[i]
  }
  return null
}
</script>
<style lang="less" scoped>
@import '@/assets/css/main.css';
@import '@/assets/css/animations.less';
.chat{
    height: 100vh;
    position: relative;      
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    position: relative;
    box-sizing: border-box;
    overflow-y: scroll;
    transition: all 0.3s ease;
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

  p {
    font-size: 1.1rem;
    color: var(--gray-700);
  }

  .agent-icons {
    height: 180px;
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
    // border: 1px solid var(--gray-100);
    border-radius: 16px;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--gray-700);
    transition: all 0.15s ease;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      // background: var(--main-25);
      border-color: var(--main-200);
      color: var(--main-700);
      box-shadow: 0 0px 4px rgba(0, 0, 0, 0.03);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
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
    z-index: 100; /* Ensure it's above other elements */
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
    letter-spacing: 0.025em;
    /* 恢复灰色调：深灰 -> 亮灰(高光) -> 深灰 */
    background: linear-gradient(
      90deg,
      var(--gray-700) 0%,
      var(--gray-700) 40%,
      var(--gray-300) 45%,
      var(--gray-200) 50%,
      var(--gray-300) 55%,
      var(--gray-700) 60%,
      var(--gray-700) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: waveFlash 2s linear infinite;
  }
}

@keyframes waveFlash {
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
}

@media (max-width: 1800px) {
  .chat-header {
    background-color: var(--gray-0);
    border-bottom: 1px solid var(--gray-100);
  }
}

@media (max-width: 768px) {
  .chat-header {
    .header__left {
      .text {
        display: none;
      }
    }
  }
}
</style>

<style lang="less">
.agent-nav-btn {
  display: flex;
  gap: 10px;
  padding: 6px 8px;
  height: 32px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  color: var(--gray-900);
  cursor: pointer;
  width: auto;
  font-size: 15px;
  transition: background-color 0.3s;
  border: none;
  background: transparent;

  &:hover:not(.is-disabled) {
    background-color: var(--gray-100);
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.7;
    pointer-events: none;
  }

  .nav-btn-icon {
    height: 18px;
  }

  .loading-icon {
    animation: spin 1s linear infinite;
  }
}

/* AgentState 按钮有内容时的样式 */
.agent-nav-btn.agent-state-btn.has-content:hover:not(.is-disabled) {
  color: var(--main-700);
  background-color: var(--main-20);
}
</style>