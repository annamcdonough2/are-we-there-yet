/**
 * mapbox.js - Helper functions for talking to Mapbox
 *
 * WHAT THIS FILE DOES:
 * Contains functions that communicate with Mapbox's servers to:
 * 1. Search for places by name (POI/business search) or address
 * 2. Get driving directions between two points
 *
 * WHY IT'S SEPARATE:
 * Keeping this code in its own file makes it reusable and keeps
 * our components cleaner. Think of it like a phone book + GPS
 * that other parts of the app can use.
 *
 * SEARCH BOX API (vs old Geocoding API):
 * We use the Search Box API because it supports POI (Point of Interest)
 * searches. This means you can search for "Waterworks Swim" or
 * "watertower kitchen" and find businesses, not just street addresses.
 * The old Geocoding v5 API no longer returns POI results.
 */

import { SearchBoxCore, SessionToken } from '@mapbox/search-js-core'

// Get the Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Create a single SearchBoxCore instance to reuse
const searchBox = new SearchBoxCore({ accessToken: MAPBOX_TOKEN })

// Session token groups suggest + retrieve calls for billing optimization
// We create a new one for each "search session" (when user starts typing)
let sessionToken = new SessionToken()

/**
 * Search for places matching the user's input
 *
 * PLAIN ENGLISH:
 * When the user types "Waterworks Swim" or "123 Main", this asks Mapbox
 * "what places match this?" The Search Box API is smart enough to find:
 * - Businesses and POIs (like "Waterworks Swim")
 * - Addresses (like "123 Main Street, Springfield, IL")
 * - Cities and places (like "Chicago")
 *
 * NOTE: This returns SUGGESTIONS, not full results with coordinates.
 * When the user selects one, you need to call retrievePlaceDetails()
 * to get the actual coordinates.
 *
 * @param {string} query - What the user typed
 * @param {[number, number]} proximity - [longitude, latitude] to prefer nearby results
 * @returns {Promise<Array>} - List of matching place suggestions
 */
// Store suggestions so we can pass the full object to retrieve()
let cachedSuggestions = new Map()

export async function searchPlaces(query, proximity = null) {
  // Don't search if the query is too short
  if (!query || query.length < 3) {
    return []
  }

  try {
    // Build the options for the search
    const options = {
      language: 'en',
      country: 'us',
      limit: 5,
      // Prioritize POIs, then addresses, then places (cities)
      types: 'poi,address,place',
      sessionToken: sessionToken
    }

    // If we know the user's location, prefer nearby results
    if (proximity) {
      options.proximity = `${proximity[0]},${proximity[1]}`
    }

    // Get suggestions from Search Box API
    const response = await searchBox.suggest(query, options)

    // Clear old cache and store new suggestions
    cachedSuggestions.clear()

    // Transform the results into our app's format
    return response.suggestions.map(suggestion => {
      // Cache the full suggestion object for retrieve()
      cachedSuggestions.set(suggestion.mapbox_id, suggestion)

      return {
        // Use mapbox_id for retrieving full details later
        id: suggestion.mapbox_id,
        // Full address/name
        name: suggestion.full_address || suggestion.name,
        // Just the place name (business name or street number)
        shortName: suggestion.name,
        // Type of place: 'poi', 'address', or 'place'
        placeType: suggestion.feature_type,
        // Category for POIs (like 'restaurant', 'gym', etc.)
        category: suggestion.poi_category?.[0] || null,
        // NOTE: coordinates are NOT available yet - must call retrievePlaceDetails()
        coordinates: null
      }
    })
  } catch (error) {
    console.error('Error searching places:', error)
    return []
  }
}

/**
 * Get full details (including coordinates) for a selected place
 *
 * PLAIN ENGLISH:
 * When the user clicks on a suggestion, we need to get the actual
 * coordinates so we can show it on the map. The suggest() call
 * doesn't include coordinates (to save bandwidth), so we need
 * this second "retrieve" call.
 *
 * @param {string} mapboxId - The mapbox_id from a suggestion
 * @returns {Promise<Object>} - Place with full details including coordinates
 */
export async function retrievePlaceDetails(mapboxId) {
  try {
    // Get the cached suggestion object (required for retrieve())
    const suggestion = cachedSuggestions.get(mapboxId)
    if (!suggestion) {
      throw new Error('Suggestion not found in cache - please search again')
    }

    const response = await searchBox.retrieve(suggestion, { sessionToken })

    // Get the first (and only) feature from the response
    const feature = response.features[0]

    if (!feature) {
      throw new Error('Place not found')
    }

    // Start a new session for the next search
    sessionToken = new SessionToken()

    return {
      id: mapboxId,
      name: feature.properties.full_address || feature.properties.name,
      shortName: feature.properties.name,
      coordinates: feature.geometry.coordinates, // [longitude, latitude]
      placeType: feature.properties.feature_type,
      category: feature.properties.poi_category?.[0] || null
    }
  } catch (error) {
    console.error('Error retrieving place details:', error)
    throw error
  }
}

/**
 * Reset the session token (call when user clears search or starts over)
 */
export function resetSearchSession() {
  sessionToken = new SessionToken()
  cachedSuggestions.clear()
}

/**
 * Get driving directions between two points
 *
 * PLAIN ENGLISH:
 * Given a start and end point, this asks Mapbox "what's the best driving route?"
 * Mapbox returns:
 * - The path to draw on the map (a series of coordinates)
 * - How long it will take
 * - How far it is
 *
 * @param {[number, number]} start - Starting point [longitude, latitude]
 * @param {[number, number]} end - Destination [longitude, latitude]
 * @returns {Promise<Object>} - Route information
 */
export async function getDirections(start, end) {
  // Build the URL for Mapbox's directions API
  const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`
  let url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?`
  url += `access_token=${MAPBOX_TOKEN}`
  url += `&geometries=geojson`  // Return the route as GeoJSON (a format maps understand)
  url += `&overview=full`  // Return the full detailed route, not simplified
  url += `&steps=true`  // Include turn-by-turn steps (we might use these later)

  try {
    const response = await fetch(url)
    const data = await response.json()

    // Check if we got a valid route
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found')
    }

    const route = data.routes[0]

    return {
      // The line to draw on the map
      geometry: route.geometry,

      // Duration in seconds - we'll convert to minutes for display
      durationSeconds: route.duration,
      durationMinutes: Math.round(route.duration / 60),

      // Distance in meters - we'll convert to miles for display
      distanceMeters: route.distance,
      distanceMiles: (route.distance / 1609.34).toFixed(1),  // 1609.34 meters = 1 mile

      // Turn-by-turn steps (for future use)
      steps: route.legs[0].steps
    }
  } catch (error) {
    console.error('Error getting directions:', error)
    throw error
  }
}

/**
 * Format duration for display
 *
 * PLAIN ENGLISH:
 * Turns "90 minutes" into "1 hr 30 min" for easier reading
 *
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted string like "1 hr 30 min"
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${remainingMinutes} min`
}

/**
 * Format distance for display
 *
 * PLAIN ENGLISH:
 * Makes distances look nice, like "0.5 mi" or "125 mi"
 *
 * @param {number} miles - Distance in miles
 * @returns {string} - Formatted string like "12.5 mi"
 */
export function formatDistance(miles) {
  return `${miles} mi`
}
