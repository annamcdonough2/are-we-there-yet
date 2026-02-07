/**
 * verify-fact.js - Vercel Serverless Function
 *
 * WHAT THIS FILE DOES:
 * Verifies a fun fact using Claude's built-in web search.
 * Returns whether the fact could be verified.
 *
 * USES: Anthropic's built-in web search tool
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2025-01-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        // Enable Claude's built-in web search tool
        tools: [
          {
            type: 'web_search_20250305'
          }
        ],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Claude API error:', errorData)
      return res.status(200).json({ verified: false, confidence: 0 })
    }

    const data = await response.json()

    // Find the text response (Claude may return tool use blocks first)
    const textBlock = data.content.find(block => block.type === 'text')
    if (!textBlock) {
      console.error('No text response from Claude')
      return res.status(200).json({ verified: false, confidence: 0 })
    }

    const text = textBlock.text.trim()

    // Parse the JSON response (handle potential markdown wrapping)
    let jsonText = text
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonText = match[1].trim()
    }

    const result = JSON.parse(jsonText)

    return res.status(200).json({
      verified: result.verified === true && result.confidence >= 5,
      confidence: result.confidence
    })

  } catch (error) {
    console.error('Error verifying fact:', error)
    return res.status(200).json({ verified: false, confidence: 0 })
  }
}
