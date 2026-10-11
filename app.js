"use strict";

const intro = document.querySelector("#intro");
const button = document.querySelector("#start-button");
const canvas = document.querySelector("#heart");
const ctx = canvas.getContext("2d");

const fixedPhrases = [
  "I love you", "Ich liebe dich", "Ljubim te",
  "دوستت دارم", "زه تا سره مینه لرم",
];

const optionalPhrases = [
  "Seni seviyorum", "Te amo", "Je t'aime", "Ti amo", "Eu te amo",
  "Я тебя люблю", "사랑해", "愛してる", "我爱你", "मैं तुमसे प्यार करता हूँ",
  "Σ' αγαπώ", "Ik hou van jou", "Jag älskar dig", "Kocham cię",
  "ฉันรักเธอ", "Anh yêu em", "Aku cinta kamu", "Я тебе кохаю",
];

let started = false;
let words = [];
let width = 0;
let height = 0;
let originY = 0;
let scale = 1;
let startTime = 0;
let frameId = 0;

const random = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const easeOut = (value) => 1 - (1 - value) ** 3;

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function heart(angle) {
  return [
    16 * Math.sin(angle) ** 3,
    13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle),
  ];
}

const outline = Array.from({ length: 721 }, (_, index) => heart((Math.PI * 2 * index) / 720));
const yMax = Math.max(...outline.map(([, y]) => y));
const yMin = Math.min(...outline.map(([, y]) => y));

function spansAt(y) {
  const intersections = [];
  for (let index = 0; index < outline.length - 1; index += 1) {
    const [x1, y1] = outline[index];
    const [x2, y2] = outline[index + 1];
    if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
      intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
  }
  intersections.sort((a, b) => a - b);
  return intersections.reduce((pairs, x, index) => {
    if (index % 2 === 0 && intersections[index + 1] !== undefined) pairs.push([x, intersections[index + 1]]);
    return pairs;
  }, []);
}

function colorFor(edge) {
  const palette = edge
    ? ["#e85b78", "#f16c86", "#db405f"]
    : ["#8e102b", "#ad1837", "#c52849", "#94122e"];
  return palette[Math.floor(Math.random() * palette.length)];
}

function buildWords() {
  const phrases = [
    ...fixedPhrases,
    ...shuffle(optionalPhrases).slice(0, optionalPhrases.length - 2),
  ].map((phrase) => `${phrase} Mary`);
  const placed = [];
  let phraseIndex = 0;
  const smallestFont = Math.max(7, Math.round(scale * 0.38));
  const rowHeight = Math.max(smallestFont + 4, Math.round(scale * 0.6));
  const halfModelRow = rowHeight / scale / 2;

  for (let y = yMax - halfModelRow; y > yMin + halfModelRow; y -= rowHeight / scale) {
    for (const [left, right] of spansAt(y)) {
      const lo = left * scale + width / 2 + 5;
      const hi = right * scale + width / 2 - 5;
      let x = lo + random(0, 8);
      const row = [];

      while (x < hi) {
        const phrase = phrases[phraseIndex % phrases.length];
        phraseIndex += 1;
        const size = Math.round(random(smallestFont, smallestFont + 3));
        ctx.font = `700 ${size}px Arial, Tahoma, sans-serif`;
        const textWidth = ctx.measureText(phrase).width;
        if (x + textWidth > hi) break;
        row.push({ x: x + textWidth / 2, y: originY - y * scale, phrase, size, width: textWidth });
        x += textWidth + 7;
      }

      if (row.length > 1) {
        const spare = hi - (row[row.length - 1].x + row[row.length - 1].width / 2);
        row.forEach((word, index) => { word.x += (spare * index) / (row.length - 1); });
      } else if (row.length === 1) {
        row[0].x = (lo + hi) / 2;
      }

      row.forEach((word, index) => placed.push({
        ...word,
        edge: index === 0 || index === row.length - 1,
        color: colorFor(index === 0 || index === row.length - 1),
        drift: random(-9, 9),
      }));
    }
  }
  return placed;
}

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  scale = Math.max(10, Math.min((width - 54) / 34, (height - 64) / 31));
  originY = height / 2 + scale * 2.15;
  words = buildWords();
}

function draw(timestamp) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#060208";
  ctx.fillRect(0, 0, width, height);

  const duration = 7800;
  const stagger = duration / Math.max(words.length, 1);
  words.forEach((word, index) => {
    const progress = clamp((timestamp - startTime - index * stagger) / 620);
    if (progress <= 0) return;
    const eased = easeOut(progress);
    const afterGlow = progress === 1 ? (Math.sin((timestamp / 620) + index * 1.71) + 1) / 2 : 0;
    const x = word.x + word.drift * (1 - eased);
    const y = word.y - 30 * (1 - eased);

    ctx.save();
    ctx.globalAlpha = eased;
    ctx.font = `700 ${word.size}px Arial, Tahoma, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0, 0, 0, .6)";
    ctx.fillText(word.phrase, x + 1.5, y + 2);
    ctx.shadowColor = `rgba(255, 102, 132, ${0.12 + afterGlow * 0.3})`;
    ctx.shadowBlur = 3 + afterGlow * 10;
    ctx.fillStyle = word.color;
    ctx.fillText(word.phrase, x, y);
    ctx.restore();
  });

  frameId = requestAnimationFrame(draw);
}

function startHeart() {
  if (started) return;
  started = true;
  intro.classList.add("leaving");
  canvas.classList.add("visible");
  resize();
  startTime = performance.now();
  frameId = requestAnimationFrame(draw);
  window.setTimeout(() => intro.remove(), 1000);
}

button.addEventListener("click", startHeart);
document.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") startHeart();
});
window.addEventListener("resize", () => {
  if (!started) return;
  cancelAnimationFrame(frameId);
  resize();
  startTime = performance.now();
  frameId = requestAnimationFrame(draw);
});
window.setTimeout(startHeart, 6200);
