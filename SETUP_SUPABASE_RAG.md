# 🚀 Configuración de Supabase para RAG

## Problema Actual

El RAG (Retrieval Augmented Generation) no funciona porque **Supabase no está configurado**.

## ✅ Solución: Configurar Supabase en 5 Pasos

### Paso 1: Crear Proyecto en Supabase

1. Ve a https://supabase.com
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Completa:
   - **Name**: `chatbot-uss-kine` (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña (la necesitarás)
   - **Region**: Elige la más cercana (ej: South America)
5. Click "Create new project" (tarda ~2 minutos)

### Paso 2: Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** → **API**
2. Copia estos valores:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 3: Configurar Variables de Entorno

#### Para Desarrollo Local (.env.local)

Agrega estas líneas a tu archivo `.env.local`:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini (ya lo tienes)
GOOGLE_GEMINI_API_KEY=tu_key_actual
```

#### Para Cloudflare Workers (Producción)

1. Ve a Cloudflare Pages → Tu proyecto
2. Settings → Environment Variables
3. Agrega:
   - `SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `SUPABASE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Paso 4: Crear Tabla y Función en Supabase

1. En Supabase, ve a **SQL Editor**
2. Click "New Query"
3. Pega este SQL completo:

```sql
-- 1. Habilitar extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),  -- Dimensión 768 para text-embedding-004
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear índice para búsqueda vectorial
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Crear función de búsqueda
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

4. Click **Run** (o F5)
5. Deberías ver: "Success. No rows returned"

### Paso 5: Cargar Documentos

Ahora carga documentos con embeddings:

```bash
# Configurar variables de entorno
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export GOOGLE_GEMINI_API_KEY="tu_key"

# Ejecutar script de carga
node scripts/upload-documents-to-supabase.js
```

Este script cargará un documento de ejemplo sobre Kinesiología USS.

## 🧪 Verificar que Funciona

### Opción 1: Script de Diagnóstico

```bash
./test-rag-debug.sh
```

Deberías ver:
- ✅ SUPABASE_URL configurada
- ✅ SUPABASE_KEY configurada
- ✅ Embedding generado
- ✅ Tabla 'documents' existe
- ✅ Función match_documents responde
- ✅ Documentos encontrados: 1 (o más)

### Opción 2: Verificar en Supabase Dashboard

1. Ve a **Table Editor** → `documents`
2. Deberías ver tus documentos cargados
3. Cada documento debe tener:
   - `content`: El texto del documento
   - `metadata`: Información adicional (JSON)
   - `embedding`: Vector de 768 dimensiones

### Opción 3: Test Manual con curl

```bash
# Test de búsqueda
curl -X POST "https://xxxxx.supabase.co/rest/v1/rpc/match_documents" \
  -H "Content-Type: application/json" \
  -H "apikey: tu_anon_key" \
  -H "Authorization: Bearer tu_anon_key" \
  -d '{
    "query_embedding": [0.1, 0.2, 0.3, ...],  # 768 valores
    "match_threshold": 0.5,
    "match_count": 3
  }'
```

## 📊 Cargar Más Documentos

### Opción 1: Desde Archivos

1. Crea carpeta `documents/` en tu proyecto
2. Agrega archivos `.txt` o `.md` con información
3. Modifica `scripts/upload-documents-to-supabase.js`:

```javascript
// Descomentar estas líneas al final del archivo
const documentsDir = './documents';
if (fs.existsSync(documentsDir)) {
  await processDocuments(documentsDir);
}
```

4. Ejecuta: `node scripts/upload-documents-to-supabase.js`

### Opción 2: Desde JSON

Si tienes el archivo `chat uss kine.json`, puedo crear un script para convertirlo a documentos.

### Opción 3: Manual en Supabase

1. Ve a **Table Editor** → `documents`
2. Click "Insert row"
3. Completa:
   - `content`: Tu texto
   - `metadata`: `{"source": "manual"}`
   - `embedding`: Genera primero con Gemini

## 🎯 Resultado Esperado

Una vez configurado, cuando preguntes algo como:

**Usuario:** "¿Cuáles son los requisitos de admisión?"

**Sistema:**
1. ✅ Genera embedding de la pregunta
2. ✅ Busca documentos similares en Supabase
3. ✅ Encuentra documentos relevantes
4. ✅ Construye contexto con los documentos
5. ✅ Gemini responde usando la información de los documentos

**Respuesta:** "Según la información disponible, los requisitos de admisión para Kinesiología en la USS son: [información del documento]..."

## ❓ Troubleshooting

### Error: "Supabase no configurado"

**Causa:** Variables de entorno no configuradas

**Solución:** Verifica que `SUPABASE_URL` y `SUPABASE_KEY` estén en:
- `.env.local` (desarrollo)
- Cloudflare Pages Environment Variables (producción)

### Error: "relation 'documents' does not exist"

**Causa:** Tabla no creada

**Solución:** Ejecuta el SQL del Paso 4 en Supabase SQL Editor

### Error: "function match_documents does not exist"

**Causa:** Función no creada

**Solución:** Ejecuta el SQL del Paso 4 completo

### Error: "Documentos encontrados: 0"

**Causa:** No hay documentos cargados

**Solución:** Ejecuta `node scripts/upload-documents-to-supabase.js`

### Error: "dimension mismatch"

**Causa:** Embeddings con dimensión incorrecta

**Solución:** 
- Verifica que uses `text-embedding-004` (768 dimensiones)
- Recrea la tabla con `VECTOR(768)`

## 📝 Próximos Pasos

1. ✅ Configurar Supabase (este documento)
2. ⏭️ Cargar documentos de Kinesiología USS
3. ⏭️ Probar RAG con preguntas reales
4. ⏭️ Ajustar threshold de similitud (0.7 por defecto)
5. ⏭️ Agregar más documentos según necesidad

## 💡 Tips

- **Threshold**: Valor entre 0 y 1. Más alto = más estricto
  - 0.7 = Recomendado (balance)
  - 0.8 = Muy estricto (solo matches muy similares)
  - 0.5 = Más permisivo (más resultados)

- **Match Count**: Número de documentos a retornar
  - 5 = Recomendado
  - 3 = Menos contexto, respuestas más enfocadas
  - 10 = Más contexto, puede ser redundante

- **Chunks**: Divide documentos largos en chunks de ~1000 caracteres
  - Mejora la precisión de búsqueda
  - Evita contextos muy largos

## 🔗 Referencias

- [Supabase Vector](https://supabase.com/docs/guides/ai/vector-columns)
- [pgvector](https://github.com/pgvector/pgvector)
- [Gemini Embeddings](https://ai.google.dev/docs/embeddings_guide)
