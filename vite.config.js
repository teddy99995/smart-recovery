import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // 引入 PWA 插件

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 自動更新 Service Worker，確保使用者總是能用到最新版 App
      devOptions: {
        enabled: true // 🌟 關鍵：允許在本機測試環境 (npm run dev) 下載與測試 PWA 功能
      },
      manifest: {
        name: "Smart recovery",
        short_name: "Smart recovery",
        start_url: "/",
        display: "standalone",
        background_color: "#0F172A",
        theme_color: "#0F172A",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      }
    })
  ]
});