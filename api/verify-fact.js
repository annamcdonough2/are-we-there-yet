/**
 * verify-fact.js - Vercel Serverless Function
 *
 * WHAT THIS FILE DOES:
 * Verifies a fun fact using Claude's self-assessment.
 * Fast and cheap - no web search needed.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { funFact, placeName } = req.body

  if (!funFact || !placeName) {
    return res.status(400).json({ error: 'funFact and placeName are required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in environment')
    return res.status(500).json({ error: 'Server configuration error' })
  }

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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Claude API error:', errorData)
      return res.status(200).json({ verified: false, confidence: 0 })
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

    return res.status(200).json({
      verified: result.confidence >= 7,
      confidence: result.confidence
    })

  } catch (error) {
    console.error('Error verifying fact:', error)
    return res.status(200).json({ verified: false, confidence: 0 })
  }
}
