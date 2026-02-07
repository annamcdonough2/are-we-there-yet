/**
 * verification.js - Verifies fun facts using Claude's web search
 *
 * WHAT THIS FILE DOES:
 * Takes a fun fact and uses Claude's built-in web search tool to verify it's accurate.
 * Returns whether the fact could be verified.
 *
 * HOW IT WORKS:
 * 1. Send the fun fact to Claude with web search enabled
 * 2. Claude searches the web to find evidence
 * 3. Claude analyzes search results and determines if the fact is accurate
 *
 * USES: Anthropic's built-in web search tool (no additional API keys needed)
 */

// Get API key from environment
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

// Check if we're in production
const isProduction = !ANTHROPIC_API_KEY

/**
 * Verify a fun fact using Claude's web search
 *
 * @param {string} funFact - The fun fact to verify
 * @param {string} placeName - The place the fact is about
 * @returns {Promise<{verified: boolean, confidence: number}>}
 */
export async function verifyFact(funFact, placeName) {
  const prompt = `You have access to web search. Please verify if this fun fact about ${placeName} is accurate.

FUN FACT TO VERIFY:
"${funFact}"

Instructions:
1. Use web search to find evidence about the claim in this fun fact
2. Look for reliable sources (Wikipedia, official city sites, news, educational sites)
3. Determine if the fact is accurate based on what you find

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "verified": true or false,
  "confidence": 1-10,
  "reason": "brief explanation of what evidence you found"
}

Rules:
- Only mark verified=true if you found clear evidence supporting the fact
- Confidence 7+ means strong evidence from reliable sources
- Confidence 4-6 means some evidence but not fully conclusive
- Confidence 1-3 means weak or contradictory evidence
- If you cannot find evidence either way, mark verified=false`

  try {
    if (isProduction) {
      // In production, use the serverless function
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

    // In development, call Claude with web search directly
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        // Enable Claude's built-in web search tool
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 3
          }
        ],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Claude API error:', errorData)
      return { verified: false, confidence: 0 }
    }

    const data = await response.json()

    // Find the text response (Claude may return tool use blocks first)
    const textBlock = data.content.find(block => block.type === 'text')
    if (!textBlock) {
      console.error('No text response from Claude')
      return { verified: false, confidence: 0 }
    }

    const text = textBlock.text.trim()

    // Parse the JSON response (handle potential markdown wrapping)
    let jsonText = text
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonText = match[1].trim()
    }

    const result = JSON.parse(jsonText)

    return {
      verified: result.verified === true && result.confidence >= 6,
      confidence: result.confidence
    }
  } catch (error) {
    console.error('Verification error:', error)
    return { verified: false, confidence: 0 }
  }
}

/**
 * Check if verification is available
 * (Always true since we use Anthropic's built-in web search)
 */
export function isVerificationAvailable() {
  return true
}
