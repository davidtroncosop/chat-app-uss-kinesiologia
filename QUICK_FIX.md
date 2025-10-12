# 🚀 Quick Fix - Apuntar Frontend a Workers

## ❌ Problema

El frontend todavía está apuntando a n8n en lugar del nuevo endpoint de Workers.

## ✅ Solución Rápida

### Opción 1: Usar el fallback (más rápido)

El código ya tiene un fallback a `/api/chat-agent`, pero necesitas asegurarte de que la variable de entorno esté correcta:

1. **En Cloudflare Pages** → Settings → Environment Variables
2. **Busca** `REACT_APP_N8N_WEBHOOK_URL`
3. **Opciones:**
   - **A) Elimínala** (usará el fallback `/api/chat-agent`)
   - **B) Cámbiala** a `/api/chat-agent`

4. **Redeploy:**
   - Ve a Deployments
   - Click en "Retry deployment"

### Opción 2: Forzar el endpoint en el código (más seguro)

Vamos a cambiar el código para que siempre use el nuevo endpoint:

```typescript
// En src/ChatApp.tsx, cambiar de:
const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL || '/api/chat-agent';

// A:
const webhookUrl = '/api/chat-agent';
```

## 🧪 Verificar que funciona

### 1. Abrir DevTools (F12)

1. Ve a la pestaña **Network**
2. Envía un mensaje en el chat
3. Busca la request a `/api/chat-agent`
4. Verifica:
   - ✅ URL debe ser: `https://tu-app.pages.dev/api/chat-agent`
   - ✅ Status debe ser: `200`
   - ✅ Response debe contener: `"success": true`

### 2. Si ves error 404

Significa que el endpoint no existe. Verifica:
- El deploy se completó exitosamente
- El archivo `functions/api/chat-agent.js` existe en el repo
- Espera 2-3 minutos después del deploy

### 3. Si ves error 500

Significa que hay un error en el Worker. Verifica:
- `GOOGLE_GEMINI_API_KEY` está configurada en Cloudflare
- Los logs en Cloudflare Functions para ver el error específico

## 📋 Checklist

- [ ] Variable `REACT_APP_N8N_WEBHOOK_URL` eliminada o cambiada en Cloudflare
- [ ] Nuevo deploy realizado
- [ ] Esperado 2-3 minutos después del deploy
- [ ] Probado enviando un mensaje
- [ ] Verificado en Network DevTools que llama a `/api/chat-agent`

## 🔍 Debug

Si todavía no funciona, verifica en DevTools → Network:

```javascript
// La request debe verse así:
POST https://tu-app.pages.dev/api/chat-agent

// Headers:
Content-Type: application/json

// Body:
{
  "body": {
    "data": {
      "message": {
        "conversation": "tu mensaje"
      },
      "key": {
        "id": "session_xxx"
      }
    }
  }
}

// Response esperada:
{
  "success": true,
  "response": "respuesta del AI",
  "sessionId": "session_xxx",
  "timestamp": "2025-01-27T..."
}
```

---

**Solución más rápida:** Elimina la variable `REACT_APP_N8N_WEBHOOK_URL` de Cloudflare y haz redeploy. El código usará automáticamente `/api/chat-agent`. 🚀
