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
        'letras/**/*.png'
      ],
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