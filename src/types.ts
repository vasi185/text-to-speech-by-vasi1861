export type EngineMode = 'auto' | 'cloud' | 'offline';

export interface VoicePersona {
  id: string;
  name: string;
  nativeName?: string;
  gender: 'male' | 'female' | 'child';
  language: 'tamil' | 'english' | 'multilingual';
  baseVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';
  description: string;
  tags: string[];
  defaultPitch: number; // 0.5 to 1.5
  defaultSpeed: number; // 0.5 to 2.0
  stylePrompt: string;
  isChild?: boolean;
  isTamil?: boolean;
  isDeepBass?: boolean;
}

export interface AccentOption {
  id: string;
  name: string;
  regionalName: string;
  flag: string;
  languageGroup: 'tamil' | 'english' | 'global';
  promptInstruction: string;
}

export interface ToneOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  promptInstruction: string;
}

export interface AudioQuality {
  bitrate: 128 | 192 | 256 | 320;
  label: string;
  tag: string;
  description: string;
}

export interface AudioClip {
  id: string;
  title: string;
  text: string;
  voiceId: string;
  voiceName: string;
  accentId: string;
  accentName: string;
  toneId: string;
  toneName: string;
  bitrate: number;
  duration: number;
  createdAt: number;
  audioBase64: string; // Base64 audio/mpeg
  mimeType: string;
  engine: 'gemini-cloud' | 'offline-local';
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  accentId: string;
  toneId: string;
  customAccent?: string;
  customTone?: string;
  speed: number;
  pitch: number;
  bitrate: number;
}

export interface TTSResponse {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  sampleRate?: number;
  duration?: number;
  engineUsed?: 'gemini-cloud' | 'offline-local';
  error?: string;
  quotaExceeded?: boolean;
}

export interface SampleTextPreset {
  id: string;
  title: string;
  language: 'tamil' | 'english';
  category: string;
  text: string;
  suggestedVoiceId: string;
  suggestedAccentId: string;
  suggestedToneId: string;
}
