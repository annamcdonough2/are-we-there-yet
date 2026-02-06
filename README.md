# 🚗 Are We There Yet?

A fun web app for kids that tracks road trips and shares interesting facts about places along the way!

---

## What Does This App Do?

1. **Parent enters a destination** - Type in where you're driving to
2. **See your route on a map** - A cute car icon shows where you are
3. **Watch the progress** - Time and distance remaining updates as you drive
4. **Learn fun facts** - The app tells you interesting things about towns you pass through
5. **Listen along** - Facts can be read aloud so kids can hear them!

---

## Quick Start (How to Run the App)

### First Time Setup

1. **Open Terminal** (the command line app on your Mac)

2. **Go to the project folder:**
   ```bash
   cd ~/projects/are-we-there-yet
   ```
   *This tells the computer to look at our project folder*

3. **Create your secret keys file:**
   ```bash
   cp .env.example .env.local
   ```
   *This copies the example file to create your own private file for API keys*

4. **Edit the keys file** with your actual API keys:
   ```bash
   open .env.local
   ```
   *Replace the placeholder text with your real keys from Mapbox and Anthropic*

5. **Start the app:**
   ```bash
   npm run dev
   ```
   *This starts a local web server so you can test the app*

6. **Open in browser:** Go to http://localhost:5173

### After First Time

Just run these two commands:
```bash
cd ~/projects/are-we-there-yet
npm run dev
```

---

## Getting Your API Keys

### Mapbox (for the map)

1. Go to https://mapbox.com and create a free account
2. Click "Create a token" in your dashboard
3. Name it something like "are-we-there-yet"
4. Copy the token (starts with `pk.`)
5. Paste it in your `.env.local` file

**Plain English:** Mapbox gives us a beautiful map to display. The token is like a library card - it identifies you so Mapbox knows you're allowed to use their maps.

### Anthropic / Claude (for fun facts)

1. Go to https://console.anthropic.com and create an account
2. Go to API Keys section
3. Click "Create Key"
4. Copy the key (starts with `sk-ant-`)
5. Paste it in your `.env.local` file

**Plain English:** This is what lets us ask Claude AI to create fun facts about places. The key is like a password that proves we're allowed to use the service.

---

## Project Structure (What's in Each Folder)

```
are-we-there-yet/
├── src/                    # Where all our code lives
│   ├── App.jsx             # The main "control center" of the app
│   ├── index.css           # Styles (colors, fonts, etc.)
│   ├── main.jsx            # Starting point - loads the app
│   ├── components/         # Reusable building blocks
│   │   ├── Map.jsx         # Shows the map
│   │   ├── DestinationInput.jsx  # Where you type the address
│   │   ├── ProgressPanel.jsx     # Shows time/distance left
│   │   ├── FunFactCard.jsx       # Displays fun facts
│   │   └── CarMarker.jsx         # The cute car on the map
│   ├── hooks/              # Reusable logic
│   │   ├── useGeolocation.js     # Gets your GPS location
│   │   ├── useRoute.js           # Calculates the route
│   │   └── useFunFacts.js        # Gets fun facts from Claude
│   ├── services/           # Code that talks to external services
│   │   ├── mapbox.js       # Talks to Mapbox
│   │   ├── claude.js       # Talks to Claude AI
│   │   └── speech.js       # Text-to-speech
│   └── utils/              # Helper functions
│       └── distance.js     # Math for distances/times
├── public/                 # Static files (images, etc.)
├── api/                    # Server-side code (for security)
│   └── fun-fact.js         # Safely calls Claude API
├── .env.local              # Your secret API keys (never share!)
├── .env.example            # Template showing what keys you need
└── package.json            # List of dependencies
```

**Plain English:** Think of `src/` as the kitchen where we cook. `components/` are our ingredients (reusable pieces). `hooks/` are our recipes (how to do specific tasks). `services/` are our delivery apps (how we get things from outside).

---

## Build Progress Checklist

Check off each phase as we complete it:

### Phase 1: Project Setup ✅
- [x] Create project with Vite + React
- [x] Install dependencies
- [x] Configure Tailwind CSS
- [x] Set up environment variables
- [x] Create basic App.jsx shell
- [x] Create this README

### Phase 2: Map Display
- [ ] Create Map.jsx component
- [ ] Display map centered on user
- [ ] Add cute car marker
- [ ] Test map renders correctly

### Phase 3: Destination & Routing
- [ ] Create DestinationInput with autocomplete
- [ ] Integrate Mapbox Geocoding (address → coordinates)
- [ ] Integrate Mapbox Directions (calculate route)
- [ ] Draw route line on map
- [ ] Show initial time/distance

### Phase 4: Live Tracking
- [ ] Create useGeolocation hook
- [ ] Update car position in real-time
- [ ] Create ProgressPanel
- [ ] Update time/distance as you move
- [ ] Add kid-friendly progress bar

### Phase 5: Fun Facts
- [ ] Create server-side API route
- [ ] Connect to Claude API
- [ ] Detect when entering new area
- [ ] Display fun facts
- [ ] Add animations

### Phase 6: Text-to-Speech
- [ ] Create speech service
- [ ] Add "Read Aloud" button
- [ ] Optional: auto-read new facts

### Phase 7: Polish & Deploy
- [ ] Kid-friendly colors and animations
- [ ] Mobile-friendly layout
- [ ] Error handling (GPS denied, offline, etc.)
- [ ] Deploy to Vercel
- [ ] Set up domain restrictions on API keys

---

## Common Commands

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Starts the app locally for testing |
| `npm run build` | Creates a production version of the app |
| `npm run preview` | Preview the production build locally |

---

## Troubleshooting

### "Map doesn't show"
- Check that your Mapbox token is in `.env.local`
- Make sure the token starts with `pk.`
- Try refreshing the page

### "Can't get location"
- Make sure you clicked "Allow" when the browser asked for location
- Some browsers block location on non-HTTPS sites (fine for localhost)
- Check if Location Services is enabled in System Settings

### "Fun facts not working"
- Check that your Anthropic key is in `.env.local`
- Make sure the key starts with `sk-ant-`
- Check the browser console for error messages

### "npm install fails"
If you see permission errors, try:
```bash
npm install --cache /tmp/npm-cache
```

---

## Security Reminders

- ✅ `.env.local` is in `.gitignore` - your keys won't be uploaded
- ✅ Never share your `.env.local` file with anyone
- ✅ The Claude API key goes through a server, not the browser
- ✅ Set spending limits in Mapbox and Anthropic dashboards

---

## Questions?

If you get stuck, just ask! Claude Code can help explain any part of the code or fix issues that come up.

Happy road tripping! 🚗💨
