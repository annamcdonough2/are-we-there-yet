/**
 * useGeolocation.js - Continuously tracks the user's GPS position
 *
 * WHAT THIS FILE DOES:
 * Creates a reusable "hook" that:
 * 1. Gets the user's initial GPS position
 * 2. Keeps watching for position changes
 * 3. Updates whenever the user moves
 *
 * WHAT'S A HOOK? (Plain English)
 * A hook is a reusable piece of logic. Instead of copying the same
 * GPS code into multiple components, we write it once here and
 * any component can use it by calling useGeolocation().
 *
 * HOW GPS WATCHING WORKS:
 * - navigator.geolocation.watchPosition() asks the browser to
 *   notify us whenever the position changes
 * - On phones/tablets, this uses the GPS chip
 * - On computers, this uses WiFi/IP location (less accurate)
 */

import { useState, useEffect, useCallback } from 'react'

function useGeolocation(options = {}) {
  // ============================================================
  // CONFIGURATION
  // ============================================================

  // Default options (can be overridden when calling the hook)
  const {
    enableHighAccuracy = true,  // Use GPS if available (more accurate but uses more battery)
    maximumAge = 10000,         // Accept cached positions up to 10 seconds old
    timeout = 15000,            // Give up after 15 seconds
    watchPosition = true        // Keep tracking (vs. one-time position)
  } = options

  // ============================================================
  // STATE
  // ============================================================

  // Current position: { latitude, longitude, accuracy, timestamp }
  const [position, setPosition] = useState(null)

  // Just the coordinates as an array: [longitude, latitude]
  // (Mapbox uses this format)
  const [coordinates, setCoordinates] = useState(null)

  // Error message if something goes wrong
  const [error, setError] = useState(null)

  // Are we currently getting a position?
  const [isLoading, setIsLoading] = useState(true)

  // ============================================================
  // CALLBACKS
  // ============================================================

  // Called when we successfully get a position
  const handleSuccess = useCallback((pos) => {
    const { latitude, longitude, accuracy } = pos.coords

    setPosition({
      latitude,
      longitude,
      accuracy,  // Accuracy in meters (lower = more accurate)
      timestamp: pos.timestamp
    })

    // Mapbox uses [longitude, latitude] format (note the order!)
    setCoordinates([longitude, latitude])

    setError(null)
    setIsLoading(false)
  }, [])

  // Called when there's an error getting position
  const handleError = useCallback((err) => {
    let message

    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = "Location access denied. Please enable location in your browser settings."
        break
      case err.POSITION_UNAVAILABLE:
        message = "Location unavailable. Please check your GPS/location settings."
        break
      case err.TIMEOUT:
        message = "Location request timed out. Please try again."
        break
      default:
        message = "An unknown error occurred while getting location."
    }

    setError(message)
    setIsLoading(false)
  }, [])

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    // Check if browser supports geolocation
    if (!('geolocation' in navigator)) {
      setError("Your browser doesn't support GPS location.")
      setIsLoading(false)
      return
    }

    let watchId = null

    // Geolocation options
    const geoOptions = {
      enableHighAccuracy,
      maximumAge,
      timeout
    }

    if (watchPosition) {
      // CONTINUOUS TRACKING
      // This calls handleSuccess every time the position changes
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      )
    } else {
      // ONE-TIME POSITION
      // Just get the current position once
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      )
    }

    // CLEANUP: Stop watching when component unmounts
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [enableHighAccuracy, maximumAge, timeout, watchPosition, handleSuccess, handleError])

  // ============================================================
  // RETURN VALUES
  // ============================================================

  // Return everything the component might need
  return {
    position,      // Full position object { latitude, longitude, accuracy, timestamp }
    coordinates,   // Just [longitude, latitude] for Mapbox
    error,         // Error message string (or null)
    isLoading,     // Boolean: still getting initial position?
    isSupported: 'geolocation' in navigator  // Boolean: does browser support GPS?
  }
}

export default useGeolocation
