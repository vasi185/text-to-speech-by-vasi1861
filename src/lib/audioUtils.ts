import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Encodes a 16-bit mono or stereo PCM sample array into high-quality MP3 format.
 * @param pcmSamples Int16Array of audio samples
 * @param sampleRate e.g. 24000 or 44100
 * @param bitrateKbps e.g. 128, 192, 256, 320
 * @param channels 1 for mono, 2 for stereo
 */
export function encodePcmToMp3(
  pcmSamples: Int16Array,
  sampleRate: number = 24000,
  bitrateKbps: number = 192,
  channels: number = 1
): Uint8Array {
  const encoder = new Mp3Encoder(channels, sampleRate, bitrateKbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  const numSamples = pcmSamples.length;

  for (let i = 0; i < numSamples; i += sampleBlockSize) {
    const chunk = pcmSamples.subarray(i, Math.min(i + sampleBlockSize, numSamples));
    let mp3buf: Uint8Array;
    if (channels === 1) {
      mp3buf = encoder.encodeBuffer(chunk);
    } else {
      // Split channels if stereo
      mp3buf = encoder.encodeBuffer(chunk, chunk);
    }
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endBuf = encoder.flush();
  if (endBuf && endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  // Calculate total length
  const totalLength = mp3Data.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Data) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Encodes an AudioBuffer (from Web Audio API) directly to MP3.
 */
export function audioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitrateKbps: number = 192
): Uint8Array {
  const channels = 1; // mono is standard and clearest for speech
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
  const pcmSamples = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcmSamples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return encodePcmToMp3(pcmSamples, sampleRate, bitrateKbps, channels);
}

/**
 * Converts Base64 string to Blob with audio/mpeg
 */
export function base64ToAudioBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Converts Uint8Array to base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Blob to Base64 data
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // remove data:audio/mpeg;base64, prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Triggers a direct browser file download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Formats time in seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Estimates duration in seconds based on word count and speed factor
 */
export function estimateDuration(text: string, speedFactor: number = 1.0): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  // Average speaking rate: ~140 words per minute
  const baseMinutes = words / 140;
  const seconds = (baseMinutes * 60) / Math.max(0.5, speedFactor);
  return Math.max(1, Math.round(seconds));
}
