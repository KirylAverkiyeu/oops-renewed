import React from 'react';
import { Radio } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-400">Oops, Renewed!</span>
          <span>— Lightweight Synology NAS Container</span>
        </div>
      </div>
    </footer>
  );
};

