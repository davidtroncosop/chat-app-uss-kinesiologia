/**
 * Script para cargar documentos a Supabase con embeddings de Gemini
 * 
 * Uso:
 * node scripts/upload-documents-to-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Configuración (usar variables de entorno en producción)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'tu_supabase_key';
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || 'tu_gemini_key';

/**
 * Generate embedding using Google Gemini
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: {
            parts: [{ text: text }]
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding.values;
    
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

/**
 * Upload document to Supabase
 */
async function uploadDocument(content, metadata) {
  try {
    console.log('📝 Generando embedding para documento...');
    const embedding = await generateEmbedding(content);
    
    console.log('📤 Subiendo documento a Supabase...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        content: content,
        metadata: metadata,
        embedding: embedding
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Documento subido exitosamente:', data[0].id);
    return data[0];
    
  } catch (error) {
    console.error('❌ Error subiendo documento:', error);
    throw error;
  }
}

/**
 * Process and upload documents from a directory
 */
async function processDocuments(documentsDir) {
  try {
    const files = fs.readdirSync(documentsDir);
    console.log(`📁 Encontrados ${files.length} archivos en ${documentsDir}`);
    
    for (const file of files) {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const filePath = path.join(documentsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        console.log(`\n📄 Procesando: ${file}`);
        
        // Split large documents into chunks
        const chunks = splitIntoChunks(content, 1000);
        console.log(`   Dividido en ${chunks.length} chunks`);
        
        for (let i = 0; i < chunks.length; i++) {
          const metadata = {
            source: file,
            chunk: i + 1,
            total_chunks: chunks.length,
            uploaded_at: new Date().toISOString()
          };
          
          await uploadDocument(chunks[i], metadata);
          
          // Rate limiting - esperar 1 segundo entre requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log('\n✅ Todos los documentos procesados exitosamente');
    
  } catch (error) {
    console.error('❌ Error procesando documentos:', error);
    throw error;
  }
}

/**
 * Split text into chunks
 */
function splitIntoChunks(text, maxChunkSize) {
  const chunks = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Example: Upload a single document
 */
async function uploadSingleDocument() {
  const exampleContent = `
# Escuela de Kinesiología USS

## Requisitos de Admisión

Para ingresar a la carrera de Kinesiología en la Universidad San Sebastián, los postulantes deben cumplir con los siguientes requisitos:

1. **Puntaje PSU/PAES**: Mínimo 500 puntos promedio
2. **Ranking**: Percentil 50 o superior
3. **Notas de Enseñanza Media**: Promedio mínimo 5.5

## Malla Curricular

La carrera tiene una duración de 10 semestres e incluye:

- Anatomía Humana
- Fisiología
- Biomecánica
- Kinesiología Deportiva
- Rehabilitación
- Práctica Profesional

## Perfil del Egresado

El kinesiólogo egresado de la USS está capacitado para:

- Evaluar y diagnosticar alteraciones del movimiento
- Diseñar planes de tratamiento personalizados
- Aplicar técnicas de rehabilitación
- Trabajar en equipos multidisciplinarios
- Promover la salud y prevención de lesiones
`;

  const metadata = {
    source: 'manual_estudiante',
    section: 'informacion_general',
    uploaded_at: new Date().toISOString()
  };
  
  await uploadDocument(exampleContent, metadata);
}

// Main execution
async function main() {
  console.log('🚀 Iniciando carga de documentos a Supabase\n');
  
  // Verificar configuración
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'tu_gemini_key') {
    console.error('❌ Error: GOOGLE_GEMINI_API_KEY no configurada');
    console.log('   Configura la variable de entorno GOOGLE_GEMINI_API_KEY');
    process.exit(1);
  }
  
  if (!SUPABASE_KEY || SUPABASE_KEY === 'tu_supabase_key') {
    console.error('❌ Error: SUPABASE_KEY no configurada');
    console.log('   Configura las variables SUPABASE_URL y SUPABASE_KEY');
    process.exit(1);
  }
  
  // Opción 1: Subir un documento de ejemplo
  console.log('📝 Subiendo documento de ejemplo...\n');
  await uploadSingleDocument();
  
  // Opción 2: Procesar directorio de documentos
  // const documentsDir = './documents';
  // if (fs.existsSync(documentsDir)) {
  //   await processDocuments(documentsDir);
  // } else {
  //   console.log(`⚠️  Directorio ${documentsDir} no encontrado`);
  // }
  
  console.log('\n✅ Proceso completado');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  generateEmbedding,
  uploadDocument,
  processDocuments
};
