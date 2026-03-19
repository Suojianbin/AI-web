<template>
  <div class="demo">
    <div class="cfg">
      <input v-model="baseUrl" placeholder="https://api.dify.ai/v1" />
      <input v-model="apiKey" placeholder="app-xxxx" />
      <input v-model="userId" placeholder="demo-user" />
      <button @click="resetConversation">新对话</button>
    </div>

    <div ref="listRef" class="list">
      <div v-for="(m, i) in messages" :key="i" class="row" :class="m.role">
        <div class="bubble">
          <pre>{{ m.content }}</pre>
          <div v-if="m.role === 'assistant' && m.streamStats" class="meta">
            <span class="pill" :class="m.streamStats.status">{{ m.streamStats.status }}</span>
            <span v-if="m.streamStats.totalTokens !== null">
              Token {{ m.streamStats.promptTokens ?? 0 }}/{{ m.streamStats.completionTokens ?? 0 }}/{{ m.streamStats.totalTokens }}
            </span>
            <span v-if="m.streamStats.ttfb !== null">TTFB {{ fmtSec(m.streamStats.ttfb) }}</span>
            <span v-if="m.streamStats.latency !== null">生成耗时 {{ fmtSec(m.streamStats.latency) }}</span>
            <span v-if="m.streamStats.totalTime !== null">总耗时 {{ fmtSec(m.streamStats.totalTime) }}</span>
            <span v-if="m.streamStats.totalPrice !== null">费用 {{ fmtPrice(m.streamStats.totalPrice, m.streamStats.currency) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="input">
      <textarea
        v-model="input"
        :disabled="isSending"
        placeholder="Enter 发送，Shift+Enter 换行"
        @keydown="onKeydown"
      />
      <button class="send" :class="{ stop: isSending }" @click="onSendOrStop">
        {{ isSending ? "停止" : "发送" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref } from "vue";

const baseUrl = ref("https://api.dify.ai/v1");
const apiKey = ref("");
const userId = ref("demo-user");

const input = ref("");
const isSending = ref(false);
const conversationId = ref(null);
const messages = ref([]);
const listRef = ref(null);
const controller = ref(null);

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const fmtSec = (v) => `${Number(v).toFixed(3)}s`;
const fmtPrice = (p, c) => `${Number(p).toFixed(6)} ${c || ""}`.trim();

const createStats = () => ({
  status: "streaming",
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  ttfb: null,
  latency: null,
  totalTime: null,
  totalPrice: null,
  currency: null
});

const applyUsage = (stats, usage) => {
  if (!usage) return;
  if (toNum(usage.prompt_tokens) !== null) stats.promptTokens = toNum(usage.prompt_tokens);
  if (toNum(usage.completion_tokens) !== null) stats.completionTokens = toNum(usage.completion_tokens);
  if (toNum(usage.total_tokens) !== null) stats.totalTokens = toNum(usage.total_tokens);
  if (toNum(usage.time_to_first_token) !== null) stats.ttfb = toNum(usage.time_to_first_token);
  if (toNum(usage.latency) !== null) stats.latency = toNum(usage.latency);
  if (toNum(usage.total_price) !== null) stats.totalPrice = toNum(usage.total_price);
  if (usage.currency) stats.currency = usage.currency;
};

const scrollBottom = async () => {
  await nextTick();
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight;
};

const parseSSEBlock = (block) => {
  const dataLines = block
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trimStart());
  if (!dataLines.length) return null;
  const txt = dataLines.join("\n").trim();
  if (!txt || txt === "[DONE]") return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
};

const applyEvent = (ev, assistantMsg) => {
  if (ev.conversation_id) conversationId.value = ev.conversation_id;

  if (ev.event === "message") {
    if (ev.answer) assistantMsg.content += ev.answer;
    return;
  }

  if (ev.event === "message_end") {
    applyUsage(assistantMsg.streamStats, ev.metadata?.usage);
    assistantMsg.streamStats.status = "finished";
    return;
  }

  if (ev.event === "workflow_finished") {
    if (toNum(ev.data?.elapsed_time) !== null) assistantMsg.streamStats.totalTime = toNum(ev.data.elapsed_time);
    if (toNum(ev.data?.total_tokens) !== null && assistantMsg.streamStats.totalTokens == null) {
      assistantMsg.streamStats.totalTokens = toNum(ev.data.total_tokens);
    }
    if (assistantMsg.streamStats.status === "streaming") assistantMsg.streamStats.status = "finished";
    return;
  }

  if (ev.event === "error") {
    throw new Error(ev.message || "stream error");
  }
};

const send = async () => {
  const text = input.value.trim();
  if (!text || isSending.value) return;
  if (!apiKey.value.trim()) {
    alert("请填写 API Key");
    return;
  }

  messages.value.push({ role: "user", content: text });
  const assistantMsg = { role: "assistant", content: "", streamStats: createStats() };
  messages.value.push(assistantMsg);
  input.value = "";

  isSending.value = true;
  controller.value = new AbortController();
  await scrollBottom();

  const payload = {
    inputs: {},
    query: text,
    response_mode: "streaming",
    user: userId.value || "demo-user"
  };
  if (conversationId.value) payload.conversation_id = conversationId.value;

  try {
    const resp = await fetch(`${baseUrl.value.replace(/\/$/, "")}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.value.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.value.signal
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(t || `HTTP ${resp.status}`);
    }
    if (!resp.body) throw new Error("empty stream body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let idx = buffer.indexOf("\n\n");
      while (idx !== -1) {
        const block = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (block) {
          const ev = parseSSEBlock(block);
          if (ev) applyEvent(ev, assistantMsg);
        }
        idx = buffer.indexOf("\n\n");
      }
      await scrollBottom();
    }

    const tail = parseSSEBlock(buffer.trim());
    if (tail) applyEvent(tail, assistantMsg);

    if (!assistantMsg.content.trim()) assistantMsg.content = "Dify 返回为空";
    if (assistantMsg.streamStats.status === "streaming") assistantMsg.streamStats.status = "finished";
  } catch (err) {
    if (err?.name === "AbortError") {
      if (!assistantMsg.content.trim()) assistantMsg.content = "已停止生成";
      assistantMsg.streamStats.status = "stopped";
    } else {
      assistantMsg.content += `\n\n请求失败：${err.message || String(err)}`;
      assistantMsg.streamStats.status = "error";
    }
  } finally {
    isSending.value = false;
    controller.value = null;
    await scrollBottom();
  }
};

const onSendOrStop = () => {
  if (isSending.value && controller.value) {
    controller.value.abort();
    return;
  }
  send();
};

const onKeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSendOrStop();
  }
};

const resetConversation = () => {
  conversationId.value = null;
  messages.value = [];
};
</script>

<style scoped>
.demo { max-width: 980px; margin: 0 auto; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
.cfg { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 12px; }
.cfg input, .cfg button { height: 36px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 10px; }
.cfg button { background: #0f172a; color: #fff; border: 0; }
.list { height: 56vh; overflow: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #fff; }
.row { display: flex; margin: 10px 0; }
.row.user { justify-content: flex-end; }
.bubble { max-width: 82%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; background: #fff; }
.row.user .bubble { background: #f1f5f9; }
pre { margin: 0; white-space: pre-wrap; line-height: 1.6; }
.meta { margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 12px; color: #64748b; display: flex; flex-wrap: wrap; gap: 8px; }
.pill { padding: 2px 8px; border-radius: 999px; border: 1px solid #cbd5e1; font-weight: 600; }
.pill.streaming { background: #e0f2fe; color: #075985; }
.pill.finished { background: #dcfce7; color: #166534; }
.pill.stopped { background: #fee2e2; color: #991b1b; }
.pill.error { background: #ffe4e6; color: #9f1239; }
.input { margin-top: 12px; display: flex; gap: 8px; }
textarea { flex: 1; min-height: 72px; border-radius: 12px; border: 1px solid #cbd5e1; padding: 10px; }
.send { width: 96px; border: 0; border-radius: 12px; background: #0f172a; color: #fff; }
.send.stop { background: #b91c1c; }
</style>
