import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { encode } from '../lib/audioUtils';

export const useGeminiSTT = (incidentId: string | undefined, isEnabled: boolean) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const socket = useSocket();
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isSessionActiveRef = useRef(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptTextRef = useRef('');

  const stopListening = useCallback(() => {
    isSessionActiveRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setMediaStream(null);
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(console.error);
      inputAudioContextRef.current = null;
    }

    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.close()).catch(console.error);
      sessionRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (isSessionActiveRef.current) return;
    isSessionActiveRef.current = true;
    setIsListening(true);
    
    try {
      // 1. Fetch Key
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/gemini-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.key) throw new Error("No key returned");
      
      const ai = new GoogleGenAI({ apiKey: data.key });

      // 2. Setup Audio
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(mediaStreamRef.current);
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      await inputAudioContextRef.current.resume();

      // 3. Connect to Gemini Live
      sessionRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: 'You are an audio transcriber. Listen and transcribe what the user says accurately. Do not respond back with audio.',
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (e) => {
              if (!isSessionActiveRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = { 
                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)), 
                mimeType: 'audio/pcm;rate=16000' 
              };
              sessionRef.current?.then((s: any) => s.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!isSessionActiveRef.current) return;

            if (msg.serverContent?.inputTranscription?.text) {
              const text = msg.serverContent.inputTranscription.text.trim();
              if (text && text !== lastTranscriptTextRef.current) {
                lastTranscriptTextRef.current = text;
                setTranscript(text);
                
                // Emit final transcript to OpsEcho socket
                if (socket && incidentId) {
                  socket.emit('TRANSCRIPT_FINAL', { incidentId, text });
                }

                setIsSpeaking(true);
                if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 1500);
              }
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
      console.error("[Gemini STT] Failed:", e);
      stopListening();
    }
  }, [incidentId, socket, stopListening]);

  useEffect(() => {
    if (isEnabled && !isListening) {
      startListening();
    } else if (!isEnabled && isListening) {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isEnabled, isListening, startListening, stopListening]);

  return { isListening, isSpeaking, transcript, mediaStream };
};
