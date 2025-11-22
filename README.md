# Joseliyo App - Gestión de Finanzas Personales

Aplicación web creada por José N. para que sus amigos y conocidos puedan gestionar sus finanzas personales de manera sencilla y profesional. Controla activos, pasivos, ingresos y gastos desde un dashboard intuitivo con gráficos interactivos.

## 🚀 Características

- **Dashboard Completo**: Visualiza tu situación financiera con gráficos de ingresos y gastos
- **Gestión de Activos**: Controla inversiones y su rentabilidad
- **Control de Pasivos**: Monitorea préstamos y deudas con seguimiento de progreso
- **Transacciones**: Registra y filtra ingresos y gastos por fecha, categoría y tipo
- **Diseño Responsive**: Interfaz moderna que se adapta a móviles, tablets y escritorio
- **Tema Financiero**: Paleta de colores profesional tipo fintech

## 🛠️ Tecnologías

- **React 18** con TypeScript
- **Vite** para desarrollo rápido
- **Tailwind CSS** para estilos
- **Recharts** para gráficos interactivos
- **Axios** para llamadas API
- **Shadcn/ui** para componentes UI
- **React Router** para navegación
- **date-fns** para manejo de fechas

## 📡 API Backend

La aplicación se conecta a la API REST en:
```
https://cuentas-springboot.onrender.com/api
```

Swagger UI disponible en:
```
https://cuentas-springboot.onrender.com/swagger-ui/index.html
```

## 🚦 Inicio Rápido

### Requisitos previos
- Node.js 18+ 
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:8080`

### Demo Login

Para probar la aplicación, puedes usar cualquier email y contraseña (el backend está configurado para el usuario ID 1).

## 📱 Páginas de la Aplicación

### 1. Login (`/login`)
- Autenticación con email y contraseña
- Diseño moderno con gradientes

### 2. Dashboard (`/dashboard`)
- Resumen financiero: ingresos, gastos y balance neto
- Gráficos de evolución temporal (líneas y barras)
- Tarjetas de mejor y peor activo
- Selector de rango de fechas (por defecto: mes anterior)

### 3. Activos (`/assets`)
- Tabla con todos los activos
- Información: nombre, tipo, valor de adquisición, valor actual, rentabilidad
- Vista detallada de rendimiento por activo

### 4. Pasivos (`/liabilities`)
- Listado de pasivos con barras de progreso
- Detalles: monto total, saldo pendiente, % amortizado
- Vista de progreso con principal e intereses pagados

### 5. Transacciones (`/transactions`)
- Tabla de ingresos y gastos separados visualmente
- Filtros por fecha, tipo y categoría
- Crear nuevas transacciones
- Eliminar transacciones existentes

## 🎨 Sistema de Diseño

La aplicación utiliza un sistema de diseño moderno tipo fintech:

- **Colores Primarios**: Azul profundo (#1e40af)
- **Colores de Éxito**: Verde financiero (#10b981)
- **Colores de Alerta**: Amarillo/naranja (#f59e0b)
- **Fondos**: Grises claros con efectos sutiles
- **Tipografía**: Sistema sans-serif para máxima legibilidad

Todos los colores están definidos en `src/index.css` usando HSL y son accesibles mediante tokens semánticos en todo el código.

## 🔧 Configuración

### Proxy API

El proyecto está configurado con un proxy en `vite.config.ts` para solucionar problemas de CORS:

```typescript
proxy: {
  '/api': {
    target: 'https://cuentas-springboot.onrender.com',
    changeOrigin: true,
    secure: true,
  }
}
```

### Variables de Entorno

No se requieren variables de entorno para funcionar.

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Lint
npm run lint
```

## 🏗️ Estructura del Proyecto

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   ├── Layout.tsx       # Layout con sidebar
│   ├── StatCard.tsx     # Tarjeta de estadística
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx  # Contexto de autenticación
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Assets.tsx
│   ├── Liabilities.tsx
│   ├── Transactions.tsx
│   └── NotFound.tsx
├── services/
│   └── api.ts           # Cliente API con Axios
├── types/
│   └── api.ts           # Tipos TypeScript
├── App.tsx              # Componente raíz
└── main.tsx             # Punto de entrada
```

## 🔐 Autenticación

La aplicación incluye un sistema de autenticación básico:
- Los datos de sesión se guardan en `localStorage`
- Rutas protegidas con componente `ProtectedRoute`
- Redirección automática a login si no hay sesión

## 📊 Gráficos y Visualización

Utilizamos **Recharts** para crear visualizaciones interactivas:
- Gráficos de líneas para evolución temporal
- Gráficos de barras para comparativas
- Tooltips personalizados con formato de moneda
- Colores temáticos del sistema de diseño

## 🌐 Despliegue

Para desplegar la aplicación en producción:

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/` y pueden ser desplegados en cualquier servidor web estático.

### Plataformas recomendadas:
- Vercel
- Netlify
- GitHub Pages
- Lovable (clic en "Publish")

## 📄 Sobre el Proyecto

Esta aplicación fue creada por **José N.** como una herramienta personal para que sus amigos y conocidos puedan gestionar sus finanzas de manera profesional y sencilla.

---

**Desarrollado por**: José N.
