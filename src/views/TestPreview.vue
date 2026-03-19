<template>
  <div class="test-wrapper">
    <div 
      class="upload-section" 
      @dragover.prevent 
      @drop.prevent="handleDrop"
      @click="triggerFileSelect"
    >
      <div class="upload-tip">
        <i class="icon">📂</i>
        <p>将文件拖到这里，或点击选择</p>
        <p class="ext-hint">支持: pdf, docx, ofd, xlsx, md, html, img</p>
      </div>
      <input 
        type="file" 
        ref="fileInput" 
        style="display: none" 
        @change="handleFileSelect" 
      />
    </div>

    <div class="main-preview">
      <FilePreview 
        v-if="currentFile.url" 
        :fileUrl="currentFile.url" 
        :fileName="currentFile.name" 
      />
      <div v-else class="empty-hero">
        <h2>Yuxi-Know 离线预览测试</h2>
        <p>请先在左侧上传文件</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import FilePreview from '../components/FilePreview.vue'; // 确保路径正确

const fileInput = ref(null);
const currentFile = reactive({
  url: '',
  name: ''
});

// 处理文件选择
const processFile = (file) => {
  if (!file) return;
  
  // 关键：释放之前的 Blob URL，防止内存泄漏
  if (currentFile.url) {
    URL.revokeObjectURL(currentFile.url);
  }

  currentFile.name = file.name;
  // 生成本地预览地址（无需经过后端，离线可用）
  currentFile.url = URL.createObjectURL(file);
};

const handleDrop = (e) => {
  const file = e.dataTransfer.files[0];
  processFile(file);
};

const handleFileSelect = (e) => {
  const file = e.target.files[0];
  processFile(file);
};

const triggerFileSelect = () => {
  fileInput.value.click();
};
</script>

<style scoped>
.test-wrapper {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: sans-serif;
}

.upload-section {
  width: 300px;
  background: #2c3e50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-right: 2px dashed #34495e;
  transition: background 0.3s;
}

.upload-section:hover {
  background: #34495e;
}

.upload-tip {
  text-align: center;
  padding: 20px;
}

.icon { font-size: 40px; display: block; margin-bottom: 10px; }
.ext-hint { font-size: 12px; color: #95a5a6; margin-top: 10px; }

.main-preview {
  flex: 1;
  background: #ecf0f1;
  overflow: hidden;
}

.empty-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #7f8c8d;
}
</style>