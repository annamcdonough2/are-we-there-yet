/**
 * App.jsx - The main component of our "Are We There Yet?" app
 *
 * WHAT THIS FILE DOES:
 * This is like the "control center" of our app. It holds all the main pieces
 * together and manages the data that needs to be shared between them.
 *
 * HOW DATA FLOWS (Plain English):
 * 1. User's position comes from the Map component (via GPS)
 * 2. User types destination in DestinationInput
 * 3. DestinationInput sends the chosen place to App
 * 4. App passes the destination to Map
 * 5. Map calculates the route and sends back time/distance
 * 6. App passes route info to ProgressPanel to display
 */

import { useState } from 'react'
// useState is a React feature that lets us store data that can change
// Think of it like a whiteboard we can write on and erase

// Import our components
import Map from './components/Map'
import DestinationInput from './components/DestinationInput'
import ProgressPanel from './components/ProgressPanel'
import FunFactCard from './components/FunFactCard'

function App() {
  // ============================================================
  // STATE (Data that changes as the app runs)
  // ============================================================

  // Where are we going? Starts empty until the parent enters an address
  // This object contains: { name, coordinates, shortName }
  const [destination, setDestination] = useState(null)

  // The user's current position [longitude, latitude]
  // Used to help autocomplete suggest nearby places
  const [userPosition, setUserPosition] = useState(null)

  // The calculated route information
  // Contains: { durationMinutes, distanceMiles, geometry, steps }
  const [route, setRoute] = useState(null)

  // ============================================================
  // EVENT HANDLERS (Functions that respond to user actions)
  // ============================================================

  // Called when the user selects a destination from autocomplete
  function handleDestinationSelect(place) {
    setDestination(place)
    if (!place) {
      setRoute(null)  // Clear route when destination is cleared
    }
  }

  // Called when the Map gets the user's GPS position
  function handlePositionChange(position) {
    setUserPosition(position)
  }

  // Called when the Map finishes calculating the route
  function handleRouteCalculated(routeData) {
    setRoute(routeData)
  }

  // ============================================================
  // RENDER (What appears on screen)
  // ============================================================

  return (
    <div className="h-screen w-screen relative bg-gray-100">
      {/*
        LAYOUT EXPLANATION:
        - The map takes up the full screen
        - Everything else floats on top of the map
        - We use "absolute" positioning to layer things
      */}

      {/* LAYER 1: The map (fills entire screen) */}
      <main className="h-full w-full">
        <Map
          destination={destination}
          onPositionChange={handlePositionChange}
          onRouteCalculated={handleRouteCalculated}
        />
      </main>

      {/* LAYER 2: Header with title and destination input */}
      <header className="absolute top-0 left-0 right-0 z-10 p-2 sm:p-4 safe-area-top">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-3 sm:p-4 max-w-md mx-auto">
          {/* App title */}
          <h1 className="text-lg sm:text-xl font-bold text-center text-blue-600 mb-2 sm:mb-3">
            🚗 Are We There Yet?
          </h1>

          {/* Destination input with autocomplete */}
          <DestinationInput
            onDestinationSelect={handleDestinationSelect}
            userLocation={userPosition}
          />
        </div>
      </header>

      {/* LAYER 3: Progress panel (only shows when there's a route) */}
      {route && (
        <div className="absolute top-36 sm:top-44 left-0 right-0 z-10 flex justify-center px-2 sm:px-4">
          <ProgressPanel route={route} />
        </div>
      )}

      {/* LAYER 4: Fun facts card */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 p-2 sm:p-4 safe-area-bottom">
        <FunFactCard
          position={userPosition}
          isActive={destination !== null}
        />
      </footer>
    </div>
  )
}

// This line makes the App component available to other files
export default App
