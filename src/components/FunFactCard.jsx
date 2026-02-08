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

// Calculate distance between two coordinates in miles
function getDistanceMiles(pos1, pos2) {
  if (!pos1 || !pos2) return 0
  const [lon1, lat1] = pos1
  const [lon2, lat2] = pos2
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// How often to show new facts
const FACT_INTERVAL_MINUTES = 5
const FACT_INTERVAL_MILES = 5

function FunFactCard({ position, isActive, destination, route }) {
  // ============================================================
  // STATE
  // ============================================================

  // The current fun fact to display
  const [funFact, setFunFact] = useState(null)

  // Is the current fact verified?
  const [isVerified, setIsVerified] = useState(false)

  // The place name we got the fact for
  const [placeName, setPlaceName] = useState(null)

  // Are we loading a new fact?
  const [isLoading, setIsLoading] = useState(false)

  // Loading status message
  const [loadingStatus, setLoadingStatus] = useState('')

  // Track the last place we got a fact for (to avoid duplicates)
  const [lastPlace, setLastPlace] = useState(null)

  // Track when and where we last fetched a fact (for time/distance triggers)
  const lastFactTimeRef = useRef(null)
  const lastFactPositionRef = useRef(null)

  // Animation state
  const [isVisible, setIsVisible] = useState(false)

  // Is the card collapsed (just showing emoji buttons)?
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Is the speech currently playing?
  const [isSpeaking, setIsSpeaking] = useState(false)

  // ============================================================
  // REFS & STATE (to track state across async operations)
  // ============================================================

  // Track which destination we've announced (to avoid re-announcing)
  const announcedDestinationRef = useRef(null)

  // Track if we've read the initial fun fact for current trip
  const hasReadInitialFactRef = useRef(false)

  // Ref to access current funFact value in async functions
  // (needed for mobile Safari audio chaining)
  const funFactRef = useRef(null)

  // Refs to avoid stale closures in interval callbacks
  const positionRef = useRef(position)
  const isActiveRef = useRef(isActive)
  const lastPlaceRef = useRef(lastPlace)
  const isFetchingRef = useRef(false)

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
    }
  }, [destination])

  // Keep funFactRef in sync with funFact state
  // This allows async functions to access the current value
  useEffect(() => {
    funFactRef.current = funFact
  }, [funFact])

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
        setLoadingStatus('Finding fun facts...')

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

        setLoadingStatus('Verifying facts...')

        // Get a VERIFIED fun fact about the DESTINATION (pass true for isDestination)
        const result = await getFunFact(placeForFact, true)

        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 300))

        const shortPlace = placeForFact.split(',')[0].trim()

        if (result && result.fact) {
          setFunFact(result.fact)
          setIsVerified(result.verified)
          setPlaceName(shortPlace)
          setLastPlace(shortPlace)
          setIsVisible(true)
          setIsCollapsed(false)  // Expand when new fact arrives
        } else {
          // All verification attempts failed - show a generic message
          setFunFact(`🚗 You're heading to ${shortPlace}! Keep your eyes open for cool things on your adventure!`)
          setIsVerified(false)
          setPlaceName(shortPlace)
          setLastPlace(shortPlace)
          setIsVisible(true)
        }

        // Mark initial fact as ready - this enables position-based facts
        // (Set here instead of after speech, so CarPlay/audio issues don't block future facts)
        hasReadInitialFactRef.current = true

        // Initialize time/distance tracking from the destination
        lastFactTimeRef.current = Date.now()
        lastFactPositionRef.current = destination.coordinates

        setIsLoading(false)
        setLoadingStatus('')

      } catch (error) {
        console.error('Error fetching destination fun fact:', error)
        setIsLoading(false)
        setLoadingStatus('')
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

    // Mark as announced (but don't reset hasReadInitialFactRef - that's handled by fetchDestinationFact)
    announcedDestinationRef.current = destination.id

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

        // Wait 1 second before fun fact
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Wait for fun fact to be available (mobile Safari requires
        // both speak calls in the same async chain from user gesture)
        let attempts = 0
        while (!funFactRef.current && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 250))
          attempts++
        }

        // Read the fun fact if available
        if (funFactRef.current && !hasReadInitialFactRef.current) {
          hasReadInitialFactRef.current = true
          await speak(funFactRef.current)
        }

        setIsSpeaking(false)

      } catch (error) {
        console.error('Error announcing trip:', error)
        setIsSpeaking(false)
      }
    }

    announceTrip()
  }, [destination, route])


  // ============================================================
  // EFFECT: Get fun facts based on position, time, or distance
  // Triggers on: new city, 5 minutes elapsed, or 5 miles traveled
  // ============================================================

  // Track if we're currently fetching to prevent duplicate requests
  const isFetchingRef = useRef(false)

  // The main fetch function - can be called by position change OR time interval
  const fetchFunFactIfNeeded = async (currentPosition) => {
    // Prevent duplicate fetches
    if (isFetchingRef.current) return
    if (!currentPosition || !isActiveRef.current) return
    if (!hasReadInitialFactRef.current) return

    try {
      // First, figure out what place we're near
      const place = await getPlaceName(currentPosition)

      // If we couldn't get a place name, skip
      if (!place) return

      // Extract just the city/town name (first part before the comma)
      const shortPlace = place.split(',')[0].trim()

      // Check if we should fetch a new fact based on:
      // 1. New city/town
      // 2. Time elapsed (5 minutes)
      // 3. Distance traveled (5 miles)
      const now = Date.now()
      const timeSinceLastFact = lastFactTimeRef.current
        ? (now - lastFactTimeRef.current) / 1000 / 60  // minutes
        : Infinity
      const distanceSinceLastFact = getDistanceMiles(lastFactPositionRef.current, currentPosition)

      const isNewPlace = shortPlace !== lastPlaceRef.current
      const timeTriggered = timeSinceLastFact >= FACT_INTERVAL_MINUTES
      const distanceTriggered = distanceSinceLastFact >= FACT_INTERVAL_MILES

      // Skip if none of the triggers are met
      if (!isNewPlace && !timeTriggered && !distanceTriggered) return

      console.log(`[FunFact] Triggered by: ${isNewPlace ? 'new place ' : ''}${timeTriggered ? 'time ' : ''}${distanceTriggered ? 'distance' : ''}`)

      isFetchingRef.current = true
      setIsLoading(true)
      setLastPlace(shortPlace)
      setLoadingStatus('Finding fun facts...')

        // Only stop speech if we've already done the initial announcement
        // (don't interrupt the trip announcement!)
        if (hasReadInitialFactRef.current) {
          stopSpeaking()
          setIsSpeaking(false)
        }

        // Animate out the old fact
        setIsVisible(false)

        setLoadingStatus('Verifying facts...')

        // Get a VERIFIED fun fact from Claude
        const result = await getFunFact(place, false)  // false = current location, not destination

        // Small delay for animation
        await new Promise(resolve => setTimeout(resolve, 300))

        // Update tracking refs
        lastFactTimeRef.current = Date.now()
        lastFactPositionRef.current = currentPosition

        if (result && result.fact) {
          setFunFact(result.fact)
          setIsVerified(result.verified)
          setPlaceName(shortPlace)
          setIsVisible(true)
          setIsCollapsed(false)  // Expand when new fact arrives

          // Auto-read the new fun fact
          if (isSpeechSupported()) {
            try {
              setIsSpeaking(true)
              await speak(result.fact)
              setIsSpeaking(false)
            } catch (error) {
              console.error('Error auto-reading fun fact:', error)
              setIsSpeaking(false)
            }
          }
        } else {
          // All verification attempts failed - show generic message
          const genericFact = `🚗 You're in ${shortPlace}! Keep your eyes open for cool things on your adventure!`
          setFunFact(genericFact)
          setIsVerified(false)
          setPlaceName(shortPlace)
          setIsVisible(true)
        }

        setIsLoading(false)
        setLoadingStatus('')
        isFetchingRef.current = false

      } catch (error) {
        console.error('Error fetching fun fact:', error)
        setIsLoading(false)
        setLoadingStatus('')
        isFetchingRef.current = false
      }
    }
  }

  // Effect: Check on position changes
  useEffect(() => {
    if (!position || !isActive) return
    if (!hasReadInitialFactRef.current) return

    // Debounce: wait a bit before fetching to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchFunFactIfNeeded(position)
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [position, isActive, lastPlace])

  // Keep refs updated for use in interval (avoids stale closures)
  useEffect(() => { positionRef.current = position }, [position])
  useEffect(() => { isActiveRef.current = isActive }, [isActive])
  useEffect(() => { lastPlaceRef.current = lastPlace }, [lastPlace])

  // Effect: Check periodically for time-based triggers (every 30 seconds)
  useEffect(() => {
    // Always create interval, but check conditions inside callback
    const intervalId = setInterval(async () => {
      // Check conditions using refs (fresh values)
      if (!isActiveRef.current) return
      if (!hasReadInitialFactRef.current) return
      if (!positionRef.current) return
      if (isFetchingRef.current) return

      console.log('[FunFact] Time check interval running...')

      // Check if 5 minutes have passed
      const now = Date.now()
      const timeSinceLastFact = lastFactTimeRef.current
        ? (now - lastFactTimeRef.current) / 1000 / 60
        : Infinity

      if (timeSinceLastFact >= FACT_INTERVAL_MINUTES) {
        console.log(`[FunFact] Time trigger: ${timeSinceLastFact.toFixed(1)} minutes elapsed`)
        fetchFunFactIfNeeded(positionRef.current)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(intervalId)
  }, []) // Empty deps - interval runs for component lifetime

  // ============================================================
  // EFFECT: Auto-collapse card after speech ends
  // ============================================================

  useEffect(() => {
    // Only auto-collapse if visible, not speaking, and has a fun fact
    if (!isVisible || isSpeaking || !funFact || isCollapsed) return

    // Collapse after 8 seconds of inactivity
    const collapseTimer = setTimeout(() => {
      setIsCollapsed(true)
    }, 8000)

    return () => clearTimeout(collapseTimer)
  }, [isVisible, isSpeaking, funFact, isCollapsed])

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
      <div className="bg-white rounded-3xl shadow-xl py-5 sm:py-6 landscape-compact">
        <div className="flex items-center justify-center gap-4 landscape-gap-sm">
          <span className="text-4xl landscape-emoji-sm">✨</span>
          <p className="text-lg text-gray-600 font-medium landscape-text-sm">
            Enter a destination to start your trip!
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading && !funFact) {
    return (
      <div className="bg-white rounded-3xl shadow-xl py-5 sm:py-6 landscape-compact">
        <div className="flex items-center justify-center gap-4 landscape-gap-sm">
          <span className="text-4xl animate-bounce landscape-emoji-sm">🔍</span>
          <p className="text-lg text-gray-600 font-medium landscape-text-sm">
            {loadingStatus || 'Looking for fun facts nearby...'}
          </p>
        </div>
      </div>
    )
  }

  // Collapsed state - just show emoji buttons
  if (isCollapsed && funFact) {
    return (
      <div className="flex justify-center gap-4">
        {/* Read last fun fact button */}
        <button
          onClick={() => {
            setIsCollapsed(false)
            handleSpeak()
          }}
          disabled={isSpeaking}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                     transition-all duration-200 active:scale-95
                     ${isSpeaking
                       ? 'bg-gray-300'
                       : 'bg-white hover:bg-gray-50'}`}
        >
          <span className="text-3xl">🔊</span>
        </button>

        {/* When will we be there button */}
        <button
          onClick={() => {
            setIsCollapsed(false)
            handleSpeakProgress()
          }}
          disabled={!route || isSpeaking}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center
                     transition-all duration-200 active:scale-95
                     ${isSpeaking
                       ? 'bg-gray-300'
                       : 'bg-white hover:bg-gray-50'}
                     ${!route ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="text-3xl">🗣️</span>
        </button>
      </div>
    )
  }

  // Show the fun fact
  return (
    <div
      className={`bg-white rounded-3xl shadow-xl px-6 landscape-compact
                  transition-all duration-300 ease-out
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ paddingTop: '12px', paddingBottom: '12px' }}
    >
      {/* Header row */}
      <div className="flex flex-col items-center justify-center text-center mb-3 landscape-tight">
        <div className="flex items-center gap-3 landscape-gap-sm">
          <span className="text-4xl landscape-emoji-sm">🎉</span>
          <span className="text-xl font-bold text-purple-600 landscape-text-sm">Fun Fact!</span>
          {isVerified && (
            <span className="text-2xl landscape-emoji-sm">✅</span>
          )}
        </div>
      </div>

      {/* The fun fact text */}
      <p
        className="text-gray-700 text-lg sm:text-xl leading-relaxed text-center landscape-text-sm"
        style={{ marginLeft: '10%', marginRight: '10%' }}
      >
        {funFact || "🚗 You're on an adventure! Fun facts coming soon..."}
      </p>

      {/* Loading indicator for new facts */}
      {isLoading && funFact && (
        <div className="mt-3 landscape-tight flex items-center justify-center gap-2 text-purple-500">
          <span className="text-2xl landscape-emoji-sm animate-spin">⏳</span>
          <span className="font-medium landscape-text-xs">Getting new fact...</span>
        </div>
      )}

      {/* Speaker buttons row */}
      <div className="mt-4 landscape-tight flex justify-center gap-6 landscape-gap-sm">
        {isSpeechSupported() ? (
          <>
            {/* Read Aloud button */}
            <button
              onClick={handleSpeak}
              disabled={!funFact || isSpeaking}
              className={`flex items-center gap-3 landscape-gap-sm py-3 landscape-btn-compact rounded-full font-semibold
                         transition-all duration-200 active:scale-95
                         ${isSpeaking
                           ? 'bg-gray-300 text-gray-500'
                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                         ${!funFact ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ paddingLeft: '16px', paddingRight: '24px' }}
            >
              <span className="text-2xl landscape-emoji-sm">🔊</span>
              <span className="landscape-text-xs">Read Aloud</span>
            </button>

            {/* When will we be there button */}
            <button
              onClick={handleSpeakProgress}
              disabled={!route || isSpeaking}
              className={`flex items-center gap-3 landscape-gap-sm py-3 landscape-btn-compact rounded-full font-semibold
                         transition-all duration-200 active:scale-95
                         ${isSpeaking
                           ? 'bg-gray-300 text-gray-500'
                           : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}
                         ${!route ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ paddingLeft: '16px', paddingRight: '24px' }}
            >
              <span className="text-2xl landscape-emoji-sm">🗣️</span>
              <span className="landscape-text-xs">When will we be there?!</span>
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
        <div className="mt-4 landscape-tight flex items-center justify-center gap-3 landscape-gap-sm">
          <span className="flex gap-1">
            <span className="text-2xl landscape-emoji-sm animate-bounce" style={{ animationDelay: '0ms' }}>🔊</span>
            <span className="text-2xl landscape-emoji-sm animate-bounce" style={{ animationDelay: '150ms' }}>🔊</span>
            <span className="text-2xl landscape-emoji-sm animate-bounce" style={{ animationDelay: '300ms' }}>🔊</span>
          </span>
          <span className="text-purple-600 font-medium landscape-text-xs">Reading aloud...</span>
        </div>
      )}
    </div>
  )
}

export default FunFactCard
