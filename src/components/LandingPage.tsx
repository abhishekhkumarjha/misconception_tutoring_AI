import React, { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    setLeaving(true);
    setTimeout(() => onEnter(), 400);
  };

  const features = [
    { icon: '🧠', title: 'Misconception Detection', desc: 'Pinpoints exactly why you\'re wrong, not just that you\'re wrong' },
    { icon: '🎓', title: 'TalkMoves Pedagogy', desc: 'Guided questioning from 68,000+ real teacher-student dialogue turns' },
    { icon: '📚', title: '55k+ Knowledge Records', desc: 'Trained on EEDI Diagnostic Questions, MathDial, GSM8K & Hendrycks' },
    { icon: '⚡', title: 'Multi-Agent Pipeline', desc: '4 specialized AI agents collaborating in real time' },
  ];

  const stats = [
    { value: '55,422', label: 'Knowledge Records' },
    { value: '68,719', label: 'Real Dialogue Turns' },
    { value: '9,731', label: 'Math Problems' },
    { value: '4', label: 'AI Agents' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background: 'rgba(2, 2, 5, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        opacity: leaving ? 0 : visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Main content */}
      <div className="relative flex flex-col min-h-screen text-slate-100" style={{ zIndex: 1 }}>

        {/* Top nav bar */}
        <nav className="flex items-center justify-between px-8 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 700, fontSize: '1.3rem',
              background: 'linear-gradient(90deg, #a5b4fc, #67e8f9)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
            }}>OTTC</span>
            <span style={{ color: '#4b5563', fontSize: '1rem' }}>by</span>
            <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '1rem' }}>AK</span>
          </div>
          <div className="flex items-center gap-6">
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontFamily: 'Space Grotesk, sans-serif' }}>
              Powered by Gemini 2.5 Flash
            </span>
            <button
              onClick={handleEnter}
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#a5b4fc',
                padding: '6px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontFamily: 'Space Grotesk, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.3)';
                (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.7)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.15)';
                (e.target as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
              }}
            >
              Open App →
            </button>
          </div>
        </nav>

        {/* Hero section */}
        <div className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-12">

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '99px',
            padding: '5px 16px',
            marginBottom: '2rem',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ color: '#a5b4fc', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' }}>
              RAG-POWERED · 28K+ TRAINING RECORDS
            </span>
          </div>

          {/* Main title */}
          <h1 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: '1.5rem',
            maxWidth: '900px',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              The Math Tutor That
            </span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 40%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Understands Why You're Wrong
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            color: '#9ca3af',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            maxWidth: '620px',
            lineHeight: 1.7,
            marginBottom: '3rem',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            Not just <em>what</em> you got wrong — but <strong style={{ color: '#c4b5fd' }}>why</strong>. 
            A multi-agent AI pipeline that detects misconceptions, adapts its teaching strategy, 
            and measures whether you actually improve.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              onClick={handleEnter}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px 36px',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'Space Grotesk, sans-serif',
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                transition: 'all 0.25s',
                letterSpacing: '0.03em',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLElement).style.boxShadow = '0 0 50px rgba(99,102,241,0.6)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(99,102,241,0.4)';
              }}
            >
              Start Learning →
            </button>
            <button
              style={{
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '14px 28px',
                borderRadius: '12px',
                fontSize: '1rem',
                fontFamily: 'Space Grotesk, sans-serif',
                cursor: 'default',
                letterSpacing: '0.02em',
              }}
            >
              🎓 Research-Based Pedagogy
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          padding: '24px 0',
          flexWrap: 'wrap',
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 48px',
              borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              <span style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '2rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #a5b4fc, #67e8f9)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{stat.value}</span>
              <span style={{ color: '#6b7280', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', marginTop: '2px' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '64px auto',
          padding: '0 32px',
          width: '100%',
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '28px 24px',
                transition: 'all 0.25s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(99,102,241,0.08)';
                el.style.borderColor = 'rgba(99,102,241,0.25)';
                el.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.03)';
                el.style.borderColor = 'rgba(255,255,255,0.07)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{f.icon}</div>
              <div style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700, color: '#e2e8f0',
                fontSize: '1rem', marginBottom: '8px',
              }}>{f.title}</div>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Pipeline visualization */}
        <div style={{
          maxWidth: '900px', margin: '0 auto 80px', padding: '0 32px', width: '100%',
          textAlign: 'center',
        }}>
          <p style={{
            color: '#4b5563', fontSize: '0.8rem', letterSpacing: '0.15em',
            fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase',
            marginBottom: '24px',
          }}>
            Multi-Agent Architecture
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px' }}>
            {['Error Detector', 'RAG Retrieval', 'Pedagogy Planner', 'Tutor LLM', 'Evaluator'].map((step, i) => (
              <React.Fragment key={i}>
                <div style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: '#a5b4fc',
                  fontSize: '0.8rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>{step}</div>
                {i < 4 && <span style={{ color: '#374151', fontSize: '1.2rem', margin: '0 2px' }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '48px 32px',
          marginTop: 'auto',
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '20px' }}>
            Ready to find out where your thinking goes wrong?
          </p>
          <button
            onClick={handleEnter}
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#c7d2fe',
              border: '1px solid rgba(99,102,241,0.4)',
              padding: '12px 32px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 600,
              fontFamily: 'Space Grotesk, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.25s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              const el = e.target as HTMLElement;
              el.style.background = 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)';
              el.style.boxShadow = '0 0 25px rgba(99,102,241,0.3)';
            }}
            onMouseLeave={e => {
              const el = e.target as HTMLElement;
              el.style.background = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)';
              el.style.boxShadow = 'none';
            }}
          >
            Launch Tutor →
          </button>
          <p style={{ color: '#374151', fontSize: '0.75rem', marginTop: '16px', fontFamily: 'Space Grotesk, sans-serif' }}>
            OTTC by AK · Misconception-Aware Math Tutor
          </p>
        </div>

      </div>
    </div>
  );
}
