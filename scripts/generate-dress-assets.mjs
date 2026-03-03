import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const width = 420;
const height = 640;
const outDir = resolve(process.cwd(), 'public/assets/dresses');

function crc32(buffer) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([len, typeBuffer, data, crc]);
}

function writePng(fileName, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    scanlines[y * (1 + width * 4)] = 0;
    rgba.copy(scanlines, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(resolve(outDir, fileName), png);
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function drawDress(fileName, base, accent) {
  const pixels = Buffer.alloc(width * height * 4);
  const body = [[100, 90], [320, 90], [370, 600], [50, 600]];
  const neck = [[160, 90], [210, 165], [260, 90]];
  const belt = [[70, 280], [350, 280], [350, 300], [70, 300]];
  const stripe = [[95, 390], [325, 390], [325, 406], [95, 406]];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      let color = [0, 0, 0, 0];

      if (pointInPoly(x, y, body)) color = base;
      if (pointInPoly(x, y, neck)) color = [0, 0, 0, 0];
      if ((x - 145) ** 2 + (y - 95) ** 2 < 34 ** 2 || (x - 275) ** 2 + (y - 95) ** 2 < 34 ** 2) {
        color = base;
      }
      if (pointInPoly(x, y, belt) || pointInPoly(x, y, stripe)) color = accent;

      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
      pixels[idx + 3] = color[3];
    }
  }

  writePng(fileName, pixels);
}

mkdirSync(outDir, { recursive: true });

drawDress('ruby-a-line.png', [190, 22, 62, 210], [255, 180, 200, 180]);
drawDress('midnight-wrap.png', [38, 49, 92, 210], [130, 180, 255, 180]);
drawDress('mint-midi.png', [45, 125, 98, 210], [180, 255, 220, 180]);

console.log('Generated dress PNG assets in public/assets/dresses');
