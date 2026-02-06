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
 */

import { formatDuration, formatDistance } from '../services/mapbox'

function ProgressPanel({ route }) {
  // If there's no route yet, don't show anything
  if (!route) return null

  // Calculate progress percentage (0 to 100)
  // progress comes from the Map component
  const progress = route.progress || 0

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 min-w-[300px]">
      {/* Stats row: Time and Distance */}
      <div className="flex items-center justify-around mb-4">
        {/* Time remaining */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {formatDuration(route.durationMinutes)}
            </div>
            <div className="text-xs text-gray-500 uppercase">
              Time left
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-12 w-px bg-gray-200" />

        {/* Distance remaining */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">📍</span>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {formatDistance(route.distanceMiles)}
            </div>
            <div className="text-xs text-gray-500 uppercase">
              To go
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          {/* Filled portion */}
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Car emoji that moves along the bar */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
          style={{ left: `calc(${progress}% - 12px)` }}
        >
          <span className="text-xl">🚗</span>
        </div>

        {/* Start and end markers */}
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Start</span>
          <span>{Math.round(progress)}% complete</span>
          <span>🏁</span>
        </div>
      </div>

      {/* Encouraging message based on progress */}
      <div className="mt-3 text-center text-sm">
        {progress < 25 && (
          <span className="text-blue-600">🚀 Adventure starting!</span>
        )}
        {progress >= 25 && progress < 50 && (
          <span className="text-blue-600">⭐ Making great progress!</span>
        )}
        {progress >= 50 && progress < 75 && (
          <span className="text-purple-600">🎉 More than halfway there!</span>
        )}
        {progress >= 75 && progress < 95 && (
          <span className="text-green-600">🌟 Almost there!</span>
        )}
        {progress >= 95 && (
          <span className="text-green-600 font-bold">🏁 You made it!</span>
        )}
      </div>
    </div>
  )
}

export default ProgressPanel
