import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const srcSvg = path.join(root, 'public', 'icon.svg')
const outDir = path.join(root, 'build')
const outPng = path.join(outDir, 'icon.png')

async function main() {
  if (!fs.existsSync(srcSvg)) {
    process.exit(0)
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  await sharp(srcSvg).resize(512, 512).png().toFile(outPng)
}

main().catch(() => process.exit(1))
