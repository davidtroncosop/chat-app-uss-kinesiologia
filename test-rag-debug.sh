#!/bin/bash

# Script para diagnosticar problemas con RAG en Cloudflare Workers

echo "🔍 Diagnóstico de RAG - Cloudflare Workers"
echo "=========================================="
echo ""

# Cargar variables de entorno
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Verificar variables críticas
echo "1️⃣ Verificando variables de entorno..."
echo ""

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL no está configurada"
else
  echo "✅ SUPABASE_URL: $SUPABASE_URL"
fi

if [ -z "$SUPABASE_KEY" ]; then
  echo "❌ SUPABASE_KEY no está configurada"
else
  echo "✅ SUPABASE_KEY: ${SUPABASE_KEY:0:20}..."
fi

if [ -z "$GOOGLE_GEMINI_API_KEY" ]; then
  echo "❌ GOOGLE_GEMINI_API_KEY no está configurada"
else
  echo "✅ GOOGLE_GEMINI_API_KEY: ${GOOGLE_GEMINI_API_KEY:0:20}..."
fi

echo ""
echo "2️⃣ Probando generación de embedding con Gemini..."
echo ""

# Test embedding generation
EMBEDDING_RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=$GOOGLE_GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "models/text-embedding-004",
    "content": {
      "parts": [{"text": "requisitos de admisión kinesiología"}]
    }
  }')

if echo "$EMBEDDING_RESPONSE" | grep -q "embedding"; then
  DIMENSION=$(echo "$EMBEDDING_RESPONSE" | grep -o '"values":\[' | wc -l)
  echo "✅ Embedding generado correctamente"
  echo "   Respuesta: ${EMBEDDING_RESPONSE:0:200}..."
else
  echo "❌ Error generando embedding"
  echo "   Respuesta: $EMBEDDING_RESPONSE"
fi

echo ""
echo "3️⃣ Verificando tabla de documentos en Supabase..."
echo ""

# Check if documents table exists
SUPABASE_CHECK=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/documents?select=count" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

if echo "$SUPABASE_CHECK" | grep -q "count"; then
  echo "✅ Tabla 'documents' existe"
  echo "   Respuesta: $SUPABASE_CHECK"
else
  echo "❌ Error accediendo a tabla 'documents'"
  echo "   Respuesta: $SUPABASE_CHECK"
fi

echo ""
echo "4️⃣ Verificando función match_documents..."
echo ""

# Test match_documents function with dummy embedding
MATCH_TEST=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/match_documents" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -d '{
    "query_embedding": [0.1, 0.2, 0.3],
    "match_threshold": 0.5,
    "match_count": 3
  }')

if echo "$MATCH_TEST" | grep -q "error"; then
  echo "❌ Error en función match_documents"
  echo "   Respuesta: $MATCH_TEST"
else
  echo "✅ Función match_documents responde"
  echo "   Respuesta: ${MATCH_TEST:0:200}..."
fi

echo ""
echo "5️⃣ Contando documentos en Supabase..."
echo ""

DOC_COUNT=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/documents?select=id" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

if echo "$DOC_COUNT" | grep -q "\["; then
  COUNT=$(echo "$DOC_COUNT" | grep -o '"id"' | wc -l)
  echo "✅ Documentos encontrados: $COUNT"
  if [ "$COUNT" -eq 0 ]; then
    echo "⚠️  No hay documentos cargados en Supabase"
    echo "   Ejecuta: node scripts/upload-documents-to-supabase.js"
  fi
else
  echo "❌ Error contando documentos"
  echo "   Respuesta: $DOC_COUNT"
fi

echo ""
echo "=========================================="
echo "✅ Diagnóstico completado"
echo ""
