/**
 * fun-fact.js - Vercel Serverless Function
 *
 * WHAT THIS FILE DOES:
 * Gets a VERIFIED fun fact about a place.
 *
 * VERIFICATION SYSTEM:
 * 1. Generate a fun fact using Claude
 * 2. Verify it using Claude's web search
 * 3. If not verified, try again with a different fact (up to 3 attempts)
 * 4. Only returns verified facts
 *
 * USES: Anthropic's built-in web search tool for verification
 */

const MAX_VERIFICATION_ATTEMPTS = 3

/**
 * Generate a fun fact (internal helper)
 */
async function generateFact(apiKey, placeName, isDestination) {
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

Now tell the kids about ${placeName}:`

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
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate fact')
  }

  const data = await response.json()
  return data.content[0].text.trim()
}

/**
 * Verify a fact using Claude's web search
 */
async function verifyFact(apiKey, funFact, placeName) {
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
        tools: [
          {
            type: 'web_search_20250305'
          }
        ],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      return { verified: false, confidence: 0 }
    }

    const data = await response.json()
    const textBlock = data.content.find(block => block.type === 'text')

    if (!textBlock) {
      return { verified: false, confidence: 0 }
    }

    let jsonText = textBlock.text.trim()
    if (jsonText.includes('```')) {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) jsonText = match[1].trim()
    }

    const result = JSON.parse(jsonText)
    return {
      verified: result.verified === true && result.confidence >= 5,
      confidence: result.confidence
    }
  } catch (error) {
    console.error('Verification error:', error)
    return { verified: false, confidence: 0 }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { placeName, isDestination = false } = req.body

  if (!placeName) {
    return res.status(400).json({ error: 'placeName is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in environment')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    for (let attempt = 1; attempt <= MAX_VERIFICATION_ATTEMPTS; attempt++) {
      console.log(`[Verification] Attempt ${attempt}/${MAX_VERIFICATION_ATTEMPTS} for ${placeName}`)

      // Generate a fact
      const fact = await generateFact(apiKey, placeName, isDestination)

      // Verify it
      console.log(`[Verification] Verifying: "${fact.substring(0, 50)}..."`)
      const verification = await verifyFact(apiKey, fact, placeName)

      if (verification.verified) {
        console.log(`[Verification] Verified with confidence ${verification.confidence}`)
        return res.status(200).json({
          funFact: fact,
          verified: true
        })
      }

      console.log(`[Verification] Not verified (confidence: ${verification.confidence}), trying again...`)
    }

    // All attempts failed
    console.log(`[Verification] All ${MAX_VERIFICATION_ATTEMPTS} attempts failed for ${placeName}`)
    return res.status(200).json({
      funFact: null,
      verified: false
    })

  } catch (error) {
    console.error('Error in fun-fact handler:', error)
    return res.status(500).json({
      error: 'Failed to get verified fun fact',
      funFact: null,
      verified: false
    })
  }
}
