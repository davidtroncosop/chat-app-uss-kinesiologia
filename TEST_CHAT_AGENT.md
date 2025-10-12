# Testing Chat Agent en Cloudflare Workers

## ✅ Checklist de Configuración

Verifica que hayas configurado estas variables en **Cloudflare Pages → Settings → Environment Variables**:

- [ ] `GOOGLE_GEMINI_API_KEY` - Tu API key de Google Gemini
- [ ] `SUPABASE_URL` - (Opcional por ahora) URL de Supabase
- [ ] `SUPABASE_KEY` - (Opcional por ahora) Anon key de Supabase

**Nota:** El agente ahora funciona solo con `GOOGLE_GEMINI_API_KEY`. Supabase es opcional.

## 🧪 Pruebas Rápidas

### 1. Verificar que el deploy se completó

1. Ve a **Cloudflare Pages → tu-proyecto → Deployments**
2. Verifica que el último deploy tenga estado "Success"
3. Espera ~2 minutos después del deploy

### 2. Probar desde el navegador

Abre tu aplicación y envía estos mensajes de prueba:

#### Test 1: Saludo básico
```
Mensaje: "Hola"
Esperado: Respuesta amigable del asistente de kinesiología
```

#### Test 2: Pregunta general
```
Mensaje: "¿Qué es kinesiología?"
Esperado: Explicación sobre kinesiología
```

#### Test 3: Pregunta sobre la USS
```
Mensaje: "¿Cuáles son los requisitos de admisión?"
Esperado: Información sobre requisitos (general si no hay documentos)
```

### 3. Verificar logs en Cloudflare

1. Ve a **Cloudflare Pages → tu-proyecto → Functions**
2. Click en **Real-time Logs**
3. Envía un mensaje en el chat
4. Deberías ver logs como:
   ```
   📨 Request recibido: {...}
   📝 Datos extraídos: {...}
   💬 Historial recuperado: 0 mensajes
   ⚠️ Knowledge base no disponible, continuando sin documentos
   🤖 Respuesta de AI generada
   ```

## 🐛 Troubleshooting

### Error: "GOOGLE_GEMINI_API_KEY no configurada"

**Solución:**
1. Ve a Cloudflare Pages → Settings → Environment Variables
2. Verifica que `GOOGLE_GEMINI_API_KEY` esté configurada
3. Haz un nuevo deploy (Settings → Deployments → Retry deployment)

### Error: "Error al procesar mensaje"

**Posibles causas:**

1. **API Key inválida:**
   - Verifica tu API key en https://makersuite.google.com/app/apikey
   - Asegúrate de copiarla completa

2. **Rate limit de Gemini:**
   - Gemini free tier: 60 requests/minuto
   - Espera 1 minuto y vuelve a intentar

3. **Payload incorrecto:**
   - Verifica los logs en Cloudflare Functions
   - Busca el error específico

### No recibo respuesta

**Solución:**
1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña Network
3. Envía un mensaje
4. Busca la request a `/api/chat-agent`
5. Revisa la respuesta:
   - Status 200: Todo bien, revisa el response body
   - Status 500: Error del servidor, revisa logs en Cloudflare
   - Status 404: El endpoint no existe, verifica el deploy

## 📊 Verificar que funciona correctamente

### Señales de éxito:

✅ **En el chat:**
- Recibes respuestas coherentes
- El asistente se presenta como especialista en kinesiología
- Las respuestas son relevantes a tus preguntas

✅ **En los logs de Cloudflare:**
- Ves los emojis de log (📨, 📝, 🤖, etc.)
- No hay errores en rojo
- El flujo completa todos los pasos

✅ **En Network DevTools:**
- Status 200 en `/api/chat-agent`
- Response contiene `"success": true`
- Response contiene `"response": "...texto de respuesta..."`

### Señales de problema:

❌ **Error 500:**
- Revisa logs en Cloudflare Functions
- Verifica que GOOGLE_GEMINI_API_KEY esté configurada

❌ **Error 404:**
- El endpoint no existe
- Verifica que el deploy se completó
- Espera 2-3 minutos después del deploy

❌ **Timeout:**
- Gemini puede tardar 5-10 segundos en responder
- Es normal en la primera request (cold start)

## 🚀 Próximos pasos

Una vez que el agente funcione correctamente:

### 1. Cargar documentos a Supabase (opcional pero recomendado)

```bash
# Configurar variables de entorno localmente
export GOOGLE_GEMINI_API_KEY="tu_key"
export SUPABASE_URL="https://remnlovnoyzcvsqxuegr.supabase.co"
export SUPABASE_KEY="tu_anon_key"

# Ejecutar script
node scripts/upload-documents-to-supabase.js
```

### 2. Configurar PostgreSQL para historial (opcional)

Agrega la variable de entorno en Cloudflare:
```
DATABASE_URL=postgresql://postgres.remnlovnoyzcvsqxuegr:password@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

### 3. Monitorear uso

- **Cloudflare Dashboard:** Requests, errores, latencia
- **Google Cloud Console:** Uso de Gemini API
- **Supabase Dashboard:** Queries a la base de datos

## 💡 Tips

1. **Primera request lenta:** Es normal (cold start). Las siguientes serán rápidas.

2. **Rate limits:** Gemini free tier tiene límites. Si los excedes, espera o upgrade.

3. **Logs útiles:** Los logs en Cloudflare Functions son tu mejor amigo para debugging.

4. **Testing local:** Usa `wrangler pages dev build` para probar localmente antes de deploy.

## 📞 ¿Necesitas ayuda?

Si algo no funciona:

1. **Revisa los logs** en Cloudflare Functions
2. **Verifica las variables** de entorno
3. **Prueba con curl** para aislar el problema:

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

---

**Estado actual:** El agente está configurado para funcionar inmediatamente con solo la API key de Gemini. Supabase y PostgreSQL son opcionales y pueden agregarse después. 🚀
