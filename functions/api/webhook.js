export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    console.log('📨 Webhook recibido del chat:', body);
    
    // Extraer el mensaje del payload del chat
    const userMessage = body.body?.data?.message?.conversation || body.message || '';
    const sessionId = body.body?.data?.key?.remoteJid || body.sessionId || 'default-session';
    
    if (!userMessage) {
      throw new Error('No se encontró mensaje en el payload');
    }
    
    // URL del webhook de n8n (desde variables de entorno o hardcoded)
    const n8nWebhookUrl = env.N8N_WEBHOOK_URL || 'https://n8n.dtroncoso.site/webhook/937141bc-6966-4adb-bddd-7f4004210f7d';
    
    console.log('🚀 Enviando a n8n:', { userMessage, sessionId });
    
    // Enviar el mensaje a n8n y esperar la respuesta
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        source: 'web-chat'
      })
    });
    
    if (!n8nResponse.ok) {
      throw new Error(`Error en n8n: ${n8nResponse.status}`);
    }
    
    const n8nData = await n8nResponse.json();
    console.log('✅ Respuesta de n8n:', n8nData);
    
    // Extraer la respuesta del asistente
    let assistantResponse = '';
    
    if (n8nData.response) {
      assistantResponse = n8nData.response;
    } else if (n8nData.message) {
      assistantResponse = n8nData.message;
    } else if (n8nData.text) {
      assistantResponse = n8nData.text;
    } else if (typeof n8nData === 'string') {
      assistantResponse = n8nData;
    } else {
      assistantResponse = 'Respuesta procesada por el asistente USS Kinesiología';
    }
    
    // Devolver la respuesta del asistente al chat
    return new Response(JSON.stringify({ 
      success: true, 
      response: assistantResponse,
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
    console.error('❌ Error procesando webhook:', error);
    
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

// Manejar preflight requests para CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}