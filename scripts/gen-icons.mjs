// 生成 PWA 图标（public/icon-192.png、icon-512.png）
// 用法：node scripts/gen-icons.mjs（在项目根目录运行）
import sharp from "sharp";
import path from "node:path";

const projectDir = process.cwd();

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#c026d3"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <text x="256" y="330" font-size="300" text-anchor="middle" dominant-baseline="middle">⚡</text>
</svg>`;

await sharp(Buffer.from(svg))
  .resize(192, 192)
  .png()
  .toFile(path.join(projectDir, "public", "icon-192.png"));

await sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile(path.join(projectDir, "public", "icon-512.png"));

console.log("✅ PWA 图标已生成");
