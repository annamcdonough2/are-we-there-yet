/**
 * speech.js - Text-to-speech using OpenAI TTS API
 *
 * WHAT THIS FILE DOES:
 * Reads text aloud using OpenAI's natural-sounding voices.
 * Audio is generated server-side to keep the API key secure.
 *
 * HOW IT WORKS:
 * 1. Send text to our /api/speak endpoint
 * 2. Server calls OpenAI TTS and returns MP3 audio
 * 3. Play the audio using HTML5 Audio element
 *
 * AVAILABLE VOICES:
 * - nova (default) - Friendly female voice
 * - alloy - Neutral
 * - echo - Male
 * - fable - British accent
 * - onyx - Deep male
 * - shimmer - Soft female
 */

// Persistent audio element - reused for all playback
// Once "unlocked" by a user gesture, it stays unlocked for the session
// This is critical for mobile Safari support
let persistentAudio = null

// Current blob URL (for cleanup)
let currentBlobUrl = null

// Queue for managing speech requests
let speechQueue = []
let isProcessingQueue = false

/**
 * Get or create the persistent audio element
 * Reusing the same element keeps it "unlocked" on mobile Safari
 */
function getPersistentAudio() {
  if (!persistentAudio) {
    persistentAudio = new Audio()
    // Set attributes that help with mobile playback
    persistentAudio.setAttribute('playsinline', 'true')
    persistentAudio.setAttribute('webkit-playsinline', 'true')
  }
  return persistentAudio
}

/**
 * Check if text-to-speech is supported
 * Always true since we use OpenAI API (with Web Speech fallback)
 * @returns {boolean}
 */
export function isSpeechSupported() {
  return true
}

/**
 * Speak text aloud using OpenAI TTS
 *
 * @param {string} text - The text to read
 * @param {Object} options - Optional settings
 * @param {string} options.voice - Voice to use (nova, alloy, echo, fable, onyx, shimmer)
 * @returns {Promise} - Resolves when done speaking
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    // Add to queue and process
    speechQueue.push({ text, options, resolve, reject })
    processQueue()
  })
}

/**
 * Process the speech queue one at a time
 */
async function processQueue() {
  if (isProcessingQueue || speechQueue.length === 0) {
    return
  }

  isProcessingQueue = true

  // Stop any currently playing audio on the persistent element
  const audio = getPersistentAudio()
  if (!audio.paused) {
    audio.pause()
  }

  // Get next item from queue (and clear any older items)
  // We only want to speak the most recent request
  const item = speechQueue[speechQueue.length - 1]

  // Reject any skipped items
  for (let i = 0; i < speechQueue.length - 1; i++) {
    speechQueue[i].resolve() // Resolve silently (don't reject - not an error)
  }
  speechQueue = []

  const { text, options, resolve, reject } = item

  try {
    await fetchAndPlayAudio(text, options)

    audio.onended = () => {
      isProcessingQueue = false
      resolve()
      processQueue() // Process next in queue if any
    }

    audio.onerror = (error) => {
      isProcessingQueue = false
      console.error('Audio playback error:', error)
      // Fall back to Web Speech API
      fallbackToWebSpeech(text, options).then(resolve).catch(reject)
    }

  } catch (error) {
    console.error('OpenAI TTS error, falling back to Web Speech:', error)
    isProcessingQueue = false
    // Fall back to Web Speech API
    fallbackToWebSpeech(text, options).then(resolve).catch(reject)
  }
}

/**
 * Fetch audio from OpenAI TTS API and play it
 */
async function fetchAndPlayAudio(text, options = {}) {
  const voice = options.voice || 'nova'

  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, voice })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to generate speech')
  }

  // Clean up previous blob URL if exists
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }

  // Get audio blob and create URL
  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)
  currentBlobUrl = audioUrl

  // Get the persistent audio element (stays "unlocked" on mobile Safari)
  const audio = getPersistentAudio()

  // Set the new source and play
  audio.src = audioUrl
  await audio.play()

  return audio
}

/**
 * Fallback to Web Speech API if OpenAI TTS fails
 */
function fallbackToWebSpeech(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech is not supported'))
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options.rate || 0.9
    utterance.pitch = options.pitch || 1.1
    utterance.volume = options.volume || 1

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoices = [
      'Samantha (Enhanced)', 'Karen (Enhanced)',
      'Microsoft Aria', 'Microsoft Jenny',
      'Samantha', 'Karen', 'Victoria',
      'Microsoft Zira', 'Google US English'
    ]

    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred))
      if (voice) {
        utterance.voice = voice
        break
      }
    }

    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(event.error)

    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Stop speaking immediately
 */
export function stopSpeaking() {
  // Clear the queue
  speechQueue.forEach(item => item.resolve())
  speechQueue = []
  isProcessingQueue = false

  // Stop persistent audio element
  if (persistentAudio) {
    persistentAudio.pause()
    persistentAudio.currentTime = 0
  }

  // Clean up blob URL
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }

  // Also stop Web Speech API (in case fallback is playing)
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Check if currently speaking
 * @returns {boolean}
 */
export function isSpeaking() {
  if (persistentAudio && !persistentAudio.paused) {
    return true
  }
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    return true
  }
  return false
}

/**
 * Load voices - no longer needed for OpenAI TTS
 * Kept for compatibility
 */
export function loadVoices() {
  // No-op for OpenAI TTS, but load Web Speech voices for fallback
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }
  }
}

/**
 * Check if enhanced voices available - always true with OpenAI
 * Kept for compatibility
 * @returns {boolean}
 */
export function hasEnhancedVoice() {
  return true
}
