/**
 * Cloudflare Worker - AI Chat Agent
 * Replica el flujo de n8n con Google Gemini, Supabase y PostgreSQL
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    console.log('📨 Request recibido:', body);
    
    // 1. Extract Fields (Edit Fields node)
    const sessionId = body.body?.data?.key?.id || body.sessionId || 'default-session';
    const chatInput = body.body?.data?.message?.conversation || body.message || '';
    const dateTime = body.body?.date_time || new Date().toISOString();
    const remoteJid = body.body?.data?.key?.remoteJid || sessionId;
    
    if (!chatInput) {
      throw new Error('No se encontró mensaje en el payload');
    }
    
    console.log('📝 Datos extraídos:', { sessionId, chatInput, remoteJid });
    
    // 2. Get Chat History from PostgreSQL
    const chatHistory = await getChatHistory(env, sessionId);
    console.log('💬 Historial recuperado:', chatHistory.length, 'mensajes');
    
    // 3. Search Knowledge Base (Supabase Vector Store)
    let relevantDocs = [];
    try {
      relevantDocs = await searchKnowledgeBase(env, chatInput);
      console.log('📚 Documentos relevantes encontrados:', relevantDocs.length);
    } catch (error) {
      console.warn('⚠️ Knowledge base no disponible, continuando sin documentos:', error.message);
      relevantDocs = [];
    }
    
    // 4. Build context for AI
    const context = buildContext(chatHistory, relevantDocs, chatInput);
    
    // 5. Call Google Gemini AI
    const aiResponse = await callGeminiAI(env, context, chatInput);
    console.log('🤖 Respuesta de AI generada');
    
    // 6. Save to Chat History
    await saveChatHistory(env, sessionId, chatInput, aiResponse);
    console.log('💾 Historial guardado');
    
    // 7. Format and Return Response
    return new Response(JSON.stringify({
      success: true,
      message: 'Response sent successfully',
      response: aiResponse,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en chat agent:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Error al procesar mensaje',
      response: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Get chat history from PostgreSQL
 */
async function getChatHistory(env, sessionId) {
  try {
    // Conectar a PostgreSQL usando env.DATABASE_URL
    // Por ahora retornamos array vacío, implementaremos después
    return [];
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return [];
  }
}

/**
 * Search knowledge base using Supabase vector store
 */
async function searchKnowledgeBase(env, query) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Supabase no configurado - continuando sin knowledge base');
      return [];
    }
    
    // 1. Generate embedding for the query using Gemini
    let embedding;
    try {
      embedding = await generateEmbedding(env, query);
    } catch (error) {
      console.warn('⚠️ Error generando embedding:', error.message);
      return [];
    }
    
    // 2. Search similar documents in Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5
      })
    });
    
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    const documents = await response.json();
    return documents || [];
    
  } catch (error) {
    console.error('Error buscando en knowledge base:', error);
    return [];
  }
}

/**
 * Generate embedding using Google Gemini
 */
async function generateEmbedding(env, text) {
  try {
    const apiKey = env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY no configurada');
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key=${apiKey}`,
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
      throw new Error(`Gemini embedding error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.embedding.values;
    
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

/**
 * Build context for AI from history and documents
 */
function buildContext(chatHistory, relevantDocs, currentQuery) {
  let context = `Eres un asistente virtual especializado en Kinesiología de la Universidad San Sebastián (USS).

Tu función es ayudar a estudiantes y personas interesadas con información sobre:
- Programas académicos de Kinesiología
- Requisitos de admisión
- Malla curricular
- Perfil del egresado
- Áreas de especialización
- Información general sobre kinesiología como disciplina

Metodología de respuesta:
1. Responde de manera clara, concisa y profesional
2. Si tienes información específica de documentos, úsala
3. Si no tienes información específica, proporciona conocimiento general sobre kinesiología
4. Mantén un tono amigable y educativo

Estilo: Claro, conciso y profesional.\n\n`;
  
  // Add relevant documents
  if (relevantDocs.length > 0) {
    context += '📚 Información relevante del documento:\n\n';
    relevantDocs.forEach((doc, index) => {
      context += `[Documento ${index + 1}]\n${doc.content}\n\n`;
    });
  } else {
    context += '📚 Nota: Actualmente no hay documentos específicos cargados. Responde basándote en tu conocimiento general sobre kinesiología y la USS.\n\n';
  }
  
  // Add chat history
  if (chatHistory.length > 0) {
    context += '💬 Historial de conversación:\n\n';
    chatHistory.slice(-5).forEach(msg => {
      context += `${msg.role}: ${msg.content}\n`;
    });
    context += '\n';
  }
  
  return context;
}

/**
 * Call Google Gemini AI
 */
async function callGeminiAI(env, context, userMessage) {
  try {
    const apiKey = env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY no configurada');
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${context}\n\nPregunta del usuario: ${userMessage}\n\nRespuesta:`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No se recibió respuesta de Gemini');
    }
    
    const aiResponse = data.candidates[0].content.parts[0].text;
    return aiResponse;
    
  } catch (error) {
    console.error('Error llamando a Gemini AI:', error);
    throw error;
  }
}

/**
 * Save chat history to PostgreSQL
 */
async function saveChatHistory(env, sessionId, userMessage, aiResponse) {
  try {
    // Implementar guardado en PostgreSQL
    // Por ahora solo logueamos
    console.log('Guardando historial para sesión:', sessionId);
    return true;
  } catch (error) {
    console.error('Error guardando historial:', error);
    return false;
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
