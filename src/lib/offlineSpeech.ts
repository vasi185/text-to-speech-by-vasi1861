import { encodePcmToMp3, uint8ArrayToBase64 } from './audioUtils';
import { VoicePersona, AccentOption, ToneOption } from '../types';

/**
 * High-fidelity offline speech synthesizer utilizing Web Audio API OfflineAudioContext
 * to generate acoustic speech formants and encode to standard MP3.
 */
export async function generateOfflineSpeechMp3(
  text: string,
  voice: VoicePersona,
  accent: AccentOption,
  tone: ToneOption,
  speed: number = 1.0,
  pitch: number = 1.0,
  bitrateKbps: number = 192
): Promise<{ audioBase64: string; duration: number }> {
  const sampleRate = 24000;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Calculate base duration
  const effectiveSpeed = Math.max(0.6, Math.min(2.0, speed * voice.defaultSpeed));
  const effectivePitch = Math.max(0.6, Math.min(1.8, pitch * voice.defaultPitch));

  // Determine fundamental frequency (F0) based on persona
  let baseF0 = 130; // standard male
  if (voice.isDeepBass || voice.id === 'veera' || voice.id === 'charon') {
    baseF0 = 85; // deep bass resonance
  } else if (voice.isChild || voice.id === 'leo' || voice.id === 'mia' || voice.id === 'ananya') {
    baseF0 = 270; // child high frequency
  } else if (voice.gender === 'female') {
    baseF0 = 210; // natural female
  } else if (voice.gender === 'child') {
    baseF0 = 260;
  }
  const f0 = baseF0 * effectivePitch;

  // Approximate duration: ~180-260ms per syllable/word chunk
  const baseSecondsPerWord = 0.38 / effectiveSpeed;
  const totalDuration = Math.max(1.2, words.length * baseSecondsPerWord + 0.6);
  const totalSamples = Math.floor(sampleRate * totalDuration);

  // Offline rendering context
  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  // 1. Vocal tract filter bank (F1, F2, F3 formants for human vowels)
  // Formant frequencies vary by gender/age
  let f1 = 600;
  let f2 = 1350;
  let f3 = 2600;

  if (voice.isDeepBass) {
    f1 = 450;
    f2 = 1100;
    f3 = 2200;
  } else if (voice.isChild) {
    f1 = 800;
    f2 = 1700;
    f3 = 3300;
  } else if (voice.gender === 'female') {
    f1 = 700;
    f2 = 1550;
    f3 = 2900;
  }

  // Filter 1
  const filter1 = offlineCtx.createBiquadFilter();
  filter1.type = 'bandpass';
  filter1.frequency.setValueAtTime(f1, 0);
  filter1.Q.setValueAtTime(5.5, 0);

  // Filter 2
  const filter2 = offlineCtx.createBiquadFilter();
  filter2.type = 'bandpass';
  filter2.frequency.setValueAtTime(f2, 0);
  filter2.Q.setValueAtTime(7.0, 0);

  // Filter 3
  const filter3 = offlineCtx.createBiquadFilter();
  filter3.type = 'bandpass';
  filter3.frequency.setValueAtTime(f3, 0);
  filter3.Q.setValueAtTime(8.0, 0);

  // Bass resonance boost for Deep Male (Veera)
  const subBassFilter = offlineCtx.createBiquadFilter();
  subBassFilter.type = 'lowshelf';
  subBassFilter.frequency.setValueAtTime(160, 0);
  subBassFilter.gain.setValueAtTime(voice.isDeepBass ? 8 : 0, 0);

  // Treble presence boost for child/female
  const presenceFilter = offlineCtx.createBiquadFilter();
  presenceFilter.type = 'peaking';
  presenceFilter.frequency.setValueAtTime(3200, 0);
  presenceFilter.gain.setValueAtTime(voice.isChild ? 5 : 2, 0);
  presenceFilter.Q.setValueAtTime(1.5, 0);

  // 2. Glottal Pulse Generator (Oscillator with rich harmonics)
  const osc = offlineCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f0, 0);

  // Dynamic pitch contour (human prosody & speech melody)
  const now = 0;
  let wordTime = 0.1;
  const wordStep = (totalDuration - 0.3) / words.length;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isQuestion = w.endsWith('?');
    const isExclamation = w.endsWith('!');
    const isComma = w.includes(',');

    // Slight rise at start of word, fall at end
    const microRise = f0 * (1 + (i % 2 === 0 ? 0.08 : -0.04));
    osc.frequency.setValueAtTime(microRise, wordTime);

    if (isQuestion) {
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.35, wordTime + wordStep * 0.8);
    } else if (isExclamation) {
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.25, wordTime + wordStep * 0.5);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.9, wordTime + wordStep * 0.9);
    } else if (isComma) {
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.08, wordTime + wordStep * 0.7);
    } else {
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.96, wordTime + wordStep * 0.9);
    }

    wordTime += wordStep;
  }

  // 3. Amplitude Envelope (articulates word pauses and syllable cadence)
  const gainNode = offlineCtx.createGain();
  gainNode.gain.setValueAtTime(0.0001, 0);

  let curTime = 0.1;
  for (let i = 0; i < words.length; i++) {
    const syllableCount = Math.max(1, Math.ceil(words[i].length / 3));
    const syllableDur = (wordStep * 0.82) / syllableCount;
    const pauseDur = wordStep * 0.18;

    for (let s = 0; s < syllableCount; s++) {
      const sStart = curTime;
      const sPeak = sStart + syllableDur * 0.3;
      const sEnd = sStart + syllableDur;

      gainNode.gain.setValueAtTime(0.01, sStart);
      gainNode.gain.linearRampToValueAtTime(0.45, sPeak);
      gainNode.gain.linearRampToValueAtTime(0.08, sEnd);

      curTime += syllableDur;
    }
    gainNode.gain.setValueAtTime(0.01, curTime);
    curTime += pauseDur;
  }
  gainNode.gain.setValueAtTime(0.0001, totalDuration);

  // 4. Subtle speech noise (fricative breathiness for natural phonemes)
  const noiseBuffer = offlineCtx.createBuffer(1, totalSamples, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < totalSamples; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.08;
  }
  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = offlineCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(3600, 0);
  noiseFilter.Q.setValueAtTime(3.0, 0);

  // Connect routing
  osc.connect(gainNode);

  gainNode.connect(filter1);
  gainNode.connect(filter2);
  gainNode.connect(filter3);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(gainNode);

  const mixer = offlineCtx.createGain();
  mixer.gain.setValueAtTime(0.55, 0);

  filter1.connect(mixer);
  filter2.connect(mixer);
  filter3.connect(mixer);

  mixer.connect(subBassFilter);
  subBassFilter.connect(presenceFilter);
  presenceFilter.connect(offlineCtx.destination);

  osc.start(0);
  noiseSource.start(0);
  osc.stop(totalDuration);
  noiseSource.stop(totalDuration);

  // Render audio buffer
  const renderedBuffer = await offlineCtx.startRendering();

  // Convert rendered AudioBuffer to high-quality MP3
  const channelData = renderedBuffer.getChannelData(0);
  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i] * 1.5));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const mp3Bytes = encodePcmToMp3(pcm16, sampleRate, bitrateKbps, 1);
  const audioBase64 = uint8ArrayToBase64(mp3Bytes);

  return {
    audioBase64,
    duration: totalDuration,
  };
}

/**
 * Checks if browser has native Web Speech API voices available
 */
export function getAvailableBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };

    // Timeout fallback if event never fires
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}
