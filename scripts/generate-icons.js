const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function generateHeartImage(width, height, isBadge = false) {
  const png = new PNG({ width, height });

  // Center coordinates
  const cx = width / 2;
  const cy = height * 0.48;
  const scale = width * 0.024;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;

      // Normalized coordinates from -1 to 1
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(nx * nx + ny * ny);

      if (isBadge) {
        // Transparent badge with white heart silhouette
        const hx = (x - cx) / scale;
        const hy = -(y - cy) / scale;
        // Heart formula: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
        const val = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3);
        if (val <= 0) {
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
          png.data[idx + 3] = 255;
        } else {
          png.data[idx] = 0;
          png.data[idx + 1] = 0;
          png.data[idx + 2] = 0;
          png.data[idx + 3] = 0;
        }
        continue;
      }

      // Deep dark luxury background with radial purple/pink gradient
      const bgR = Math.min(255, Math.floor(18 + (1 - dist) * 25));
      const bgG = Math.min(255, Math.floor(12 + (1 - dist) * 15));
      const bgB = Math.min(255, Math.floor(32 + (1 - dist) * 45));

      // Calculate heart equation
      const hx = (x - cx) / scale;
      const hy = -(y - cy) / scale;
      const val = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3);

      if (val <= 0) {
        // Inside heart: bright glowing romantic pink-red-rose gradient
        const heartDist = Math.sqrt(hx * hx + hy * hy);
        const r = Math.min(255, Math.floor(255 - heartDist * 20));
        const g = Math.min(255, Math.floor(75 + (hy + 1) * 35));
        const b = Math.min(255, Math.floor(130 + (hx + 1) * 30));

        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      } else if (val < 0.35) {
        // Soft aura / glow around heart
        const glowFactor = 1 - val / 0.35;
        png.data[idx] = Math.min(255, Math.floor(bgR + glowFactor * 180));
        png.data[idx + 1] = Math.min(255, Math.floor(bgG + glowFactor * 70));
        png.data[idx + 2] = Math.min(255, Math.floor(bgB + glowFactor * 130));
        png.data[idx + 3] = 255;
      } else {
        // Background
        png.data[idx] = bgR;
        png.data[idx + 1] = bgG;
        png.data[idx + 2] = bgB;
        png.data[idx + 3] = 255;
      }
    }
  }

  return png;
}

function savePng(png, filePath) {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log('Saved:', filePath);
}

savePng(generateHeartImage(192, 192), path.join(iconsDir, 'icon-192.png'));
savePng(generateHeartImage(512, 512), path.join(iconsDir, 'icon-512.png'));
savePng(generateHeartImage(180, 180), path.join(iconsDir, 'apple-touch-icon.png'));
savePng(generateHeartImage(72, 72, true), path.join(iconsDir, 'badge-72.png'));
savePng(generateHeartImage(600, 300), path.join(iconsDir, 'banner.png'));
// Also copy icon-192 to favicon.png
fs.copyFileSync(path.join(iconsDir, 'icon-192.png'), path.join(__dirname, '..', 'public', 'favicon.png'));

console.log('✅ All icons generated successfully!');
