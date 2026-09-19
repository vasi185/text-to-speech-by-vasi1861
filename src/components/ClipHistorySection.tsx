import React, { useState } from 'react';
import {
  History,
  Search,
  Play,
  Download,
  Trash2,
  Clock,
  Volume2,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { AudioClip } from '../types';
import { base64ToAudioBlob, downloadBlob, formatTime } from '../lib/audioUtils';

interface ClipHistorySectionProps {
  clips: AudioClip[];
  onSelectClip: (clip: AudioClip) => void;
  onDeleteClip: (id: string) => void;
  onClearAll: () => void;
  activeClipId?: string;
}

export const ClipHistorySection: React.FC<ClipHistorySectionProps> = ({
  clips,
  onSelectClip,
  onDeleteClip,
  onClearAll,
  activeClipId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClips = clips.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.text.toLowerCase().includes(q) ||
      c.voiceName.toLowerCase().includes(q) ||
      c.accentName.toLowerCase().includes(q)
    );
  });

  const handleDownload = (clip: AudioClip, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = base64ToAudioBlob(clip.audioBase64, 'audio/mpeg');
    const safeVoice = clip.voiceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeAccent = clip.accentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `speech-${safeVoice}-${safeAccent}-${clip.bitrate}kbps.mp3`;
    downloadBlob(blob, filename);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteClip(id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Generated Clips Library
          </h2>
          <span className="text-xs text-slate-500 font-normal">
            ({clips.length} stored offline)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {clips.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-transparent transition-colors shrink-0"
              title="Clear all saved clips"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Clips List */}
      {clips.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-1">
          <Volume2 className="w-8 h-8 text-slate-300 stroke-1" />
          <p className="font-medium text-slate-600">No clips in your local library</p>
          <p className="text-slate-400">
            Clips you generate are saved automatically here for offline access and MP3 export.
          </p>
        </div>
      ) : filteredClips.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs">
          No clips match &ldquo;{searchQuery}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
          {filteredClips.map((clip) => {
            const isActive = activeClipId === clip.id;
            const dateStr = new Date(clip.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={clip.id}
                onClick={() => onSelectClip(clip)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between group ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {clip.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed font-sans">
                    {clip.text}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                      {clip.voiceName}
                    </span>
                    <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {clip.accentName}
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-mono">
                      {clip.bitrate}k
                    </span>
                    <span className="text-slate-500 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(clip.duration)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(clip, e)}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
                      title="Download MP3"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(clip.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectClip(clip)}
                      className="p-1 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                      title="Play clip"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
