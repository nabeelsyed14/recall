import { useState, useEffect } from 'react'

export default function SuccessToast({ title, topic, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="success-toast" onClick={onClose}>
      <div className="toast-checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 15"></polyline>
        </svg>
      </div>
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        <div className="toast-message">
          Added to your knowledge base
          <span className="toast-topic">{topic}</span>
        </div>
      </div>
    </div>
  )
}