/**
 * DestinationInput.jsx - Where the parent enters the destination
 *
 * WHAT THIS FILE DOES:
 * Shows a text box where you type an address. As you type:
 * 1. It searches for matching places
 * 2. Shows a dropdown with suggestions
 * 3. When you pick one, it tells the app where we're going
 *
 * HOW AUTOCOMPLETE WORKS (Plain English):
 * 1. You type "123 Main"
 * 2. After a short pause (so we don't search on every keystroke)
 * 3. We ask Mapbox "what places match 123 Main?"
 * 4. Mapbox returns suggestions
 * 5. We show them in a dropdown
 * 6. You click one, and we have the exact coordinates!
 */

import { useState, useEffect, useRef } from 'react'
import { searchPlaces } from '../services/mapbox'

function DestinationInput({ onDestinationSelect, userLocation }) {
  // ============================================================
  // STATE
  // ============================================================

  // What the user has typed so far
  const [query, setQuery] = useState('')

  // List of suggestions from Mapbox
  const [suggestions, setSuggestions] = useState([])

  // Are we currently searching?
  const [isSearching, setIsSearching] = useState(false)

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
  function handleSuggestionClick(place) {
    setQuery(place.name)  // Put the full address in the input
    setSelectedPlace(place)
    setSuggestions([])
    setIsOpen(false)

    // Tell the parent component about the selection
    onDestinationSelect(place)
  }

  // Clear the input and selection
  function handleClear() {
    setQuery('')
    setSelectedPlace(null)
    setSuggestions([])
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
        {isSearching ? (
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
          {suggestions.map((place) => (
            <li key={place.id}>
              <button
                onClick={() => handleSuggestionClick(place)}
                className="w-full px-5 py-4 text-left hover:bg-blue-50 active:bg-blue-100
                           border-b border-gray-100 last:border-b-0
                           flex items-center gap-4 transition-colors"
              >
                {/* Location pin icon - bigger */}
                <span className="text-3xl">📍</span>

                {/* Address text */}
                <div>
                  <div className="font-semibold text-gray-800 text-lg">
                    {place.shortName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {place.name}
                  </div>
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
