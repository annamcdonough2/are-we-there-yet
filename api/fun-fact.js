/**
 * fun-fact.js - Vercel Serverless Function
 *
 * WHAT THIS FILE DOES (Plain English):
 * This runs on Vercel's servers, NOT in the user's browser.
 * It keeps the Anthropic API key secret by:
 * 1. Receiving a request from the browser (just the place name)
 * 2. Adding the secret API key (stored safely on Vercel)
 * 3. Calling Claude API
 * 4. Sending back just the fun fact (no secrets exposed!)
 *
 * WHY THIS MATTERS:
 * In development, we use VITE_ANTHROPIC_API_KEY (browser-accessible).
 * In production, we use this serverless function + ANTHROPIC_API_KEY (server-only).
 * This means no one can steal our API key from the deployed app!
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get the place name from the request
  const { placeName } = req.body

  if (!placeName) {
    return res.status(400).json({ error: 'placeName is required' })
  }

  // Get the API key from environment (server-side only, NOT exposed to browser)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in environment')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
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
      return res.status(response.status).json({
        error: errorData.error?.message || 'Failed to get fun fact'
      })
    }

    const data = await response.json()
    const funFact = data.content[0].text.trim()

    return res.status(200).json({ funFact })

  } catch (error) {
    console.error('Error calling Claude API:', error)
    return res.status(500).json({
      error: 'Failed to get fun fact',
      fallback: `🚗 You're on an adventure through ${placeName}! Keep your eyes open for cool things!`
    })
  }
}
