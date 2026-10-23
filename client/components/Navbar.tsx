import React from 'react';
import { Radio, Zap, Plus, Sun, Moon } from 'lucide-react';
import { HealthCheckResponse } from '../../types';

export interface NavbarProps {
  health: HealthCheckResponse | null;
  schedulerTriggering: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onTriggerScheduler: () => void;
  onOpenAdd: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  schedulerTriggering,
  theme,
  onToggleTheme,
  onTriggerScheduler,
  onOpenAdd,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner shadow-emerald-500/20 shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white truncate">
                Oops, Renewed!
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block truncate">
              Self-Hosted Subscription & Renewal Intelligence
            </p>
          </div>
        </div>

        {/* System Health Status Pills & Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {health && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300"
                title="Offline-Resilient Scheduler Engine"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.scheduler.running ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                ></span>
                <span className="font-mono">
                  Engine: {health.scheduler.running ? 'Active (60m)' : 'Halted'}
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300"
                title="Telegram Bot Long-Polling Status"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.bot.running
                      ? 'bg-emerald-400'
                      : health.bot.enabled
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                ></span>
                <span>
                  Bot: {health.bot.running ? 'Connected' : health.bot.enabled ? 'Ready' : 'Disabled'}
                </span>
              </div>
            </div>
          )}

          {/* Trigger Catch-up Check */}
          <button
            onClick={onTriggerScheduler}
            disabled={schedulerTriggering}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            title="Force immediate catch-up and rollover check"
          >
            <Zap
              className={`w-3.5 h-3.5 text-amber-400 ${
                schedulerTriggering ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">Check Now</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Add Tracker Button */}
          <button
            onClick={onOpenAdd}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Add Item</span>
            <span className="inline sm:hidden xs:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
};
