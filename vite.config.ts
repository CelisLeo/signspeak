import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const REPO_NAME = 'signspeak';
const isProd = process.env.NODE_ENV === 'production';
const base = isProd ? `/${REPO_NAME}/` : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'logo.png',
        'letras/**/*.png',
        'model/**/*',
        'videos/**/*'
      ],
      workbox: {
        // Precachea la app completa, incluido el modelo de IA (model.json, *.bin y meta.json)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,bin,webmanifest,mp4,webm,gif}'],
        // TensorFlow.js genera un chunk grande: se sube el límite (por defecto 2 MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            // CSS de Google Fonts (App.css importa Inter)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' }
          },
          {
            // Archivos de la fuente
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'SignSpeak - Traductor LSM',
        short_name: 'SignSpeak',
        description: 'Traductor de Lengua de Señas Mexicana a texto y voz',
        theme_color: '#6366F1',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
})
