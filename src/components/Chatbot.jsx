import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader } from 'lucide-react';
import { chatWithGemini } from '../services/gemini';

const INITIAL_MESSAGES = [
  {
    id: 'm-init',
    role: 'model',
    text: "Namaste! I am your Jaan Sathi Assistant. How can I help you today? You can ask me how to report potholes, where to find volunteer missions, how to earn community points, or check your profile level!"
  }
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [thinking, setThinking] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: inputText
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setThinking(true);

    try {
      // Gather chat history to send to Gemini
      // Format: Array of { role: 'user'|'model', text: '...' }
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        text: m.text
      }));

      const botReplyText = await chatWithGemini(history);
      
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: botReplyText
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: "I am having trouble connecting to the municipality service. Please try again in a moment."
      }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* --- CHAT DIALOG PANEL --- */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[460px] rounded-3xl border border-slate-800/80 shadow-2xl glass flex flex-col overflow-hidden mb-4 animate-scale-up bg-[#0c101b]/95">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-950/40 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0c101b] animate-pulse" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-white leading-none">Jaan Sathi AI</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1 block leading-none">Online • 24/7 Civic Assistant</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {thinking && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-slate-900/80 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  <Loader className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span className="text-[10px] font-semibold">Sathi is thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form onSubmit={handleSend} className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask me how to report, view points..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || thinking}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* --- FLOATING CHAT BUTTON --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Assistant"
        className={`p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 shadow-xl transition-all cursor-pointer relative group ${
          isOpen ? 'rotate-90 bg-slate-800' : ''
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0b0f19] flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
              1
            </span>
          </>
        )}
      </button>

    </div>
  );
}
