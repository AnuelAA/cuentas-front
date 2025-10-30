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
    // Asegurar que todas las rutas se sirvan a index.html para SPA routing
    // Esto es necesario para que funcionen las rutas como /assets, /dashboard, etc.
    // cuando se refresca la página o se accede directamente
    strictPort: false,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Configuración para el build de producción
  build: {
    rollupOptions: {
      output: {
        // Asegurar que los assets tengan nombres predecibles
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  }
  };
});
