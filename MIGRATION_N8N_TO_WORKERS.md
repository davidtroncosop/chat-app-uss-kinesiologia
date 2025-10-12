# Migración de n8n a Cloudflare Workers

## 🎯 Objetivo

Migrar el flujo completo de n8n a Cloudflare Workers para resolver problemas de memoria (servidor con solo 1GB RAM) y mejorar rendimiento, confiabilidad y costos.

## 📊 Comparación

| Aspecto | n8n (Actual) | Cloudflare Workers (Nuevo) |
|---------|--------------|----------------------------|
| **RAM** | 1GB (limitado) | Ilimitado (auto-scaling) |
| **Uptime** | ~95% (se cae) | 99.99% |
| **Velocidad** | Variable | Edge computing (rápido) |
| **Costo** | Servidor 24/7 | Pay-per-use (muy bajo) |
| **Mantenimiento** | Alto | Mínimo |
| **Escalabilidad** | Manual | Automática |

## 🚀 Pasos de Migración

### 1. Configurar Variables de Entorno en Cloudflare

Ve a **Cloudflare Pages → Settings → Environment Variables** y agrega:

```env
# Google Gemini API
GOOGLE_GEMINI_API_KEY=tu_api_key_aqui

# Supabase (para RAG - Knowledge Base)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key

# PostgreSQL (opcional - para historial)
DATABASE_URL=postgresql://user:password@host:5432/database
```

#### Obtener API Keys:

**Google Gemini:**
1. Ve a https://makersuite.google.com/app/apikey
2. Crea un nuevo API key
3. Copia el key

**Supabase:**
1. Ve a tu proyecto en Supabase
2. Settings → API
3. Copia `URL` y `anon public` key

### 2. Setup Supabase (Knowledge Base)

Ejecuta estos SQL en Supabase SQL Editor:

```sql
-- 1. Habilitar extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear tabla de documentos
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índice para búsqueda vectorial
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Crear función de búsqueda semántica
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Cargar Documentos a Supabase

#### Opción A: Usar el script automatizado

```bash
# Configurar variables de entorno
export GOOGLE_GEMINI_API_KEY="tu_key"
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_KEY="tu_key"

# Ejecutar script
node scripts/upload-documents-to-supabase.js
```

#### Opción B: Cargar manualmente

1. Prepara tus documentos en formato `.txt` o `.md`
2. Colócalos en la carpeta `documents/`
3. Modifica el script para procesar el directorio
4. Ejecuta el script

### 4. Setup PostgreSQL (Historial de Chat - Opcional)

Si quieres mantener historial de conversaciones:

```sql
-- Crear tabla de historial
CREATE TABLE chat_history (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_chat_history_session 
ON chat_history(session_id, created_at DESC);
```

### 5. Actualizar Configuración del Chat

El archivo `.env.local` ya está actualizado para usar el nuevo endpoint:

```env
REACT_APP_N8N_WEBHOOK_URL=/api/chat-agent
```

### 6. Desplegar a Cloudflare

```bash
# Commit y push
git add .
git commit -m "Migrate n8n flow to Cloudflare Workers"
git push origin main
```

Cloudflare Pages detectará el push y desplegará automáticamente.

### 7. Testing

#### Test local:

```bash
# Build del proyecto
npm run build

# Test con wrangler
npx wrangler pages dev build

# Test del endpoint
curl -X POST http://localhost:8788/api/chat-agent \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "data": {
        "message": {
          "conversation": "¿Qué es kinesiología?"
        },
        "key": {
          "id": "test_session"
        }
      }
    }
  }'
```

#### Test en producción:

1. Abre la aplicación en tu navegador
2. Envía un mensaje de prueba
3. Verifica que recibas respuesta del AI
4. Revisa los logs en Cloudflare Dashboard

## 🔍 Verificación

### Checklist de Migración:

- [ ] Variables de entorno configuradas en Cloudflare
- [ ] Supabase setup completado (tabla + función)
- [ ] Documentos cargados a Supabase con embeddings
- [ ] PostgreSQL configurado (opcional)
- [ ] Código desplegado a Cloudflare
- [ ] Tests pasando correctamente
- [ ] Chat funcionando con el nuevo endpoint

### Verificar que funciona:

1. **Envía mensaje simple**: "Hola"
   - Debe responder como asistente de kinesiología

2. **Pregunta sobre documentos**: "¿Cuáles son los requisitos de admisión?"
   - Debe buscar en knowledge base y responder con información específica

3. **Conversación con contexto**: Envía varios mensajes seguidos
   - Debe mantener contexto de la conversación

## 🐛 Troubleshooting

### Error: "GOOGLE_GEMINI_API_KEY no configurada"

**Solución:**
1. Ve a Cloudflare Pages → Settings → Environment Variables
2. Agrega `GOOGLE_GEMINI_API_KEY` con tu API key
3. Redeploy el proyecto

### Error: "Supabase error: 401"

**Solución:**
1. Verifica que `SUPABASE_URL` y `SUPABASE_KEY` sean correctos
2. Asegúrate de usar el `anon public` key, no el `service_role` key
3. Verifica que la tabla `documents` exista

### Error: "No se recibió respuesta de Gemini"

**Solución:**
1. Verifica que tu API key de Gemini sea válida
2. Revisa los logs en Cloudflare Dashboard → Functions
3. Verifica que no hayas excedido el rate limit de Gemini

### No encuentra documentos relevantes

**Solución:**
1. Verifica que los documentos estén cargados en Supabase
2. Revisa que los embeddings se hayan generado correctamente
3. Ajusta el `match_threshold` en el código (actualmente 0.7)

## 📈 Monitoreo

### Cloudflare Dashboard

1. Ve a **Cloudflare Pages → tu-proyecto**
2. Click en **Functions**
3. Revisa:
   - Requests por minuto
   - Errores
   - Latencia
   - Logs en tiempo real

### Métricas importantes:

- **Requests/min**: Cuántas consultas procesa
- **Error rate**: Debe ser < 1%
- **P50 latency**: Debe ser < 500ms
- **P99 latency**: Debe ser < 2s

## 💰 Costos Estimados

### Cloudflare Workers:
- **Gratis**: Hasta 100,000 requests/día
- **Paid**: $5/mes por 10 millones de requests adicionales

### Google Gemini API:
- **Gratis**: 60 requests/minuto
- **Paid**: Muy económico, ~$0.001 por request

### Supabase:
- **Gratis**: Hasta 500MB de base de datos
- **Paid**: $25/mes por 8GB

**Total estimado**: $0-30/mes (vs servidor dedicado $50-100/mes)

## 🎉 Beneficios de la Migración

✅ **Sin caídas**: 99.99% uptime garantizado
✅ **Más rápido**: Edge computing, respuestas en <500ms
✅ **Escalable**: Auto-scaling automático
✅ **Económico**: Pay-per-use, muy bajo costo
✅ **Global**: Desplegado en 200+ ubicaciones
✅ **Mantenimiento**: Mínimo, sin servidor que mantener

## 📚 Recursos

- [Documentación Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Supabase Vector Docs](https://supabase.com/docs/guides/ai)
- [CLOUDFLARE_WORKERS_SETUP.md](./CLOUDFLARE_WORKERS_SETUP.md) - Documentación técnica detallada

## 🆘 Soporte

Si tienes problemas con la migración:

1. Revisa los logs en Cloudflare Dashboard
2. Verifica que todas las variables de entorno estén configuradas
3. Prueba el endpoint localmente con wrangler
4. Revisa la documentación técnica en CLOUDFLARE_WORKERS_SETUP.md

---

**¿Listo para migrar?** Sigue los pasos en orden y en ~30 minutos tendrás tu flujo funcionando en Workers sin problemas de memoria. 🚀
