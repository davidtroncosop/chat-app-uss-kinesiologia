/**
 * Script para convertir JSON de conversaciones a documentos de Supabase
 * 
 * Uso:
 * node scripts/convert-json-to-supabase.js /path/to/chat-uss-kine.json
 */

const fs = require('fs');
const path = require('path');

// Configuración
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'tu_supabase_key';
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || 'tu_gemini_key';

/**
 * Generate embedding using Google Gemini
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: text }]
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
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
    console.log('📝 Generando embedding...');
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
    console.log('✅ Documento subido:', data[0].id);
    return data[0];
    
  } catch (error) {
    console.error('❌ Error subiendo documento:', error);
    throw error;
  }
}

/**
 * Extract Q&A pairs from JSON and create documents
 */
async function processJSON(jsonPath) {
  try {
    console.log(`📁 Leyendo archivo: ${jsonPath}`);
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    console.log(`📊 Estructura del JSON:`, Object.keys(data));
    
    // Detectar estructura del JSON
    let conversations = [];
    
    // Opción 1: Array de conversaciones
    if (Array.isArray(data)) {
      conversations = data;
    }
    // Opción 2: Objeto con propiedad conversations/messages/etc
    else if (data.conversations) {
      conversations = data.conversations;
    } else if (data.messages) {
      conversations = data.messages;
    } else if (data.data) {
      conversations = data.data;
    }
    // Opción 3: Objeto con pares Q&A directos
    else {
      conversations = Object.entries(data).map(([key, value]) => ({
        question: key,
        answer: value
      }));
    }
    
    console.log(`💬 Encontradas ${conversations.length} conversaciones`);
    
    let uploaded = 0;
    
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      
      // Extraer pregunta y respuesta según estructura
      let question = conv.question || conv.user || conv.input || conv.q || '';
      let answer = conv.answer || conv.assistant || conv.output || conv.a || '';
      
      // Si no hay estructura clara, intentar con el contenido completo
      if (!question && !answer) {
        question = conv.content || JSON.stringify(conv);
        answer = '';
      }
      
      // Crear documento combinando pregunta y respuesta
      const content = answer 
        ? `Pregunta: ${question}\n\nRespuesta: ${answer}`
        : question;
      
      const metadata = {
        source: 'chat_uss_kine_json',
        index: i,
        original_question: question,
        has_answer: !!answer,
        uploaded_at: new Date().toISOString()
      };
      
      console.log(`\n[${i + 1}/${conversations.length}] Procesando...`);
      console.log(`   Pregunta: ${question.substring(0, 60)}...`);
      
      try {
        await uploadDocument(content, metadata);
        uploaded++;
        
        // Rate limiting - esperar 1 segundo entre requests
        if (i < conversations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`   ❌ Error en documento ${i}:`, error.message);
        // Continuar con el siguiente
      }
    }
    
    console.log(`\n✅ Proceso completado: ${uploaded}/${conversations.length} documentos subidos`);
    
  } catch (error) {
    console.error('❌ Error procesando JSON:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Conversión de JSON a Supabase\n');
  
  // Verificar configuración
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'tu_gemini_key') {
    console.error('❌ Error: GOOGLE_GEMINI_API_KEY no configurada');
    console.log('   export GOOGLE_GEMINI_API_KEY="tu_key"');
    process.exit(1);
  }
  
  if (!SUPABASE_KEY || SUPABASE_KEY === 'tu_supabase_key') {
    console.error('❌ Error: SUPABASE_KEY no configurada');
    console.log('   export SUPABASE_URL="https://xxx.supabase.co"');
    console.log('   export SUPABASE_KEY="tu_key"');
    process.exit(1);
  }
  
  // Obtener path del JSON
  const jsonPath = process.argv[2];
  
  if (!jsonPath) {
    console.error('❌ Error: Debes proporcionar el path al archivo JSON');
    console.log('\nUso:');
    console.log('   node scripts/convert-json-to-supabase.js /path/to/chat-uss-kine.json');
    console.log('\nEjemplo:');
    console.log('   node scripts/convert-json-to-supabase.js ~/Downloads/chat\\ uss\\ kine.json');
    process.exit(1);
  }
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Error: Archivo no encontrado: ${jsonPath}`);
    process.exit(1);
  }
  
  // Procesar JSON
  await processJSON(jsonPath);
  
  console.log('\n✅ Conversión completada');
  console.log('\n💡 Próximos pasos:');
  console.log('   1. Verifica los documentos en Supabase Dashboard');
  console.log('   2. Prueba el RAG con: ./test-rag-debug.sh');
  console.log('   3. Haz preguntas en el chat');
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
  processJSON
};
