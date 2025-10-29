import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Asegurar que todas las rutas se sirvan a index.html para SPA routing
    // Esto es necesario para que funcionen las rutas como /assets, /dashboard, etc.
    // cuando se refresca la página o se accede directamente
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://46.101.144.147:8080',
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
}));
