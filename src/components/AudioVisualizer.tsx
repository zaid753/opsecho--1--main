import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

/**
 * AudioVisualizer
 *
 * Renders a fixed-position waveform bar animation at the bottom-center
 * of the screen when the user is actively speaking (isActive=true & stream set).
 * Uses the Web Audio AnalyserNode to read frequency data from the mic stream.
 */
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive || !stream) {
      // Stop animation when inactive
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Create AudioContext once
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;

    // Resume suspended context (browser policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Clean up old source before creating a new one
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyserRef.current = analyser;

    try {
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (e) {
      console.error('[AudioVisualizer] Failed to connect stream:', e);
      return;
    }

    const bufferLength = analyser.frequencyBinCount; // 64 bins
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d')!;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const W = canvas.width;
      const H = canvas.height;
      canvasCtx.clearRect(0, 0, W, H);

      // Only draw the middle 32 bins (more pleasing visually)
      const numBars = 32;
      const start = Math.floor((bufferLength - numBars) / 2);
      const barW = W / numBars;
      const maxBarH = H * 0.9;

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[start + i] / 255; // 0..1
        const barH = Math.max(4, val * maxBarH);
        const x = i * barW;
        const y = (H - barH) / 2;

        // Blue → indigo gradient based on volume
        const hue = 220 + val * 30;
        const alpha = 0.5 + val * 0.5;
        canvasCtx.fillStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;

        // Rounded bars
        canvasCtx.beginPath();
        canvasCtx.roundRect(x + 1, y, barW - 2, barH, barW / 3);
        canvasCtx.fill();
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    };
  }, [stream, isActive]);

  if (!isActive || !stream) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '88px', // just above the footer control bar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '16px',
        padding: '8px 20px',
      }}
    >
      {/* Pulsing mic indicator */}
      <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: '#6366f1',
          animation: 'pulse 1.2s ease-in-out infinite',
        }} />
      </div>
      <canvas
        ref={canvasRef}
        width={240}
        height={40}
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default AudioVisualizer;
