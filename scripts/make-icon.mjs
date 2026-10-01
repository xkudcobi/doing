// Draws the doing app icon — the logo's block-letter "d" on a dark rounded
// square — and writes assets/icon.png + assets/icon.ico. No dependencies:
// pixels are computed directly, PNG is hand-encoded with node's zlib.
//   node scripts/make-icon.mjs
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import zlib from 'node:zlib'

const BG = [24, 24, 27] // #18181b — the dark theme background
const FG = [255, 255, 255]
const SHADE = [161, 161, 170] // #a1a1aa — the ▓ cells of the terminal logo

// a blocky lowercase "d" in the terminal logo's style:
// 1 = full block, 2 = shaded (▓), 0 = empty
const GLYPH = [
  [0, 0, 0, 2],
  [0, 0, 0, 1],
  [1, 1, 1, 1],
  [1, 0, 0, 1],
  [1, 1, 1, 1],
]

function pixel(x, y) {
  // unit square coordinates
  const r = 0.22 // corner radius
  const dx = Math.max(r - x, 0, x - (1 - r))
  const dy = Math.max(r - y, 0, y - (1 - r))
  if (dx * dx + dy * dy > r * r) return null // outside the rounded square
  const cell = 0.13
  const left = 0.5 - (GLYPH[0].length * cell) / 2
  const top = 0.5 - (GLYPH.length * cell) / 2
  const col = Math.floor((x - left) / cell)
  const row = Math.floor((y - top) / cell)
  const value = GLYPH[row]?.[col] ?? 0
  return value === 1 ? FG : value === 2 ? SHADE : BG
}

function render(size) {
  const ss = 4 // supersampling for smooth corners
  const data = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const color = pixel((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size)
          if (!color) continue
          r += color[0]; g += color[1]; b += color[2]; a++
        }
      }
      const i = (py * size + px) * 4
      if (a > 0) {
        data[i] = Math.round(r / a)
        data[i + 1] = Math.round(g / a)
        data[i + 2] = Math.round(b / a)
      }
      data[i + 3] = Math.round((a / (ss * ss)) * 255)
    }
  }
  return encodePng(size, data)
}

const CRC_TABLE = Array.from({length: 256}, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = buf => {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, body) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed))
  return Buffer.concat([len, typed, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// .ico with PNG-compressed entries (supported since Windows Vista)
function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({size, png}) => {
    const entry = Buffer.alloc(16)
    entry[0] = size >= 256 ? 0 : size
    entry[1] = size >= 256 ? 0 : size
    entry.writeUInt16LE(1, 4) // planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(image => image.png)])
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets')
fs.mkdirSync(outDir, {recursive: true})
const sizes = [256, 64, 48, 32, 16]
const images = sizes.map(size => ({size, png: render(size)}))
fs.writeFileSync(path.join(outDir, 'icon.png'), images[0].png)
fs.writeFileSync(path.join(outDir, 'icon.ico'), encodeIco(images))
console.log(`wrote ${path.join(outDir, 'icon.png')} and icon.ico`)
