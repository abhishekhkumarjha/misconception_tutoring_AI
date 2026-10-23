import React, { useEffect, useRef } from 'react';

export const MathBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    const symbols = ['∑', '∫', '∂', 'π', '√', '∞', 'α', 'β', 'θ', 'Δ', '÷', '×', '≠', '≈', '±', '∇', 'λ', 'μ', 'σ'];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      symbol: string; size: number; opacity: number; color: string;
    }[] = [];

    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    for (let i = 0; i < 65; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        size: 14 + Math.random() * 26,
        opacity: 0.05 + Math.random() * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.symbol, p.x, p.y);
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -50) p.x = canvas.width + 50;
        if (p.x > canvas.width + 50) p.x = -50;
        if (p.y < -50) p.y = canvas.height + 50;
        if (p.y > canvas.height + 50) p.y = -50;
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', setSize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', setSize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Base Cosmic Dark Gradient */}
      <div
        className="fixed inset-0"
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 40%, #0a0f1a 100%)',
        }}
      />

      {/* Floating Math Symbols Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />

      {/* Ambient Glowing Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(55px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '8%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(65px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '350px',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.09) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
    </div>
  );
};
