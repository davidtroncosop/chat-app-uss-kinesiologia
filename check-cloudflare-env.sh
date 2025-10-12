#!/bin/bash

# Script para verificar variables de entorno en Cloudflare Pages

echo "🔍 Verificación de Variables de Entorno en Cloudflare"
echo "======================================================"
echo ""

# Detectar el dominio de Cloudflare
echo "📝 Ingresa tu dominio de Cloudflare Pages:"
echo "   Ejemplo: mi-chatbot.pages.dev"
read -p "Dominio: " DOMAIN

if [ -z "$DOMAIN" ]; then
  echo "❌ Error: Dominio no puede estar vacío"
  exit 1
fi

# Agregar https:// si no lo tiene
if [[ ! "$DOMAIN" =~ ^https?:// ]]; then
  DOMAIN="https://$DOMAIN"
fi

echo ""
echo "🧪 Probando endpoint de debug..."
echo "   URL: $DOMAIN/api/debug-env"
echo ""

# Hacer request al endpoint de debug
RESPONSE=$(curl -s "$DOMAIN/api/debug-env")

# Verificar si la respuesta es válida
if echo "$RESPONSE" | grep -q "success"; then
  echo "✅ Endpoint respondió correctamente"
  echo ""
  echo "📊 Resultado:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
  
  # Verificar variables críticas
  echo "🔑 Variables Críticas:"
  echo ""
  
  if echo "$RESPONSE" | grep -q '"GOOGLE_GEMINI_API_KEY".*"configured": true'; then
    echo "✅ GOOGLE_GEMINI_API_KEY - Configurada"
  else
    echo "❌ GOOGLE_GEMINI_API_KEY - NO configurada"
  fi
  
  if echo "$RESPONSE" | grep -q '"SUPABASE_URL".*"configured": true'; then
    echo "✅ SUPABASE_URL - Configurada"
  else
    echo "❌ SUPABASE_URL - NO configurada"
  fi
  
  if echo "$RESPONSE" | grep -q '"SUPABASE_KEY".*"configured": true'; then
    echo "✅ SUPABASE_KEY - Configurada"
  else
    echo "❌ SUPABASE_KEY - NO configurada"
  fi
  
  echo ""
  
  # Verificar si RAG puede funcionar
  if echo "$RESPONSE" | grep -q '"SUPABASE_URL".*"configured": true' && \
     echo "$RESPONSE" | grep -q '"SUPABASE_KEY".*"configured": true' && \
     echo "$RESPONSE" | grep -q '"GOOGLE_GEMINI_API_KEY".*"configured": true'; then
    echo "🎉 RAG debería funcionar - Todas las variables están configuradas"
  else
    echo "⚠️  RAG NO funcionará - Faltan variables"
    echo ""
    echo "📝 Para configurar variables en Cloudflare:"
    echo "   1. Ve a Cloudflare Pages Dashboard"
    echo "   2. Selecciona tu proyecto"
    echo "   3. Settings → Environment Variables"
    echo "   4. Agrega las variables faltantes"
    echo "   5. Redeploy el proyecto"
  fi
  
else
  echo "❌ Error: No se pudo conectar al endpoint"
  echo "   Respuesta: $RESPONSE"
  echo ""
  echo "💡 Posibles causas:"
  echo "   1. El dominio es incorrecto"
  echo "   2. El proyecto no está desplegado"
  echo "   3. El archivo functions/api/debug-env.js no existe"
  echo ""
  echo "🔧 Solución:"
  echo "   1. Verifica el dominio en Cloudflare Pages Dashboard"
  echo "   2. Asegúrate de haber hecho deploy del código"
  echo "   3. Ejecuta: git push (para trigger deploy)"
fi

echo ""
echo "======================================================"
echo ""
