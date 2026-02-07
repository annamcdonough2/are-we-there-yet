/**
 * claude.js - Gets fun facts from Claude AI
 *
 * WHAT THIS FILE DOES:
 * Asks Claude to generate kid-friendly fun facts about places.
 * Given a location name, Claude creates an interesting, educational fact
 * that's appropriate for children.
 *
 * SECURITY NOTE (Plain English):
 * Right now, we're calling Claude directly from the browser. This is fine
 * for testing on YOUR computer because only YOU can see the API key.
 *
 * For a PUBLIC app, we'd need to:
 * 1. Create a server-side function (like Vercel serverless)
 * 2. Have the browser call OUR server
 * 3. Our server calls Claude with the secret key
 *
 * This keeps the key hidden from users. We'll do this in Phase 7 (Deploy).
 */

// Get the API key from environment variables (only available in development)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// Check if we're in production (no VITE_ API key available)
const isProduction = !ANTHROPIC_API_KEY

/**
 * Get a fun fact about a location
 *
 * HOW IT WORKS (Plain English):
 * - In DEVELOPMENT: Calls Claude API directly (uses VITE_ANTHROPIC_API_KEY)
 * - In PRODUCTION: Calls our serverless function at /api/fun-fact
 *   which keeps the API key secret on the server
 *
 * @param {string} placeName - Name of the place (e.g., "Springfield, Illinois")
 * @param {boolean} isDestination - If true, this is the destination (use "heading to"), otherwise current location (use "in")
 * @returns {Promise<string>} - A fun fact about the place
 */
export async function getFunFact(placeName, isDestination = false) {
  // Build the appropriate prompt based on whether this is a destination or current location
  const prompt = isDestination
    ? `You are a fun, friendly guide for kids on a road trip. Tell them about ${placeName}, their destination, with an exciting fun fact!

Rules:
- This is for 6-year-old children. ONLY share kid-safe, age-appropriate facts
- NEVER mention alcoholic beverages (wine, beer, etc.), drugs, or anything explicit
- Only share facts you are confident are true. Do not make up or guess information
- Focus on topics like: animals, nature, sports, history, food (kid-friendly), buildings, parks, fun records
- Start with "You're heading to [city name]!" or "We're going to [city name]!" (just the city, not full address)
- Then share ONE interesting fact about the place
- End with an engaging question for the kids when possible
- Keep it to 2-3 short sentences total
- Use simple words a 6-year-old would understand
- Include a relevant emoji at the start

Examples:
"🍎 You're heading to Campbell! Campbell is known as the Orchard City because it used to have lots of fruit trees. What do you know about orchards?"
"🗼 We're going to Las Vegas! Did you know they have a mini Eiffel Tower that's half the size of the real one in Paris?"
"🎢 You're heading to Orlando! This city has more theme parks than almost anywhere else in the world. What ride would you want to go on?"

Now tell the kids about their destination, ${placeName}:`
    : `You are a fun, friendly guide for kids on a road trip. Tell them about ${placeName} with an exciting fun fact!

Rules:
- This is for 6-year-old children. ONLY share kid-safe, age-appropriate facts
- NEVER mention alcoholic beverages (wine, beer, etc.), drugs, or anything explicit
- Only share facts you are confident are true. Do not make up or guess information
- Focus on topics like: animals, nature, sports, history, food (kid-friendly), buildings, parks, fun records
- Start with "You're in [city name]!" or "We're in [city name]!" (just the city, not full address)
- Then share ONE interesting fact about the place
- End with an engaging question for the kids when possible
- Keep it to 2-3 short sentences total
- Use simple words a 6-year-old would understand
- Include a relevant emoji at the start

Examples:
"🍎 You're in Campbell, CA! Campbell is known as the Orchard City because it used to have lots of fruit trees. What do you know about orchards?"
"🗼 We're in Las Vegas! Did you know they have a mini Eiffel Tower that's half the size of the real one in Paris?"
"🎢 You're in Orlando! This city has more theme parks than almost anywhere else in the world. What ride would you want to go on?"

Now tell the kids about ${placeName}:`

  try {
    // PRODUCTION: Use serverless function (keeps API key secret)
    if (isProduction) {
      const response = await fetch('/api/fun-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName, isDestination })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get fun fact')
      }

      const data = await response.json()
      return data.funFact || data.fallback
    }

    // DEVELOPMENT: Call Claude API directly
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'  // Required for browser calls
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',  // Fast and cheap - perfect for fun facts
        max_tokens: 150,  // Keep facts short
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Claude API error:', errorData)
      throw new Error(errorData.error?.message || 'Failed to get fun fact')
    }

    const data = await response.json()

    // Extract the text from Claude's response
    const funFact = data.content[0].text.trim()

    return funFact
  } catch (error) {
    console.error('Error getting fun fact:', error)

    // Return a friendly fallback if the API call fails
    const cityName = placeName.split(',')[0].trim()
    if (isDestination) {
      return `🚗 You're heading to ${cityName}! Keep your eyes open for cool things on your adventure. What do you think you'll see there?`
    }
    return `🚗 You're in ${cityName}! Keep your eyes open for cool things on your adventure. What do you see outside?`
  }
}

/**
 * Get the name of a place from coordinates
 * Uses Mapbox reverse geocoding
 * Prioritizes city ("place") over neighborhood/locality
 *
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @returns {Promise<string|null>} - Place name or null
 */
export async function getPlaceName(coordinates) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

  try {
    const [lng, lat] = coordinates

    // First, try to get the city (place type)
    const cityUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${MAPBOX_TOKEN}&types=place&limit=1`

    const cityResponse = await fetch(cityUrl)
    const cityData = await cityResponse.json()

    // If we found a city, use it
    if (cityData.features && cityData.features.length > 0) {
      return cityData.features[0].place_name
    }

    // Fallback: try locality and neighborhood if no city found
    const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${MAPBOX_TOKEN}&types=locality,neighborhood&limit=1`

    const fallbackResponse = await fetch(fallbackUrl)
    const fallbackData = await fallbackResponse.json()

    if (fallbackData.features && fallbackData.features.length > 0) {
      return fallbackData.features[0].place_name
    }

    return null
  } catch (error) {
    console.error('Error getting place name:', error)
    return null
  }
}
