import React from 'react';
import { Volume2, Wifi, WifiOff, Sparkles, Cpu, ShieldCheck } from 'lucide-react';
import { EngineMode } from '../types';

interface HeaderProps {
  engineMode: EngineMode;
  setEngineMode: (mode: EngineMode) => void;
  isOnline: boolean;
  libraryCount: number;
  quotaWarning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  engineMode,
  setEngineMode,
  isOnline,
  libraryCount,
  quotaWarning,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Text to Speech Studio
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="w-3 h-3" />
                Gemini 3.1 TTS
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Accents, Tones, Tamil Native & Deep Voices • Offline MP3 Engine
            </p>
          </div>
        </div>

        {/* Engine Controls & Status */}
        <div className="flex items-center gap-3">
          {/* Quota Banner */}
          {quotaWarning && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Offline Fallback Active</span>
            </div>
          )}

          {/* Engine Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setEngineMode('auto')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                engineMode === 'auto'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Auto: Gemini AI with seamless offline fallback"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('cloud')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                engineMode === 'cloud'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="AI Cloud: Powered by Gemini 3.1 Flash TTS"
            >
              Gemini AI
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('offline')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                engineMode === 'offline'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Offline: Synthesize without network, 100% private"
            >
              Offline
            </button>
          </div>

          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Library Counter */}
          {libraryCount > 0 && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>{libraryCount} Saved</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
