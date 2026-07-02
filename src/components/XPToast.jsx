import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Star, Zap } from "lucide-react";

export default function XPToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((amount, action) => {
    const id = `xp-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, amount, action, visible: true }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 400);
    }, 3000);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { amount, action } = e.detail || {};
      if (amount && action) addToast(amount, action);
    };
    window.addEventListener("xp-awarded", handler);
    return () => window.removeEventListener("xp-awarded", handler);
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border pointer-events-auto backdrop-blur-xl transition-all duration-400 ${toast.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}`}
          style={{
            background: "linear-gradient(135deg, rgba(66,32,6,0.97), rgba(40,20,4,0.97))",
            borderColor: "rgba(234,179,8,0.4)",
            boxShadow: toast.visible ? "0 0 28px rgba(234,179,8,0.22), 0 4px 24px rgba(0,0,0,0.5)" : "none",
          }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <Sparkles className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-yellow-300 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-yellow-300 font-black text-xl tracking-tight leading-none">+{toast.amount} XP</span>
            <span className="text-yellow-500 text-xs font-semibold truncate mt-0.5 tracking-wide">{toast.action}</span>
          </div>
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400/40 flex-shrink-0 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function fireXPEvent(amount, action) {
  window.dispatchEvent(new CustomEvent("xp-awarded", { detail: { amount, action } }));
}
