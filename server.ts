import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { Mp3Encoder } from '@breezystack/lamejs';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Convert PCM buffer to MP3
function convertPcmToMp3(
  pcmBuffer: Buffer,
  sampleRate: number = 24000,
  bitrateKbps: number = 192,
  channels: number = 1
): Buffer {
  // 16-bit PCM little endian samples
  const int16Samples = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    Math.floor(pcmBuffer.byteLength / 2)
  );

  const encoder = new Mp3Encoder(channels, sampleRate, bitrateKbps);
  const chunks: Buffer[] = [];
  const blockSize = 1152;

  for (let i = 0; i < int16Samples.length; i += blockSize) {
    const slice = int16Samples.subarray(i, Math.min(i + blockSize, int16Samples.length));
    const mp3Buf = encoder.encodeBuffer(slice);
    if (mp3Buf && mp3Buf.length > 0) {
      chunks.push(Buffer.from(mp3Buf));
    }
  }

  const endBuf = encoder.flush();
  if (endBuf && endBuf.length > 0) {
    chunks.push(Buffer.from(endBuf));
  }

  return Buffer.concat(chunks);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    model: 'gemini-3.1-flash-tts-preview',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// TTS Generation Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceId = 'veera',
      accentId = 'tamil_tn',
      toneId = 'conversational',
      speed = 1.0,
      pitch = 1.0,
      bitrate = 192,
      customAccent = '',
      customTone = '',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ success: false, error: 'Text prompt is required.' });
      return;
    }

    const ai = getAiClient();

    // Determine base voice name and stylistic cues
    let baseVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede' = 'Charon';
    let styleDirection = '';

    switch (voiceId) {
      case 'veera':
        baseVoice = 'Charon';
        styleDirection = 'Speak in a very deep, low-pitched, bass-heavy, authoritative, commanding, and resonant Tamil male voice with clear enunciation';
        break;
      case 'kavitha':
        baseVoice = 'Kore';
        styleDirection = 'Speak in a warm, articulate, graceful, and natural Tamil female voice with authentic Tamil phonetics and expressive inflection';
        break;
      case 'iniyan':
        baseVoice = 'Puck';
        styleDirection = 'Speak in a clear, friendly, confident, and resonant Tamil male voice with natural cadence';
        break;
      case 'ananya':
        baseVoice = 'Puck';
        styleDirection = 'Speak like an energetic, adorable, cheerful Tamil child with joyful, curious, and playful inflection';
        break;
      case 'senthan':
        baseVoice = 'Fenrir';
        styleDirection = 'Speak as a dramatic, captivating Tamil classical narrator and storyteller with vivid pauses and emotional depth';
        break;
      case 'leo':
        baseVoice = 'Puck';
        styleDirection = 'Speak in the voice of an enthusiastic, curious 8-year-old boy with high vocal pitch and cheerful wonder';
        break;
      case 'mia':
        baseVoice = 'Kore';
        styleDirection = 'Speak in the voice of a sweet, cheerful, imaginative young girl with bright vocal pitch and friendly warmth';
        break;
      case 'charon':
        baseVoice = 'Charon';
        styleDirection = 'Speak in a deep, resonant, baritone voice with rich timber and calm authority';
        break;
      case 'kore':
        baseVoice = 'Kore';
        styleDirection = 'Speak in a crisp, clear, balanced, and articulate female voice with professional warmth';
        break;
      case 'puck':
        baseVoice = 'Puck';
        styleDirection = 'Speak in a lively, vibrant, engaging, and dynamic tone with friendly conversational energy';
        break;
      case 'fenrir':
        baseVoice = 'Fenrir';
        styleDirection = 'Speak in a strong, commanding, bold, and authoritative voice with decisive emphasis';
        break;
      case 'zephyr':
        baseVoice = 'Zephyr';
        styleDirection = 'Speak in a soothing, soft, airy, and relaxing voice with gentle breaths';
        break;
      case 'aoede':
        baseVoice = 'Aoede';
        styleDirection = 'Speak in an expressive, melodic, cultured voice with rich emotional shading';
        break;
      default:
        baseVoice = 'Charon';
        styleDirection = 'Speak clearly and naturally';
        break;
    }

    // Append accent instructions
    let accentDirection = '';
    if (accentId === 'tamil_tn') {
      accentDirection = 'with authentic Tamil Nadu continental Tamil pronunciation, natural Tamil intonation, and native Tamil phonetic phonemes';
    } else if (accentId === 'tamil_sl') {
      accentDirection = 'with authentic Northern Sri Lankan / Eelam Tamil dialect and classical Jaffna pronunciation';
    } else if (accentId === 'tamil_en') {
      accentDirection = 'with a colloquial South Indian bilingual Tamil-English accent';
    } else if (accentId === 'en_us') {
      accentDirection = 'with a standard General American accent and clear articulation';
    } else if (accentId === 'en_uk') {
      accentDirection = 'with a refined British Received Pronunciation accent';
    } else if (accentId === 'en_in') {
      accentDirection = 'with an authentic Indian English accent';
    } else if (accentId === 'custom_accent' && customAccent) {
      accentDirection = `with ${customAccent}`;
    }

    // Append tone instructions
    let toneDirection = '';
    if (toneId === 'deep_bass') {
      toneDirection = 'in a very deep, bass-heavy, booming, cinematic, and authoritative delivery';
    } else if (toneId === 'child_playful') {
      toneDirection = 'with cheerful, energetic, innocent, and playful child-like enthusiasm';
    } else if (toneId === 'professional') {
      toneDirection = 'in a polished, confident, professional corporate executive delivery';
    } else if (toneId === 'calm_meditation') {
      toneDirection = 'in a slow, deeply calming, mindful, and serene whisper-soft meditation tone';
    } else if (toneId === 'storyteller') {
      toneDirection = 'in an engaging, captivating, dramatic audiobook storyteller delivery';
    } else if (toneId === 'energetic') {
      toneDirection = 'in an upbeat, enthusiastic, highly energetic, and motivational delivery';
    } else if (toneId === 'whisper') {
      toneDirection = 'in a soft, intimate, gentle close-mic whisper tone';
    } else if (toneId === 'news_broadcast') {
      toneDirection = 'in an authoritative, crisp, and objective news anchor broadcast style';
    } else if (toneId === 'custom_tone' && customTone) {
      toneDirection = `in a ${customTone} tone`;
    }

    // Rate and pitch descriptions
    let pacingDirection = '';
    if (speed < 0.85) pacingDirection += ', speak slowly and deliberately';
    if (speed > 1.15) pacingDirection += ', speak briskly and at a fast pace';

    // Build the styled prompt for Gemini 3.1 Flash TTS
    const instructions = [styleDirection, accentDirection, toneDirection, pacingDirection]
      .filter(Boolean)
      .join(', ');

    const promptText = instructions ? `Say ${instructions}: ${text.trim()}` : text.trim();

    // Call Gemini 3.1 Flash TTS
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: baseVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio content returned by Gemini TTS');
    }

    const rawBuffer = Buffer.from(base64Audio, 'base64');

    // Check if rawBuffer contains a WAV header or raw PCM
    let pcmBuffer = rawBuffer;
    let sampleRate = 24000;

    if (rawBuffer.length > 44 && rawBuffer.toString('ascii', 0, 4) === 'RIFF') {
      // It has a WAV header, read sample rate at offset 24 (4 bytes uint32 little-endian)
      sampleRate = rawBuffer.readUInt32LE(24);
      // Skip 44-byte WAV header
      pcmBuffer = rawBuffer.subarray(44);
    }

    // Encode to standard high-quality MP3 (audio/mpeg)
    const bitrateVal = [128, 192, 256, 320].includes(Number(bitrate)) ? Number(bitrate) : 192;
    const mp3Buffer = convertPcmToMp3(pcmBuffer, sampleRate, bitrateVal, 1);
    const mp3Base64 = mp3Buffer.toString('base64');

    // Approximate duration
    const numSamples = Math.floor(pcmBuffer.byteLength / 2);
    const duration = Math.round((numSamples / sampleRate) * 10) / 10;

    res.json({
      success: true,
      audioBase64: mp3Base64,
      mimeType: 'audio/mpeg',
      sampleRate,
      duration,
      engineUsed: 'gemini-cloud',
    });
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    const errMsg = error?.message || String(error);
    const isQuota =
      error?.status === 429 ||
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('Quota exceeded') ||
      errMsg.includes('quota');

    res.status(isQuota ? 429 : 500).json({
      success: false,
      error: isQuota
        ? 'Gemini 3.1 Flash TTS quota reached or resource exhausted.'
        : errMsg,
      quotaExceeded: isQuota,
    });
  }
});

// Setup Vite development server or production static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS Studio Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
