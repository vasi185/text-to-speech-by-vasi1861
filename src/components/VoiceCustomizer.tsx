import React, { useState } from 'react';
import {
  User,
  Sliders,
  Sparkles,
  Music,
  Gauge,
  Activity,
  Check,
  Play,
  RotateCcw,
} from 'lucide-react';
import { VoicePersona, AccentOption, ToneOption, AudioQuality } from '../types';
import { VOICE_PERSONAS, ACCENT_OPTIONS, TONE_OPTIONS, AUDIO_QUALITIES } from '../data/presets';

interface VoiceCustomizerProps {
  selectedVoice: VoicePersona;
  setSelectedVoice: (voice: VoicePersona) => void;
  selectedAccent: AccentOption;
  setSelectedAccent: (accent: AccentOption) => void;
  selectedTone: ToneOption;
  setSelectedTone: (tone: ToneOption) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  bitrate: number;
  setBitrate: (bitrate: 128 | 192 | 256 | 320) => void;
  customAccent: string;
  setCustomAccent: (val: string) => void;
  customTone: string;
  setCustomTone: (val: string) => void;
  onPreviewVoice?: (voice: VoicePersona) => void;
  isPreviewing?: boolean;
}

export const VoiceCustomizer: React.FC<VoiceCustomizerProps> = ({
  selectedVoice,
  setSelectedVoice,
  selectedAccent,
  setSelectedAccent,
  selectedTone,
  setSelectedTone,
  speed,
  setSpeed,
  pitch,
  setPitch,
  bitrate,
  setBitrate,
  customAccent,
  setCustomAccent,
  customTone,
  setCustomTone,
  onPreviewVoice,
  isPreviewing = false,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tamil' | 'child' | 'english'>('all');

  const filteredVoices = VOICE_PERSONAS.filter((voice) => {
    if (activeTab === 'tamil') return voice.isTamil;
    if (activeTab === 'child') return voice.isChild;
    if (activeTab === 'english') return voice.language === 'english' && !voice.isChild;
    return true;
  });

  const handleResetSliders = () => {
    setSpeed(selectedVoice.defaultSpeed);
    setPitch(selectedVoice.defaultPitch);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-6">
      {/* SECTION 1: Voice Persona Selection */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Voice Persona</h2>
            <span className="text-xs text-slate-500 font-normal">
              ({filteredVoices.length} available)
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Voices
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tamil')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                activeTab === 'tamil'
                  ? 'bg-white text-amber-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇮🇳</span>
              <span>தமிழ் (Tamil)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('child')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                activeTab === 'child'
                  ? 'bg-white text-orange-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🧒</span>
              <span>Child Voices</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('english')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'english'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English & Global
            </button>
          </div>
        </div>

        {/* Voice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoice.id === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => {
                  setSelectedVoice(voice);
                  setSpeed(voice.defaultSpeed);
                  setPitch(voice.defaultPitch);
                }}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">
                        {voice.name}
                      </span>
                      {voice.nativeName && (
                        <span className="text-xs font-medium text-slate-600">
                          {voice.nativeName}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 capitalize">
                      {voice.gender} • {voice.language}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                  {voice.description}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-1 flex-wrap">
                  {voice.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        tag.includes('Deep Bass')
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : tag.includes('Tamil')
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : tag.includes('Child')
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {onPreviewVoice && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewVoice(voice);
                    }}
                    className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white border border-slate-200 shadow-xs hover:bg-slate-100 text-slate-700 text-[10px] flex items-center gap-1"
                    title={`Test preview for ${voice.name}`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Sample</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Accent & Dialect Selection */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Accent & Regional Dialect
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-800">{selectedAccent.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ACCENT_OPTIONS.map((accent) => {
            const isSelected = selectedAccent.id === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => setSelectedAccent(accent)}
                className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center gap-2 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-base shrink-0">{accent.flag}</span>
                <div className="truncate">
                  <div className="truncate font-semibold text-slate-900">{accent.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{accent.regionalName}</div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedAccent.id === 'custom_accent' && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Dialect Instructions
            </label>
            <input
              type="text"
              value={customAccent}
              onChange={(e) => setCustomAccent(e.target.value)}
              placeholder="e.g. Madurai Tamil inflection, Singaporean English, Texan drawl..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* SECTION 3: Tone & Emotional Mood */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Delivery Tone & Emotional Mood
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Selected: <strong className="text-slate-800">{selectedTone.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TONE_OPTIONS.map((tone) => {
            const isSelected = selectedTone.id === tone.id;
            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => setSelectedTone(tone)}
                className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium ring-1 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-900 truncate">{tone.name}</div>
                <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                  {tone.description}
                </div>
              </button>
            );
          })}
        </div>

        {selectedTone.id === 'custom_tone' && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Emotional Direction
            </label>
            <input
              type="text"
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              placeholder="e.g. Whispering mysteriously, speaking with proud triumph, sarcastic comedy..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* SECTION 4: Acoustic Fine-Tuning & MP3 Bitrate */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Acoustics & MP3 Export Quality
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetSliders}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Persona Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Speed / Pace */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                Speech Rate
              </span>
              <span className="font-mono font-medium text-indigo-700">{speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>1.8x (Fast)</span>
            </div>
          </div>

          {/* Pitch */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Music className="w-3.5 h-3.5 text-indigo-500" />
                Vocal Register (Pitch)
              </span>
              <span className="font-mono font-medium text-indigo-700">{pitch.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0.6x (Deep Bass)</span>
              <span>1.0x (Natural)</span>
              <span>1.6x (High/Child)</span>
            </div>
          </div>

          {/* MP3 Bitrate */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Export MP3 Bitrate</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-indigo-100 text-indigo-800 font-medium">
                {AUDIO_QUALITIES.find((q) => q.bitrate === bitrate)?.tag}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {AUDIO_QUALITIES.map((q) => (
                <button
                  key={q.bitrate}
                  type="button"
                  onClick={() => setBitrate(q.bitrate)}
                  className={`py-1 px-1 rounded-lg text-xs font-medium text-center transition-all ${
                    bitrate === q.bitrate
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {q.bitrate}k
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              {AUDIO_QUALITIES.find((q) => q.bitrate === bitrate)?.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
