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
 * @returns {Promise<string>} - A fun fact about the place
 */
export async function getFunFact(placeName) {
  try {
    // PRODUCTION: Use serverless function (keeps API key secret)
    if (isProduction) {
      const response = await fetch('/api/fun-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName })
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
            content: `You are a fun, friendly guide for kids on a road trip. Give ONE short, interesting fun fact about ${placeName}.

Rules:
- Keep it under 2 sentences
- Make it kid-friendly and exciting
- Use simple words a 6-year-old would understand
- Start with "Did you know?" or similar
- Include an emoji at the start

Example: "🦕 Did you know? Springfield has a dinosaur museum with real fossils that are millions of years old!"

Now give a fun fact about ${placeName}:`
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

    // Return a generic fun fact if something goes wrong
    return `🚗 You're on an adventure through ${placeName}! Keep your eyes open for cool things!`
  }
}

/**
 * Get the name of a place from coordinates
 * Uses Mapbox reverse geocoding
 *
 * @param {[number, number]} coordinates - [longitude, latitude]
 * @returns {Promise<string|null>} - Place name or null
 */
export async function getPlaceName(coordinates) {
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

  try {
    const [lng, lat] = coordinates
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
      `access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood&limit=1`

    const response = await fetch(url)
    const data = await response.json()

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name
    }

    return null
  } catch (error) {
    console.error('Error getting place name:', error)
    return null
  }
}
