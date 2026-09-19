import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { VoiceCustomizer } from './components/VoiceCustomizer';
import { TextInputSection } from './components/TextInputSection';
import { AudioPlayerSection } from './components/AudioPlayerSection';
import { ClipHistorySection } from './components/ClipHistorySection';
import {
  VoicePersona,
  AccentOption,
  ToneOption,
  AudioClip,
  EngineMode,
  SampleTextPreset,
} from './types';
import {
  VOICE_PERSONAS,
  ACCENT_OPTIONS,
  TONE_OPTIONS,
  SAMPLE_TEXT_PRESETS,
} from './data/presets';
import {
  getAllClipsFromStorage,
  saveClipToStorage,
  deleteClipFromStorage,
  clearAllClipsFromStorage,
} from './lib/storage';
import { generateOfflineSpeechMp3 } from './lib/offlineSpeech';
import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function App() {
  // Voice & Customization State
  const [selectedVoice, setSelectedVoice] = useState<VoicePersona>(VOICE_PERSONAS[0]); // Veera (Deep Tamil Male)
  const [selectedAccent, setSelectedAccent] = useState<AccentOption>(ACCENT_OPTIONS[0]); // Tamil (TN)
  const [selectedTone, setSelectedTone] = useState<ToneOption>(TONE_OPTIONS[0]); // Conversational
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [bitrate, setBitrate] = useState<128 | 192 | 256 | 320>(192);
  const [customAccent, setCustomAccent] = useState<string>('');
  const [customTone, setCustomTone] = useState<string>('');

  // Transcript Text
  const [text, setText] = useState<string>(SAMPLE_TEXT_PRESETS[0].text);

  // Audio Playback & Library State
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [autoPlayTrigger, setAutoPlayTrigger] = useState<number>(0);

  // Engine & Connectivity
  const [engineMode, setEngineMode] = useState<EngineMode>('auto');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [quotaWarning, setQuotaWarning] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load clips from IndexedDB on startup
  useEffect(() => {
    getAllClipsFromStorage().then((savedClips) => {
      setClips(savedClips);
      if (savedClips.length > 0 && !currentClip) {
        // Set the latest clip as initial player reference
        setCurrentClip(savedClips[0]);
      }
    });
  }, []);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Handle Preset Selection
  const handleApplyPreset = (preset: SampleTextPreset) => {
    setText(preset.text);
    const matchedVoice = VOICE_PERSONAS.find((v) => v.id === preset.suggestedVoiceId);
    if (matchedVoice) {
      setSelectedVoice(matchedVoice);
      setSpeed(matchedVoice.defaultSpeed);
      setPitch(matchedVoice.defaultPitch);
    }
    const matchedAccent = ACCENT_OPTIONS.find((a) => a.id === preset.suggestedAccentId);
    if (matchedAccent) setSelectedAccent(matchedAccent);

    const matchedTone = TONE_OPTIONS.find((t) => t.id === preset.suggestedToneId);
    if (matchedTone) setSelectedTone(matchedTone);

    setNotification({
      type: 'success',
      message: `Loaded &ldquo;${preset.title}&rdquo; sample preset.`,
    });
  };

  // Generate Speech Audio
  const handleGenerate = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setNotification(null);

    const useOffline = engineMode === 'offline' || !isOnline;

    if (useOffline) {
      try {
        const result = await generateOfflineSpeechMp3(
          text,
          selectedVoice,
          selectedAccent,
          selectedTone,
          speed,
          pitch,
          bitrate
        );

        const newClip: AudioClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: text.trim().substring(0, 32) + (text.length > 32 ? '...' : ''),
          text: text.trim(),
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          accentId: selectedAccent.id,
          accentName: selectedAccent.name,
          toneId: selectedTone.id,
          toneName: selectedTone.name,
          bitrate,
          duration: result.duration,
          createdAt: Date.now(),
          audioBase64: result.audioBase64,
          mimeType: 'audio/mpeg',
          engine: 'offline-local',
        };

        await saveClipToStorage(newClip);
        setClips((prev) => [newClip, ...prev]);
        setCurrentClip(newClip);
        setAutoPlayTrigger(Date.now());
        setNotification({
          type: 'success',
          message: 'Speech synthesized offline with high-quality MP3 export.',
        });
      } catch (err: any) {
        console.error('Offline speech error:', err);
        setNotification({
          type: 'error',
          message: 'Failed to synthesize offline speech: ' + (err.message || 'Unknown error'),
        });
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Try Gemini Cloud API
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice.id,
          accentId: selectedAccent.id,
          toneId: selectedTone.id,
          speed,
          pitch,
          bitrate,
          customAccent: selectedAccent.id === 'custom_accent' ? customAccent : undefined,
          customTone: selectedTone.id === 'custom_tone' ? customTone : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.audioBase64) {
        const newClip: AudioClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: text.trim().substring(0, 32) + (text.length > 32 ? '...' : ''),
          text: text.trim(),
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          accentId: selectedAccent.id,
          accentName: selectedAccent.name,
          toneId: selectedTone.id,
          toneName: selectedTone.name,
          bitrate,
          duration: data.duration || 3,
          createdAt: Date.now(),
          audioBase64: data.audioBase64,
          mimeType: 'audio/mpeg',
          engine: 'gemini-cloud',
        };

        await saveClipToStorage(newClip);
        setClips((prev) => [newClip, ...prev]);
        setCurrentClip(newClip);
        setAutoPlayTrigger(Date.now());
        setNotification({
          type: 'success',
          message: `Generated via Gemini 3.1 Flash TTS (${selectedVoice.name} • ${bitrate} kbps MP3).`,
        });
      } else {
        // Handle Quota Exhausted or Cloud Error
        if (data.quotaExceeded || res.status === 429) {
          setQuotaWarning(true);
          if (engineMode === 'auto') {
            // Automatic seamless offline fallback
            const fallbackResult = await generateOfflineSpeechMp3(
              text,
              selectedVoice,
              selectedAccent,
              selectedTone,
              speed,
              pitch,
              bitrate
            );

            const fallbackClip: AudioClip = {
              id: `clip_${Date.now()}_fallback`,
              title: text.trim().substring(0, 32) + (text.length > 32 ? '...' : ''),
              text: text.trim(),
              voiceId: selectedVoice.id,
              voiceName: selectedVoice.name,
              accentId: selectedAccent.id,
              accentName: selectedAccent.name,
              toneId: selectedTone.id,
              toneName: selectedTone.name,
              bitrate,
              duration: fallbackResult.duration,
              createdAt: Date.now(),
              audioBase64: fallbackResult.audioBase64,
              mimeType: 'audio/mpeg',
              engine: 'offline-local',
            };

            await saveClipToStorage(fallbackClip);
            setClips((prev) => [fallbackClip, ...prev]);
            setCurrentClip(fallbackClip);
            setAutoPlayTrigger(Date.now());

            setNotification({
              type: 'warning',
              message:
                'Gemini AI quota reached. Automatically synthesized via the Offline Engine.',
            });
            return;
          }
        }

        throw new Error(data.error || 'Server error generating TTS audio.');
      }
    } catch (error: any) {
      console.error('TTS Generation error:', error);
      // If in auto mode, fallback to offline engine
      if (engineMode === 'auto') {
        try {
          const fallbackResult = await generateOfflineSpeechMp3(
            text,
            selectedVoice,
            selectedAccent,
            selectedTone,
            speed,
            pitch,
            bitrate
          );

          const fallbackClip: AudioClip = {
            id: `clip_${Date.now()}_local`,
            title: text.trim().substring(0, 32) + (text.length > 32 ? '...' : ''),
            text: text.trim(),
            voiceId: selectedVoice.id,
            voiceName: selectedVoice.name,
            accentId: selectedAccent.id,
            accentName: selectedAccent.name,
            toneId: selectedTone.id,
            toneName: selectedTone.name,
            bitrate,
            duration: fallbackResult.duration,
            createdAt: Date.now(),
            audioBase64: fallbackResult.audioBase64,
            mimeType: 'audio/mpeg',
            engine: 'offline-local',
          };

          await saveClipToStorage(fallbackClip);
          setClips((prev) => [fallbackClip, ...prev]);
          setCurrentClip(fallbackClip);
          setAutoPlayTrigger(Date.now());
          setNotification({
            type: 'warning',
            message: 'Network issue. Switched to offline synthesizer seamlessly.',
          });
          return;
        } catch (offlineErr: any) {
          console.error('Offline fallback also failed:', offlineErr);
        }
      }

      setNotification({
        type: 'error',
        message: error.message || 'Failed to generate voice.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview Voice Sample
  const handlePreviewVoice = async (voice: VoicePersona) => {
    const previewText = voice.isTamil
      ? `வணக்கம்! என் பெயர் ${voice.name}. இந்த குரல் உங்களுக்கு பிடித்துள்ளதா?`
      : `Hello! My name is ${voice.name}. This is a preview of my voice.`;

    try {
      const res = await generateOfflineSpeechMp3(
        previewText,
        voice,
        selectedAccent,
        selectedTone,
        voice.defaultSpeed,
        voice.defaultPitch,
        192
      );

      const previewClip: AudioClip = {
        id: `preview_${voice.id}`,
        title: `Preview: ${voice.name}`,
        text: previewText,
        voiceId: voice.id,
        voiceName: voice.name,
        accentId: selectedAccent.id,
        accentName: selectedAccent.name,
        toneId: selectedTone.id,
        toneName: selectedTone.name,
        bitrate: 192,
        duration: res.duration,
        createdAt: Date.now(),
        audioBase64: res.audioBase64,
        mimeType: 'audio/mpeg',
        engine: 'offline-local',
      };

      setCurrentClip(previewClip);
      setAutoPlayTrigger(Date.now());
    } catch (e) {
      console.warn('Voice preview error:', e);
    }
  };

  // Select clip from library
  const handleSelectClip = (clip: AudioClip) => {
    setCurrentClip(clip);
    setAutoPlayTrigger(Date.now());
  };

  // Delete clip
  const handleDeleteClip = async (id: string) => {
    await deleteClipFromStorage(id);
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (currentClip?.id === id) {
      setCurrentClip(null);
    }
  };

  // Clear all clips
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear your local audio library?')) {
      await clearAllClipsFromStorage();
      setClips([]);
      setCurrentClip(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top App Bar */}
      <Header
        engineMode={engineMode}
        setEngineMode={setEngineMode}
        isOnline={isOnline}
        libraryCount={clips.length}
        quotaWarning={quotaWarning}
      />

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Floating / Inline Notification Banner */}
        {notification && (
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : notification.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              {notification.type === 'warning' && (
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              {notification.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Text Transcript & Generation Trigger */}
        <TextInputSection
          text={text}
          setText={setText}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          speed={speed}
          onApplyPreset={handleApplyPreset}
        />

        {/* Audio Player & Visualizer */}
        <AudioPlayerSection
          currentClip={currentClip}
          autoPlayTrigger={autoPlayTrigger}
        />

        {/* Voice Persona, Accent, Tone & Quality Customizer */}
        <VoiceCustomizer
          selectedVoice={selectedVoice}
          setSelectedVoice={setSelectedVoice}
          selectedAccent={selectedAccent}
          setSelectedAccent={setSelectedAccent}
          selectedTone={selectedTone}
          setSelectedTone={setSelectedTone}
          speed={speed}
          setSpeed={setSpeed}
          pitch={pitch}
          setPitch={setPitch}
          bitrate={bitrate}
          setBitrate={setBitrate}
          customAccent={customAccent}
          setCustomAccent={setCustomAccent}
          customTone={customTone}
          setCustomTone={setCustomTone}
          onPreviewVoice={handlePreviewVoice}
        />

        {/* Offline Audio Library & Clip History */}
        <ClipHistorySection
          clips={clips}
          onSelectClip={handleSelectClip}
          onDeleteClip={handleDeleteClip}
          onClearAll={handleClearAll}
          activeClipId={currentClip?.id}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Text to Speech Studio • Powered by Gemini 3.1 Flash TTS & Local Offline Speech Engine
          </div>
          <div className="flex items-center gap-4">
            <span>High-Quality MP3 Export</span>
            <span>•</span>
            <span>Tamil & Multilingual Personas</span>
            <span>•</span>
            <span>IndexedDB Persistence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
