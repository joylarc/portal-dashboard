// Portal Dashboard Configuration
// Edit these settings to customize your dashboard

const CONFIG = {

  // ── Photos ──────────────────────────────────────────────
  // Option 1: List image filenames placed in the photos/ folder
  // Option 2: Use full URLs to images hosted anywhere
  photos: [
    // "photos/vacation1.jpg",
    // "photos/family.jpg",
    // "https://example.com/photo.jpg",
  ],

  // How long each photo displays (in seconds)
  photoInterval: 30,

  // Crossfade duration (in seconds)
  photoFadeDuration: 1.5,

  // ── Google Calendar ─────────────────────────────────────
  // To get your embed URL:
  // 1. Go to Google Calendar → Settings → Settings for my calendars
  // 2. Click your calendar → "Integrate calendar"
  // 3. Copy the "Embed code" URL (the src="" part of the iframe)
  // 4. Paste it below
  googleCalendarUrl: "",

  // ── MTA Configuration ───────────────────────────────────
  // Your Cloudflare Worker URL for MTA data (see README for setup)
  mtaProxyUrl: "",

  // Stations to display (pre-configured for your stops)
  mtaStations: [
    {
      name: "Fulton St",
      lines: ["A", "C", "2", "3"],
      gtfsStopIds: {
        "A": ["A38"],   // Fulton St on A/C/E
        "C": ["A38"],
        "2": ["230"],   // Fulton St on 1/2/3
        "3": ["230"],
      }
    },
    {
      name: "Brooklyn Bridge–City Hall",
      lines: ["4", "5", "6"],
      gtfsStopIds: {
        "4": ["416"],
        "5": ["416"],
        "6": ["416"],
      }
    },
    {
      name: "World Trade Center",
      lines: ["E"],
      gtfsStopIds: {
        "E": ["A36"],
      }
    },
    {
      name: "City Hall",
      lines: ["R"],
      gtfsStopIds: {
        "R": ["R25"],
      }
    }
  ],

  // How often to refresh MTA data (in seconds)
  mtaRefreshInterval: 30,

  // ── Recipes ────────────────────────────────────────────
  // Google Apps Script URL that serves recipe list from your Drive folder
  recipesApiUrl: "https://script.google.com/macros/s/AKfycbyRpdDYRi09ZCYGxEYsowvVWP2UIhJ2whyAda_km4_u8ziJ9weR4PWpL4X5nYOIkEH2/exec",

  // ── Firebase (for iPhone remote control) ────────────────
  // Paste your Firebase config here after creating a project at
  // https://console.firebase.google.com
  firebase: {
    apiKey: "AIzaSyD1cTCOOgek0WnwczijfhEx_N3DpKvDeNY",
    authDomain: "portal-4e3e3.firebaseapp.com",
    databaseURL: "https://portal-4e3e3-default-rtdb.firebaseio.com",
    projectId: "portal-4e3e3",
    storageBucket: "portal-4e3e3.firebasestorage.app",
    messagingSenderId: "878737677803",
    appId: "1:878737677803:web:d844cb2e865b35863b0dae",
  },

  // ── Display ─────────────────────────────────────────────
  // Use 24-hour clock format
  use24HourClock: false,

  // Show seconds on clock
  showSeconds: true,
};
