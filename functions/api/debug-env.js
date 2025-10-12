/**
 * Debug endpoint para verificar variables de entorno en Cloudflare
 * Acceder: https://tu-dominio.pages.dev/api/debug-env
 */

export async function onRequestGet(context) {
  const { env } = context;

  // Lista de variables que deberían estar configuradas
  const expectedVars = [
    'GOOGLE_GEMINI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'GEMINI_API_VERSION',
    'GEMINI_MODEL',
    'GEMINI_EMBEDDING_MODEL',
    'GEMINI_EMBEDDING_API_VERSION',
    'DATABASE_URL'
  ];

  const envStatus = {};

  expectedVars.forEach(varName => {
    const value = env[varName];
    if (value) {
      // Mostrar solo los primeros caracteres por seguridad
      envStatus[varName] = {
        configured: true,
        preview: value.substring(0, 20) + '...',
        length: value.length
      };
    } else {
      envStatus[varName] = {
        configured: false,
        preview: null,
        length: 0
      };
    }
  });

  // Información adicional
  const info = {
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'production',
    totalEnvVars: Object.keys(env).length,
    availableVars: Object.keys(env).filter(key => !key.startsWith('_')),
  };

  return new Response(JSON.stringify({
    success: true,
    info: info,
    variables: envStatus,
    message: 'Variables de entorno verificadas'
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
