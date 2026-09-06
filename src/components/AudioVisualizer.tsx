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

      // Create a gradient for the wave
      const gradient = canvasCtx.createLinearGradient(0, 0, W, 0);
      gradient.addColorStop(0, '#6366f1'); // Indigo
      gradient.addColorStop(0.5, '#ec4899'); // Pink
      gradient.addColorStop(1, '#8b5cf6'); // Violet

      canvasCtx.beginPath();
      canvasCtx.moveTo(0, H / 2);

      const numPoints = 64;
      const sliceWidth = W / numPoints;
      let x = 0;

      for (let i = 0; i < numPoints; i++) {
        // Use a smoothed value
        const val = dataArray[i] / 255.0;
        const v = val * (H / 2) * 1.5; // Amplify slightly
        
        // Alternate up and down to create a mirrored waveform effect, or just draw a filled wave
        const y = (H / 2) - v;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          // Quadratic curve for smoothness
          const prevX = x - sliceWidth;
          const prevVal = dataArray[i-1] / 255.0;
          const prevY = (H / 2) - (prevVal * (H / 2) * 1.5);
          const cpX = prevX + sliceWidth / 2;
          const cpY = prevY;
          canvasCtx.quadraticCurveTo(cpX, cpY, x, y);
        }

        x += sliceWidth;
      }
      
      // Mirror the bottom half for a symmetrical wave
      for (let i = numPoints - 1; i >= 0; i--) {
        const val = dataArray[i] / 255.0;
        const v = val * (H / 2) * 1.5;
        const y = (H / 2) + v;
        const prevX = (i + 1) * sliceWidth;
        const currX = i * sliceWidth;
        
        if (i === numPoints - 1) {
          canvasCtx.lineTo(currX, y);
        } else {
          const cpX = currX + sliceWidth / 2;
          canvasCtx.lineTo(currX, y);
        }
      }

      canvasCtx.lineTo(0, H / 2);
      
      canvasCtx.fillStyle = gradient;
      canvasCtx.fill();
      
      // Add a glowing line on top
      canvasCtx.shadowBlur = 10;
      canvasCtx.shadowColor = '#ec4899';
      canvasCtx.strokeStyle = 'white';
      canvasCtx.lineWidth = 1;
      canvasCtx.stroke();
      canvasCtx.shadowBlur = 0; // reset
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
      className="glass-panel w-full max-w-2xl mx-auto mt-4"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        borderRadius: '24px',
        padding: '16px 32px',
        boxShadow: '0 0 40px rgba(99, 102, 241, 0.1)',
        background: 'rgba(9, 9, 11, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Pulsing mic indicator */}
      <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: '#6366f1',
          animation: 'pulse 1.2s ease-in-out infinite',
          boxShadow: '0 0 15px #6366f1'
        }} />
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={60}
        style={{ display: 'block', width: '100%', maxWidth: '320px' }}
      />
    </div>
  );
};

export default AudioVisualizer;
