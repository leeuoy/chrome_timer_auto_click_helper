(function () {
  'use strict';

  /**
   * Background Service Worker 入口
   * 负责扩展安装/更新时的初始化、动态时钟图标绘制、content script 动态注入容错
   */

  /** content script bundle 文件名 */
  const CONTENT_SCRIPT_FILE = 'content.js';

  /**
   * 扩展安装或更新时的初始化处理
   */
  chrome.runtime.onInstalled.addListener((details) => {
    console.log(`[Chrome Timer] 扩展已${details.reason}，版本: ${chrome.runtime.getManifest().version}`);
  });

  /* ==================== 动态时钟图标 ==================== */

  /**
   * 通过直接操作像素数组绘制时钟图标
   * 不依赖 OffscreenCanvas，兼容所有 Chrome 版本
   * @param {number} size - 图标尺寸
   * @returns {ImageData|null}
   */
  function drawClockIcon(size) {
    try {
      const now = new Date();
      const hours = now.getHours() % 12;
      const minutes = now.getMinutes();

      /* 创建像素缓冲区 [R, G, B, A, R, G, B, A, ...] */
      const pixels = new Uint8ClampedArray(size * size * 4);
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.45;

      /**
       * 设置单个像素的颜色
       * @param {number} x - 像素 x 坐标
       * @param {number} y - 像素 y 坐标
       * @param {number} r - 红色 0-255
       * @param {number} g - 绿色 0-255
       * @param {number} b - 蓝色 0-255
       * @param {number} a - 透明度 0-255
       */
      function setPixel(x, y, r, g, b, a) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix >= size || iy < 0 || iy >= size) return;
        const idx = (iy * size + ix) * 4;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = a;
      }

      /**
       * 绘制抗锯齿线段（Wu 算法简化版）
       * @param {number} x0 - 起点 x
       * @param {number} y0 - 起点 y
       * @param {number} x1 - 终点 x
       * @param {number} y1 - 终点 y
       * @param {number} r - 颜色 R
       * @param {number} g - 颜色 G
       * @param {number} b - 颜色 B
       * @param {number} width - 线宽
       */
      function drawLine(x0, y0, x1, y1, r, g, b, width) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) return;
        const steps = Math.ceil(dist * 2);
        const radius = width / 2;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = x0 + dx * t;
          const y = y0 + dy * t;
          /* 在线宽范围内绘制圆形点 */
          const range = Math.ceil(radius);
          for (let dy2 = -range; dy2 <= range; dy2++) {
            for (let dx2 = -range; dx2 <= range; dx2++) {
              const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
              if (d > radius) continue;
              const alpha = d < radius - 1 ? 255 : Math.round(255 * (1 - (d - (radius - 1))));
              setPixel(x + dx2, y + dy2, r, g, b, alpha);
            }
          }
        }
      }

      /* 填充圆形（蓝色渐变表盘） */
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > radius) continue;

          /* 径向渐变：中心亮蓝色 → 边缘深蓝色 */
          const t = d / radius;
          const r = Math.round(91 + (43 - 91) * t);   /* 91 → 43 */
          const g = Math.round(155 + (87 - 155) * t); /* 155 → 87 */
          const b = Math.round(213 + (151 - 213) * t);/* 213 → 151 */
          const a = 255;
          setPixel(x, y, r, g, b, a);
        }
      }

      /* 外圈白色边框 */
      const borderWidth = Math.max(1, size * 0.04);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < radius - borderWidth || d > radius) continue;
          const alpha = d < radius - borderWidth + 1
            ? Math.round(255 * (d - (radius - borderWidth)))
            : (d > radius - 1 ? Math.round(255 * (radius - d + 1)) : 153);
          setPixel(x, y, 255, 255, 255, alpha);
        }
      }

      /* 刻度线 */
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const r1 = radius * 0.78;
        const r2 = radius * 0.88;
        drawLine(
          cx + Math.cos(angle) * r1,
          cy + Math.sin(angle) * r1,
          cx + Math.cos(angle) * r2,
          cy + Math.sin(angle) * r2,
          255, 255, 255, Math.max(1, size * 0.025)
        );
      }

      /* 指针角度 */
      const hourAngle = ((hours + minutes / 60) * 30 - 90) * Math.PI / 180;
      const minuteAngle = (minutes * 6 - 90) * Math.PI / 180;

      /* 时针 */
      drawLine(cx, cy,
        cx + Math.cos(hourAngle) * radius * 0.45,
        cy + Math.sin(hourAngle) * radius * 0.45,
        255, 255, 255, Math.max(1.5, size * 0.06));

      /* 分针 */
      drawLine(cx, cy,
        cx + Math.cos(minuteAngle) * radius * 0.65,
        cy + Math.sin(minuteAngle) * radius * 0.65,
        255, 255, 255, Math.max(1, size * 0.04));

      /* 中心圆点 */
      const dotRadius = Math.max(1.5, size * 0.055);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > dotRadius) continue;
          setPixel(x, y, 255, 255, 255, 255);
        }
      }

      return new ImageData(pixels, size, size);
    } catch (err) {
      console.error('[Chrome Timer] 绘制时钟图标失败:', err.message);
      return null;
    }
  }

  /**
   * 更新扩展工具栏图标为当前时间的时钟
   */
  function updateClockIcon() {
    const sizes = [16, 48, 128];
    const imageData = {};

    for (const size of sizes) {
      const data = drawClockIcon(size);
      if (data) imageData[size] = data;
    }

    if (Object.keys(imageData).length > 0) {
      chrome.action.setIcon({ imageData }).catch(() => {});
    }
  }

  /**
   * 启动时钟图标定时更新
   * 每分钟更新一次
   */
  function startClockIconUpdate() {
    try {
      updateClockIcon();
      const now = new Date();
      const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(() => {
        updateClockIcon();
        setInterval(updateClockIcon, 60000);
      }, msToNextMinute);
    } catch (err) {
      console.error('[Chrome Timer] 时钟图标更新启动失败:', err.message);
    }
  }

  /* 启动动态图标 */
  startClockIconUpdate();

  /* ==================== 消息监听 ==================== */

  /**
   * 监听来自 popup 的消息，处理 content script 未加载时的动态注入
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /* 动态注入 content script */
    if (message.action === 'injectContentScript') {
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            sendResponse({ success: false, error: '未找到活动标签页' });
            return;
          }
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [CONTENT_SCRIPT_FILE],
          });
          await new Promise(resolve => setTimeout(resolve, 300));
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    /* 在页面 MAIN world 中执行用户脚本（绕过 CSP） */
    if (message.action === 'executeScript') {
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            sendResponse({ success: false, error: '未找到活动标签页' });
            return;
          }
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            /* 在页面主世界中执行，可直接访问页面 JS 上下文 */
            world: 'MAIN',
            func: (userCode) => {
              try {
                /* 使用 eval 执行脚本，避开 CSP 对 <script> 标签的限制 */
                eval(userCode);
              } catch (err) {
                console.error('[Chrome Timer] 脚本执行错误:', err.message);
              }
            },
            args: [message.data.code],
          });
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }
  });

})();
