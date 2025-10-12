# 🚀 Quick Start: Activar RAG en 10 Minutos

## ❌ Problema Actual

El RAG no funciona porque **Supabase no está configurado**.

## ✅ Solución Rápida (3 Comandos)

### 1. Configurar Supabase (5 min)

```bash
# 1. Crear proyecto en https://supabase.com
# 2. Copiar URL y API Key
# 3. Agregar a .env.local:

echo "SUPABASE_URL=https://xxxxx.supabase.co" >> .env.local
echo "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." >> .env.local
```

### 2. Crear Tabla en Supabase (2 min)

1. Ve a Supabase → SQL Editor
2. Pega y ejecuta:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id BIGINT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT documents.id, documents.content, documents.metadata,
         1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END; $$;
```

### 3. Cargar Documentos (3 min)

**Opción A: Desde tu JSON**

```bash
# Configurar variables
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export GOOGLE_GEMINI_API_KEY="tu_key"

# Convertir JSON a documentos
node scripts/convert-json-to-supabase.js ~/Downloads/chat\ uss\ kine.json
```

**Opción B: Documento de ejemplo**

```bash
node scripts/upload-documents-to-supabase.js
```

## 🧪 Verificar

```bash
./test-rag-debug.sh
```

Deberías ver:
- ✅ SUPABASE_URL configurada
- ✅ Embedding generado
- ✅ Tabla 'documents' existe
- ✅ Documentos encontrados: X

## 🎯 Resultado

Ahora cuando preguntes:

**"¿Cuáles son los requisitos de admisión?"**

El sistema:
1. ✅ Genera embedding de la pregunta
2. ✅ Busca en Supabase documentos similares
3. ✅ Usa esos documentos para responder
4. ✅ Respuesta basada en tus datos reales

## 📚 Documentación Completa

- `SETUP_SUPABASE_RAG.md` - Guía detallada paso a paso
- `CLOUDFLARE_WORKERS_SETUP.md` - Setup completo del Worker
- `TEST_CHAT_AGENT.md` - Testing y debugging

## 🆘 Problemas Comunes

### "SUPABASE_URL no configurada"
```bash
# Agregar a .env.local
echo "SUPABASE_URL=https://xxxxx.supabase.co" >> .env.local
echo "SUPABASE_KEY=tu_key" >> .env.local
```

### "relation 'documents' does not exist"
```bash
# Ejecutar SQL en Supabase SQL Editor (ver paso 2)
```

### "Documentos encontrados: 0"
```bash
# Cargar documentos (ver paso 3)
node scripts/upload-documents-to-supabase.js
```

## 💡 Tips

- **Gratis**: Supabase free tier incluye 500MB de base de datos
- **Rápido**: Búsqueda vectorial en <100ms
- **Escalable**: Soporta millones de documentos
- **Compatible**: Funciona con text-embedding-004 (768 dimensiones)

## 🔗 Links Útiles

- [Crear cuenta Supabase](https://supabase.com)
- [Obtener Gemini API Key](https://makersuite.google.com/app/apikey)
- [Documentación pgvector](https://github.com/pgvector/pgvector)
