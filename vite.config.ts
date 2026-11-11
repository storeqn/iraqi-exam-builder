import { defineConfig } from 'vite'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [tailwind(), {
    name: 'mathlive-fonts',
    apply: 'build',
    buildStart() {
      const directory = resolve('node_modules/mathlive/fonts')
      for (const name of readdirSync(directory).filter(name => name.endsWith('.woff2'))) {
        this.emitFile({ type: 'asset', fileName: 'mathlive-fonts/' + name, source: readFileSync(resolve(directory,name)) })
      }
    },
  }, VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['logo.svg', 'icons/*.png'],
    manifest: {
      id: '/', start_url: '/', scope: '/', lang: 'ar', dir: 'rtl',
      name: 'منشئ الأسئلة الامتحانية العراقي', short_name: 'أسئلتي',
      description: 'تحرير أوراق الامتحانات العراقية وطباعتها',
      display: 'standalone', theme_color: '#142544', background_color: '#f4f6fa',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{html,js,css,svg,png,woff2}'],
      maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
    },
  })],
  build: { assetsInlineLimit: 0 },
})
