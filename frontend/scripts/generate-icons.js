import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, 'public')
const ICONS_DIR = join(PUBLIC_DIR, 'icons')
const LOGO_PATH = join(PUBLIC_DIR, 'logo.png')

const ICON_SIZES = [
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
]

async function generateIcons() {
  console.log('Generating PWA icons from logo.png...')
  
  await mkdir(ICONS_DIR, { recursive: true })
  
  for (const { name, size } of ICON_SIZES) {
    const outputPath = join(ICONS_DIR, name)
    await sharp(LOGO_PATH)
      .resize(size, size, { fit: 'contain', background: { r: 248, g: 247, b: 255, alpha: 1 } })
      .png()
      .toFile(outputPath)
    console.log(`  ✓ ${name} (${size}x${size})`)
  }
  
  // Also copy favicon to root public dir
  await sharp(LOGO_PATH)
    .resize(32, 32, { fit: 'contain', background: { r: 248, g: 247, b: 255, alpha: 1 } })
    .png()
    .toFile(join(PUBLIC_DIR, 'favicon.ico'))
  console.log('  ✓ favicon.ico (32x32)')
  
  console.log('\nAll icons generated successfully!')
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err.message)
  process.exit(1)
})
