import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { encode } from '../lib/audioUtils';

/**
 * useGeminiSTT
 *
 * Streams audio to Gemini Multimodal Live API for real-time STT.
 *
 * KEY DESIGN: accepts an `agoraTrack` (MediaStreamTrack) from useAgoraRoom
 * instead of calling getUserMedia() itself. This means we reuse the same
 * track that Agora already has, so Agora's built-in AEC/ANS applies to the
 * audio we send to Gemini — eliminating the echo.
 *
 * On transcript: POSTs to /api/incidents/:id/chat (REST, Vercel-compatible).
 */
export const useGeminiSTT = (
  incidentId: string | undefined,
  isEnabled: boolean,
  agoraTrack: MediaStreamTrack | null
) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const sessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isSessionActiveRef = useRef(false);
  const lastTranscriptTextRef = useRef('');

  const stopListening = useCallback(() => {
    isSessionActiveRef.current = false;
    setIsListening(false);

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(console.error);
      inputAudioContextRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s?.close()).catch(console.error);
      sessionRef.current = null;
    }

    setMediaStream(null);
  }, []);

  const startListening = useCallback(async () => {
    // Don't start if already active, or if there is no Agora track to use
    if (isSessionActiveRef.current || !agoraTrack || !incidentId) return;
    isSessionActiveRef.current = true;
    setIsListening(true);

    try {
      // 1. Fetch Gemini API key from backend
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/gemini-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.key) throw new Error('No Gemini key returned from backend');

      const ai = new GoogleGenAI({ apiKey: data.key });

      // 2. Wrap the existing Agora track in a MediaStream
      //    This reuses the AEC-processed track — NO new mic grab, NO echo.
      const stream = new MediaStream([agoraTrack]);
      setMediaStream(stream);

      // 3. Set up AudioContext at 16 kHz (what Gemini Live expects)
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      await inputAudioContextRef.current.resume();

      // 4. Connect to Gemini Live — STT only, no audio response
      sessionRef.current = ai.live.connect({
        model: 'gemini-2.0-flash-live-001',
        config: {
          responseModalities: [Modality.TEXT],
          systemInstruction: 'You are a real-time audio transcriber. Transcribe the user speech accurately and concisely. Only output the transcription, nothing else.',
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (e) => {
              if (!isSessionActiveRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = encode(new Uint8Array(new Int16Array(inputData.map(f => Math.max(-1, Math.min(1, f)) * 32768)).buffer));
              const pcmBlob = { data: pcmData, mimeType: 'audio/pcm;rate=16000' };
              sessionRef.current?.then((s: any) => s?.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessorRef.current);
            // Connect to destination so the node stays active (don't play it — Agora handles that)
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },

          onmessage: async (msg: LiveServerMessage) => {
            if (!isSessionActiveRef.current) return;

            // Handle input transcription (what the user said)
            const text = msg.serverContent?.inputTranscription?.text?.trim();
            if (text && text !== lastTranscriptTextRef.current) {
              lastTranscriptTextRef.current = text;
              setTranscript(text);

              // POST to REST API — Vercel-compatible, persists to DB, triggers AI
              try {
                const token = localStorage.getItem('token');
                await fetch(`/api/incidents/${incidentId}/chat`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({ text, source: 'voice' }),
                });
              } catch (err) {
                console.error('[Gemini STT] Failed to POST transcript:', err);
              }

              // Auto-clear the subtitle overlay after 2 seconds
              setTimeout(() => {
                setTranscript(t => (t === text ? '' : t));
              }, 2000);
            }
          },

          onerror: (e: ErrorEvent) => {
            console.error('[Gemini STT] Error:', e);
            stopListening();
          },

          onclose: () => {
            if (isSessionActiveRef.current) stopListening();
          },
        },
      });

    } catch (e) {
      console.error('[Gemini STT] Failed to start:', e);
      stopListening();
    }
  }, [incidentId, agoraTrack, stopListening]);

  useEffect(() => {
    if (isEnabled && agoraTrack && !isSessionActiveRef.current) {
      startListening();
    } else if (!isEnabled && isSessionActiveRef.current) {
      stopListening();
    }

    return () => {
      stopListening();
    };
  // startListening is memoized via useCallback; including it ensures
  // the effect re-fires when agoraTrack becomes available after join.
  }, [isEnabled, agoraTrack, startListening, stopListening]);

  return { isListening, transcript, mediaStream };
};
