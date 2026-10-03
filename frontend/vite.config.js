import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During local `npm run dev` (outside Docker), proxy API calls to the
    // backend services so the frontend can call relative /api/* paths
    // without CORS issues. In the containerized setup, nginx performs
    // this same proxying (see nginx.conf).
    proxy: {
      '/api/patients': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/appointments': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/billing': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
});
