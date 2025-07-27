import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, MessageSquare, Clock, RefreshCw } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

const ChatApp = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');


  // Función para inicializar una nueva sesión
  const initializeSession = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    setConnectionStatus('connected');

    // Mensaje de bienvenida
    setMessages([{
      id: 1,
      text: "¡Hola! Soy el asistente virtual de la escuela de kinesiología USS. ¿En qué puedo ayudarte?",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }]);

    console.log('Nueva sesión iniciada:', newSessionId);
  };

  // Inicializar sesión al cargar el componente
  useEffect(() => {
    initializeSession();
  }, []);

  // Función para iniciar un nuevo chat
  const startNewChat = () => {
    setIsLoading(false);
    setIsTyping(false);
    setInputMessage('');
    initializeSession();
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Llamada al webhook local que procesa con n8n
  const sendToN8nWebhook = async (message: string): Promise<string> => {
    // URL del webhook local (Cloudflare Functions)
    const webhookUrl = '/api/webhook';

    // Payload que coincide con la estructura esperada por n8n
    const payload = {
      body: {
        data: {
          message: {
            conversation: message,
            messageType: 'text'
          },
          pushName: 'Usuario Web',
          key: {
            id: sessionId,
            remoteJid: `${sessionId}@web.client`
          }
        },
        instance: 'web-chat',
        date_time: new Date().toISOString()
      }
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extraer la respuesta del webhook
      // Ajusta esta lógica según la estructura de respuesta de tu n8n workflow
      if (data && data.response) {
        return data.response;
      } else if (data && data.message) {
        return data.message;
      } else if (typeof data === 'string') {
        return data;
      } else {
        return "Respuesta recibida del asistente USS Kinesiología";
      }

    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      throw new Error('Error al conectar con el asistente. Por favor, intenta nuevamente.');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await sendToN8nWebhook(inputMessage);

      setIsTyping(false);

      const botMessage: Message = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setIsTyping(false);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "❌ Error al procesar tu mensaje. Por favor, intenta nuevamente.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header - Optimizado para móvil */}
      <div className="bg-white shadow-lg border-b border-gray-200 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                  Asistente USS Kinesiología
                </h1>
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-400' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                    'bg-red-400'
                  }`}></div>
                  <span className="hidden sm:inline">
                    {connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'connecting' ? 'Conectando...' : 
                     'Desconectado'}
                  </span>
                  <span className="sm:hidden">
                    {connectionStatus === 'connected' ? 'En línea' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button
                onClick={startNewChat}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs sm:text-sm text-gray-700"
                title="Iniciar nuevo chat"
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Nuevo Chat</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
              <div className="text-right hidden md:block">
                <div className="text-sm text-gray-500">Session ID</div>
                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {sessionId.substring(0, 16)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Burbujas que caen hacia abajo */}
      <div className="flex-1 overflow-y-auto p-4 mobile-compact flex flex-col justify-end chat-scroll">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 flex flex-col justify-end min-h-full">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} px-2 sm:px-0`}>
              <div className={`flex items-start space-x-1.5 sm:space-x-2 ${
                message.sender === 'user' 
                  ? 'max-w-[80%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl' 
                  : 'max-w-[85%] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl'
              }`}>
                {message.sender === 'bot' && (
                  <div className="bg-blue-600 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm shadow-lg'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-md border border-gray-100'
                  }`}>
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
                  <div className={`text-xs mt-1.5 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                    {message.timestamp}
                  </div>
                </div>
                {message.sender === 'user' && (
                  <div className="bg-gray-600 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator - Optimizado para móvil */}
          {isTyping && (
            <div className="flex justify-start px-2 sm:px-0">
              <div className="flex items-start space-x-1.5 sm:space-x-2">
                <div className="bg-blue-600 p-1.5 sm:p-2 rounded-full">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2.5 sm:py-3 shadow-md border border-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Optimizado para móvil */}
      <div className="bg-white border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2 sm:space-x-3">
            <div className="flex-1 min-w-0">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta sobre kinesiología..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                rows={1}
                style={{ 
                  maxHeight: '100px', 
                  minHeight: '44px',
                  fontSize: '16px' // Previene zoom en iOS
                }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2.5 sm:p-3 rounded-full transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Status - Oculto en móvil para ahorrar espacio */}
          <div className="hidden sm:flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>Presiona Enter para enviar</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 rounded-full bg-green-400"></div>
              <span>n8n Flow Activo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;