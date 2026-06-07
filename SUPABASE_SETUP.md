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
