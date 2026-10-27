# LA NUEVE

Sistema privado de gestión para una cervecería artesanal de Trinidad, Flores. La primera versión está pensada para iPhone y cubre catálogo, ventas, stock, gastos, compras de insumos, historial de movimientos y planificación básica de lotes.

> **Estado:** primera versión operativa con catálogo, ventas, compras, gastos, ajustes de stock, lotes, escáner, usuarios y estado de conexión a la base. Los registros reales comienzan vacíos; no hay productos ni precios de demostración. La verificación física de cámara requiere un iPhone con Safari y HTTPS.

## Stack y arquitectura

- Next.js App Router, React y TypeScript estricto.
- PostgreSQL de Neon mediante Prisma y el adaptador serverless `@prisma/adapter-neon`.
- Rutas de servidor validan datos con Zod y usan transacciones Prisma para ventas, compras y movimientos.
- Sesiones JWT en cookie HTTP-only, SameSite Lax y Secure en producción; contraseñas verificadas con bcrypt.
- PWA con manifest, iconos, service worker y caché de recursos estáticos. La API y las operaciones nunca se almacenan offline.
- Interfaz responsive iPhone-first con safe areas, navegación inferior y escaneo de códigos ZXing.

## Desarrollo local

Requisitos: Node.js 20.9+ y una base PostgreSQL compatible con Neon.

```bash
npm install
cp .env.example .env
```

Completá `.env` con valores privados. Generá un secreto de sesión con `openssl rand -base64 32` y configurá una cadena de conexión de desarrollo distinta a la de producción. En PowerShell se puede generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

```bash
npm run db:migrate
npx tsx prisma/seed.ts
npm run dev
```

El seed requiere `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD` (mínimo 12 caracteres). El seed crea el primer administrador solo si ese correo no existe; no incluyas la contraseña en Git. Desde la sección **Equipo**, un administrador puede crear operadores o administradores y activar/desactivar accesos. El último administrador activo no se puede desactivar.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Cadena PostgreSQL privada de Neon; no lleva prefijo `NEXT_PUBLIC_`. |
| `AUTH_SECRET` | Secreto aleatorio de al menos 32 caracteres para firmar sesiones. |
| `INITIAL_ADMIN_NAME` | Nombre del usuario inicial creado por el seed. |
| `INITIAL_ADMIN_EMAIL` | Correo del usuario inicial. |
| `INITIAL_ADMIN_PASSWORD` | Contraseña inicial temporal, nunca versionada. |

## Neon y migraciones

1. El proyecto Neon de producción creado para LA NUEVE se llama `la-nueve` y está en AWS South America East 1 (São Paulo). Conservá la cadena pooled para la aplicación serverless.
2. Creá otra rama/base de desarrollo para desarrollo local. No pruebes migraciones sobre la base de producción.
3. Copiá la cadena elegida a `DATABASE_URL` y confirmá que requiera SSL (`sslmode=require`).
4. Ejecutá `npm run db:migrate` localmente para crear y versionar cambios de esquema.
5. Para producción, luego de revisar el cambio, ejecutá `npm run db:deploy` como paso controlado antes de servir la versión que requiere esa migración. No se migran bases en cada arranque.

Las migraciones están en `prisma/migrations`. Los backups y la restauración point-in-time dependen del plan y la retención configurados en Neon. Activá y revisá retención/recuperación, conserva una copia lógica periódica si el plan lo requiere y ensayá la restauración en una base separada antes de depender de ella.

## Comandos

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run db:studio
```

## Vercel

1. Importá el repositorio `Mateo14RDGZ/SistemaLaNUEVE` desde Vercel con el preset Next.js.
2. Configurá `DATABASE_URL` y `AUTH_SECRET` como variables privadas para Preview y Production por separado. Configurá variables de seed solo durante el bootstrap; quitá `INITIAL_ADMIN_PASSWORD` después.
3. Mantené una base Neon de Preview/desarrollo separada de Production.
4. Antes del primer despliegue funcional, aplicá `npm run db:deploy` a la base correspondiente desde un entorno controlado. La ruta administrativa `/api/system/health` confirma conectividad y muestra la última migración aplicada sin revelar valores de configuración.
5. Desplegá y verificá inicio de sesión, creación de catálogo, venta y descuento transaccional, exportación CSV, manifest, service worker y HTTPS. Un build verde por sí solo no verifica la conexión a Neon.

No hay `vercel.json`: Next.js configura el build. No se configura despliegue automático de migraciones.

## Instalar en iPhone

Abrí la URL desplegada en Safari, iniciá sesión y usá **Compartir → Añadir a pantalla de inicio**. La app ofrece `display: standalone`, iconos, `apple-touch-icon`, viewport con `viewport-fit=cover` y márgenes de áreas seguras. El escaneo abre la cámara trasera cuando el dispositivo y Safari dan permiso. La cámara requiere HTTPS; si no está disponible, se puede ingresar SKU/código manualmente. Este entorno no tiene un iPhone físico para verificar cámara, instalación o funcionamiento específico de iOS.

## Seguridad y límites de la versión

- No se envían credenciales de DB al navegador. Las escrituras pasan por API de servidor, autenticación y validación.
- Las ventas usan clave de idempotencia, stock condicional y transacción; reintentos con la misma clave no duplican el movimiento.
- Una compra de insumos genera inventario, movimiento y gasto asociado atómicamente; el gasto de compra no se cuenta dos veces.
- Un SKU y un código de barras son únicos en base de datos. Las ventas toman precio y nombre como snapshot histórico.
- Offline se limita a recursos estáticos y una página informativa. No se confirma ninguna operación si el servidor no respondió.
- El resultado del panel es ingresos menos gastos registrados, no utilidad neta ni margen bruto contable.
- El flujo de lotes registra etapas, volumen embotellado, merma y liberación de unidades al stock. La composición de recetas y el descuento automático de ingredientes al elaborar todavía requieren una interfaz/flujo dedicado.
- La cámara escanea códigos asociados al catálogo; un administrador puede asociar códigos nuevos. Si no hay permiso o HTTPS, el ingreso manual sigue disponible.
- No hay recuperación de contraseña, segundo factor ni límite de intentos de inicio de sesión. Mantener el acceso limitado al equipo autorizado.

## Estado de entrega

Incluye autenticación inicial, productos y variantes, códigos únicos, escaneo/ingreso manual, ventas transaccionales e idempotentes, cancelación administrativa con reposición de stock, compras y gastos, ajustes/mermas/roturas, historial de movimientos, administración de usuarios, panel de salud, dashboard, CSV, estados y liberación de lotes, PWA y guía de despliegue. Los tests unitarios verifican cálculos monetarios, límites de fechas de Uruguay y validación de operaciones. La conexión a Neon y el escaneo con cámara física deben verificarse en los entornos y dispositivos reales; no se simulan con productos ficticios.
