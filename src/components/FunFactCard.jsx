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

import { useState, useEffect, useRef } from 'react'
import { getFunFact, getPlaceName } from '../services/claude'
import { speak, stopSpeaking, isSpeechSupported, loadVoices } from '../services/speech'

function FunFactCard({ position, isActive, destination, route }) {
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
  // REFS & STATE (to track state across async operations)
  // ============================================================

  // Track which destination we've announced (to avoid re-announcing)
  const announcedDestinationRef = useRef(null)

  // Track if we've read the initial fun fact for current trip
  const hasReadInitialFactRef = useRef(false)

  // Track if we're waiting to read the fun fact after announcement
  // Using state so it triggers re-renders and effects
  const [waitingForFact, setWaitingForFact] = useState(false)

  // ============================================================
  // EFFECT: Load voices when component mounts
  // ============================================================

  useEffect(() => {
    // Pre-load voices so they're ready when needed
    loadVoices()
  }, [])

  // ============================================================
  // EFFECT: Reset tracking when destination changes
  // ============================================================

  useEffect(() => {
    if (!destination) {
      announcedDestinationRef.current = null
      hasReadInitialFactRef.current = false
      setWaitingForFact(false)
    }
  }, [destination])

  // ============================================================
  // EFFECT: Fetch fun fact about DESTINATION when trip starts
  // ============================================================

  useEffect(() => {
    // Only run when we have a new destination with coordinates
    if (!destination || !destination.coordinates) return

    // Don't fetch again if we already have a fact for this destination
    if (announcedDestinationRef.current === destination.id && funFact) return

    async function fetchDestinationFact() {
      try {
        setIsLoading(true)
        setIsVisible(false)

        // Use reverse geocoding to get the city/place name from destination coordinates
        // This gives us a clean city name like "San Francisco, California"
        const destinationPlace = await getPlaceName(destination.coordinates)

        // If we couldn't get a place name, fall back to parsing the address
        let placeForFact = destinationPlace
        if (!placeForFact) {
          // Try to extract city from the full address (format: "Name, Street, City, State ZIP")
          const parts = destination.name.split(',')
          if (parts.length >= 3) {
            // Get the city part (usually 2nd or 3rd from end)
            placeForFact = parts.slice(-3, -1).join(',').trim()
          } else {
            placeForFact = destination.name
          }
        }

        // Get a fun fact about the DESTINATION (pass true for isDestination)
        const fact = await getFunFact(placeForFact, true)

        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 300))

        const shortPlace = placeForFact.split(',')[0].trim()
        setFunFact(fact)
        setPlaceName(shortPlace)
        setLastPlace(shortPlace)
        setIsLoading(false)
        setIsVisible(true)

      } catch (error) {
        console.error('Error fetching destination fun fact:', error)
        setIsLoading(false)
      }
    }

    fetchDestinationFact()
  // Only run when destination changes (by id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.id])

  // ============================================================
  // EFFECT: Auto-announce trip when destination/route is set
  // ============================================================

  useEffect(() => {
    // Only run if we have a destination and route
    if (!destination || !route) return
    if (!isSpeechSupported()) return

    // Check if we've already announced this destination
    if (announcedDestinationRef.current === destination.id) return

    // Mark as announced
    announcedDestinationRef.current = destination.id
    hasReadInitialFactRef.current = false

    async function announceTrip() {
      try {
        setIsSpeaking(true)

        // Build the trip announcement
        const destinationName = destination.shortName || destination.name.split(',')[0]
        const timeText = route.durationMinutes < 60
          ? `${route.durationMinutes} minutes`
          : `${Math.floor(route.durationMinutes / 60)} hours and ${route.durationMinutes % 60} minutes`
        const distanceText = `${route.distanceMiles} miles`

        const announcement = `Let's go to ${destinationName}! It will take about ${timeText} and is ${distanceText} away.`

        // Read the trip announcement
        await speak(announcement)

        // Wait 2 seconds before fun fact
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Mark that we're ready for the fun fact (this triggers the next effect)
        setWaitingForFact(true)
        setIsSpeaking(false)

      } catch (error) {
        console.error('Error announcing trip:', error)
        setIsSpeaking(false)
      }
    }

    announceTrip()
  }, [destination, route])

  // ============================================================
  // EFFECT: Auto-read fun fact after trip announcement
  // ============================================================

  useEffect(() => {
    // Only run if we're waiting for a fun fact AND we have one
    if (!waitingForFact || !funFact) return
    if (hasReadInitialFactRef.current) return
    if (!isSpeechSupported()) return

    // Mark that we've read the initial fact
    setWaitingForFact(false)
    hasReadInitialFactRef.current = true

    async function readFunFact() {
      try {
        setIsSpeaking(true)
        await speak(funFact)
        setIsSpeaking(false)
      } catch (error) {
        console.error('Error reading fun fact:', error)
        setIsSpeaking(false)
      }
    }

    readFunFact()
  }, [waitingForFact, funFact])

  // ============================================================
  // EFFECT: Get fun facts when position changes significantly
  // (Only runs AFTER the initial destination fact has been read)
  // ============================================================

  useEffect(() => {
    // Only run if we have a position and tracking is active
    if (!position || !isActive) return

    // Don't run until the initial trip announcement is complete
    // The destination-based fact handles the first fun fact
    if (!hasReadInitialFactRef.current) return

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

        // Only stop speech if we've already done the initial announcement
        // (don't interrupt the trip announcement!)
        if (hasReadInitialFactRef.current) {
          stopSpeaking()
          setIsSpeaking(false)
        }

        // Animate out the old fact
        setIsVisible(false)

        // Get a fun fact from Claude
        const fact = await getFunFact(place, false)  // false = current location, not destination

        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 300))

        setFunFact(fact)
        setPlaceName(shortPlace)
        setIsLoading(false)

        // Animate in the new fact
        setIsVisible(true)

        // Auto-read the new fun fact
        if (isSpeechSupported()) {
          try {
            setIsSpeaking(true)
            await speak(fact)
            setIsSpeaking(false)
          } catch (error) {
            console.error('Error auto-reading fun fact:', error)
            setIsSpeaking(false)
          }
        }

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

  // Handle the speak button click (fun fact)
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

  // Handle the "When will we be there?!" button click
  async function handleSpeakProgress() {
    if (!route) return

    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
    } else {
      setIsSpeaking(true)
      try {
        const timeLeft = route.durationMinutes
        const milesLeft = route.distanceMiles

        // Format time in a kid-friendly way
        let timeText
        if (timeLeft < 60) {
          timeText = `${timeLeft} minutes`
        } else {
          const hours = Math.floor(timeLeft / 60)
          const mins = timeLeft % 60
          if (mins === 0) {
            timeText = `about ${hours} ${hours === 1 ? 'hour' : 'hours'}`
          } else {
            timeText = `about ${hours} ${hours === 1 ? 'hour' : 'hours'} and ${mins} minutes`
          }
        }

        const announcement = `We have ${milesLeft} miles to go. That's ${timeText} until we get there!`
        await speak(announcement)
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
        <div className="flex items-center gap-4" style={{ marginLeft: '10%', marginRight: '10%' }}>
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
      <p
        className="text-gray-700 text-lg sm:text-xl leading-relaxed text-center"
        style={{ marginLeft: '10%', marginRight: '10%' }}
      >
        {funFact || "🚗 You're on an adventure! Fun facts coming soon..."}
      </p>

      {/* Loading indicator for new facts */}
      {isLoading && funFact && (
        <div className="mt-3 flex items-center justify-center gap-2 text-purple-500">
          <span className="text-2xl animate-spin">⏳</span>
          <span className="font-medium">Getting new fact...</span>
        </div>
      )}

      {/* Speaker buttons row */}
      <div className="mt-4 flex justify-center gap-6">
        {isSpeechSupported() ? (
          <>
            {/* Read Aloud button */}
            <button
              onClick={handleSpeak}
              disabled={!funFact || isSpeaking}
              className={`flex items-center gap-3 py-3 rounded-full font-semibold
                         transition-all duration-200 active:scale-95
                         ${isSpeaking
                           ? 'bg-gray-300 text-gray-500'
                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                         ${!funFact ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ paddingLeft: '16px', paddingRight: '24px' }}
            >
              <span className="text-2xl">🔊</span>
              <span>Read Aloud</span>
            </button>

            {/* When will we be there button */}
            <button
              onClick={handleSpeakProgress}
              disabled={!route || isSpeaking}
              className={`flex items-center gap-3 py-3 rounded-full font-semibold
                         transition-all duration-200 active:scale-95
                         ${isSpeaking
                           ? 'bg-gray-300 text-gray-500'
                           : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}
                         ${!route ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ paddingLeft: '16px', paddingRight: '24px' }}
            >
              <span className="text-2xl">🗣️</span>
              <span>When will we be there?!</span>
            </button>
          </>
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
