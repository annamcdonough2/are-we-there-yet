/**
 * ArrivalModal.jsx - Celebratory popup when you arrive at your destination
 *
 * WHAT THIS FILE DOES:
 * Shows a fun "Yay! You made it!" popup with confetti animation
 * when the user arrives at their destination.
 */

import { useState, useEffect, useRef } from 'react'
import { speak, isSpeechSupported } from '../services/speech'

// Confetti particle component
function ConfettiParticle({ delay, left, color }) {
  return (
    <div
      className="absolute w-3 h-3 opacity-0"
      style={{
        left: `${left}%`,
        top: '-10px',
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
        animation: `confetti-fall 3s ease-out ${delay}s forwards`
      }}
    />
  )
}

function ArrivalModal({ isOpen, destinationName, onClose }) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiParticles, setConfettiParticles] = useState([])
  const hasSpokenRef = useRef(false)

  // Generate confetti particles
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)

      // Create confetti particles
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
      const particles = []

      for (let i = 0; i < 50; i++) {
        particles.push({
          id: i,
          delay: Math.random() * 2,
          left: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      }

      setConfettiParticles(particles)

      // Speak the arrival message
      if (isSpeechSupported() && !hasSpokenRef.current) {
        hasSpokenRef.current = true
        const message = `Yay! You made it to ${destinationName}! Great job!`
        speak(message)
      }
    } else {
      setShowConfetti(false)
      setConfettiParticles([])
      hasSpokenRef.current = false
    }
  }, [isOpen, destinationName])

  if (!isOpen) return null

  return (
    <>
      {/* Confetti animation keyframes */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.5);
          }
        }
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Confetti container */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {confettiParticles.map(particle => (
              <ConfettiParticle
                key={particle.id}
                delay={particle.delay}
                left={particle.left}
                color={particle.color}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        <div
          className="bg-white rounded-3xl shadow-xl px-6 mx-4 max-w-md w-full"
          style={{
            paddingTop: '24px',
            paddingBottom: '24px',
            animation: 'bounce-in 0.5s ease-out'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Car emoji with wiggle animation */}
          <div className="text-center mb-4">
            <span
              className="text-6xl inline-block"
              style={{ animation: 'wiggle 0.5s ease-in-out infinite' }}
            >
              🚗
            </span>
          </div>

          {/* Celebration text */}
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-purple-600 mb-2">
              🎉 Yay! 🎉
            </h2>
            <p className="text-xl text-gray-700 font-semibold">
              You made it to
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {destinationName}!
            </p>
          </div>

          {/* Fun message */}
          <p className="text-center text-gray-600 mb-6">
            Great job on the trip! Time to explore!
          </p>

          {/* Close button */}
          <div style={{ marginLeft: '10%', marginRight: '10%' }}>
            <button
              onClick={onClose}
              className="w-full bg-purple-300 hover:bg-purple-400 text-purple-800 font-bold py-3 px-6 rounded-full
                         transition-all duration-200 active:scale-95 text-lg"
            >
              🎊 Hooray! 🎊
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ArrivalModal
