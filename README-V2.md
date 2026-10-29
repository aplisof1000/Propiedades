# Gestor de Propiedades V2

## Qué contiene
Versión multiusuario preparada para Supabase:
- Autenticación por correo y contraseña.
- Base de datos PostgreSQL.
- Seguridad RLS por usuario.
- Propiedades.
- Propietarios.
- Arrendatarios.
- Arriendos.
- Impuestos.
- Administración.
- Mantenimiento.
- Pagos.
- Documentos (metadatos y bucket de Storage preparado).
- Dashboard.
- CRUD de los módulos principales.

## Configuración de Supabase
1. Cree un proyecto en Supabase.
2. Abra SQL Editor y ejecute `supabase-schema-v2.sql`.
3. Vaya a Project Settings > API.
4. Copie la URL del proyecto y la clave pública/anon en `config.js`.
5. Abra `index.html` o publique la carpeta en GitHub Pages/Vercel.
6. Regístrese desde la pantalla de acceso.

## Seguridad
El frontend contiene solamente la clave pública de Supabase. La protección real la proporcionan las políticas RLS incluidas en el SQL.
No coloque nunca una service_role key en `config.js`.

## Próxima iteración
- Carga real de archivos al bucket.
- Roles y permisos administrativos.
- Propietarios con porcentajes de participación.
- Renovación automática de contratos.
- Alertas de vencimiento.
- Dashboard financiero.
- Exportación Excel/PDF.
- Auditoría.
- Multiempresa/portafolios.
