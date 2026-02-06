/**
 * mapbox.js - Helper functions for talking to Mapbox
 *
 * WHAT THIS FILE DOES:
 * Contains functions that communicate with Mapbox's servers to:
 * 1. Turn addresses into coordinates (geocoding)
 * 2. Get driving directions between two points
 *
 * WHY IT'S SEPARATE:
 * Keeping this code in its own file makes it reusable and keeps
 * our components cleaner. Think of it like a phone book + GPS
 * that other parts of the app can use.
 */

// Get the Mapbox token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/**
 * Search for places matching the user's input
 *
 * PLAIN ENGLISH:
 * When the user types "123 Main", this asks Mapbox "what places match this?"
 * Mapbox returns a list of suggestions like:
 * - 123 Main Street, Springfield, IL
 * - 123 Main Avenue, Boston, MA
 *
 * @param {string} query - What the user typed
 * @param {[number, number]} proximity - [longitude, latitude] to prefer nearby results
 * @returns {Promise<Array>} - List of matching places
 */
export async function searchPlaces(query, proximity = null) {
  // Don't search if the query is too short
  if (!query || query.length < 3) {
    return []
  }

  // Build the URL for Mapbox's geocoding API
  // "geocoding" = turning text addresses into coordinates
  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?`
  url += `access_token=${MAPBOX_TOKEN}`
  url += `&country=us`  // Only search in the US (you can remove this for worldwide)
  url += `&types=address,place,poi`  // Search for addresses, cities, and points of interest
  url += `&limit=5`  // Return max 5 results

  // If we know the user's location, prefer nearby results
  if (proximity) {
    url += `&proximity=${proximity[0]},${proximity[1]}`
  }

  try {
    // Send the request to Mapbox
    const response = await fetch(url)
    const data = await response.json()

    // Transform the results into a simpler format
    return data.features.map(feature => ({
      id: feature.id,
      name: feature.place_name,  // Full address like "123 Main St, Springfield, IL 62701"
      coordinates: feature.center,  // [longitude, latitude]
      shortName: feature.text  // Just the main part, like "123 Main St"
    }))
  } catch (error) {
    console.error('Error searching places:', error)
    return []
  }
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
