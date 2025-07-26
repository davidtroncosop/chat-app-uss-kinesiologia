# Chat App USS Kinesiología

Aplicación de chat integrada con n8n para asistencia virtual de la escuela de kinesiología USS.

## 🚀 Despliegue en Cloudflare Pages

### Opción 1: Desde el Dashboard de Cloudflare

1. Ve a [Cloudflare Pages](https://pages.cloudflare.com/)
2. Conecta tu repositorio de GitHub/GitLab
3. Configura las variables de entorno:
   - `REACT_APP_N8N_WEBHOOK_URL`: Tu URL del webhook de n8n

### Opción 2: Usando Wrangler CLI

```bash
# Instalar Wrangler
npm install -g wrangler

# Autenticarse
wrangler login

# Desplegar
wrangler pages deploy dist --project-name chat-app-uss-kinesiologia
```

## 🔧 Configuración de Variables de Entorno

### En Cloudflare Pages Dashboard:
1. Ve a tu proyecto en Cloudflare Pages
2. Settings → Environment variables
3. Agrega:
   - **Variable**: `REACT_APP_N8N_WEBHOOK_URL`
   - **Value**: `https://n8n.dtroncoso.site/webhook/937141bc-6966-4adb-bddd-7f4004210f7d`

### Para desarrollo local:
```bash
# Copia el archivo de ejemplo
cp .env.example .env.local

# Edita .env.local con tus valores
```

## 📦 Build Commands para Cloudflare Pages

- **Build command**: `npm run build`
- **Build output directory**: `dist` o `build`
- **Root directory**: `/` (raíz del proyecto)

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start

# Build para producción
npm run build
```

## 🔗 Integración con n8n

La aplicación se conecta a tu workflow de n8n mediante webhook. El payload enviado incluye:

```json
{
  "body": {
    "data": {
      "message": {
        "conversation": "mensaje del usuario",
        "messageType": "text"
      },
      "pushName": "Usuario Web",
      "key": {
        "id": "msg_timestamp",
        "remoteJid": "session_id@web.client"
      }
    },
    "instance": "web-chat",
    "date_time": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔒 Seguridad

- Las variables de entorno mantienen las URLs sensibles fuera del código
- CORS configurado para dominios específicos
- Validación de entrada en el frontend

## 📱 Características

- ✅ Chat en tiempo real
- ✅ Indicador de escritura
- ✅ Historial de sesión
- ✅ Responsive design
- ✅ Manejo de errores
- ✅ Variables de entorno
- ✅ Listo para Cloudflare Pages