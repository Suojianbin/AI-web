<template>
  <div class="file-preview-container">
    <div class="preview-header">
      <span class="file-name">📄 {{ fileName }}</span>
      <div class="tools">
        <button v-if="mode === 'pdf'" @click="printPdf">打印 PDF</button>
      </div>
    </div>

    <div class="view-body">
      <img v-if="mode === 'image'" :src="fileUrl" class="img-render" />

      <vue-pdf-embed v-else-if="mode === 'pdf'" :source="fileUrl" class="pdf-render" />

      <div v-else-if="mode === 'word'" ref="wordRef" class="docx-render"></div>

      <div v-else-if="mode === 'ofd'" ref="ofdRef" class="ofd-render"></div>

      <div v-else-if="mode === 'markdown'" class="markdown-body" v-html="renderData"></div>

      <div v-else-if="mode === 'excel'" class="excel-render" v-html="renderData"></div>

      <iframe v-else-if="mode === 'html'" :srcdoc="renderData" class="html-render"></iframe>

      <div v-else class="unsupported">无法预览此格式，请下载后查看</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { renderAsync } from 'docx-preview';
import { parseOfdDocument, renderOfdByIndex, openOFDBaseViewer } from 'ofd.js';
import MarkdownIt from 'markdown-it';
import * as XLSX from 'xlsx'; // 引入 Excel 处理
import VuePdfEmbed from 'vue-pdf-embed';
// 引入刚刚安装的 CSS
import 'github-markdown-css/github-markdown.css';

const props = defineProps({
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  ofdSecret: { type: String, default: '' },
  ofdDigest: { type: String, default: '' }
});
const renderData = ref('');
const wordRef = ref(null);
const ofdRef = ref(null);
const md = new MarkdownIt();
const resolvedOfdSecret = computed(() => props.ofdSecret || import.meta.env.VITE_OFD_SECRET || '');
const resolvedOfdDigest = computed(() => props.ofdDigest || import.meta.env.VITE_OFD_DIGEST || '');

const mode = computed(() => {
  const ext = props.fileName?.split('.').pop().toLowerCase();
  const map = {
    pdf: 'pdf', docx: 'word', ofd: 'ofd', md: 'markdown',
    html: 'html', htm: 'html', xlsx: 'excel', xls: 'excel', csv: 'excel'
  };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  return map[ext] || 'unknown';
});

const loadFile = async () => {
  if (!props.fileUrl) return;
  const res = await fetch(props.fileUrl);
  if (!res.ok) {
    const message = `文件加载失败: HTTP ${res.status}`;
    if (mode.value === 'ofd' && ofdRef.value) {
      ofdRef.value.innerHTML = message;
    } else {
      renderData.value = message;
    }
    return;
  }
  
  // 策略渲染
  if (mode.value === 'word') {
    renderAsync(await res.blob(), wordRef.value);
  } 
  else if (mode.value === 'excel') {
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    // 将 Excel 转为 HTML Table
    renderData.value = XLSX.utils.sheet_to_html(firstSheet);
  }
  else if (mode.value === 'markdown') {
    renderData.value = md.render(await res.text());
  }
  else if (mode.value === 'ofd') {
    const target = ofdRef.value;
    if (!target) return;
    target.innerHTML = '正在加载 OFD...';

    try {
      const buffer = await res.arrayBuffer();

      // parseOfdDocument 通过回调通知结果，这里包装成 Promise 方便 await
      const ofdCore = await new Promise((resolve, reject) => {
        parseOfdDocument({
          ofd: buffer,
          secret: resolvedOfdSecret.value || undefined,
          digest: resolvedOfdDigest.value || undefined,
          success: (core) => resolve(core),
          fail: (err) => reject(err)
        });
      });

      // 优先从解析后的 ofdCore 读取页数，避免依赖不稳定的外部导出函数
      const trustedPageCount = Number(ofdCore?.getOFDPageCount?.(0)) || 0;
      // 兜底：个别版本可能拿不到页数，按页尝试上限扫描
      const pageCount = trustedPageCount || 200;
      const pageNodes = [];
      let successPages = 0;
      for (let i = 0; i < pageCount; i += 1) {
        try {
          const node = renderOfdByIndex(0, i, 1200);
          if (node) {
            pageNodes.push(node);
            successPages += 1;
          } else if (!trustedPageCount && successPages > 0) {
            // 兜底扫描模式下，出现空页通常意味着已到文末
            break;
          }
        } catch (pageErr) {
          if (!trustedPageCount) {
            // 兜底扫描模式下：
            // 1) 第一页就报错，交给后续基础预览器兜底；
            // 2) 已经成功渲染过，认为后续为越界，停止扫描。
            if (successPages > 0) break;
            throw pageErr;
          }
          console.warn(`OFD 第 ${i + 1} 页渲染失败:`, pageErr);
          const fallbackPage = document.createElement('div');
          fallbackPage.style.margin = '20px auto';
          fallbackPage.style.padding = '20px';
          fallbackPage.style.border = '1px dashed #f59e0b';
          fallbackPage.style.background = '#fff7ed';
          fallbackPage.style.color = '#9a3412';
          fallbackPage.textContent = `第 ${i + 1} 页渲染失败，已跳过`;
          pageNodes.push(fallbackPage);
        }
      }
      target.innerHTML = '';

      pageNodes.forEach((node) => {
        node.style.margin = '20px auto';
        node.style.position = 'relative';
        node.style.overflow = 'visible';

        const svg = node.querySelector('svg');
        if (svg) {
          svg.setAttribute('shape-rendering', 'geometricPrecision');
        }

        target.appendChild(node);
      });

      // 如果所有页都失败，切换到 ofd.js 内置基础预览器再试一次
      if (pageCount > 0 && successPages === 0) {
        if (typeof openOFDBaseViewer === 'function') {
          target.innerHTML = '常规渲染失败，正在切换 OFD 基础预览模式...';
          openOFDBaseViewer({
            ofd: buffer,
            container: target,
            width: Math.max(target.clientWidth || 0, 900),
            secret: resolvedOfdSecret.value || undefined,
            digest: resolvedOfdDigest.value || undefined,
            parserOFDFail: (msg) => {
              target.innerHTML = `OFD 基础预览失败：${msg}`;
            }
          });
        } else {
          target.innerHTML = 'OFD 常规渲染失败，且基础预览器不可用';
        }
        return;
      }

      if (!pageNodes.length) {
        target.innerHTML = 'OFD 解析完成，但未检测到可渲染页面';
      }
    } catch (e) {
      console.error('OFD 加载异常:', e);
      const message = e instanceof Error ? e.message : String(e || '未知异常');
      if (message.includes('授权信息错误') || message.includes('授权时间过期')) {
        target.innerHTML = 'OFD 授权失败：请配置有效的 secret/digest（支持 props 或 VITE_OFD_SECRET / VITE_OFD_DIGEST）';
        return;
      }
      target.innerHTML = `OFD 解析失败：${message}`;
    }
  }
  else if (mode.value === 'html') {
    renderData.value = await res.text();
  }
};

onMounted(loadFile);
watch(() => props.fileUrl, loadFile);
</script>

<style scoped>
.file-preview-container { height: 100%; display: flex; flex-direction: column; background: #f9f9f9; }
.preview-header { padding: 8px 15px; background: #fff; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
.view-body { flex: 1; overflow: auto; padding: 20px; display: flex; justify-content: center; }

/* 文档类容器通用样式 */
.docx-render, .ofd-render, .markdown-body, .excel-render {
  background: #fff;
  width: 100%;
  max-width: 900px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  min-height: 100%;
}

/* Excel 特殊处理：让生成的 table 美观 */
:deep(.excel-render table) {
  border-collapse: collapse;
  width: 100%;
}
:deep(.excel-render td) {
  border: 1px solid #ddd;
  padding: 8px;
}

.img-render { max-width: 100%; align-self: flex-start; }
.html-render { width: 100%; height: 100%; border: none; background: #fff; }
</style>
