import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (lee .env.local, .env, etc.)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Leer la URL del backend desde variable de entorno o usar por defecto
  const apiUrl = env.VITE_API_URL || 'http://46.101.144.147:8080';
  const proxyTarget = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
  
  return {
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    // Configuración para SPA routing - redirige todas las rutas a index.html
    // Esto permite que funcione F5 en cualquier ruta como /assets, /dashboard, etc.
    fs: {
      strict: false,
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
      }
    }
  },
  preview: {
    port: 8080,
    strictPort: false,
    host: "::",
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configuración para el build de producción
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Asegurar que los assets tengan nombres predecibles
        // Cambiamos el patrón para evitar conflictos con la ruta /assets de la aplicación
        assetFileNames: 'static/[name]-[hash].[ext]',
        chunkFileNames: 'static/[name]-[hash].js',
        entryFileNames: 'static/[name]-[hash].js',
      }
    }
  }
  };
});
