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
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Input field with search icon */}
      <div className="relative">
        {/* Search icon */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>

        {/* The text input */}
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Where are we going?"
          className="w-full pl-10 pr-10 py-3 text-lg border-2 border-gray-200 rounded-xl
                     focus:border-blue-500 focus:outline-none
                     placeholder-gray-400"
        />

        {/* Loading spinner or clear button */}
        {isSearching ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin">
            ⏳
          </span>
        ) : query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown with suggestions */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-2 bg-white border border-gray-200
                       rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((place) => (
            <li key={place.id}>
              <button
                onClick={() => handleSuggestionClick(place)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50
                           border-b border-gray-100 last:border-b-0
                           flex items-start gap-3"
              >
                {/* Location pin icon */}
                <span className="text-blue-500 mt-1">📍</span>

                {/* Address text */}
                <div>
                  <div className="font-medium text-gray-800">
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
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl
                        flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="text-green-800 text-sm">
            Destination set! Route will appear on map.
          </span>
        </div>
      )}
    </div>
  )
}

export default DestinationInput
