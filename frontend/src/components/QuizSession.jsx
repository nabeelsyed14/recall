import { useState, useEffect } from 'react'
import { getContentQuestions, recordQuiz } from '../api/client'

export default function QuizSession({ contentId, onComplete }) {
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedOpt, setSelectedOpt] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    completed: false
  })

  useEffect(() => {
    getContentQuestions(contentId)
      .then(data => {
        setQuestions(data)
        if (data.length === 0) setError('No questions available for this content.')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [contentId])

  const handleSelect = (idx) => {
    if (showFeedback) return
    setSelectedOpt(idx)
  }

  const handleSubmit = async () => {
    if (selectedOpt === null || showFeedback) return

    const currentQ = questions[currentIdx]
    const isCorrect = currentQ._shuffledOptions[selectedOpt] === currentQ.answer

    setShowFeedback(true)

    recordQuiz(currentQ.id, isCorrect).catch(console.error)

    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }))
  }

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setSessionStats(prev => ({ ...prev, completed: true }))
    } else {
      setCurrentIdx(prev => prev + 1)
      setSelectedOpt(null)
      setShowFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="review-container">
        <h2 className="mb-24">Loading Quiz...</h2>
        <div className="skeleton-detail-block" style={{ height: '200px' }} />
      </div>
    )
  }

  if (error || questions.length === 0) {
    return (
      <div className="review-container">
        <h2 className="mb-24">Quiz Session</h2>
        <div className="banner banner-error mb-24"><span>✕</span>{error || 'No questions available.'}</div>
        <button className="btn btn-secondary" onClick={onComplete}>Back to Library</button>
      </div>
    )
  }

  if (sessionStats.completed) {
    const pct = Math.round((sessionStats.correct / sessionStats.total) * 100)
    return (
      <div className="review-container" style={{ textAlign: 'center', marginTop: '64px' }}>
        <div className="label mb-16" style={{ color: 'var(--accent)' }}>QUIZ COMPLETE</div>
        <h1 className="mb-32">You scored {pct}%</h1>
        <div className="card mb-32" style={{ display: 'inline-flex', padding: '24px 48px' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="stat-value" style={{ fontSize: '2rem' }}>{sessionStats.correct}</span>
            <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{sessionStats.total}</span>
          </div>
        </div>
        <div className="flex gap-16 justify-center">
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry Quiz</button>
          <button className="btn btn-primary" onClick={onComplete}>Back to Library</button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIdx]

  if (!currentQ._shuffledOptions) {
    const all = [...(currentQ.distractor_options || []), currentQ.answer].filter(Boolean)
    const unique = [...new Set(all)]
    currentQ._shuffledOptions = unique.sort(() => Math.random() - 0.5)
  }

  const options = currentQ._shuffledOptions

  return (
    <div className="review-container">
      <div className="flex justify-between items-center mb-24">
        <span className="label">Question {currentIdx + 1} of {questions.length}</span>
        <button className="btn btn-ghost" onClick={onComplete} style={{ padding: '4px 8px', fontSize: '0.85rem' }}>✕ Exit</button>
      </div>

      <div className="progress-bar mb-32">
        <div className="progress-fill progress-teal" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
      </div>

      <h2 className="mb-32" style={{ fontSize: '1.25rem', lineHeight: '1.5' }}>
        {currentQ.question}
      </h2>

      <div className="challenge-options mb-32">
        {options.map((opt, i) => {
          const isSelected = selectedOpt === i
          const isCorrectOpt = opt === currentQ.answer
          const showCorrect = showFeedback && isCorrectOpt
          const showIncorrect = showFeedback && isSelected && !isCorrectOpt

          return (
            <button
              key={i}
              className={`challenge-option ${isSelected ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''}`}
              onClick={() => handleSelect(i)}
              disabled={showFeedback}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {showFeedback ? (
        <button className="btn btn-primary btn-full" onClick={handleNext} style={{ height: '52px' }}>
          {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question →'}
        </button>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={selectedOpt === null}
          style={{ height: '52px' }}
        >
          Check Answer
        </button>
      )}
    </div>
  )
}