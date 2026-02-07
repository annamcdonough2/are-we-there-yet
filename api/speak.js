/**
 * speak.js - Vercel Serverless Function for OpenAI Text-to-Speech
 *
 * WHAT THIS FILE DOES:
 * Converts text to speech using OpenAI's TTS API.
 * Keeps the API key server-side for security.
 *
 * COST:
 * - tts-1 model: $0.015 per 1,000 characters
 * - ~$0.01 per 30-min trip, ~$0.04 per 2-hour trip
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get the text to speak from the request
  const { text, voice = 'nova' } = req.body

  if (!text) {
    return res.status(400).json({ error: 'text is required' })
  }

  // Validate voice option
  const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  const selectedVoice = validVoices.includes(voice) ? voice : 'nova'

  // Get the API key from environment (server-side only)
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('OPENAI_API_KEY not set in environment')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: selectedVoice,
        response_format: 'mp3'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI TTS API error:', errorData)
      return res.status(response.status).json({
        error: errorData.error?.message || 'Failed to generate speech'
      })
    }

    // Get the audio as a buffer
    const audioBuffer = await response.arrayBuffer()

    // Set headers for MP3 audio
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.byteLength)

    // Send the audio data
    return res.send(Buffer.from(audioBuffer))

  } catch (error) {
    console.error('Error calling OpenAI TTS API:', error)
    return res.status(500).json({ error: 'Failed to generate speech' })
  }
}
