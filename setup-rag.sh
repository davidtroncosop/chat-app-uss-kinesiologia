#!/bin/bash

# Script interactivo para configurar RAG con Supabase

echo "🚀 Configuración de RAG - Supabase + Gemini"
echo "==========================================="
echo ""

# Verificar si ya está configurado
if grep -q "SUPABASE_URL" .env.local 2>/dev/null; then
  echo "⚠️  Supabase ya está configurado en .env.local"
  echo ""
  read -p "¿Quieres reconfigurarlo? (s/n): " RECONFIG
  if [ "$RECONFIG" != "s" ]; then
    echo "❌ Cancelado"
    exit 0
  fi
fi

echo "📋 Necesitas:"
echo "   1. Cuenta en Supabase (https://supabase.com)"
echo "   2. Proyecto creado en Supabase"
echo "   3. URL y API Key del proyecto"
echo ""
echo "💡 Si no tienes proyecto, créalo ahora en:"
echo "   https://supabase.com/dashboard/projects"
echo ""

read -p "¿Ya tienes un proyecto en Supabase? (s/n): " HAS_PROJECT

if [ "$HAS_PROJECT" != "s" ]; then
  echo ""
  echo "📝 Pasos para crear proyecto:"
  echo "   1. Ve a https://supabase.com"
  echo "   2. Crea cuenta o inicia sesión"
  echo "   3. Click 'New Project'"
  echo "   4. Completa el formulario"
  echo "   5. Espera ~2 minutos"
  echo "   6. Vuelve aquí cuando esté listo"
  echo ""
  read -p "Presiona ENTER cuando tengas el proyecto creado..."
fi

echo ""
echo "🔑 Obtener credenciales:"
echo "   1. Ve a tu proyecto en Supabase"
echo "   2. Settings → API"
echo "   3. Copia 'Project URL' y 'anon public' key"
echo ""

# Solicitar URL
read -p "📍 Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ Error: URL no puede estar vacía"
  exit 1
fi

# Solicitar API Key
read -p "🔐 Supabase API Key (anon public): " SUPABASE_KEY

if [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Error: API Key no puede estar vacía"
  exit 1
fi

# Verificar Gemini API Key
if grep -q "GOOGLE_GEMINI_API_KEY" .env.local 2>/dev/null; then
  GEMINI_KEY=$(grep "GOOGLE_GEMINI_API_KEY" .env.local | cut -d'=' -f2)
  echo ""
  echo "✅ Gemini API Key ya configurada"
else
  echo ""
  read -p "🤖 Google Gemini API Key: " GEMINI_KEY
  if [ -z "$GEMINI_KEY" ]; then
    echo "❌ Error: Gemini API Key no puede estar vacía"
    echo "   Obtener en: https://makersuite.google.com/app/apikey"
    exit 1
  fi
fi

# Guardar en .env.local
echo ""
echo "💾 Guardando configuración en .env.local..."

# Backup del archivo actual
if [ -f .env.local ]; then
  cp .env.local .env.local.backup
  echo "   Backup creado: .env.local.backup"
fi

# Agregar o actualizar variables
if grep -q "SUPABASE_URL" .env.local 2>/dev/null; then
  # Actualizar existente
  sed -i.bak "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" .env.local
  sed -i.bak "s|SUPABASE_KEY=.*|SUPABASE_KEY=$SUPABASE_KEY|" .env.local
  rm .env.local.bak
else
  # Agregar nuevo
  echo "" >> .env.local
  echo "# Supabase Configuration (RAG)" >> .env.local
  echo "SUPABASE_URL=$SUPABASE_URL" >> .env.local
  echo "SUPABASE_KEY=$SUPABASE_KEY" >> .env.local
fi

# Verificar Gemini
if ! grep -q "GOOGLE_GEMINI_API_KEY" .env.local 2>/dev/null; then
  echo "" >> .env.local
  echo "# Google Gemini API" >> .env.local
  echo "GOOGLE_GEMINI_API_KEY=$GEMINI_KEY" >> .env.local
fi

echo "✅ Configuración guardada"
echo ""

# Test de conexión
echo "🧪 Probando conexión a Supabase..."

TEST_RESPONSE=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

if echo "$TEST_RESPONSE" | grep -q "error"; then
  echo "❌ Error conectando a Supabase"
  echo "   Verifica que la URL y API Key sean correctas"
  echo "   Respuesta: $TEST_RESPONSE"
  exit 1
else
  echo "✅ Conexión exitosa a Supabase"
fi

echo ""
echo "📊 Verificando tabla 'documents'..."

TABLE_CHECK=$(curl -s -X GET \
  "$SUPABASE_URL/rest/v1/documents?select=count" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

if echo "$TABLE_CHECK" | grep -q "relation.*does not exist"; then
  echo "⚠️  Tabla 'documents' no existe"
  echo ""
  echo "📝 Necesitas crear la tabla en Supabase:"
  echo "   1. Ve a Supabase → SQL Editor"
  echo "   2. Copia el SQL de: SETUP_SUPABASE_RAG.md (Paso 4)"
  echo "   3. Pega y ejecuta"
  echo ""
  read -p "¿Quieres abrir la documentación ahora? (s/n): " OPEN_DOCS
  if [ "$OPEN_DOCS" = "s" ]; then
    if command -v open &> /dev/null; then
      open SETUP_SUPABASE_RAG.md
    else
      echo "   Abre manualmente: SETUP_SUPABASE_RAG.md"
    fi
  fi
  echo ""
  echo "⏭️  Cuando hayas creado la tabla, ejecuta:"
  echo "   node scripts/upload-documents-to-supabase.js"
else
  echo "✅ Tabla 'documents' existe"
  
  # Contar documentos
  DOC_COUNT=$(curl -s -X GET \
    "$SUPABASE_URL/rest/v1/documents?select=id" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" | grep -o '"id"' | wc -l)
  
  echo "📚 Documentos en Supabase: $DOC_COUNT"
  
  if [ "$DOC_COUNT" -eq 0 ]; then
    echo ""
    echo "⚠️  No hay documentos cargados"
    echo ""
    read -p "¿Quieres cargar documentos de ejemplo ahora? (s/n): " UPLOAD_DOCS
    if [ "$UPLOAD_DOCS" = "s" ]; then
      echo ""
      echo "📤 Cargando documentos..."
      export SUPABASE_URL="$SUPABASE_URL"
      export SUPABASE_KEY="$SUPABASE_KEY"
      export GOOGLE_GEMINI_API_KEY="$GEMINI_KEY"
      node scripts/upload-documents-to-supabase.js
    fi
  fi
fi

echo ""
echo "==========================================="
echo "✅ Configuración completada"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Crear tabla (si no existe): Ver SETUP_SUPABASE_RAG.md"
echo "   2. Cargar documentos: node scripts/upload-documents-to-supabase.js"
echo "   3. Verificar RAG: ./test-rag-debug.sh"
echo "   4. Probar en el chat"
echo ""
echo "📚 Documentación:"
echo "   - QUICK_START_RAG.md - Guía rápida"
echo "   - SETUP_SUPABASE_RAG.md - Guía completa"
echo ""
