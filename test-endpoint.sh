#!/bin/bash

# Script para probar el endpoint del chat agent

echo "🧪 Probando endpoint del chat agent..."
echo ""

# URL de tu aplicación (cámbiala si es diferente)
URL="https://a0698bdb.chat-app-uss-kinesiologia.pages.dev/api/chat-agent"

echo "📍 URL: $URL"
echo ""

# Payload de prueba
PAYLOAD='{
  "body": {
    "data": {
      "message": {
        "conversation": "Hola"
      },
      "key": {
        "id": "test_session_123"
      }
    }
  }
}'

echo "📤 Enviando request..."
echo ""

# Hacer la request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Separar body y status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "📡 Status Code: $HTTP_CODE"
echo ""
echo "📦 Response:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Verificar resultado
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS: El endpoint funciona correctamente"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ ERROR 404: El endpoint no existe"
    echo "   Verifica que el deploy se completó en Cloudflare"
elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ ERROR 500: Error en el Worker"
    echo "   Revisa los logs en Cloudflare Functions"
    echo ""
    echo "   Posibles causas:"
    echo "   - GOOGLE_GEMINI_API_KEY no configurada"
    echo "   - API key inválida"
    echo "   - Modelo no disponible en la versión de API"
else
    echo "⚠️  Status Code inesperado: $HTTP_CODE"
fi
