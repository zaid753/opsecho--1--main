import { useState, useEffect, useCallback, useRef } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IMicrophoneAudioTrack, 
  IAgoraRTCRemoteUser 
} from 'agora-rtc-sdk-ng';
import client from '../api/client';

export const useAgora = (incidentId: string | undefined) => {
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time audio levels (0-100)
  const [localVolume, setLocalVolume] = useState<number>(0);
  const [remoteVolumes, setRemoteVolumes] = useState<Record<string, number>>({});

  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const isJoiningRef = useRef<boolean>(false);

  const joinChannel = useCallback(async () => {
    if (!incidentId || isJoiningRef.current || agoraClientRef.current) return;
    
    isJoiningRef.current = true;
    setIsJoining(true);
    setError(null);

    try {
      // 1. Get token from backend
      const res = await client.post('/agora/token', { incidentId });
      const { token, channelName, appId } = res.data;

      // 2. Initialize Agora Client
      const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClientRef.current = agoraClient;

      // 3. Handle Events
      agoraClient.on('user-published', async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        if (mediaType === 'audio') {
          user.audioTrack?.play();
          setRemoteUsers(prev => {
            if (prev.find(u => u.uid === user.uid)) return prev;
            return [...prev, user];
          });
        }
      });

      agoraClient.on('user-unpublished', (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      agoraClient.on('user-left', (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        setRemoteVolumes(prev => {
          const next = { ...prev };
          delete next[user.uid];
          return next;
        });
      });

      // Enable volume indicator
      agoraClient.enableAudioVolumeIndicator();
      agoraClient.on("volume-indicator", (volumes) => {
        const remoteVols: Record<string, number> = {};
        volumes.forEach((volume) => {
          if (volume.uid === agoraClient.uid) {
            setLocalVolume(volume.level);
          } else {
            remoteVols[volume.uid] = volume.level;
          }
        });
        setRemoteVolumes(prev => ({ ...prev, ...remoteVols }));
      });

      // 4. Join Channel
      await agoraClient.join(appId, channelName, token, null);
      
      // 5. Create and Publish Local Audio
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true });
      localAudioTrackRef.current = audioTrack;
      setLocalAudioTrack(audioTrack);
      await agoraClient.publish(audioTrack);
      
      setIsConnected(true);
    } catch (err: any) {
      console.error('Agora Join Error:', err);
      setError(err.response?.data?.error || 'Failed to join voice room');
      
      // Attempt cleanup on failure
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
      }
    } finally {
      isJoiningRef.current = false;
      setIsJoining(false);
    }
  }, [incidentId]);

  const leaveChannel = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.setMuted(true);
        localAudioTrackRef.current.stop(); // Stop playing
        localAudioTrackRef.current.close(); // Release microphone hardware completely
        localAudioTrackRef.current = null;
      }
      setLocalAudioTrack(null);
      
      if (agoraClientRef.current) {
        agoraClientRef.current.removeAllListeners();
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
      }
    } catch (err) {
      console.error("Error leaving channel:", err);
    } finally {
      setIsConnected(false);
      setRemoteUsers([]);
      setLocalVolume(0);
      setRemoteVolumes({});
      setIsMuted(false);
      isJoiningRef.current = false;
      setIsJoining(false);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (localAudioTrackRef.current) {
      const nextMuted = !isMuted;
      await localAudioTrackRef.current.setMuted(nextMuted);
      setIsMuted(nextMuted);
      if (nextMuted) {
        setLocalVolume(0);
      }
    }
  }, [isMuted]);

  // CRITICAL: Aggressive cleanup on unmount
  useEffect(() => {
    return () => {
      leaveChannel();
    };
  }, [leaveChannel]);

  return {
    isConnected,
    isMuted,
    isJoining,
    remoteUsers,
    localVolume,
    remoteVolumes,
    error,
    joinChannel,
    leaveChannel,
    toggleMute
  };
};
