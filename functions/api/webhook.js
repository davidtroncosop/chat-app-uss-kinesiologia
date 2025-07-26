// Store para mantener las conexiones activas (compartido entre archivos)
const connections = new Map();

export async function onRequestPost(context) {
  const { request } = context;
  
  try {
    const body = await request.json();
    const { sessionId, remoteJid, message, messageType, timestamp } = body;
    
    console.log('Received webhook from n8n:', {
      sessionId,
      remoteJid,
      message,
      messageType,
      timestamp
    });
    
    // Enviar mensaje a la sesión específica a través de SSE
    const writer = connections.get(sessionId);
    if (writer) {
      try {
        await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'message',
          sessionId,
          message,
          timestamp: new Date().toISOString()
        })}\n\n`));
      } catch (writeError) {
        console.error('Error writing to SSE stream:', writeError);
        connections.delete(sessionId);
      }
    } else {
      console.log('No active connection found for sessionId:', sessionId);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Message received and processed',
      data: {
        sessionId,
        response: message,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to process webhook',
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

// Función para registrar conexiones SSE
export function registerConnection(sessionId, writer) {
  connections.set(sessionId, writer);
}

// Función para limpiar conexiones
export function removeConnection(sessionId) {
  connections.delete(sessionId);
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