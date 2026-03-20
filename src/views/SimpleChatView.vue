<template>
  <div class="simple-chat-view">
    <SimpleNoAgentChatComponent assistant-id="simple-chat-assistant" assistant-name="AI助手">
      <template #header-right>
        <UserInfoComponent />
      </template>
    </SimpleNoAgentChatComponent>
  </div>
</template>

<script setup>
import SimpleNoAgentChatComponent from '@/components/simple-chat/SimpleNoAgentChatComponent.vue'
import UserInfoComponent from '@/components/UserInfoComponent.vue'
</script>

<style lang="less" scoped>
.simple-chat-view {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}
</style>
