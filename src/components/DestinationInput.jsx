/**
 * DestinationInput.jsx - Where the parent enters the destination
 *
 * WHAT THIS FILE DOES:
 * Shows a text box where you type an address OR place name. As you type:
 * 1. It searches for matching places (businesses, addresses, cities)
 * 2. Shows a dropdown with suggestions
 * 3. When you pick one, it fetches coordinates and tells the app
 *
 * HOW AUTOCOMPLETE WORKS (Plain English):
 * 1. You type "Waterworks Swim" or "123 Main"
 * 2. After a short pause (so we don't search on every keystroke)
 * 3. We ask Mapbox "what places match this?"
 * 4. Mapbox returns suggestions (businesses, addresses, cities)
 * 5. We show them in a dropdown with different icons
 * 6. You click one, we fetch the coordinates, and we're ready to go!
 *
 * POI SEARCH:
 * We use Mapbox's Search Box API which supports POI (Point of Interest)
 * searches. This means you can find businesses by name, not just addresses!
 */

import { useState, useEffect, useRef } from 'react'
import { searchPlaces, retrievePlaceDetails, resetSearchSession } from '../services/mapbox'

/**
 * Get the appropriate icon for a place type
 * POIs get a store icon, addresses get a pin
 */
function getPlaceIcon(placeType) {
  switch (placeType) {
    case 'poi':
      return '🏢'  // Business/POI
    case 'address':
      return '📍'  // Address
    case 'place':
      return '🏙️'  // City/region
    default:
      return '📍'
  }
}

function DestinationInput({ onDestinationSelect, userLocation }) {
  // ============================================================
  // STATE
  // ============================================================

  // What the user has typed so far
  const [query, setQuery] = useState('')

  // List of suggestions from Mapbox
  const [suggestions, setSuggestions] = useState([])

  // Are we currently searching for suggestions?
  const [isSearching, setIsSearching] = useState(false)

  // Are we loading the full place details after selection?
  const [isRetrieving, setIsRetrieving] = useState(false)

  // Is the dropdown open?
  const [isOpen, setIsOpen] = useState(false)

  // The selected destination (once they pick one)
  const [selectedPlace, setSelectedPlace] = useState(null)

  // Reference to the input container (for detecting clicks outside)
  const containerRef = useRef(null)

  // ============================================================
  // EFFECTS
  // ============================================================

  // Search for places when the user types (with a delay)
  useEffect(() => {
    // Don't search if query is too short or if we already selected a place
    if (query.length < 3 || selectedPlace) {
      setSuggestions([])
      return
    }

    // Set a timer to search after 300ms of no typing
    // This prevents searching on every single keystroke
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchPlaces(query, userLocation)
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setIsSearching(false)
    }, 300)

    // If the user types again before 300ms, cancel the previous search
    return () => clearTimeout(timeoutId)
  }, [query, userLocation, selectedPlace])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  // When the user types in the input
  function handleInputChange(e) {
    setQuery(e.target.value)
    setSelectedPlace(null)  // Clear selection when typing
  }

  // When the user clicks a suggestion
  async function handleSuggestionClick(suggestion) {
    // Immediately show the name and close dropdown
    setQuery(suggestion.name)
    setSuggestions([])
    setIsOpen(false)
    setIsRetrieving(true)

    try {
      // Fetch full details including coordinates
      const place = await retrievePlaceDetails(suggestion.id)
      setSelectedPlace(place)
      // Tell the parent component about the selection
      onDestinationSelect(place)
    } catch (error) {
      console.error('Error getting place details:', error)
      // Show error state - user can try again
      setSelectedPlace(null)
      setQuery('')
    } finally {
      setIsRetrieving(false)
    }
  }

  // Clear the input and selection
  function handleClear() {
    setQuery('')
    setSelectedPlace(null)
    setSuggestions([])
    resetSearchSession()  // Start fresh session for next search
    onDestinationSelect(null)
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input field with search icon */}
      <div className="relative">
        {/* Search icon */}
        <span className="absolute top-1/2 -translate-y-1/2 text-xl pointer-events-none" style={{ left: '12px' }}>
          🔍
        </span>

        {/* The text input */}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Where are we going?"
          style={{ paddingLeft: '48px' }}
          className="w-full pr-12 py-3 text-lg bg-white border-2 border-gray-200 rounded-2xl
                     focus:border-blue-400 focus:outline-none
                     placeholder-gray-400 transition-all duration-200"
        />

        {/* Loading spinner or clear button */}
        {(isSearching || isRetrieving) ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl animate-spin">
            ⏳
          </span>
        ) : query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400
                       hover:text-gray-600 active:scale-90 transition-all"
          >
            ✖️
          </button>
        )}
      </div>

      {/* Dropdown with suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-3 bg-white border-2 border-gray-100
                       rounded-2xl shadow-xl overflow-hidden">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-5 py-4 text-left hover:bg-blue-50 active:bg-blue-100
                           border-b border-gray-100 last:border-b-0
                           flex items-center gap-4 transition-colors"
              >
                {/* Icon based on place type - POI vs address */}
                <span className="text-3xl">{getPlaceIcon(suggestion.placeType)}</span>

                {/* Place name and details */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-lg truncate">
                    {suggestion.shortName}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.name}
                  </div>
                  {/* Show category for POIs (like "Restaurant", "Gym") */}
                  {suggestion.category && (
                    <div className="text-xs text-purple-600 mt-1 capitalize">
                      {suggestion.category}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Selected destination confirmation */}
      {selectedPlace && (
        <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-2xl
                        flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <span className="text-green-700 font-medium">
            Let's go! Route is on the map.
          </span>
        </div>
      )}
    </div>
  )
}

export default DestinationInput
