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
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Función para inicializar una nueva sesión
  const initializeSession = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    setConnectionStatus('connecting');

    // Mensaje de bienvenida
    setMessages([{
      id: 1,
      text: "¡Hola! Soy el asistente virtual de la escuela de kinesiología USS. ¿En qué puedo ayudarte?",
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }]);

    // Cerrar conexión anterior si existe
    if (eventSource) {
      eventSource.close();
    }

    // Conectar a Server-Sent Events para recibir respuestas
    const newEventSource = new EventSource(`/api/events?sessionId=${newSessionId}`);
    setEventSource(newEventSource);
    
    newEventSource.onopen = () => {
      console.log('SSE connection opened for session:', newSessionId);
      setConnectionStatus('connected');
    };
    
    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE message received:', data);
        
        if (data.type === 'connected') {
          setConnectionStatus('connected');
        } else if (data.type === 'message') {
          setIsTyping(false);
          
          const botMessage: Message = {
            id: Date.now(),
            text: data.message,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString()
          };
          
          setMessages(prev => [...prev, botMessage]);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setConnectionStatus('disconnected');
      
      // Intentar reconectar después de 3 segundos
      setTimeout(() => {
        if (newEventSource.readyState === EventSource.CLOSED) {
          console.log('Attempting to reconnect...');
          setConnectionStatus('connecting');
        }
      }, 3000);
    };

    return newEventSource;
  };

  // Inicializar sesión al cargar el componente
  useEffect(() => {
    const es = initializeSession();
    
    // Cleanup al desmontar el componente
    return () => {
      es.close();
    };
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

  // Llamada real al webhook de n8n
  const sendToN8nWebhook = async (message: string): Promise<string> => {
    const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL || 'https://n8n.dtroncoso.site/webhook-test/937141bc-6966-4adb-bddd-7f4004210f7d';

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
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-full">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Asistente USS Kinesiología</h1>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-400' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                    'bg-red-400'
                  }`}></div>
                  <span>
                    {connectionStatus === 'connected' ? 'Conectado' : 
                     connectionStatus === 'connecting' ? 'Conectando...' : 
                     'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={startNewChat}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700"
                title="Iniciar nuevo chat"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Nuevo Chat</span>
              </button>
              <div className="text-right">
                <div className="text-sm text-gray-500">Session ID</div>
                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {sessionId.substring(0, 16)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-2 max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl`}>
                {message.sender === 'bot' && (
                  <div className="bg-blue-600 p-2 rounded-full flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 ${message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-md'
                  }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                    {message.timestamp}
                  </div>
                </div>
                {message.sender === 'user' && (
                  <div className="bg-gray-600 p-2 rounded-full flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="bg-blue-600 p-2 rounded-full">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2">
            <div className="flex-1 min-w-0">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta sobre kinesiología..."
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ maxHeight: '120px', minHeight: '48px' }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-3 rounded-full transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
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