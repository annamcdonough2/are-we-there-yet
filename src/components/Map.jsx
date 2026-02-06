/**
 * Map.jsx - Displays the interactive map with live tracking
 *
 * WHAT THIS FILE DOES:
 * Shows a full-screen map using Mapbox. The map displays:
 * - Your current location (with a cute car marker that MOVES!)
 * - The route to your destination (colored line on the map)
 * - A marker at the destination (flag emoji)
 *
 * LIVE TRACKING (Plain English):
 * Instead of getting your location once, we now continuously watch it.
 * Every time your GPS updates (every few seconds), we:
 * 1. Move the car marker to your new position
 * 2. Recalculate the remaining distance and time
 * 3. Update the route if needed
 */

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { getDirections } from '../services/mapbox'

import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

function Map({ destination, onPositionChange, onRouteCalculated }) {
  // ============================================================
  // REFS (References to things we need to keep between renders)
  // ============================================================

  const mapContainer = useRef(null)
  const map = useRef(null)
  const carMarker = useRef(null)
  const destinationMarker = useRef(null)
  const watchId = useRef(null)  // Stores the GPS watch ID so we can stop it later

  // ============================================================
  // STATE
  // ============================================================

  const [position, setPosition] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  // Track if this is the first position update (for initial zoom)
  const isFirstPosition = useRef(true)

  // Store the original route distance for progress calculation
  const [totalDistance, setTotalDistance] = useState(null)

  // ============================================================
  // EFFECT 1: Create the map and start GPS tracking
  // ============================================================

  useEffect(() => {
    if (map.current) return

    // First, get initial position to center the map
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.longitude, pos.coords.latitude]
          setPosition(coords)

          if (onPositionChange) {
            onPositionChange(coords)
          }

          // Create the map
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: coords,
            zoom: 14
          })

          map.current.on('load', () => {
            setIsLoading(false)
            setMapReady(true)
            addCarMarker(coords)

            // NOW start continuous tracking
            startWatchingPosition()
          })
        },
        (err) => {
          console.error('High accuracy geolocation failed, trying low accuracy:', err)

          // FALLBACK: Try again with low accuracy (uses WiFi/IP instead of GPS)
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              // Low accuracy worked!
              const coords = [pos.coords.longitude, pos.coords.latitude]
              setPosition(coords)
              if (onPositionChange) onPositionChange(coords)

              map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: coords,
                zoom: 14
              })

              map.current.on('load', () => {
                setIsLoading(false)
                setMapReady(true)
                addCarMarker(coords)
                startWatchingPosition()
              })
            },
            (fallbackErr) => {
              // Both attempts failed
              console.error('All geolocation attempts failed:', fallbackErr)
              setError(getLocationErrorMessage(fallbackErr))

              // Still show a map centered on US
              map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [-98.5795, 39.8283],
                zoom: 4
              })

              map.current.on('load', () => {
                setIsLoading(false)
                setMapReady(true)
              })
            },
            {
              enableHighAccuracy: false,  // Use WiFi/IP location
              timeout: 30000,
              maximumAge: 300000  // Accept positions up to 5 minutes old
            }
          )
        },
        {
          enableHighAccuracy: true,  // Try GPS first
          timeout: 15000,            // Wait up to 15 seconds for GPS
          maximumAge: 120000         // Accept positions up to 2 minutes old
        }
      )
    } else {
      setError("Your browser doesn't support GPS location")
      setIsLoading(false)
    }

    // CLEANUP
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // ============================================================
  // FUNCTION: Start continuous GPS tracking
  // ============================================================

  function startWatchingPosition() {
    if (!('geolocation' in navigator)) return

    watchId.current = navigator.geolocation.watchPosition(
      // SUCCESS: Position updated!
      (pos) => {
        const newCoords = [pos.coords.longitude, pos.coords.latitude]

        setPosition(newCoords)

        // Tell parent component about the new position
        if (onPositionChange) {
          onPositionChange(newCoords)
        }

        // Move the car marker smoothly
        if (carMarker.current) {
          carMarker.current.setLngLat(newCoords)
        }

        // If we have a destination, recalculate the route
        // (This happens in the other useEffect when position changes)
      },
      // ERROR
      (err) => {
        console.error('GPS tracking error:', err)
        // Don't show error for every tracking failure, just log it
      },
      // OPTIONS
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000  // Accept positions up to 5 seconds old
      }
    )
  }

  // ============================================================
  // EFFECT 2: Draw/update route when destination or position changes
  // ============================================================

  useEffect(() => {
    if (!mapReady || !map.current || !position || !destination) {
      // If destination was cleared, remove the route
      if (!destination && map.current) {
        if (map.current.getSource('route')) {
          map.current.removeLayer('route')
          map.current.removeSource('route')
        }
        if (destinationMarker.current) {
          destinationMarker.current.remove()
          destinationMarker.current = null
        }
        setTotalDistance(null)
      }
      return
    }

    async function updateRoute() {
      try {
        const route = await getDirections(position, destination.coordinates)

        // Store total distance on first calculation (for progress bar)
        if (totalDistance === null) {
          setTotalDistance(parseFloat(route.distanceMiles))
        }

        // Add or update the route line
        if (map.current.getSource('route')) {
          map.current.getSource('route').setData(route.geometry)
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: route.geometry
          })

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3B82F6',
              'line-width': 6,
              'line-opacity': 0.8
            }
          })
        }

        // Add destination marker if not exists
        if (!destinationMarker.current) {
          const markerElement = document.createElement('div')
          markerElement.innerHTML = '🏁'
          markerElement.style.fontSize = '32px'

          destinationMarker.current = new mapboxgl.Marker({
            element: markerElement,
            anchor: 'bottom'
          })
            .setLngLat(destination.coordinates)
            .addTo(map.current)
        }

        // Only zoom to fit on first route calculation
        if (isFirstPosition.current) {
          const bounds = new mapboxgl.LngLatBounds()
          bounds.extend(position)
          bounds.extend(destination.coordinates)

          map.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 150, left: 50, right: 50 },
            duration: 1000
          })

          isFirstPosition.current = false
        }

        // Send route info to parent (includes progress calculation)
        if (onRouteCalculated) {
          const progress = totalDistance
            ? Math.max(0, Math.min(100, ((totalDistance - parseFloat(route.distanceMiles)) / totalDistance) * 100))
            : 0

          onRouteCalculated({
            ...route,
            progress,
            totalDistance: totalDistance || parseFloat(route.distanceMiles)
          })
        }

      } catch (err) {
        console.error('Error updating route:', err)
      }
    }

    updateRoute()
  }, [destination, position, mapReady])

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function addCarMarker(coordinates) {
    const markerElement = document.createElement('div')
    markerElement.className = 'car-marker'
    markerElement.innerHTML = '🚗'
    markerElement.style.fontSize = '32px'
    markerElement.style.cursor = 'pointer'
    markerElement.style.transition = 'transform 0.3s ease'  // Smooth movement

    carMarker.current = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'center'
    })
      .setLngLat(coordinates)
      .addTo(map.current)
  }

  function getLocationErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "📍 Location access was denied. Please allow location access to see your position on the map."
      case error.POSITION_UNAVAILABLE:
        return "📍 Couldn't determine your location. Please check your GPS settings."
      case error.TIMEOUT:
        return "📍 Getting your location took too long. Please try again."
      default:
        return "📍 An unknown error occurred while getting your location."
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🚗</div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-20 left-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-md">
          <p>{error}</p>
          <p className="text-sm mt-2">The map is still usable, but we can't show your location.</p>
        </div>
      )}

      {position && !isLoading && !destination && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm text-gray-600">
          📍 GPS active! Enter a destination above.
        </div>
      )}

      {/* Live tracking indicator */}
      {position && destination && (
        <div className="absolute bottom-4 left-4 bg-green-100 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-sm text-green-700 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live tracking active
        </div>
      )}
    </div>
  )
}

export default Map
