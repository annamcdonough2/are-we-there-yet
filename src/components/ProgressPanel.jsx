/**
 * ProgressPanel.jsx - Shows time, distance, and progress
 *
 * WHAT THIS FILE DOES:
 * Displays a floating panel that shows:
 * - How long until arrival (e.g., "45 min")
 * - How far to go (e.g., "32.5 mi")
 * - A progress bar showing how far you've come
 *
 * PLAIN ENGLISH:
 * This is the panel that answers "are we there yet?" with actual numbers!
 * The progress bar fills up as you get closer to your destination.
 * It's like a visual countdown that kids can understand.
 *
 * AUTO-ANNOUNCEMENTS:
 * Every 15 minutes, it reads the progress aloud so kids know how close they are!
 */

import { useEffect } from 'react'
import { formatDuration, formatDistance } from '../services/mapbox'
import { speak, isSpeechSupported } from '../services/speech'

// How often to announce progress (15 minutes in milliseconds)
const PROGRESS_ANNOUNCEMENT_INTERVAL = 15 * 60 * 1000

function ProgressPanel({ route }) {
  // ============================================================
  // EFFECT: Announce progress every 15 minutes
  // ============================================================

  useEffect(() => {
    if (!route || !isSpeechSupported()) return

    const intervalId = setInterval(() => {
      // Build the progress announcement
      const progress = Math.round(route.progress || 0)
      const timeLeft = route.durationMinutes
      const milesLeft = route.distanceMiles

      // Format time in a kid-friendly way
      let timeText
      if (timeLeft < 60) {
        timeText = `${timeLeft} minutes`
      } else {
        const hours = Math.floor(timeLeft / 60)
        const mins = timeLeft % 60
        if (mins === 0) {
          timeText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`
        } else {
          timeText = `${hours} ${hours === 1 ? 'hour' : 'hours'} and ${mins} minutes`
        }
      }

      // Build the announcement
      let announcement
      if (progress < 25) {
        announcement = `We're ${progress}% of the way there! Still ${milesLeft} miles and about ${timeText} to go. The adventure is just beginning!`
      } else if (progress < 50) {
        announcement = `Great progress! We're ${progress}% there. Only ${milesLeft} miles and ${timeText} left!`
      } else if (progress < 75) {
        announcement = `We're over halfway there! ${progress}% complete with ${milesLeft} miles and ${timeText} to go!`
      } else if (progress < 95) {
        announcement = `Almost there! We're ${progress}% of the way. Just ${milesLeft} miles and ${timeText} left!`
      } else {
        announcement = `So close! We're ${progress}% there. Only ${milesLeft} miles to go!`
      }

      // Speak the announcement
      speak(announcement).catch(err => console.error('Progress announcement error:', err))

    }, PROGRESS_ANNOUNCEMENT_INTERVAL)

    return () => clearInterval(intervalId)
  }, [route])

  // If there's no route yet, don't show anything
  if (!route) return null

  // Calculate progress percentage (0 to 100)
  // progress comes from the Map component
  const progress = route.progress || 0

  return (
    <div className="w-full">
      {/* Stats row: Time and Distance - centered in each half, matching progress bar margins */}
      <div className="flex items-center mb-2" style={{ marginLeft: '10%', marginRight: '10%' }}>
        {/* Time remaining - centered in left half */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl">⏱️</span>
          <div className="text-lg sm:text-xl font-bold text-gray-800">
            {formatDuration(route.durationMinutes)}
          </div>
          <div className="text-xs text-gray-500">Time left</div>
        </div>

        {/* Divider line */}
        <div className="h-12 w-0.5 bg-gray-200 rounded-full" />

        {/* Distance remaining - centered in right half */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl">📍</span>
          <div className="text-lg sm:text-xl font-bold text-gray-800">
            {formatDistance(route.distanceMiles)}
          </div>
          <div className="text-xs text-gray-500">To go</div>
        </div>
      </div>

      {/* Progress bar - compact with 10% margins */}
      <div className="relative" style={{ marginLeft: '10%', marginRight: '10%' }}>
        {/* Background track */}
        <div className="h-4 bg-gray-100 rounded-full overflow-visible border border-gray-200">
          {/* Filled portion - gradient for fun */}
          <div
            className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>

        {/* Car emoji that moves along the bar - flipped to face right! */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ left: `calc(${Math.min(progress, 92)}%)` }}
        >
          <span className="text-4xl inline-block" style={{ transform: 'scaleX(-1)' }}>🚗</span>
        </div>

        {/* Finish flag at end */}
        <div className="absolute top-1/2 -translate-y-1/2 -right-1">
          <span className="text-3xl">🏁</span>
        </div>
      </div>

      {/* Progress percentage and message - single line */}
      <div className="text-center mt-2 flex items-center justify-center gap-2">
        <span className="text-2xl">
          {progress < 25 && '🚀'}
          {progress >= 25 && progress < 50 && '⭐'}
          {progress >= 50 && progress < 75 && '🎉'}
          {progress >= 75 && progress < 95 && '🌟'}
          {progress >= 95 && '🏁'}
        </span>
        <span className="text-sm font-semibold text-gray-600">
          {Math.round(progress)}% complete
        </span>
      </div>
    </div>
  )
}

export default ProgressPanel
