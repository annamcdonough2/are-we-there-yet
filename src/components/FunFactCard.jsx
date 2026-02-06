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
 * - Text-to-speech: click 🔊 to hear the fact read aloud!
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
      <div className="bg-white rounded-xl shadow-lg p-4 max-w-lg mx-auto">
        <p className="text-center text-gray-600">
          ✨ Enter a destination to start your trip!
        </p>
      </div>
    )
  }

  // Loading state
  if (isLoading && !funFact) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl animate-bounce">🔍</span>
          <p className="text-gray-600">Looking for fun facts nearby...</p>
        </div>
      </div>
    )
  }

  // Show the fun fact
  return (
    <div
      className={`bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg p-4 max-w-lg mx-auto border border-purple-100
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <span className="font-semibold text-purple-700">Fun Fact!</span>
        </div>

        {/* Location badge */}
        {placeName && (
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
            📍 {placeName}
          </span>
        )}
      </div>

      {/* The fun fact */}
      <p className="text-gray-700 text-lg leading-relaxed">
        {funFact || "🚗 You're on an adventure! Fun facts coming soon..."}
      </p>

      {/* Loading indicator for new facts */}
      {isLoading && funFact && (
        <div className="mt-2 text-sm text-purple-500 flex items-center gap-1">
          <span className="animate-spin">⏳</span>
          Getting new fact...
        </div>
      )}

      {/* Speaker button */}
      <div className="mt-3 flex justify-end items-center gap-2">
        {/* Speech support indicator */}
        {!isSpeechSupported() && (
          <span className="text-xs text-gray-400">
            (Speech not supported)
          </span>
        )}

        {/* The button */}
        <button
          onClick={handleSpeak}
          disabled={!funFact || !isSpeechSupported()}
          className={`p-2 rounded-full transition-all duration-200
                     ${isSpeaking
                       ? 'bg-purple-500 text-white animate-pulse'
                       : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'}
                     ${(!funFact || !isSpeechSupported()) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isSpeaking ? 'Stop reading' : 'Read aloud'}
        >
          {isSpeaking ? '⏹️' : '🔊'}
        </button>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="mt-2 text-sm text-purple-600 flex items-center justify-center gap-2">
          <span className="flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>🔊</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>🔊</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>🔊</span>
          </span>
          Reading aloud... tap to stop
        </div>
      )}
    </div>
  )
}

export default FunFactCard
