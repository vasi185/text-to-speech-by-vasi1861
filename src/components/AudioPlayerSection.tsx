import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  FastForward,
  Rewind,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { AudioClip } from '../types';
import { base64ToAudioBlob, downloadBlob, formatTime } from '../lib/audioUtils';

interface AudioPlayerSectionProps {
  currentClip: AudioClip | null;
  autoPlayTrigger?: number;
}

export const AudioPlayerSection: React.FC<AudioPlayerSectionProps> = ({
  currentClip,
  autoPlayTrigger,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Manage object URLs safely to avoid stale URLs or memory leaks
  useEffect(() => {
    if (!currentClip || !currentClip.audioBase64) {
      setAudioUrl(null);
      return;
    }

    // Convert base64 to standard audio/mpeg blob
    const blob = base64ToAudioBlob(currentClip.audioBase64, 'audio/mpeg');
    const freshUrl = URL.createObjectURL(blob);
    setAudioUrl(freshUrl);

    // Reset playback position
    setCurrentTime(0);

    return () => {
      URL.revokeObjectURL(freshUrl);
    };
  }, [currentClip]);

  // Autoplay only when autoPlayTrigger changes and audio is ready
  useEffect(() => {
    if (!autoPlayTrigger || !audioRef.current) return;
    const audio = audioRef.current;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Autoplay prevented by browser:', err);
          setIsPlaying(false);
        });
    }
  }, [autoPlayTrigger, audioUrl]);

  // Handle Play/Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error('Audio play error:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || currentClip?.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const nextTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = () => {
    if (!currentClip) return;
    const blob = base64ToAudioBlob(currentClip.audioBase64, 'audio/mpeg');
    const safeVoice = currentClip.voiceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const safeAccent = currentClip.accentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `speech-${safeVoice}-${safeAccent}-${currentClip.bitrate}kbps.mp3`;
    downloadBlob(blob, filename);
  };

  // Canvas waveform animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = width / barCount - 2;
      const progress = duration > 0 ? currentTime / duration : 0;
      const progressIndex = Math.floor(progress * barCount);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 2);
        // Harmonic height variation
        let barHeight = 6;
        if (isPlaying) {
          const t = Date.now() * 0.005;
          const wave = Math.sin(i * 0.3 + t) * Math.cos(i * 0.15 - t * 0.5);
          barHeight = 8 + Math.abs(wave) * (height - 16);
        } else {
          // Static visual contour
          const staticWave = Math.sin(i * 0.25) * 0.5 + 0.5;
          barHeight = 6 + staticWave * 18;
        }

        const y = (height - barHeight) / 2;

        if (i <= progressIndex) {
          // Active gradient
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#6366f1');
          grad.addColorStop(1, '#8b5cf6');
          ctx.fillStyle = grad;
        } else {
          // Inactive track
          ctx.fillStyle = '#e2e8f0';
        }

        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, currentTime, duration]);

  if (!currentClip || !audioUrl) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Play className="w-5 h-5 ml-0.5" />
        </div>
        <p className="text-sm font-medium text-slate-600">No Speech Audio Generated Yet</p>
        <p className="text-xs text-slate-400 max-w-sm">
          Select your voice persona, dialect, and tone above, then click &ldquo;Generate Audio&rdquo; to
          listen and export high-quality MP3.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      {/* Hidden native HTML5 Audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-slate-900">{currentClip.title}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentClip.voiceName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
              {currentClip.accentName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
              {currentClip.toneName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {currentClip.bitrate} kbps MP3
            </span>
          </div>
        </div>

        {/* Engine indicator */}
        <div className="flex items-center gap-2">
          {currentClip.engine === 'gemini-cloud' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Gemini 3.1 Flash TTS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <WifiOff className="w-3 h-3 text-emerald-500" />
              Offline Synthesizer
            </span>
          )}
        </div>
      </div>

      {/* Canvas Waveform Visualizer */}
      <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200/80">
        <canvas
          ref={canvasRef}
          width={600}
          height={60}
          className="w-full h-14 block cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = clickX / rect.width;
            const newTime = ratio * (duration || currentClip.duration);
            if (audioRef.current) {
              audioRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }
          }}
        />
      </div>

      {/* Scrubber Timeline */}
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={duration || currentClip.duration || 1}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
        />
        <div className="flex justify-between text-xs font-mono text-slate-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || currentClip.duration)}</span>
        </div>
      </div>

      {/* Primary Control Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* Playback Transport */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Rewind 5s"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 transition-transform active:scale-95 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(5)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Forward 5s"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed Toggles */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-mono">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => handleSpeedChange(rate)}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                playbackRate === rate
                  ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Volume Slider & Direct MP3 Download */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="hidden md:flex items-center gap-1.5 text-slate-500">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 hover:text-slate-800 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all cursor-pointer shrink-0"
            title="Download High Quality MP3 file"
          >
            <Download className="w-4 h-4" />
            <span>Download MP3</span>
          </button>
        </div>
      </div>
    </div>
  );
};
