const { createCanvas, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

const W = 420, H = 560;
const outDir = path.join(__dirname, "frames");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const COLORS = {
  bg: "#f5f7fa", header: "#1a1a2e", primary: "#596bf7",
  text: "#1a1a2e", textSec: "#666", white: "#fff",
  border: "#e6e6eb", card: "#fff", hover: "#f2f2f7",
  toggleTrack: "#596bf7", danger: "#eb5757",
};

const I18N = {
  "zh-CN": { addTask: "添加任务", pick: "选择元素", compact: "精简" },
  "en":    { addTask: "Add Task",  pick: "Pick Element", compact: "Compact" },
  "ja":    { addTask: "タスク追加", pick: "要素選択",   compact: "簡易" },
  "ko":    { addTask: "작업 추가",  pick: "요소 선택",   compact: "간단" },
  "zh-TW": { addTask: "新增任務",   pick: "選擇元素",   compact: "精簡" },
};

const LANGS = [
  { code: "zh-CN", flag: "CN", label: "简体中文" },
  { code: "en",    flag: "EN", label: "English" },
  { code: "ja",    flag: "JA", label: "日本語" },
  { code: "ko",    flag: "KO", label: "한국어" },
  { code: "zh-TW", flag: "TW", label: "繁體中文" },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFrame(idx, { lang, dropdownOpen, activeLang, hoverIdx }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const tr = I18N[lang] || I18N["zh-CN"];

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, 0, W, 48);
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("Chrome Timer", 12, 30);
  ctx.font = "10px monospace";
  ctx.fillText("example.com", 160, 30);

  ctx.beginPath();
  ctx.arc(W - 26, 24, 10, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - 36, 24);
  ctx.lineTo(W - 16, 24);
  ctx.stroke();

  if (dropdownOpen) {
    const dx = W - 170, dy = 52, dw = 160, dh = LANGS.length * 36 + 8;
    ctx.fillStyle = COLORS.card;
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, dw, dh);

    LANGS.forEach((l, i) => {
      const ly = dy + 4 + i * 36;
      if (i === hoverIdx) {
        ctx.fillStyle = COLORS.hover;
        ctx.fillRect(dx + 2, ly, dw - 4, 36);
      }
      const isActive = l.code === activeLang;
      ctx.fillStyle = isActive ? COLORS.primary : COLORS.text;
      ctx.font = isActive ? "bold 11px sans-serif" : "11px sans-serif";
      ctx.fillText(`[${l.flag}] ${l.label}`, dx + 12, ly + 22);
      if (isActive) {
        ctx.fillText("✓", dx + dw - 24, ly + 22);
      }
    });
  }

  const cx = 12, cy = 60, cw = W - 24, ch = 80;
  ctx.fillStyle = COLORS.card;
  ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx, cy, cw, ch);
  ctx.fillStyle = COLORS.text;
  ctx.font = "12px sans-serif";
  ctx.fillText("定时点击 button", cx + 12, cy + 28);
  ctx.fillStyle = COLORS.textSec;
  ctx.font = "9px monospace";
  ctx.fillText("*/3 * * * * *", cx + 12, cy + 50);

  const tx = cx + cw - 50, ty = cy + 14;
  ctx.fillStyle = COLORS.toggleTrack;
  ctx.beginPath();
  roundRect(ctx, tx, ty + 2, 44, 16, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.arc(tx + 32, ty + 10, 7, 0, Math.PI * 2);
  ctx.fill();

  const btnY = H - 56;
  ctx.fillStyle = COLORS.primary;
  roundRect(ctx, 12, btnY, 130, 40, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.white;
  ctx.font = "11px sans-serif";
  ctx.fillText(tr.addTask, 30, btnY + 24);

  ctx.fillStyle = "#f0f0f5";
  roundRect(ctx, 150, btnY, 130, 40, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.fillText(tr.pick, 162, btnY + 24);

  ctx.fillStyle = "#f0f0f5";
  roundRect(ctx, 288, btnY, 120, 40, 8);
  ctx.fill();
  ctx.fillText(tr.compact, 310, btnY + 24);

  const fpath = path.join(outDir, `frame_${String(idx).padStart(4, "0")}.png`);
  fs.writeFileSync(fpath, canvas.toBuffer("image/png"));
}

let fi = 0;

for (let i = 0; i < 30; i++) drawFrame(fi++, { lang: "zh-CN", dropdownOpen: false, activeLang: "zh-CN", hoverIdx: -1 });
for (let i = 0; i < 10; i++) drawFrame(fi++, { lang: "zh-CN", dropdownOpen: true, activeLang: "zh-CN", hoverIdx: -1 });
for (let h = 0; h < LANGS.length; h++) {
  for (let i = 0; i < 4; i++) drawFrame(fi++, { lang: "zh-CN", dropdownOpen: true, activeLang: "zh-CN", hoverIdx: h });
}

const switchOrder = ["en", "ja", "ko", "zh-TW", "zh-CN"];
for (const lCode of switchOrder) {
  for (let i = 0; i < 5; i++) drawFrame(fi++, { lang: lCode, dropdownOpen: true, activeLang: lCode, hoverIdx: -1 });
  for (let i = 0; i < 30; i++) drawFrame(fi++, { lang: lCode, dropdownOpen: false, activeLang: lCode, hoverIdx: -1 });
}

console.log(`Generated ${fi} frames`);