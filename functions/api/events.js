import { registerConnection, removeConnection } from './webhook.js';

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response('SessionId required', { status: 400 });
  }
  
  // Crear stream para Server-Sent Events
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  // Registrar la conexión usando la función compartida
  registerConnection(sessionId, writer);
  
  // Enviar mensaje inicial
  writer.write(new TextEncoder().encode(`data: ${JSON.stringify({
    type: 'connected',
    sessionId,
    timestamp: new Date().toISOString()
  })}\n\n`));
  
  // Limpiar conexión cuando se cierre
  request.signal.addEventListener('abort', () => {
    removeConnection(sessionId);
    writer.close();
  });
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}