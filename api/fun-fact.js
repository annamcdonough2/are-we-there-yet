/**
 * fun-fact.js - Vercel Serverless Function
 *
 * WHAT THIS FILE DOES:
 * Gets a VERIFIED fun fact about a place.
 *
 * VERIFICATION SYSTEM:
 * 1. Generate a fun fact using Claude Haiku
 * 2. Ask Claude to rate its confidence (1-10)
 * 3. If confidence >= 7, mark as verified
 * 4. If not verified, try again (up to 3 attempts)
 */

const MAX_VERIFICATION_ATTEMPTS = 3

/**
 * Generate a fun fact
 */
async function generateFact(apiKey, placeName, isDestination) {
  const prompt = isDestination
    ? `You are a fun, friendly guide for kids on a road trip. Tell them about ${placeName}, their destination, with an exciting fun fact!

Rules:
- This is for 6-year-old children. ONLY share kid-safe, age-appropriate facts
- NEVER mention alcoholic beverages (wine, beer, etc.), drugs, or anything explicit
- NEVER mention income inequality, wealth, home prices, or "rich/poor" areas
- If a place is primarily known for wine, beer, or other adult topics, focus instead on: local wildlife, historic buildings, unique geography, famous people (artists, athletes, inventors), or kid-friendly attractions like parks, trains, or zoos
- Prefer facts specific to the exact city or town, not the general region. A fact about a local landmark, museum, or historic event in that specific place is better than a fact about the surrounding area
- Only share facts you are confident are true. Do not make up or guess information
- Focus on topics like: animals, nature, sports, history, food (kid-friendly), buildings, parks, fun records
- Start with "You're heading to [city name]!" or "We're going to [city name]!" (just the city, not full address)
- Then share ONE interesting fact about the place
- End with an engaging question for the kids when possible
- Keep it to 2-3 short sentences total, about 150 words maximum
- Use simple words a 6-year-old would understand
- Include a relevant emoji at the start

Examples:
"🍎 You're heading to Campbell! Campbell is known as the Orchard City because it used to have lots of fruit trees. What do you know about orchards?"
🚂 We're going to Sonoma! This town has a tiny train called TrainTown where you can ride a mini railroad through tunnels and over bridges. Would you like to ride a tiny train?

Now tell the kids about their destination, ${placeName}:`
    : `You are a fun, friendly guide for kids on a road trip. Tell them about ${placeName} with an exciting fun fact!

Rules:
- This is for 6-year-old children. ONLY share kid-safe, age-appropriate facts
- NEVER mention alcoholic beverages (wine, beer, etc.), drugs, or anything explicit
- NEVER mention income inequality, wealth, home prices, or "rich/poor" areas
- If a place is primarily known for wine, beer, or other adult topics, focus instead on: local wildlife, historic buildings, unique geography, famous people (artists, athletes, inventors), or kid-friendly attractions like parks, trains, or zoos
- Prefer facts specific to the exact city or town, not the general region. A fact about a local landmark, museum, or historic event in that specific place is better than a fact about the surrounding area
- Only share facts you are confident are true. Do not make up or guess information
- Focus on topics like: animals, nature, sports, history, food (kid-friendly), buildings, parks, fun records
- Start with "You're in [city name]!" or "We're in [city name]!" (just the city, not full address)
- Then share ONE interesting fact about the place
- End with an engaging question for the kids when possible
- Keep it to 2-3 short sentences total, about 150 words maximum
- Use simple words a 6-year-old would understand
- Include a relevant emoji at the start

Examples:
"🍎 You're in Campbell! Campbell is known as the Orchard City because it used to have lots of fruit trees. What do you know about orchards?"
🚂 We're in Sonoma! This town has a tiny train called TrainTown where you can ride a mini railroad through tunnels and over bridges. Would you like to ride a tiny train?

Now tell the kids about ${placeName}:`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
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
 * Verify a fact using Claude's self-assessment
 */
async function verifyFact(apiKey, funFact, placeName) {
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
