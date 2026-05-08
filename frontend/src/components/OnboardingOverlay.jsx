import { useState } from 'react'
import { dismissOnboarding } from '../api/client'

const steps = [
  {
    icon: '🧠',
    title: 'Welcome to Recall',
    description: 'Your personal knowledge hub. Save YouTube videos and articles, and AI turns them into quizzes, summaries, and insights you actually remember.',
  },
  {
    icon: '🔗',
    title: 'Save Your First Link',
    description: 'Click the "+ Add Content" button in the sidebar and paste any YouTube or article URL. We\'ll extract the transcript or text automatically.',
  },
  {
    icon: '⚡',
    title: 'Quiz & Retain',
    description: 'AI generates 6 quiz questions for every piece of content. Test yourself, track your accuracy, and build lasting knowledge.',
  },
]

export default function OnboardingOverlay({ onDismiss }) {
  const [step, setStep] = useState(0)

  const handleDismiss = async () => {
    try {
      await dismissOnboarding()
    } catch {}
    onDismiss()
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleDismiss()
    }
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div className="modal" style={{ maxWidth: '480px', textAlign: 'center', padding: '48px 40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>{steps[step].icon}</div>
        <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>{steps[step].title}</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1rem', marginBottom: '40px', fontWeight: 500 }}>
          {steps[step].description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: i === step ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <div className="modal-actions" style={{ gap: '12px', justifyContent: 'center' }}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)} style={{ flex: 1 }}>
              Back
            </button>
          )}
          <button className="btn btn-primary" onClick={handleNext} style={{ flex: 1 }}>
            {step < steps.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '20px',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
