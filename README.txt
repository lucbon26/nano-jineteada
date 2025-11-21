Jineteada – Pack de Estilos (solo CSS, NO cambia lógica ni login)

Incluye dos opciones. Usá solo UNA (la que se ajuste a TU base).
No hay cambios en TSX/JS, rutas, middleware, ni login.

Opción A) Ya tenés `src/app/globals.css` importado en tu layout:
  1) Reemplazá tu `src/app/globals.css` por el de este zip.

Opción B) No querés tocar nada de `src/app`:
  1) Copiá `public/jineteada-theme.css` a tu proyecto.
  2) En tu layout (head), agregá:
     <link rel="stylesheet" href="/jineteada-theme.css" />
  (Con esto no se modifica ninguna ruta ni componente; solo se carga CSS adicional.)

Este CSS es sutil: mejora tipografía, botones, selects y tablas sin
alterar textos/formatos de tus desplegables (ej. "Sede (YYYY-MM-DD)").
