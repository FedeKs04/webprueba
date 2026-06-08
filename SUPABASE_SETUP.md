# Configuración de Supabase Auth

## Conectar el proyecto

1. Crear un proyecto en https://supabase.com/dashboard.
2. Abrir `Project Settings > API`.
3. Copiar `Project URL` y la clave `Publishable`.
4. Pegarlas en `supabase-config.js`.
5. No usar nunca la clave `service_role` en archivos del navegador.

## Configurar autenticación

En `Authentication > URL Configuration`:

- Site URL: `https://rehardware.vercel.app`
- Redirect URLs:
  - `https://rehardware.vercel.app/**`
  - `http://localhost:4173/**`

En `Authentication > Providers > Email`, mantener habilitado Email/Password.

Para una demostración académica rápida se puede desactivar `Confirm email`. Si se
mantiene activado, cada usuario deberá confirmar su correo antes de iniciar sesión.

## Crear el usuario de prueba

Los usuarios de Auth no deben insertarse manualmente con SQL ni crearse con una
clave `service_role` desde el frontend.

1. Ir a `Authentication > Users`.
2. Seleccionar `Add user > Create new user`.
3. Email: `fedeyegros2004@gmail.com`
4. Password: `fede1234`
5. Activar `Auto Confirm User`.
6. Crear el usuario.

## Funcionalidad implementada

- Registro con nombre, correo y contraseña.
- Login y persistencia automática de la sesión.
- Compatibilidad con confirmación de correo.
- Recuperación de contraseña.
- Mensajes de error seguros.
- Cierre de sesión.
- Estado del usuario en el encabezado.
- Página protegida `cuenta.html`.

Supabase no distingue públicamente entre un correo inexistente y una contraseña
incorrecta durante el login. La interfaz usa un mensaje genérico para evitar
revelar qué correos están registrados.

## Crear las tablas

La migración está versionada en:

`supabase/migrations/20260607230000_initial_schema.sql`

La corrección del trigger que crea y sincroniza perfiles está en:

`supabase/migrations/20260608024000_harden_user_profile_trigger.sql`

Si la integración de GitHub está habilitada en `Project Settings > Integrations`:

1. Configurar `Working directory` como `.`.
2. Activar `Deploy to production`.
3. Al hacer push a `main`, Supabase aplicará las migraciones nuevas.

Alternativamente, con Supabase CLI:

```bash
supabase login
supabase link --project-ref ektceqimrdcabmjjbolv
supabase db push
```

La migración crea:

- `profiles`: perfil asociado automáticamente a `auth.users`.
- `repair_requests`: solicitudes y seguimiento de reparaciones.
- `reviews`: reseñas públicas de usuarios registrados.
- Políticas RLS para separar los datos de cada cliente.

## Correos de autenticación

Mientras se use el servidor de correo compartido de Supabase, `Confirm email`
permanece desactivado para evitar que su límite de envíos bloquee el registro.
Antes de un lanzamiento público, configurar SMTP propio en Authentication y
volver a activar `Confirm email`.
