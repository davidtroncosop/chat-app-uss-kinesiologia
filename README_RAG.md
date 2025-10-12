# 🎯 Solución: RAG no funciona

## ❌ Problema

El RAG (Retrieval Augmented Generation) no está funcionando porque **Supabase no está configurado**.

## ✅ Solución en 3 Pasos

### Paso 1: Ejecutar Script de Configuración

```bash
./setup-rag.sh
```

Este script interactivo te guiará para:
- ✅ Configurar credenciales de Supabase
- ✅ Verificar conexión
- ✅ Detectar si falta crear la tabla
- ✅ Opcionalmente cargar documentos de ejemplo

### Paso 2: Crear Tabla en Supabase (si no existe)

1. Ve a https://supabase.com → Tu proyecto → SQL Editor
2. Copia y ejecuta el SQL de `SETUP_SUPABASE_RAG.md` (Paso 4)
3. Verás: "Success. No rows returned"

### Paso 3: Cargar Documentos

**Opción A: Desde tu JSON de conversaciones**

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_KEY="tu_key"
export GOOGLE_GEMINI_API_KEY="tu_key"

node scripts/convert-json-to-supabase.js ~/Downloads/chat\ uss\ kine.json
```

**Opción B: Documento de ejemplo**

```bash
node scripts/upload-documents-to-supabase.js
```

## 🧪 Verificar que Funciona

```bash
./test-rag-debug.sh
```

Deberías ver:
```
✅ SUPABASE_URL: https://xxxxx.supabase.co
✅ SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ GOOGLE_GEMINI_API_KEY: AIzaSy...
✅ Embedding generado correctamente
✅ Tabla 'documents' existe
✅ Función match_documents responde
✅ Documentos encontrados: 5
```

## 🎯 Resultado Esperado

Antes (sin RAG):
```
Usuario: "¿Cuáles son los requisitos de admisión?"
Bot: "Los requisitos típicos de admisión incluyen..." [respuesta genérica]
```

Después (con RAG):
```
Usuario: "¿Cuáles son los requisitos de admisión?"
Bot: "Según la información de la USS, los requisitos de admisión para 
      Kinesiología son: PSU mínimo 500 puntos, ranking percentil 50..." 
      [respuesta basada en tus documentos]
```

## 📁 Archivos Creados

### Scripts
- `setup-rag.sh` - Configuración interactiva (EJECUTAR PRIMERO)
- `test-rag-debug.sh` - Diagnóstico completo del RAG
- `scripts/upload-documents-to-supabase.js` - Cargar documento de ejemplo
- `scripts/convert-json-to-supabase.js` - Convertir JSON a documentos

### Documentación
- `README_RAG.md` - Este archivo (resumen ejecutivo)
- `QUICK_START_RAG.md` - Guía rápida (10 minutos)
- `SETUP_SUPABASE_RAG.md` - Guía completa paso a paso
- `CLOUDFLARE_WORKERS_SETUP.md` - Setup del Worker completo

## 🔧 Configuración Actual

### Variables de Entorno (.env.local)

```bash
# ✅ Configurado
REACT_APP_N8N_WEBHOOK_URL=/api/chat-agent
GOOGLE_GEMINI_API_KEY=tu_key

# ❌ FALTA CONFIGURAR (ejecutar ./setup-rag.sh)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Cloudflare Workers

También necesitas configurar en Cloudflare Pages → Settings → Environment Variables:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GOOGLE_GEMINI_API_KEY` (ya configurado)

## 🆘 Troubleshooting

### "SUPABASE_URL no configurada"
```bash
./setup-rag.sh
```

### "relation 'documents' does not exist"
1. Ve a Supabase → SQL Editor
2. Ejecuta el SQL de `SETUP_SUPABASE_RAG.md`

### "Documentos encontrados: 0"
```bash
node scripts/upload-documents-to-supabase.js
```

### "Error generando embedding"
Verifica que `GOOGLE_GEMINI_API_KEY` sea válida:
```bash
echo $GOOGLE_GEMINI_API_KEY
```

### "Supabase error: 401"
Verifica que uses el `anon public` key, no el `service_role` key

## 💡 Información Técnica

### Modelo de Embedding
- **Modelo**: `text-embedding-004` (Google Gemini)
- **Dimensión**: 768
- **API Version**: v1beta

### Base de Datos Vectorial
- **Motor**: Supabase (PostgreSQL + pgvector)
- **Índice**: IVFFlat con cosine similarity
- **Threshold**: 0.7 (ajustable)
- **Max Results**: 5 documentos por búsqueda

### Flujo RAG
1. Usuario envía pregunta
2. Genera embedding de la pregunta (768 dimensiones)
3. Busca documentos similares en Supabase (cosine similarity)
4. Filtra por threshold > 0.7
5. Retorna top 5 documentos más relevantes
6. Construye contexto con los documentos
7. Gemini genera respuesta usando el contexto

## 📊 Costos

### Supabase (Free Tier)
- ✅ 500MB base de datos
- ✅ 2GB transferencia/mes
- ✅ Suficiente para ~10,000 documentos

### Google Gemini (Free Tier)
- ✅ 60 requests/minuto
- ✅ Embeddings: Gratis
- ✅ Generación: 15 requests/minuto

**Total: $0/mes** para uso moderado

## 🚀 Próximos Pasos

1. ✅ Ejecutar `./setup-rag.sh`
2. ✅ Crear tabla en Supabase
3. ✅ Cargar documentos
4. ✅ Verificar con `./test-rag-debug.sh`
5. ✅ Probar en el chat
6. ⏭️ Agregar más documentos según necesidad
7. ⏭️ Ajustar threshold si es necesario
8. ⏭️ Configurar en Cloudflare Workers (producción)

## 📞 Soporte

Si tienes problemas:
1. Ejecuta `./test-rag-debug.sh` y comparte el output
2. Revisa `SETUP_SUPABASE_RAG.md` para troubleshooting detallado
3. Verifica logs en Cloudflare Dashboard (producción)

---

**Última actualización**: Diciembre 2025
**Versión**: 1.0
**Modelo**: text-embedding-004 (768 dimensiones)
