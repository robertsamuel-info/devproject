'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface StreamTrack {
  id: number;
  label: string;
  color: string;
  ratePerSecond: number; // STT/s — drives particle speed
  progress: number; // 0–1
  from: string;
  to: string;
}

interface Particle {
  trackIdx: number;
  x: number;
  y: number;
  progress: number; // 0–1 along the track
  opacity: number;
  speed: number; // pixels per frame
  size: number;
}

interface LiveStreamFlowProps {
  streams?: StreamTrack[];
  className?: string;
}

// Track layout constants
const TRACK_HEIGHT = 56;
const TRACK_PADDING = 16;
const CANVAS_PADDING_LEFT = 120;
const CANVAS_PADDING_RIGHT = 80;
const PARTICLE_CHANCE = 0.06; // probability of spawning a new particle per frame per active track

const DEFAULT_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function buildDefaultTracks(streams: StreamTrack[], canvasWidth: number): {
  y: number;
  width: number;
  track: StreamTrack;
}[] {
  return streams.map((track, i) => ({
    y: TRACK_PADDING + i * TRACK_HEIGHT + TRACK_HEIGHT / 2,
    width: canvasWidth - CANVAS_PADDING_LEFT - CANVAS_PADDING_RIGHT,
    track,
  }));
}

export default function LiveStreamFlow({ streams, className }: LiveStreamFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const streamsRef = useRef<StreamTrack[]>([]);

  // Placeholder tracks when no real streams are provided
  const placeholderStreams: StreamTrack[] = [
    { id: 1, label: 'Engineering Payroll', color: DEFAULT_COLORS[0], ratePerSecond: 0.002, progress: 0.6, from: 'Treasury', to: 'Dev Team' },
    { id: 2, label: 'Design Subscription', color: DEFAULT_COLORS[1], ratePerSecond: 0.001, progress: 0.3, from: 'Treasury', to: 'Design' },
    { id: 3, label: 'Ops Payroll', color: DEFAULT_COLORS[2], ratePerSecond: 0.0015, progress: 0.8, from: 'Treasury', to: 'Ops' },
  ];

  const activeTracks = (streams && streams.length > 0 ? streams : placeholderStreams).slice(0, 6);
  streamsRef.current = activeTracks;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const tracks = buildDefaultTracks(streamsRef.current, W);

    ctx.clearRect(0, 0, W, H);

    // Draw track lines + labels
    tracks.forEach(({ y, width, track }) => {
      const x0 = CANVAS_PADDING_LEFT;
      const x1 = x0 + width;

      // Track line
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.strokeStyle = hexAlpha(track.color, 0.18);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Progress fill
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + width * track.progress, y);
      ctx.strokeStyle = hexAlpha(track.color, 0.45);
      ctx.lineWidth = 3;
      ctx.stroke();

      // From label (left)
      ctx.fillStyle = hexAlpha(track.color, 0.7);
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(track.from, x0 - 8, y + 4);

      // To label (right)
      ctx.textAlign = 'left';
      ctx.fillText(track.to, x1 + 8, y + 4);

      // Stream label (centre top)
      ctx.fillStyle = hexAlpha('#ffffff', 0.5);
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${track.label} · ${(track.ratePerSecond * 1000).toFixed(3)} mSTT/s`, x0 + width / 2, y - 10);

      // Speed indicator bars (5 bars, right side)
      const speedLevel = Math.min(5, Math.ceil((track.ratePerSecond / 0.002) * 5));
      for (let b = 0; b < 5; b++) {
        const bx = x1 + 12;
        const by = y + 8 + b * -5;
        ctx.fillStyle = b < speedLevel ? track.color : hexAlpha('#ffffff', 0.1);
        ctx.fillRect(bx + b * 5, by - 3, 3, speedLevel > b ? 3 + b : 2);
      }
    });

    // Spawn new particles
    tracks.forEach((t, i) => {
      if (Math.random() < PARTICLE_CHANCE) {
        const speed = 0.004 + t.track.ratePerSecond * 3;
        particlesRef.current.push({
          trackIdx: i,
          x: CANVAS_PADDING_LEFT,
          y: t.y,
          progress: 0,
          opacity: 0.9,
          speed,
          size: 3 + t.track.ratePerSecond * 300,
        });
      }
    });

    // Update & draw particles
    particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.02);
    particlesRef.current.forEach(p => {
      const track = tracks[p.trackIdx];
      if (!track) return;

      p.progress += p.speed;
      p.x = CANVAS_PADDING_LEFT + p.progress * track.width;
      p.y = track.y;

      if (p.progress >= 1) {
        p.opacity *= 0.5; // fade out at end
      }

      const color = track.track.color;

      // Glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grd.addColorStop(0, hexAlpha(color, p.opacity * 0.5));
      grd.addColorStop(1, hexAlpha(color, 0));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = hexAlpha(color, p.opacity);
      ctx.fill();
    });

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Resize observer to keep canvas pixel-accurate
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = TRACK_PADDING * 2 + activeTracks.length * TRACK_HEIGHT;
      }
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [activeTracks.length]);

  const canvasHeight = TRACK_PADDING * 2 + activeTracks.length * TRACK_HEIGHT;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Live Payment Flow</h3>
          <p className="text-xs text-muted-foreground">Real-time stream visualization</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>
      <div className="w-full overflow-hidden rounded-lg bg-black/5 dark:bg-black/40" style={{ height: canvasHeight }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: canvasHeight }}
          width={600}
          height={canvasHeight}
        />
      </div>
    </div>
  );
}

// Helper: hex color + alpha → rgba string
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
