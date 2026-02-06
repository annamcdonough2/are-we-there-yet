/**
 * FunFactCard.jsx - Displays fun facts about nearby places
 *
 * WHAT THIS FILE DOES:
 * Shows a beautiful card with fun facts about places you're passing.
 * The card appears at the bottom of the screen and updates as you
 * enter new areas.
 *
 * FEATURES:
 * - Animated appearance when new facts arrive
 * - Loading state while getting facts
 * - Text-to-speech: click speaker to hear the fact read aloud!
 */

import { useState, useEffect } from 'react'
import { getFunFact, getPlaceName } from '../services/claude'
import { speak, stopSpeaking, isSpeechSupported, loadVoices } from '../services/speech'

function FunFactCard({ position, isActive }) {
  // ============================================================
  // STATE
  // ============================================================

  // The current fun fact to display
  const [funFact, setFunFact] = useState(null)

  // The place name we got the fact for
  const [placeName, setPlaceName] = useState(null)

  // Are we loading a new fact?
  const [isLoading, setIsLoading] = useState(false)

  // Track the last place we got a fact for (to avoid duplicates)
  const [lastPlace, setLastPlace] = useState(null)

  // Animation state
  const [isVisible, setIsVisible] = useState(false)

  // Is the speech currently playing?
  const [isSpeaking, setIsSpeaking] = useState(false)

  // ============================================================
  // EFFECT: Load voices when component mounts
  // ============================================================

  useEffect(() => {
    // Pre-load voices so they're ready when needed
    loadVoices()
  }, [])

  // ============================================================
  // EFFECT: Get fun facts when position changes significantly
  // ============================================================

  useEffect(() => {
    // Only run if we have a position and tracking is active
    if (!position || !isActive) return

    async function fetchFunFact() {
      try {
        // First, figure out what place we're near
        const place = await getPlaceName(position)

        // If we couldn't get a place name, skip
        if (!place) return

        // Extract just the city/town name (first part before the comma)
        const shortPlace = place.split(',')[0].trim()

        // Don't fetch again if we're still in the same place
        if (shortPlace === lastPlace) return

        setIsLoading(true)
        setLastPlace(shortPlace)

        // Stop any current speech when getting new fact
        stopSpeaking()
        setIsSpeaking(false)

        // Animate out the old fact
        setIsVisible(false)

        // Get a fun fact from Claude
        const fact = await getFunFact(place)

        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 300))

        setFunFact(fact)
        setPlaceName(shortPlace)
        setIsLoading(false)

        // Animate in the new fact
        setIsVisible(true)

      } catch (error) {
        console.error('Error fetching fun fact:', error)
        setIsLoading(false)
      }
    }

    // Debounce: wait a bit before fetching to avoid too many requests
    const timeoutId = setTimeout(fetchFunFact, 2000)

    return () => clearTimeout(timeoutId)
  }, [position, isActive, lastPlace])

  // ============================================================
  // HANDLERS
  // ============================================================

  // Handle the speak button click
  async function handleSpeak() {
    if (!funFact) return

    if (isSpeaking) {
      // Stop speaking if already speaking
      stopSpeaking()
      setIsSpeaking(false)
    } else {
      // Start speaking
      setIsSpeaking(true)
      try {
        await speak(funFact)
      } catch (error) {
        console.error('Speech error:', error)
      }
      setIsSpeaking(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Don't show anything if not active or no fact yet
  if (!isActive) {
    return (
      <div className="bg-white rounded-3xl shadow-xl py-5 sm:py-6">
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl">✨</span>
          <p className="text-lg text-gray-600 font-medium">
            Enter a destination to start your trip!
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading && !funFact) {
    return (
      <div className="bg-white rounded-3xl shadow-xl py-5 sm:py-6">
        <div className="flex items-center gap-4" style={{ marginLeft: '12.5%', marginRight: '12.5%' }}>
          <span className="text-4xl animate-bounce">🔍</span>
          <p className="text-lg text-gray-600 font-medium">
            Looking for fun facts nearby...
          </p>
        </div>
      </div>
    )
  }

  // Show the fun fact
  return (
    <div
      className={`bg-white rounded-3xl shadow-xl px-6
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ paddingTop: '12px', paddingBottom: '12px' }}
    >
      {/* Header row */}
      <div className="flex flex-col items-center justify-center text-center mb-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎉</span>
          <span className="text-xl font-bold text-purple-600">Fun Fact!</span>
        </div>
      </div>

      {/* The fun fact text */}
      <p className="text-gray-700 text-lg sm:text-xl leading-relaxed text-center">
        {funFact || "🚗 You're on an adventure! Fun facts coming soon..."}
      </p>

      {/* Loading indicator for new facts */}
      {isLoading && funFact && (
        <div className="mt-3 flex items-center justify-center gap-2 text-purple-500">
          <span className="text-2xl animate-spin">⏳</span>
          <span className="font-medium">Getting new fact...</span>
        </div>
      )}

      {/* Speaker button row */}
      <div className="mt-4 flex justify-center">
        {isSpeechSupported() ? (
          <button
            onClick={handleSpeak}
            disabled={!funFact}
            className={`flex items-center gap-2 py-2 rounded-full font-semibold
                       transition-all duration-200 active:scale-95
                       ${isSpeaking
                         ? 'bg-gray-500 text-white shadow-lg'
                         : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                       ${!funFact ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ paddingLeft: '5px', paddingRight: '5px' }}
          >
            <span className="text-2xl">{isSpeaking ? '⏹️' : '🔊'}</span>
            <span>{isSpeaking ? 'Stop' : 'Read Aloud'}</span>
          </button>
        ) : (
          <span className="text-sm text-gray-400">
            (Speech not supported on this device)
          </span>
        )}
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="flex gap-1">
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0ms' }}>🔊</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '150ms' }}>🔊</span>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '300ms' }}>🔊</span>
          </span>
          <span className="text-purple-600 font-medium">Reading aloud...</span>
        </div>
      )}
    </div>
  )
}

export default FunFactCard
