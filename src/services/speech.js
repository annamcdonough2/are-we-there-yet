/**
 * speech.js - Text-to-speech using the Web Speech API
 *
 * WHAT THIS FILE DOES:
 * Reads text aloud using your device's built-in voice.
 * No API key needed - this is built into all modern browsers!
 *
 * HOW IT WORKS (Plain English):
 * 1. We create a "speech utterance" (the text to speak)
 * 2. We set the voice, speed, and pitch
 * 3. The browser's speech engine reads it aloud
 *
 * BROWSER SUPPORT:
 * Works in Chrome, Safari, Firefox, and Edge.
 * On phones/tablets, uses the device's voice (like Siri or Google Assistant).
 */

/**
 * Check if text-to-speech is supported
 * @returns {boolean}
 */
export function isSpeechSupported() {
  return 'speechSynthesis' in window
}

/**
 * Speak text aloud
 *
 * @param {string} text - The text to read
 * @param {Object} options - Optional settings
 * @param {number} options.rate - Speed (0.5 = slow, 1 = normal, 2 = fast)
 * @param {number} options.pitch - Pitch (0.5 = low, 1 = normal, 2 = high)
 * @returns {Promise} - Resolves when done speaking
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    // Check if speech is supported
    if (!isSpeechSupported()) {
      reject(new Error('Text-to-speech is not supported in this browser'))
      return
    }

    // Stop any current speech
    window.speechSynthesis.cancel()

    // Create the speech utterance
    const utterance = new SpeechSynthesisUtterance(text)

    // Configure the voice settings
    utterance.rate = options.rate || 0.9      // Slightly slower for kids
    utterance.pitch = options.pitch || 1.1    // Slightly higher, friendlier
    utterance.volume = options.volume || 1    // Full volume

    // Try to find a friendly-sounding voice
    const voices = window.speechSynthesis.getVoices()

    // Priority order: Female Enhanced/Neural voices first
    const preferredVoices = [
      // macOS Enhanced female voices (sound very natural)
      'Samantha (Enhanced)',
      'Karen (Enhanced)',

      // Windows 11 Neural female voices (very natural)
      'Microsoft Aria',
      'Microsoft Jenny',

      // macOS standard female voices
      'Samantha',
      'Karen',
      'Victoria',

      // Windows standard female voice
      'Microsoft Zira',

      // Chrome fallback
      'Google US English',
    ]

    // Find the first available preferred voice
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred))
      if (voice) {
        utterance.voice = voice
        break
      }
    }

    // Event handlers
    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(event.error)

    // Start speaking!
    window.speechSynthesis.speak(utterance)
  })
}

/**
 * Stop speaking immediately
 */
export function stopSpeaking() {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel()
  }
}

/**
 * Check if currently speaking
 * @returns {boolean}
 */
export function isSpeaking() {
  if (!isSpeechSupported()) return false
  return window.speechSynthesis.speaking
}

/**
 * Load voices (some browsers need this)
 * Call this early so voices are ready
 */
export function loadVoices() {
  if (!isSpeechSupported()) return

  // Some browsers load voices asynchronously
  window.speechSynthesis.getVoices()

  // Chrome needs this event listener
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices()
    }
  }
}
