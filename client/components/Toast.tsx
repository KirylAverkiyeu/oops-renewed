import React from 'react';
import { CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';

export interface ToastProps {
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 max-w-md z-50 flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-slide-up ${
        toast.type === 'error'
          ? 'bg-rose-950/90 border-rose-800 text-rose-200'
          : toast.type === 'info'
          ? 'bg-sky-950/90 border-sky-800 text-sky-200'
          : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {toast.type === 'error' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />}
        {toast.type === 'info' && <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />}
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />}
        <span className="text-xs sm:text-sm font-medium truncate">{toast.message}</span>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:opacity-75 transition-opacity shrink-0 text-slate-300"
        aria-label="Dismiss toast"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
};
