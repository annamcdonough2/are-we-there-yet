/**
 * generate-fact.js - Vercel Serverless Function
 *
 * WHAT THIS FILE DOES:
 * Generates a fun fact without verification (internal helper).
 * The main /api/fun-fact endpoint uses this + verification.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { placeName, isDestination } = req.body

  if (!placeName) {
    return res.status(400).json({ error: 'placeName is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in environment')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const prompt = isDestination
    ? `You are a fun, friendly guide for kids on a road trip. Tell them about ${placeName}, their destination, with an exciting fun fact!

Rules:
- This is for 6-year-old children. ONLY share kid-safe, age-appropriate facts
- NEVER mention alcoholic beverages (wine, beer, etc.), drugs, or anything explicit
- NEVER mention income inequality, wealth, home prices, or "rich/poor" areas
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
- NEVER mention income inequality, wealth, home prices, or "rich/poor" areas
- Only share facts you are confident are true. Do not make up or guess information
- Focus on topics like: animals, nature, sports, history, food (kid-friendly), buildings, parks, fun records
- Start with "You're in [city name]!" or "We're in [city name]!" (just the city, not full address)
- Then share ONE interesting fact about the place
- End with an engaging question for the kids when possible
- Keep it to 2-3 short sentences total
- Use simple words a 6-year-old would understand
- Include a relevant emoji at the start

Now tell the kids about ${placeName}:`

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
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Claude API error:', errorData)
      return res.status(response.status).json({
        error: errorData.error?.message || 'Failed to generate fact'
      })
    }

    const data = await response.json()
    const funFact = data.content[0].text.trim()

    return res.status(200).json({ funFact })

  } catch (error) {
    console.error('Error calling Claude API:', error)
    return res.status(500).json({ error: 'Failed to generate fact' })
  }
}
