# 🚀 MEJORAS PARA EL FRONTEND - Joseliyo App

Lista de mejoras priorizadas que se implementarán en el frontend, con detalles de implementación para cada una.

**Última actualización**: 
- ✅ Completadas: Modo rápido de entrada, Exportar CSV, Ordenamiento de transacciones, Exportar gráficos como PNG, Agrupación por categoría padre, Búsqueda avanzada
- ⚠️ **IMPORTANTE**: Se requiere instalar `html2canvas` en el servidor de producción: `npm install html2canvas`
- ⚠️ Atajos de teclado temporalmente deshabilitados (problemas con dependencias de React hooks)

---

## 📊 DASHBOARD

### 1. Filtros rápidos predefinidos
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Baja

**Qué hacer**:
- Añadir botones de filtro rápido en el Dashboard:
  - "Este mes" (mes actual)
  - "Últimos 3 meses"
  - "Últimos 6 meses"
  - "Este año"
  - "Año pasado"
  - "Últimos 12 meses"
- Al hacer clic, actualizar `startDate` y `endDate` automáticamente
- Guardar último filtro usado en localStorage
- Mostrar visualmente qué filtro está activo (badge o estado destacado)

**Implementación**:
- Componente `QuickFilters` con botones
- Usar `date-fns` para calcular rangos de fechas
- Integrar con el estado existente de `startDate`/`endDate`

---

### 2. Gráficos interactivos mejorados
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- **Zoom en gráficos de líneas**: Implementar zoom con brush/selector de rango en Recharts ✅
- **Click en leyenda**: Toggle para mostrar/ocultar series individuales ✅
- **Exportar gráficos**: Botón para descargar gráfico como PNG ✅
- **Tooltips mejorados**: Mostrar más información contextual ✅
- **Hover states**: Resaltar datos relacionados al pasar el mouse ✅

**Implementación**:
- ✅ Componente `Brush` añadido a gráficos de línea para zoom/navegación
- ✅ Leyenda interactiva en gráfico de ingresos vs gastos
- ✅ Exportar gráficos: Implementado con `html2canvas` instalado
  - Botón de exportar en todos los gráficos principales
  - Exporta como PNG con alta resolución (scale: 2)
  - Nombres de archivo con fecha: `ingresos-vs-gastos_YYYY-MM-DD.png`
- ✅ Tooltips personalizados ya implementados
- ✅ Animaciones por defecto de `recharts` activas

**Nota**: Se requiere instalar `html2canvas` en el servidor de producción:
```bash
npm install html2canvas
```

---

### 3. Widgets personalizables
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Alta

**Qué hacer**:
- Permitir arrastrar y soltar widgets para reordenar
- Checkbox para mostrar/ocultar cada sección del dashboard
- Guardar configuración en backend (requiere endpoint)
- Vista previa de widgets disponibles

**Implementación**:
- Usar `react-beautiful-dnd` o `@dnd-kit/core` para drag & drop
- Estado local para orden y visibilidad
- Componente `DashboardSettings` modal
- Guardar configuración en backend cuando esté disponible

**Requiere Backend**: ✅ (ver BACKEND_REQUIREMENTS.txt sección 1)

---

### 4. Indicadores de tendencia
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Baja

**Qué hacer**:
- Calcular cambio porcentual vs período anterior
- Mostrar flechas ↑↓ y badges de color:
  - Verde: aumento positivo (ingresos) o disminución (gastos)
  - Rojo: disminución (ingresos) o aumento (gastos)
- Mostrar porcentaje de cambio: "+15%" o "-8%"
- Aplicar a: Ingresos, Gastos, Balance, por categoría

**Implementación**:
- Función helper `calculateTrend(current, previous)`
- Componente `TrendIndicator` reutilizable
- Integrar en `StatCard` y gráficos de categorías
- Usar iconos de `lucide-react`: `TrendingUp`, `TrendingDown`, `Minus`

---

### 5. Resumen ejecutivo
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Baja

**Qué hacer**:
- Card destacada en la parte superior del Dashboard
- Mostrar 3-5 KPIs más importantes:
  - Patrimonio Neto (Activos - Pasivos)
  - Ingresos del período
  - Gastos del período
  - Balance (Ingresos - Gastos)
  - Tasa de ahorro (%)
- Diseño visual destacado (gradiente, sombra, tamaño mayor)
- Incluir indicadores de tendencia

**Implementación**:
- Componente `ExecutiveSummary` nuevo
- Calcular KPIs desde datos existentes
- Diseño con `Card` de shadcn/ui pero con estilo destacado
- Posicionar antes de otros widgets

---

### 6. Gráfico de evolución de patrimonio neto
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- Nuevo gráfico de línea mostrando: Activos - Pasivos a lo largo del tiempo
- Agrupar por mes/año según rango de fechas
- Mostrar línea de referencia en 0
- Tooltip con desglose: Activos, Pasivos, Neto
- Colores: Verde para positivo, Rojo para negativo

**Implementación**:
- Calcular patrimonio neto mensual desde `assets` y `liabilities`
- Usar `LineChart` de Recharts
- Agregar datos por mes usando `date-fns`
- Nuevo componente `NetWorthChart`

---

### 7. Heatmap de gastos
**Estado**: ❌ Descartado (ocupa mucho espacio cuando no hay datos)  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- Calendario visual tipo GitHub contributions
- Cada día muestra color según monto de gastos:
  - Sin gastos: gris claro
  - Poco gasto: verde claro
  - Gasto medio: amarillo/naranja
  - Mucho gasto: rojo
- Tooltip al hover: fecha y monto total
- Navegación entre meses
- Leyenda de intensidad

**Implementación**:
- Componente `ExpenseHeatmap` nuevo
- Calcular gastos diarios desde transacciones
- Usar `react-calendar` o componente custom
- Normalizar valores para escala de colores
- Integrar con filtros de fecha existentes

---

### 8. Filtro por activo/pasivo
**Estado**: ❌ Eliminado (no se usaba, se quitó del Dashboard)  
**Prioridad**: Media  
**Complejidad**: Baja

**Nota**: Esta funcionalidad fue implementada pero posteriormente eliminada del Dashboard por falta de uso.

---

### 9. Filtro por rango de importes
**Estado**: ❌ Eliminado (no se usaba, se quitó del Dashboard)  
**Prioridad**: Media  
**Complejidad**: Baja

**Nota**: Esta funcionalidad fue implementada pero posteriormente eliminada del Dashboard por falta de uso.

---

### 10. Vista de comparación
**Estado**: Pendiente  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- Seleccionar dos períodos para comparar
- Mostrar lado a lado:
  - Período 1 vs Período 2
  - Diferencia absoluta y porcentual
  - Gráficos comparativos (barras lado a lado)
- Aplicar a: Ingresos, Gastos, por Categoría, Activos
- Toggle para alternar entre vista normal y comparación

**Implementación**:
- Estados para `period1Start/End` y `period2Start/End`
- Componente `ComparisonView` nuevo
- Reutilizar componentes de gráficos con datos de ambos períodos
- Calcular diferencias y mostrar en cards destacadas

**Requiere Backend**: ⚠️ (opcional, para optimización - ver BACKEND_REQUIREMENTS.txt sección 2)

---

## 💰 TRANSACCIONES

### 11. Plantillas de transacciones recurrentes
**Estado**: Pendiente  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- Sección "Plantillas" en página de Transacciones
- Crear plantilla desde transacción existente o nueva
- Campos: nombre, categoría, tipo, importe, activo, descripción
- Botón "Aplicar plantilla" que crea transacción con datos prellenados
- Lista de plantillas guardadas
- Editar/eliminar plantillas

**Implementación**:
- Nuevo componente `TransactionTemplates`
- Modal para crear/editar plantillas
- Integrar con formulario de transacciones existente
- Guardar plantillas en backend

**Requiere Backend**: ✅ (ver BACKEND_REQUIREMENTS.txt sección 3)

---

### 12. Atajos de teclado
**Estado**: ⚠️ Temporalmente Deshabilitado  
**Prioridad**: Media  
**Complejidad**: Media

**Nota**: Los atajos de teclado fueron temporalmente deshabilitados debido a problemas con dependencias de React hooks. Se reimplementarán de forma más segura en el futuro.

**Qué hacer**:
- **Enter**: Guardar transacción/formulario
- **Esc**: Cerrar modales, cancelar edición
- **Tab**: Navegar entre campos
- **Ctrl/Cmd + K**: Búsqueda global (futuro)
- **Ctrl/Cmd + N**: Nueva transacción
- **Ctrl/Cmd + S**: Guardar (en formularios)
- **Flechas**: Navegar en tablas
- Mostrar ayuda de atajos (modal con `?` o `Ctrl+/`)

**Implementación**:
- Hook `useKeyboardShortcuts` custom
- Usar `useEffect` con `addEventListener('keydown')`
- Prevenir default behavior cuando corresponda
- Componente `KeyboardShortcutsHelp` modal
- Documentar atajos en tooltips

---

### 13. Modo rápido de entrada
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- Botón "Modo rápido" que cambia a vista simplificada ✅
- Formulario minimalista con solo:
  - Importe (focus automático) ✅
  - Categoría (dropdown) ✅
  - Fecha (opcional, default última transacción) ✅
  - Botón "Añadir y continuar" ✅
- Después de guardar, limpiar y mantener focus en importe ✅
- Contador de transacciones añadidas en sesión ✅
- Salir del modo rápido con Esc ✅

**Implementación**:
- ✅ Toggle `quickMode` state implementado
- ✅ Componente `QuickTransactionForm` simplificado
- ✅ Auto-focus y navegación por teclado optimizada (Ctrl+K, Enter, Esc)
- ✅ Guardado inmediato sin necesidad de confirmación

---

### 14. Vista de calendario
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- Nueva vista "Calendario" además de "Tabla"
- Mostrar transacciones en calendario mensual
- Cada día muestra:
  - Total de ingresos (verde)
  - Total de gastos (rojo)
  - Número de transacciones
- Click en día: modal con transacciones de ese día
- Navegación entre meses
- Resaltar días con más actividad

**Implementación**:
- Usar `react-calendar` o componente custom
- Agrupar transacciones por día
- Calcular totales diarios
- Modal `DayTransactionsModal` para detalles
- Toggle entre vista tabla/calendario

---

### 15. Agrupación por categoría padre
**Estado**: ✅ Realizado  
**Prioridad**: Media  
**Complejidad**: Baja

**Qué hacer**:
- Toggle "Agrupar por categoría padre" en página de Transacciones ✅
- Cuando activo, agrupar transacciones por categoría padre ✅
- Mostrar totales por grupo ✅
- Expandir/colapsar grupos (pendiente - se puede añadir después)
- Mantener filtros y búsqueda funcionando ✅

**Implementación**:
- ✅ Similar a implementación en Dashboard
- ✅ Agrupar transacciones usando `parentCategoryId`
- ✅ Botón toggle en header de Ingresos y Gastos
- ✅ Funciones helper `getParentCategory` y `getSubcategories`
- ⚠️ Pendiente: Expandir/colapsar subcategorías (mejora futura)

---

### 16. Búsqueda avanzada
**Estado**: ✅ Realizado  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- Panel de búsqueda avanzada con múltiples filtros:
  - Texto libre (descripción, categoría) ✅
  - Rango de fechas (ya existe en el header) ✅
  - Rango de importes ✅
  - Categorías (múltiple selección) ✅
  - Activos/Pasivos (pendiente - se puede añadir después)
  - Tipo (ingreso/gasto) ✅
- Guardar búsquedas favoritas (pendiente)
- Aplicar filtros en tiempo real ✅
- Mostrar contador de resultados ✅

**Implementación**:
- ✅ Panel de búsqueda avanzada con botón toggle
- ✅ Estados para cada filtro (texto, tipo, importes, categorías)
- ✅ Filtrar `rows` array en frontend usando `useMemo`
- ✅ Contador de resultados: "X de Y transacciones"
- ✅ Botón "Limpiar filtros"
- ⚠️ Pendiente: Guardar búsquedas favoritas (requiere backend)
- ⚠️ Pendiente: Filtro por activos/pasivos (se puede añadir fácilmente)

**Requiere Backend**: ⚠️ (solo para guardar búsquedas favoritas - ver BACKEND_REQUIREMENTS.txt sección 4)

---

### 17. Vista de tabla mejorada
**Estado**: ✅ Parcialmente Realizado  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- **Columnas ordenables**: Click en header para ordenar ✅
- **Columnas personalizables**: Mostrar/ocultar columnas (pendiente)
- **Exportar a CSV/Excel**: Botón para descargar tabla ✅
- **Selección múltiple**: Checkbox para seleccionar filas (pendiente)
- **Acciones masivas**: Eliminar/editar múltiples transacciones (pendiente)
- **Paginación**: Si hay muchas filas (pendiente)
- **Vista compacta/expandida**: Toggle de densidad (pendiente)

**Implementación**:
- ✅ Ordenamiento por fecha e importe en transacciones por categoría
- ✅ Función `exportToCSV` implementada con BOM para Excel
- ✅ Botón de exportar en header con atajo Ctrl+E
- ⚠️ Pendiente: Funcionalidad completa de tabla (requiere refactorizar estructura actual por categorías)

---

### 18. Análisis de patrones
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Alta

**Qué hacer**:
- Sección "Insights" en página de Transacciones
- Detectar y mostrar patrones:
  - "Gastas más los fines de semana"
  - "Tu mayor gasto mensual es en [categoría]"
  - "Gastas un promedio de X€ en [categoría]"
  - "Tendencia: tus gastos en [categoría] han aumentado 20%"
- Gráficos de patrones temporales
- Alertas de cambios significativos

**Implementación**:
- Funciones de análisis:
  - Agrupar por día de semana
  - Calcular promedios y tendencias
  - Detectar outliers
- Componente `PatternAnalysis` con visualizaciones
- Mostrar insights más relevantes primero

**Requiere Backend**: ⚠️ (opcional, para cálculos complejos - ver BACKEND_REQUIREMENTS.txt sección 5)

---

### 19. Alertas de presupuesto
**Estado**: Pendiente  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- Mostrar alertas cuando se acerca/excede presupuesto:
  - Badge en categoría: "80% usado"
  - Alerta roja: "Presupuesto excedido"
  - Notificación toast al crear transacción que excede
- Barra de progreso por categoría
- Vista de todos los presupuestos con estado

**Implementación**:
- Componente `BudgetAlert` reutilizable
- Calcular % usado: `(gastado / presupuesto) * 100`
- Integrar en lista de categorías y formulario de transacciones
- Usar colores: verde (<50%), amarillo (50-90%), rojo (>90%)

**Requiere Backend**: ✅ (ver BACKEND_REQUIREMENTS.txt sección 6)

---

## 📈 ACTIVOS

### 20. Vista de cartera
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Baja

**Qué hacer**:
- Nueva sección en página de Activos: "Vista de cartera"
- Mostrar distribución de activos:
  - Total por tipo de activo
  - Porcentaje de cada activo en el total
  - Gráfico de pastel
- Resumen: "Tu cartera vale X€ distribuida en Y activos"

**Implementación**:
- Agrupar activos por `assetTypeId`
- Calcular totales y porcentajes
- Usar `PieChart` de Recharts
- Componente `PortfolioView` nuevo

---

### 21. Historial completo mejorado
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Baja

**Qué hacer**:
- Mejorar modal de valoraciones existente:
  - Tabla ordenable por fecha/valor
  - Gráfico de evolución dentro del modal
  - Filtros: rango de fechas, rango de valores
  - Exportar historial a CSV
- Mostrar cambios porcentuales entre valoraciones
- Resaltar valoraciones más recientes

**Implementación**:
- Mejorar componente `ValuationsModal` existente
- Añadir tabla con `@tanstack/react-table`
- Gráfico pequeño dentro del modal
- Funciones de cálculo de cambios

---

### 22. Comparación de activos
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- Seleccionar múltiples activos para comparar
- Mostrar en gráfico de líneas superpuestas
- Comparar:
  - Evolución de valor
  - ROI
  - Rentabilidad
- Tabla comparativa con métricas lado a lado

**Implementación**:
- Checkboxes para seleccionar activos
- Componente `AssetComparison` nuevo
- `LineChart` con múltiples series
- Tabla comparativa con métricas calculadas

---

### 23. Gráfico de distribución
**Estado**: Pendiente  
**Prioridad**: Baja  
**Complejidad**: Baja

**Qué hacer**:
- Gráfico de pastel mostrando % de cada activo en el total
- Mostrar en página de Activos
- Tooltip con: nombre, valor, porcentaje
- Click en segmento: filtrar o ver detalle

**Implementación**:
- Usar `PieChart` de Recharts existente
- Calcular porcentajes: `(valorActivo / totalActivos) * 100`
- Integrar en vista de Activos

---

### 24. Vista de timeline
**Estado**: Pendiente  
**Prioridad**: Baja  
**Complejidad**: Media

**Qué hacer**:
- Vista alternativa de valoraciones en formato timeline
- Mostrar todas las valoraciones en línea vertical
- Cada punto muestra: fecha, valor, cambio
- Zoom y scroll horizontal
- Click en punto: ver detalles

**Implementación**:
- Componente `TimelineView` nuevo
- Usar librería como `react-chrono` o custom
- Agrupar por año/mes si hay muchas valoraciones
- Integrar con modal de valoraciones

---

## 💳 PASIVOS

### 25. Calculadora de préstamos
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- Herramienta para calcular préstamos nuevos
- Inputs:
  - Monto principal
  - Tasa de interés anual
  - Plazo (meses/años)
  - Tipo de interés (fijo/variable)
- Mostrar:
  - Cuota mensual
  - Total a pagar
  - Total de intereses
  - Tabla de amortización
- Botón "Crear pasivo desde cálculo"

**Implementación**:
- Componente `LoanCalculator` nuevo
- Fórmulas de cálculo de cuotas
- Generar tabla de amortización
- Integrar con formulario de creación de pasivo

---

### 26. Simulador de pagos
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- En detalle de pasivo, sección "Simulador"
- Input: "Pago extra de X€"
- Mostrar:
  - Nuevo plazo estimado
  - Ahorro en intereses
  - Nueva cuota (si aplica)
- Gráfico comparativo: con/sin pago extra

**Implementación**:
- Componente `PaymentSimulator` en `LiabilityDetail`
- Calcular nuevo calendario de pagos
- Mostrar comparación visual
- Usar datos del pasivo existente

---

### 27. Proyección de finalización
**Estado**: Pendiente  
**Prioridad**: Baja  
**Complejidad**: Baja

**Qué hacer**:
- En detalle de pasivo, mostrar:
  - "Fecha estimada de finalización: DD/MM/YYYY"
  - "Faltan X meses"
  - Barra de progreso: "X% pagado"
- Calcular basado en pagos históricos y cuota actual

**Implementación**:
- Calcular desde `liabilityValues` y pagos realizados
- Mostrar en `LiabilityDetail`
- Componente `CompletionProjection` pequeño

---

## 📁 CATEGORÍAS

### 28. Colores personalizados
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Baja

**Qué hacer**:
- En edición de categoría, selector de color
- Paleta de colores predefinida o color picker
- Aplicar color a:
  - Icono de categoría en listas
  - Gráficos (pie charts)
  - Badges
- Guardar color en backend

**Implementación**:
- Añadir campo `color` al formulario de categoría
- Usar `react-color` o input type="color"
- Aplicar color en componentes que muestran categorías
- Actualizar endpoint de categorías

**Requiere Backend**: ✅ (ver BACKEND_REQUIREMENTS.txt sección 7)

---

### 29. Estadísticas por categoría
**Estado**: Pendiente  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- En `CategoryDetail`, sección de estadísticas:
  - Total de ingresos/gastos
  - Número de transacciones
  - Promedio por transacción
  - Evolución mensual (gráfico)
  - Tendencias (sube/baja)
  - Comparación con período anterior

**Implementación**:
- Calcular estadísticas desde transacciones filtradas
- Gráfico de evolución mensual
- Componente `CategoryStatistics` nuevo
- Integrar en `CategoryDetail`

**Requiere Backend**: ⚠️ (opcional, para optimización - ver BACKEND_REQUIREMENTS.txt sección 8)

---

### 30. Filtros visuales
**Estado**: Pendiente  
**Prioridad**: Baja  
**Complejidad**: Baja

**Qué hacer**:
- Chips/badges de categorías en página de Transacciones
- Click en chip: filtrar por esa categoría
- Múltiple selección posible
- Mostrar contador de transacciones por categoría en el chip
- Chips de categorías padre incluyen subcategorías

**Implementación**:
- Componente `CategoryFilters` con chips
- Estado para categorías seleccionadas
- Filtrar transacciones por `categoryId` o `parentCategoryId`
- Usar `Badge` de shadcn/ui

---

### 31. Vista de árbol expandida
**Estado**: Pendiente  
**Prioridad**: Baja  
**Complejidad**: Baja

**Qué hacer**:
- En página de Categorías, mostrar totales agregados
- En categorías padre, mostrar suma de subcategorías
- Badge con total al lado del nombre
- Actualizar totales al expandir/colapsar

**Implementación**:
- Calcular totales desde transacciones
- Mostrar en `renderCategoryNode`
- Actualizar cuando cambien transacciones o filtros

---

## 🎨 INTERFAZ Y UX

### 32. Undo/Redo
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Alta

**Qué hacer**:
- Sistema de undo/redo para acciones:
  - Crear transacción
  - Editar transacción
  - Eliminar transacción
  - Crear/editar activo/pasivo
- Botones Undo/Redo en toolbar
- Atajos: Ctrl+Z / Ctrl+Shift+Z
- Toast con "Deshacer" después de acciones

**Implementación**:
- Usar librería como `use-undo-redo` o implementar custom
- Guardar estado anterior antes de cambios
- Stack de acciones con límite (ej: 50 acciones)
- Integrar con todas las operaciones CRUD

---

### 33. Mejoras móviles específicas (TODAS)
**Estado**: Pendiente  
**Prioridad**: Alta  
**Complejidad**: Media

**Qué hacer**:
- **Swipe actions**: Deslizar para eliminar/editar en listas
- **Pull to refresh**: Arrastrar hacia abajo para refrescar
- **Bottom navigation**: Barra de navegación inferior en móvil
- **Modales fullscreen**: Modales ocupan toda la pantalla en móvil
- **Inputs optimizados**: Teclados numéricos donde corresponde
- **Touch targets grandes**: Botones mínimo 44x44px
- **Gestos**: Pinch to zoom en gráficos
- **Vista adaptativa**: Ocultar columnas menos importantes en móvil

**Implementación**:
- Usar `react-swipeable` para swipe actions
- `usePullToRefresh` hook custom
- Componente `MobileBottomNav` condicional
- Media queries para modales
- `inputMode` en inputs
- CSS para touch targets
- Detectar dispositivo con `useMediaQuery`

---

### 34. Navegación por teclado
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- Todas las funciones accesibles sin mouse:
  - Tab para navegar entre elementos
  - Enter/Space para activar
  - Flechas para navegar en listas/tablas
  - Esc para cerrar modales
- Indicador visual de foco (outline destacado)
- Skip links: Saltar al contenido principal
- Orden lógico de tabindex

**Implementación**:
- Revisar todos los componentes para accesibilidad
- Añadir `tabIndex` donde falte
- Mejorar estilos de `:focus`
- Componente `SkipLink`
- Testing con solo teclado

---

### 35. Contraste mejorado
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Baja

**Qué hacer**:
- Verificar ratios de contraste WCAG AA (mínimo 4.5:1)
- Ajustar colores de texto/fondo
- Mejorar contraste en:
  - Texto sobre fondos de colores
  - Botones deshabilitados
  - Bordes y separadores
  - Placeholders

**Implementación**:
- Usar herramienta de verificación de contraste
- Ajustar colores en `tailwind.config.js`
- Revisar todos los componentes
- Testing con herramientas de accesibilidad

---

### 36. Tamaño de fuente ajustable
**Estado**: Pendiente  
**Prioridad**: Baja  
**Complejidad**: Baja

**Qué hacer**:
- Selector de tamaño de fuente: Pequeño / Normal / Grande / Muy Grande
- Aplicar a toda la aplicación
- Guardar preferencia en localStorage
- Usar clases CSS con `rem` para escalabilidad

**Implementación**:
- Context `FontSizeContext` o estado global
- Clases CSS: `text-sm`, `text-base`, `text-lg`, `text-xl`
- Selector en header o settings
- Aplicar clase al contenedor principal

---

### 37. Temas
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Media

**Qué hacer**:
- Toggle para modo claro/oscuro
- Guardar preferencia en backend (opcional) o localStorage
- Transición suave entre temas
- Asegurar que todos los componentes soporten ambos temas

**Implementación**:
- Usar `next-themes` o implementar custom con Context
- Definir colores para ambos temas en Tailwind
- Toggle en header
- Testing de todos los componentes en ambos temas

**Requiere Backend**: ⚠️ (opcional, para sincronizar preferencia - ver BACKEND_REQUIREMENTS.txt sección 9)

---

### 38. Dashboard personalizable
**Estado**: Pendiente  
**Prioridad**: Media  
**Complejidad**: Alta

**Qué hacer**:
- Arrastrar y soltar widgets para reordenar
- Mostrar/ocultar widgets
- Guardar configuración
- Vista de edición del dashboard

**Implementación**:
- Similar a "Widgets personalizables" (#3)
- Usar `react-beautiful-dnd` o `@dnd-kit`
- Guardar orden y visibilidad
- Modo "Editar dashboard"

**Requiere Backend**: ✅ (ver BACKEND_REQUIREMENTS.txt sección 1)

---

### 39. Insights automáticos
**Estado**: Pendiente  
**Prioridad**: Alta  
**Complejidad**: Alta

**Qué hacer**:
- Sección "Insights" en Dashboard
- Mostrar análisis automáticos:
  - "Has gastado 20% más este mes en Alimentación"
  - "Tu patrimonio ha crecido 15% este trimestre"
  - "Tendencia: tus ingresos están subiendo"
  - "Alerta: has excedido el presupuesto de Transporte"
- Actualizar automáticamente
- Priorizar insights más relevantes

**Implementación**:
- Componente `InsightsPanel` nuevo
- Funciones de análisis:
  - Comparar períodos
  - Detectar cambios significativos
  - Calcular tendencias
- Mostrar como cards con iconos
- Integrar con datos existentes

**Requiere Backend**: ⚠️ (opcional, para cálculos complejos - ver BACKEND_REQUIREMENTS.txt sección 10)

---

## 📋 RESUMEN DE PRIORIDADES

### Alta Prioridad (Implementar primero)
1. ✅ Filtros rápidos predefinidos (con mes anterior/siguiente)
2. ✅ Gráficos interactivos mejorados (zoom, exportar PNG, leyenda interactiva)
3. ✅ Indicadores de tendencia
4. ✅ Resumen ejecutivo (mejorado con fechas del período)
5. ✅ Gráfico de evolución de patrimonio neto
6. Vista de comparación
7. Plantillas de transacciones recurrentes
8. ✅ Modo rápido de entrada (botón funcional, atajos temporalmente deshabilitados)
9. ✅ Búsqueda avanzada (texto, tipo, importes, categorías)
10. ✅ Vista de tabla mejorada (ordenamiento, exportar CSV)
11. Alertas de presupuesto
12. Estadísticas por categoría
13. Mejoras móviles específicas
14. Insights automáticos

### Eliminadas/Descartadas
- ❌ Heatmap de gastos (descartado - ocupa mucho espacio)
- ❌ Filtro por activo/pasivo (eliminado - no se usaba)
- ❌ Filtro por rango de importes (eliminado - no se usaba)

### Media Prioridad
15. Widgets personalizables
16. Heatmap de gastos
17. Filtro por activo/pasivo
18. ⚠️ Atajos de teclado (temporalmente deshabilitados)
19. Vista de calendario
20. ✅ Agrupación por categoría padre
21. Análisis de patrones
22. Vista de cartera
23. Comparación de activos
24. Calculadora de préstamos
25. Simulador de pagos
26. Colores personalizados
27. Undo/Redo
28. Navegación por teclado
29. Temas
30. Dashboard personalizable

### Baja Prioridad
31. Filtro por rango de importes
32. Historial completo mejorado
33. Gráfico de distribución
34. Vista de timeline
35. Proyección de finalización
36. Filtros visuales
37. Vista de árbol expandida
38. Contraste mejorado
39. Tamaño de fuente ajustable

---

## 🔄 DEPENDENCIAS DEL BACKEND

Las siguientes mejoras requieren endpoints del backend (ver BACKEND_REQUIREMENTS.txt):

- ✅ **Requerido**: Widgets personalizables, Plantillas, Alertas de presupuesto, Colores personalizados
- ⚠️ **Recomendado**: Vista de comparación, Búsqueda avanzada, Estadísticas por categoría, Insights automáticos
- ⚠️ **Opcional**: Temas (para sincronizar preferencia)
