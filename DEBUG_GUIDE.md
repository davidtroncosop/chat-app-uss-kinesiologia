# 🐛 Guía de Debugging - Chat Agent

## 📋 Pasos para identificar el problema

### 1. Abrir DevTools del navegador

1. Presiona **F12** (o Click derecho → Inspeccionar)
2. Ve a la pestaña **Console**
3. Ve a la pestaña **Network**

### 2. Enviar un mensaje de prueba

Envía "Hola" en el chat y observa:

#### En la pestaña Console:

Deberías ver logs como:
```
📤 Enviando request a: /api/chat-agent
📦 Payload: {...}
📡 Response status: 200
✅ Response data: {...}
```

#### En la pestaña Network:

Busca la request a `chat-agent` y verifica:

**Si ves Status 404:**
```
❌ Problema: El endpoint no existe
✅ Solución: 
   1. Verifica que el deploy se completó en Cloudflare
   2. Espera 2-3 minutos después del deploy
   3. Verifica que functions/api/chat-agent.js existe en el repo
```

**Si ves Status 500:**
```
❌ Problema: Error en el Worker
✅ Solución:
   1. Ve a Cloudflare Pages → Functions → Real-time Logs
   2. Envía otro mensaje
   3. Lee el error específico en los logs
   
Errores comunes:
- "GOOGLE_GEMINI_API_KEY no configurada"
  → Configura la variable en Cloudflare
  
- "Gemini API error: 400"
  → API key inválida o mal formateada
  
- "Gemini API error: 429"
  → Rate limit excedido, espera 1 minuto
```

**Si ves Status 200 pero error en el chat:**
```
❌ Problema: Respuesta incorrecta del Worker
✅ Solución:
   1. En Network, click en la request
   2. Ve a la pestaña "Response"
   3. Verifica la estructura del JSON
   
Debe verse así:
{
  "success": true,
  "response": "texto de respuesta",
  "sessionId": "session_xxx"
}

Si success es false, lee el campo "error" o "message"
```

### 3. Verificar logs en Cloudflare

1. Ve a **Cloudflare Pages → tu-proyecto**
2. Click en **Functions**
3. Click en **Real-time Logs**
4. Envía un mensaje en el chat
5. Lee los logs en tiempo real

#### Logs esperados (éxito):

```
📨 Request recibido: {...}
📝 Datos extraídos: {sessionId: "...", chatInput: "Hola", ...}
💬 Historial recuperado: 0 mensajes
⚠️ Knowledge base no disponible, continuando sin documentos
🤖 Respuesta de AI generada
💾 Historial guardado
```

#### Logs de error comunes:

**Error: "GOOGLE_GEMINI_API_KEY no configurada"**
```
Solución:
1. Ve a Cloudflare Pages → Settings → Environment Variables
2. Click en "Add variable"
3. Name: GOOGLE_GEMINI_API_KEY
4. Value: tu_api_key_de_gemini
5. Save
6. Retry deployment
```

**Error: "Gemini API error: 400"**
```
Solución:
1. Verifica que tu API key sea correcta
2. Ve a https://makersuite.google.com/app/apikey
3. Genera una nueva API key si es necesario
4. Actualiza la variable en Cloudflare
```

**Error: "Gemini API error: 401"**
```
Solución:
API key inválida o expirada
1. Genera nueva API key en Google AI Studio
2. Actualiza en Cloudflare
```

**Error: "Gemini API error: 429"**
```
Solución:
Rate limit excedido (60 requests/minuto en free tier)
1. Espera 1 minuto
2. Intenta de nuevo
3. Considera upgrade si necesitas más requests
```

## 🔍 Checklist de Verificación

### Variables de Entorno en Cloudflare:

- [ ] `GOOGLE_GEMINI_API_KEY` está configurada
- [ ] El valor es correcto (empieza con "AIza...")
- [ ] Se hizo redeploy después de configurarla

### Deploy:

- [ ] El último deploy tiene status "Success"
- [ ] Han pasado al menos 2-3 minutos desde el deploy
- [ ] El archivo `functions/api/chat-agent.js` existe en el repo

### Frontend:

- [ ] El código apunta a `/api/chat-agent`
- [ ] No hay errores en la consola del navegador
- [ ] La request llega al endpoint correcto

## 🧪 Test Manual con curl

Puedes probar el endpoint directamente:

```bash
curl -X POST https://tu-app.pages.dev/api/chat-agent \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "data": {
        "message": {
          "conversation": "Hola"
        },
        "key": {
          "id": "test_session"
        }
      }
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "response": "¡Hola! Soy el asistente virtual...",
  "sessionId": "test_session",
  "timestamp": "2025-01-27T..."
}
```

## 📊 Errores Comunes y Soluciones

### Error: "Failed to fetch"

**Causa:** Problema de red o CORS

**Solución:**
1. Verifica tu conexión a internet
2. Verifica que el dominio sea correcto
3. Revisa si hay bloqueadores de ads/scripts

### Error: "TypeError: Failed to fetch"

**Causa:** El endpoint no existe o hay problema de CORS

**Solución:**
1. Verifica que el deploy se completó
2. Espera 2-3 minutos
3. Verifica la URL en Network DevTools

### Error: "SyntaxError: Unexpected token"

**Causa:** La respuesta no es JSON válido

**Solución:**
1. Ve a Network → Response
2. Verifica qué está devolviendo el servidor
3. Puede ser un error HTML (404 o 500)

## 🆘 Si nada funciona

1. **Verifica que GOOGLE_GEMINI_API_KEY esté configurada:**
   ```
   Cloudflare Pages → Settings → Environment Variables
   ```

2. **Haz un redeploy limpio:**
   ```
   Cloudflare Pages → Deployments → Retry deployment
   ```

3. **Espera 5 minutos** después del deploy

4. **Prueba con curl** para aislar si es problema del frontend o backend

5. **Revisa los logs** en Cloudflare Functions en tiempo real

6. **Comparte los logs** conmigo para ayudarte a debuggear

---

## 📝 Información útil para debugging

Cuando pidas ayuda, comparte:

1. **Status code** de la request en Network
2. **Response body** completo
3. **Logs de Cloudflare** Functions
4. **Errores en Console** del navegador
5. **Screenshot** de Network DevTools

Esto ayudará a identificar el problema rápidamente. 🚀
