/**
 * verification.js - Verifies fun facts using Claude's self-assessment
 *
 * WHAT THIS FILE DOES:
 * Asks Claude to rate its confidence in a fun fact.
 * Fast and cheap - no web search needed.
 *
 * HOW IT WORKS:
 * 1. Send the fun fact to Claude
 * 2. Ask Claude to rate confidence 1-10
 * 3. If confidence >= 7, mark as verified
 */

// Get API key from environment
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// Check if we're in production
const isProduction = !ANTHROPIC_API_KEY

/**
 * Verify a fun fact using Claude's self-assessment
 *
 * @param {string} funFact - The fun fact to verify
 * @param {string} placeName - The place the fact is about
 * @returns {Promise<{verified: boolean, confidence: number}>}
 */
export async function verifyFact(funFact, placeName) {
  const prompt = `Rate your confidence in this fun fact about ${placeName}.

FACT: "${funFact}"

How confident are you that this fact is accurate? Consider:
- Is this a well-known, verifiable fact?
- Could this be confused with another place?
- Is there any chance this is outdated or incorrect?

Respond with ONLY a JSON object (no other text):
{"confidence": <1-10>, "reason": "<brief explanation>"}

Confidence scale:
- 9-10: Absolutely certain, well-documented fact
- 7-8: Very confident, commonly known
- 5-6: Somewhat confident but not certain
- 1-4: Uncertain or potentially incorrect`

  try {
    if (isProduction) {
      const response = await fetch('/api/verify-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funFact, placeName })
      })

      if (!response.ok) {
        console.error('Verification API error')
        return { verified: false, confidence: 0 }
      }

      return await response.json()
    }

    // In development, call Claude directly
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Claude API error:', errorData)
      return { verified: false, confidence: 0 }
    }

    const data = await response.json()
    const text = data.content[0].text.trim()

    // Parse JSON response
    let jsonText = text
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonText = match[1].trim()
    }

    const result = JSON.parse(jsonText)

    return {
      verified: result.confidence >= 7,
      confidence: result.confidence
    }
  } catch (error) {
    console.error('Verification error:', error)
    return { verified: false, confidence: 0 }
  }
}

/**
 * Check if verification is available
 */
export function isVerificationAvailable() {
  return true
}
