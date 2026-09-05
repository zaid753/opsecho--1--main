import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import { useSocket } from '../context/SocketContext';
import client from '../api/client';

export const useAIAudioParticipant = (incidentId: string | undefined, humanSpeaking: boolean) => {
  const socket = useSocket();
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const aiClientRef = useRef<IAgoraRTCClient | null>(null);
  const aiTrackRef = useRef<ILocalAudioTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Join as the AI user
  useEffect(() => {
    if (!incidentId) return;

    let isMounted = true;
    
    const initAIClient = async () => {
      try {
        // Generate a random suffix for the AI UID so multiple clients don't conflict in the same room
        const randomSuffix = Math.floor(Math.random() * 100000);
        const res = await client.post('/agora/token', { incidentId, role: 'publisher', customUid: `ai-opsecho-system-${randomSuffix}` });
        const { token, channelName, appId, uid } = res.data;

        const aiClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        aiClientRef.current = aiClient;
        
        await aiClient.join(appId, channelName, token, uid);
        console.log('[AI Participant] Joined Agora channel as', uid);
      } catch (err) {
        console.error('[AI Participant] Failed to join:', err);
      }
    };

    initAIClient();

    return () => {
      isMounted = false;
      if (aiTrackRef.current) {
        aiTrackRef.current.close();
      }
      if (aiClientRef.current) {
        aiClientRef.current.leave();
      }
    };
  }, [incidentId]);

  // 2. Listen for AI_SPEAK events
  useEffect(() => {
    if (!socket || !incidentId || !aiClientRef.current) return;

    const handleAISpeak = async ({ text }: { text: string }) => {
      console.log('[AI Participant] Preparing to speak:', text);
      
      try {
        // We use a free TTS service for hackathon purposes that returns an audio file
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
        
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = ttsUrl;
        audioRef.current = audio;

        // Capture the audio stream from the element
        // @ts-ignore
        const stream = audio.captureStream ? audio.captureStream() : audio.mozCaptureStream ? audio.mozCaptureStream() : null;
        
        if (!stream) {
          console.warn("[AI Participant] captureStream not supported in this browser, falling back to local playback only");
          audio.play();
          return;
        }

        const audioTrack = stream.getAudioTracks()[0];
        
        // Unpublish old track if exists
        if (aiTrackRef.current) {
          await aiClientRef.current.unpublish(aiTrackRef.current);
          aiTrackRef.current.close();
        }

        // Create Agora custom track
        const customTrack = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: audioTrack });
        aiTrackRef.current = customTrack;

        setIsAISpeaking(true);

        audio.onended = async () => {
          setIsAISpeaking(false);
          if (aiClientRef.current && aiTrackRef.current) {
            await aiClientRef.current.unpublish(aiTrackRef.current);
          }
        };

        // Publish to Agora
        await aiClientRef.current.publish(customTrack);
        
        // Play it (needed for captureStream to produce data)
        // We mute it locally so the person running the AI host doesn't hear it twice
        audio.muted = true;
        await audio.play();

      } catch (err) {
        console.error('[AI Participant] TTS Error:', err);
        setIsAISpeaking(false);
      }
    };

    socket.on("AI_SPEAK", handleAISpeak);

    return () => {
      socket.off("AI_SPEAK", handleAISpeak);
    };
  }, [socket, incidentId]);

  // 3. Handle Interruptions
  useEffect(() => {
    if (humanSpeaking && isAISpeaking && audioRef.current) {
      console.log('[AI Participant] Interrupted by human speech!');
      audioRef.current.pause();
      setIsAISpeaking(false);
      
      if (aiClientRef.current && aiTrackRef.current) {
        aiClientRef.current.unpublish(aiTrackRef.current).catch(console.error);
      }
    }
  }, [humanSpeaking, isAISpeaking]);

  return { isAISpeaking };
};
