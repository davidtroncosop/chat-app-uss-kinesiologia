# 🔧 Fix: Variables de Entorno en Cloudflare

## 🎯 Tu Situación

- ✅ Ya tienes Supabase configurado (funcionaba con n8n)
- ✅ Variables configuradas en Cloudflare
- ❌ El Worker no puede leer las variables (posiblemente encriptadas)

## 🔍 Diagnóstico

### Paso 1: Verificar Variables en Cloudflare

```bash
./check-cloudflare-env.sh
```

Este script te pedirá tu dominio y verificará qué variables están disponibles.

### Paso 2: Ver Logs en Tiempo Real

1. Ve a Cloudflare Pages Dashboard
2. Tu proyecto → View details
3. Functions → Logs
4. Haz una pregunta en el chat
5. Busca estos mensajes:

```
🔍 Verificando configuración de Supabase...
   SUPABASE_URL: https://xxxxx... o NO CONFIGURADA
   SUPABASE_KEY: eyJhbGciOiJIUzI1... o NO CONFIGURADA
```

## ✅ Soluciones Posibles

### Solución 1: Variables en Ambiente Incorrecto

Cloudflare tiene 3 ambientes:
- **Production** (branch: main)
- **Preview** (otros branches)
- **Development** (local)

**Verificar:**
1. Ve a Cloudflare Pages → Settings → Environment Variables
2. Verifica que las variables estén en **Production**
3. Si solo están en Preview, agrégalas a Production también

**Cómo agregar:**
```
Variable name: SUPABASE_URL
Value: https://xxxxx.supabase.co
Environment: Production ✓
```

### Solución 2: Variables con Nombres Incorrectos

Verifica que los nombres sean EXACTAMENTE:
- `SUPABASE_URL` (no `SUPABASE_API_URL` ni `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_KEY` (no `SUPABASE_ANON_KEY` ni `SUPABASE_API_KEY`)
- `GOOGLE_GEMINI_API_KEY` (no `GEMINI_API_KEY`)

### Solución 3: Redeploy Después de Cambios

Las variables solo se aplican en nuevos deploys:

```bash
# Opción A: Trigger redeploy con commit vacío
git commit --allow-empty -m "Trigger redeploy for env vars"
git push

# Opción B: Redeploy desde Cloudflare Dashboard
# Deployments → Latest deployment → Retry deployment
```

### Solución 4: Verificar Binding en wrangler.toml

Si tienes un archivo `wrangler.toml`, verifica que no esté sobrescribiendo las variables:

```toml
# wrangler.toml - NO debería tener esto:
[env.production.vars]
SUPABASE_URL = "..." # ❌ Esto sobrescribe las variables de Cloudflare
```

Si existe, elimínalo y usa solo las variables de Cloudflare Dashboard.

### Solución 5: Variables Encriptadas (Secrets)

Si las variables están como "secrets" encriptadas, el Worker debería poder leerlas igual.

**Verificar:**
1. Cloudflare Pages → Settings → Environment Variables
2. Las variables deberían mostrar "••••••" (encriptadas)
3. Esto es normal y el Worker puede leerlas

**Si no funcionan:**
1. Elimina las variables
2. Agrégalas de nuevo (sin marcar como secret)
3. Redeploy

## 🧪 Testing

### Test 1: Endpoint de Debug

```bash
curl https://tu-dominio.pages.dev/api/debug-env
```

Deberías ver:
```json
{
  "success": true,
  "variables": {
    "SUPABASE_URL": {
      "configured": true,
      "preview": "https://xxxxx.supabase...",
      "length": 50
    },
    "SUPABASE_KEY": {
      "configured": true,
      "preview": "eyJhbGciOiJIUzI1NiIs...",
      "length": 200
    }
  }
}
```

### Test 2: Chat con Logging

1. Abre el chat en tu sitio
2. Abre Cloudflare Dashboard → Functions → Logs
3. Envía mensaje: "¿Cuáles son los requisitos?"
4. Verifica logs:

```
✅ Esperado:
🔍 Verificando configuración de Supabase...
   SUPABASE_URL: https://xxxxx...
   SUPABASE_KEY: eyJhbGciOiJIUzI1...
🔢 Generando embedding con: text-embedding-004
✅ Embedding generado, dimensión: 768
🔎 Buscando documentos similares en Supabase...
✅ Documentos encontrados: 3

❌ Si ves:
⚠️ Supabase no configurado - continuando sin knowledge base
   Variables disponibles en env: [...]
```

## 📋 Checklist de Verificación

- [ ] Variables configuradas en Cloudflare Pages → Settings → Environment Variables
- [ ] Variables en ambiente **Production** (no solo Preview)
- [ ] Nombres exactos: `SUPABASE_URL`, `SUPABASE_KEY`, `GOOGLE_GEMINI_API_KEY`
- [ ] Redeploy después de agregar/modificar variables
- [ ] No hay `wrangler.toml` sobrescribiendo variables
- [ ] Endpoint `/api/debug-env` muestra variables configuradas
- [ ] Logs muestran que las variables se leen correctamente

## 🔧 Configuración Correcta en Cloudflare

### Production Environment Variables

```
GOOGLE_GEMINI_API_KEY = AIzaSy... (tu key actual)
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Opcionales (con defaults en código)

```
GEMINI_API_VERSION = v1
GEMINI_MODEL = gemini-2.0-flash-exp
GEMINI_EMBEDDING_MODEL = text-embedding-004
GEMINI_EMBEDDING_API_VERSION = v1beta
```

## 🆘 Si Nada Funciona

### Opción 1: Hardcodear Temporalmente (Solo para Debug)

En `functions/api/chat-agent.js`:

```javascript
async function searchKnowledgeBase(env, query) {
  try {
    // DEBUG: Hardcodear temporalmente
    const supabaseUrl = env.SUPABASE_URL || 'https://xxxxx.supabase.co';
    const supabaseKey = env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    
    console.log('🔍 DEBUG - URL:', supabaseUrl);
    console.log('🔍 DEBUG - Key:', supabaseKey ? 'Presente' : 'Ausente');
    // ... resto del código
```

⚠️ **IMPORTANTE**: Esto es solo para debug. NO commitees las credenciales reales.

### Opción 2: Usar Cloudflare Workers (no Pages)

Si Pages no funciona, considera migrar a Cloudflare Workers:

```bash
# Instalar wrangler
npm install -g wrangler

# Login
wrangler login

# Crear worker
wrangler init chat-agent

# Deploy
wrangler deploy
```

Workers tienen mejor soporte para variables de entorno.

## 📊 Comparación: n8n vs Cloudflare Workers

| Aspecto | n8n | Cloudflare Workers |
|---------|-----|-------------------|
| Variables | ✅ Directo | ⚠️ Requiere config |
| Acceso | `$env.VARIABLE` | `env.VARIABLE` |
| Encriptación | Automática | Manual |
| Redeploy | No necesario | Necesario |

## 💡 Tip: Migración desde n8n

Si las variables funcionaban en n8n, verifica:

1. **Nombres**: n8n puede usar nombres diferentes
2. **Formato**: n8n puede tener prefijos (ej: `N8N_SUPABASE_URL`)
3. **Scope**: n8n tiene variables globales vs por workflow

Asegúrate de usar los nombres exactos que espera el Worker.

## 🎯 Resultado Esperado

Una vez configurado correctamente:

```bash
# Test
curl https://tu-dominio.pages.dev/api/debug-env

# Respuesta
{
  "success": true,
  "variables": {
    "SUPABASE_URL": { "configured": true },
    "SUPABASE_KEY": { "configured": true },
    "GOOGLE_GEMINI_API_KEY": { "configured": true }
  }
}
```

Y en el chat:
```
Usuario: "¿Requisitos de admisión?"
Bot: "Según la información de la USS, los requisitos son..." [con datos reales]
```

---

**Siguiente paso**: Ejecuta `./check-cloudflare-env.sh` y comparte el resultado.
