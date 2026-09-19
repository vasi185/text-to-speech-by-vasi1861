import React from 'react';
import { Type, Sparkles, Clock, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { SAMPLE_TEXT_PRESETS } from '../data/presets';
import { SampleTextPreset, VoicePersona, AccentOption, ToneOption } from '../types';
import { estimateDuration, formatTime } from '../lib/audioUtils';

interface TextInputSectionProps {
  text: string;
  setText: (text: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  speed: number;
  onApplyPreset: (preset: SampleTextPreset) => void;
}

export const TextInputSection: React.FC<TextInputSectionProps> = ({
  text,
  setText,
  onGenerate,
  isGenerating,
  speed,
  onApplyPreset,
}) => {
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = estimateDuration(text, speed);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating && text.trim()) {
        onGenerate();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Speech Transcript</h2>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>{charCount} chars</span>
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-indigo-600 font-medium">
            <Clock className="w-3.5 h-3.5" />
            ~{formatTime(estimatedSeconds)}
          </span>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type or paste your text here (in English, Tamil தமிழ், or any supported language)..."
          className="w-full text-slate-800 placeholder-slate-400 text-sm p-3.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y min-h-[110px]"
        />
        {text.length > 0 && (
          <button
            type="button"
            onClick={() => setText('')}
            className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Clear transcript"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Presets & Generate Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Preset chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick Scripts:
          </span>
          {SAMPLE_TEXT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium border border-slate-200/70 transition-all text-left"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !text.trim()}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 transition-all shrink-0 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Voice...</span>
            </>
          ) : (
            <>
              <span>Generate Audio</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
