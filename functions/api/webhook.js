export async function onRequestPost(context) {
  const { request } = context;
  
  try {
    const body = await request.json();
    const { sessionId, message, messageType, timestamp } = body;
    
    console.log('✅ Webhook recibido de n8n:', {
      sessionId,
      message: message?.substring(0, 100) + '...',
      messageType,
      timestamp
    });
    
    // Respuesta exitosa para n8n
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook procesado correctamente',
      sessionId,
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
      error: 'Error al procesar webhook',
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