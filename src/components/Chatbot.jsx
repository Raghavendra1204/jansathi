import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader } from 'lucide-react';
import { chatWithGemini } from '../services/gemini';
import { useTranslation } from '../context/TranslationContext';

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
  const { t } = useTranslation();
  
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
        <div className="w-80 sm:w-96 h-[460px] rounded-3xl border border-slate-200 shadow-2xl bg-white flex flex-col overflow-hidden mb-4 animate-scale-up">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-sky-400 to-blue-500 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2 bg-white/20 text-white rounded-xl border border-white/30">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-sky-400" />
              </div>
              <div className="text-left text-white">
                <span className="block text-xs font-black tracking-tight">{t("Jaan Sathi AI")}</span>
                <span className="text-[9px] text-sky-100 font-bold mt-0.5 block leading-none">{t("Online • 24/7 Civic Assistant")}</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/15 rounded-lg text-white transition-colors cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white scrollbar-thin">
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
                        : 'bg-sky-50/70 border border-sky-100/60 text-blue-950 rounded-tl-none font-medium'
                    }`}
                  >
                    <p className="whitespace-pre-line text-left">{t(msg.text)}</p>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {thinking && (
              <div className="flex justify-start animate-fade-in text-left">
                <div className="bg-sky-50/70 border border-sky-100/60 text-blue-950 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  <Loader className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  <span className="text-[10px] font-bold">{t("Sathi is thinking...")}</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form onSubmit={handleSend} className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder={t("Ask me how to report, view points...")}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || thinking}
              className="p-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      {/* --- FLOATING CHAT BUTTON --- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("Open AI Assistant")}
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
