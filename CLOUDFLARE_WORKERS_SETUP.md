# Cloudflare Workers - AI Chat Agent Setup

## 📋 Descripción

Este Worker replica el flujo completo de n8n para el asistente de Kinesiología USS, incluyendo:

- ✅ Google Gemini AI para generación de respuestas
- ✅ Supabase Vector Store para RAG (Retrieval Augmented Generation)
- ✅ PostgreSQL para historial de conversaciones
- ✅ Embeddings con Google Gemini
- ✅ Búsqueda semántica en documentos

## 🔧 Variables de Entorno Requeridas

Configura estas variables en Cloudflare Pages → Settings → Environment Variables:

### Google Gemini API
```
GOOGLE_GEMINI_API_KEY=tu_api_key_de_gemini
```
**Obtener en:** https://makersuite.google.com/app/apikey

### Google Gemini Configuration (Opcional)
```
GEMINI_API_VERSION=v1                       # Default: v1
GEMINI_MODEL=gemini-1.5-flash               # Default: gemini-1.5-flash (rápido y económico)
GEMINI_EMBEDDING_MODEL=text-embedding-004   # Default: text-embedding-004 (dimensión 768)
```
**Modelos disponibles:**
- `gemini-1.5-flash` - Rápido y económico (recomendado)
- `gemini-1.5-pro` - Más potente y preciso
- `gemini-pro` - Solo disponible en v1beta (legacy)

**Modelos de embedding:**
- `text-embedding-004` - Más reciente, dimensión 768 (recomendado)
- `embedding-001` - Legacy, dimensión 768

### Supabase
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_anon_key
```
**Obtener en:** Supabase Dashboard → Settings → API

### PostgreSQL (Opcional - para historial)
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Webhook URL (ya configurada)
```
REACT_APP_N8N_WEBHOOK_URL=/api/chat-agent
```

## 📁 Estructura del Proyecto

```
functions/
├── api/
│   ├── webhook.js          # Webhook simple (legacy)
│   └── chat-agent.js       # Nuevo AI Agent completo
```

## 🚀 Endpoints

### POST /api/chat-agent

**Request:**
```json
{
  "body": {
    "data": {
      "message": {
        "conversation": "¿Cuáles son los requisitos de admisión?"
      },
      "key": {
        "id": "session_123",
        "remoteJid": "user@example.com"
      }
    },
    "date_time": "2025-01-27T18:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Response sent successfully",
  "response": "Los requisitos de admisión son...",
  "sessionId": "session_123",
  "timestamp": "2025-01-27T18:00:00Z"
}
```

## 🔄 Flujo de Procesamiento

1. **Recepción** - Webhook recibe el mensaje
2. **Extracción** - Extrae sessionId, mensaje, metadata
3. **Historial** - Recupera conversaciones previas de PostgreSQL
4. **Búsqueda** - Busca documentos relevantes en Supabase (RAG)
5. **Embedding** - Genera embedding del query con Gemini
6. **Contexto** - Construye contexto con historial + documentos
7. **AI** - Llama a Google Gemini con el contexto completo
8. **Guardado** - Guarda la conversación en PostgreSQL
9. **Respuesta** - Devuelve respuesta formateada

## 📊 Supabase Setup

### 1. Crear tabla de documentos

```sql
-- Crear extensión para vectores
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de documentos
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768), -- Gemini embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 2. Crear función de búsqueda

```sql
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

### 3. Insertar documentos (ejemplo)

```sql
-- Primero genera el embedding usando Gemini API, luego inserta:
INSERT INTO documents (content, metadata, embedding)
VALUES (
  'Contenido del documento sobre kinesiología...',
  '{"source": "manual_estudiante", "page": 1}',
  '[0.123, 0.456, ...]'::VECTOR -- Embedding generado por Gemini
);
```

## 🗄️ PostgreSQL Setup (Chat History)

```sql
-- Tabla de historial de chat
CREATE TABLE chat_history (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'user' o 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por sesión
CREATE INDEX idx_chat_history_session ON chat_history(session_id, created_at DESC);
```

## 🧪 Testing

### Test local con wrangler:

```bash
# Instalar wrangler
npm install -g wrangler

# Test local
wrangler pages dev build --compatibility-date=2024-01-15

# Test del endpoint
curl -X POST http://localhost:8788/api/chat-agent \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "data": {
        "message": {
          "conversation": "Hola, ¿qué es kinesiología?"
        },
        "key": {
          "id": "test_session"
        }
      }
    }
  }'
```

## 📈 Ventajas vs n8n

✅ **Rendimiento**: Workers escala automáticamente
✅ **Costo**: Solo pagas por uso (muy económico)
✅ **Confiabilidad**: 99.99% uptime de Cloudflare
✅ **Velocidad**: Edge computing, respuestas más rápidas
✅ **Sin servidor**: No necesitas mantener servidor con 1GB RAM
✅ **Global**: Desplegado en 200+ ubicaciones

## 🔐 Seguridad

- ✅ Variables de entorno encriptadas
- ✅ CORS configurado
- ✅ Rate limiting automático de Cloudflare
- ✅ Sin exposición de API keys en el código

## 📝 Próximos Pasos

1. **Configurar variables de entorno** en Cloudflare
2. **Setup Supabase** con la tabla y función
3. **Cargar documentos** a Supabase con embeddings
4. **Actualizar webhook URL** en el chat para usar `/api/chat-agent`
5. **Testing** y ajustes de prompts

## 🆘 Troubleshooting

### Error: "GOOGLE_GEMINI_API_KEY no configurada"
- Verifica que la variable esté en Cloudflare Pages → Settings → Environment Variables

### Error: "Supabase error: 401"
- Verifica SUPABASE_URL y SUPABASE_KEY
- Asegúrate de usar el anon key, no el service_role key

### Error: "No se recibió respuesta de Gemini"
- Verifica que tu API key de Gemini sea válida
- Revisa los logs en Cloudflare Dashboard

## 📚 Referencias

- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase Vector](https://supabase.com/docs/guides/ai)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
