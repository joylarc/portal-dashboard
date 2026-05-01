# Portal Dashboard

A custom smart display dashboard for a Meta Portal device, controlled from an iPhone. The Portal's built-in browser loads a full-screen web page with widgets and apps — all controllable via a phone-based remote.

## Live URLs

- **Dashboard (Portal):** https://joylarc.github.io/portal-dashboard/
- **Remote (iPhone):** https://joylarc.github.io/portal-dashboard/remote.html

## Architecture

```
iPhone Remote ──> Firebase Realtime DB ──> Portal Dashboard
                         ^                       |
                    (commands,                   v
                     alarms,              Cloudflare Workers
                     notes,               (MTA feeds, Photos)
                     todos,                      |
                     timers,              Google Apps Script
                     pomodoro)            (recipes from Drive)
```

The system has six components:

### 1. Dashboard (`index.html`, `js/dashboard.js`, `css/style.css`)

Static web page hosted on GitHub Pages. This is what the Portal displays. It renders a 2x2 widget grid and listens for remote commands via Firebase.

- `index.html` — widget layout, overlays for weather/todos/timer/pomodoro/YouTube/recipes/notes/calendar/alarm/sleep
- `js/dashboard.js` — clock updates, photo slideshow, MTA rendering, widget fullscreen toggle, browser fullscreen button, keep-awake video
- `js/firebase-listener.js` — listens for commands from Firebase and acts on them (switch widgets, open apps, play YouTube, manage timers, etc.)
- `css/style.css` — all styling, responsive grid, MTA line colors, overlays, app drawer
- `config.js` — all configuration: Firebase credentials, worker URLs, recipes API URL, display preferences

**2x2 Grid Layout:**
| Clock | Photos |
|-------|--------|
| MTA   | Apps   |

### 2. Remote Control (`remote.html`)

iPhone-optimized web page, also hosted on GitHub Pages. Sends commands to Firebase, which the dashboard picks up in real time.

**Sections on the remote:**
- **Display** — switch Portal to show any single widget fullscreen, or show all four
- **To-Do** — add tasks with category/priority/sub-tasks, check off, delete, show on Portal
- **Notes** — type text/bullets, pick a color, show/hide on Portal
- **Alarm** — set/delete alarms with a time picker
- **Timer** — set countdown timers with labels, show on Portal, clear all
- **Pomodoro** — set focus/break durations, start/stop, shows split view with to-do list
- **YouTube** — paste a video, Shorts, or playlist URL to play on Portal; stop button
- **Recipes** — tappable list of recipes from Google Drive folder
- **Actions** — refresh, sleep, wake

### 3. Firebase Realtime Database

Free-tier Firebase project (`portal-4e3e3`) that acts as the communication bridge between the remote and the dashboard. No backend server needed.

**Database paths:**
- `portal/command` — latest command from the remote
- `portal/alarms` — list of set alarms with hour, minute, fired status
- `portal/notes` — current notes text, rendered HTML, color, visibility
- `portal/todos` — tasks with category, priority, sub-tasks, completion status
- `portal/timers` — active countdown timers with end times
- `portal/pomodoro` — pomodoro state (phase, durations, cycle count)

**Security rules** (set in Firebase Console > Realtime Database > Rules):
```json
{
  "rules": {
    "portal": {
      "command": { ".read": true, ".write": true },
      "alarms": { ".read": true, ".write": true },
      "notes": { ".read": true, ".write": true },
      "todos": { ".read": true, ".write": true },
      "timers": { ".read": true, ".write": true },
      "pomodoro": { ".read": true, ".write": true }
    }
  }
}
```

**Console:** https://console.firebase.google.com/project/portal-4e3e3

### 4. Cloudflare Worker — MTA (`portal-mta`)

Fetches MTA subway GTFS-RT protobuf feeds, decodes them with a hand-written protobuf decoder, filters for specific stations, and returns JSON with CORS headers. The dashboard fetches this every 30 seconds.

**Worker URL:** https://portal-mta.joy-arcangeli.workers.dev/

**Source code:** `/Users/joyarcangeli/portal-mta-worker/src/worker-standalone.js`

**To edit/redeploy:** Cloudflare dashboard > Workers & Pages > `portal-mta` > Edit code > paste the file > Deploy.

**Station stop IDs configured in the worker:**
| Station | Lines | GTFS Stop ID |
|---------|-------|-------------|
| Fulton St A/C | A, C | A38 |
| Fulton St 2/3 | 2, 3 | 230 |
| Brooklyn Bridge–City Hall | 4, 5 | 416 |
| Brooklyn Bridge–City Hall | 6 | 640 |
| World Trade Center | E | E01 |
| City Hall | R | R25 |

### 5. Cloudflare Worker — Photos (`portal-photos`)

Scrapes a shared Google Photos album page and returns image URLs as JSON. Caches for 1 hour.

**Worker URL:** https://portal-photos.joy-arcangeli.workers.dev/

**Source code:** `/Users/joyarcangeli/portal-mta-worker/src/photos-worker.js`

**Google Photos album:** https://photos.app.goo.gl/akPux763DwdCCWD2A

To update the slideshow, add or remove photos from the Google Photos album on your phone. Changes appear within 1 hour (or immediately on Portal refresh).

### 6. Google Apps Script (recipes)

Reads a Google Drive folder of recipe docs and serves them as HTML. Two modes:
- No parameters: returns JSON list of recipe names and IDs
- `?id=DOC_ID`: returns the doc content rendered as HTML (avoids Google sign-in on Portal)

**Source code:** `apps-script-recipe.js` (reference copy in this repo)

**To edit/redeploy:** https://script.google.com > Portal Recipes project > edit code > Deploy > Manage deployments > new version.

**Drive folder:** `140_C-CywfVmqY3z8MMT8IAk0hIvR9NW8` — any Google Doc added to this folder automatically appears in the recipe list.

---

## File Structure

```
portal-dashboard/
  index.html              # Dashboard page (Portal displays this)
  remote.html             # Remote control page (iPhone)
  config.js               # All configuration
  css/
    style.css             # All styles
  js/
    dashboard.js          # Widget logic (clock, MTA, photos, keep-awake)
    firebase-listener.js  # Receives commands, manages all app overlays
  photos/                 # (unused — photos come from Google Photos worker)
  apps-script-recipe.js   # Reference copy of the Google Apps Script
  .github/
    workflows/            # GitHub Pages deployment
```

---

## How to Edit Existing Features

### Clock
- **Hide/show greeting:** `css/style.css` — `.clock-greeting` has `display: none`
- **Font sizes (fullscreen):** `css/style.css` — `.widget.fullscreen .clock-time` and `.widget.fullscreen .clock-date`
- **12/24 hour format:** `config.js` — `use24HourClock`
- **Show/hide seconds:** `config.js` — `showSeconds`

### MTA Departures
- **Add/remove stations:** Edit `STATIONS` in the Cloudflare Worker, update `mtaStations` in `config.js`. GTFS stop IDs: https://data.ny.gov/Transportation/MTA-Subway-Stations/39hk-dx4f
- **Refresh interval:** `config.js` — `mtaRefreshInterval` (seconds)
- **Font sizes:** `css/style.css` — `.mta-station-name`, `.mta-dep-row`, `.mta-col-header`
- **Line badge colors:** `css/style.css` — `.mta-line-badge.line-X`

### Photos
- **Change album:** Update the `ALBUM_URL` in the photos Cloudflare Worker and redeploy
- **Slide duration:** `config.js` — `photoInterval` (seconds)
- **Transition speed:** `config.js` — `photoFadeDuration` (seconds)

### App Drawer
- **Add/remove icons:** `index.html` — `.apps-grid` section
- **Icon layout:** `css/style.css` — `.apps-grid` (currently 3 columns)

### Weather
- **Change location:** `js/firebase-listener.js` — `showWeather()` function, change `lat` and `lon`
- **Display styling:** `css/style.css` — `.weather-*` classes

### To-Do List
- **Categories:** Add/remove in both `remote.html` (select options + CSS) and `firebase-listener.js` (`catOrder` array + CSS classes)
- **Portal display:** `css/style.css` — `.todo-item`, `.todo-subtask-portal`. Two-column via `.todos-columns`
- **Priority colors:** `css/style.css` — `.todo-priority-high`, `.todo-priority-medium`

### Timer
- **Alarm sound:** `js/firebase-listener.js` — `playTimerAlarm()` function
- **Display styling:** `css/style.css` — `.timer-countdown`, `.timer-entry`

### Pomodoro
- **Default durations:** `remote.html` — input default values (25/5)
- **Chime sounds:** `js/firebase-listener.js` — `playPomodoroChime()` function
- **Split view layout:** `css/style.css` — `.pomodoro-split`, `.pomodoro-todos`

### Calendar
- **Connect calendar:** `config.js` — paste Google Calendar embed URL as `googleCalendarUrl`
- **Get the URL:** Google Calendar > Settings > your calendar > Integrate calendar > copy iframe src URL

### Notes
- **Colors:** `css/style.css` — `.notes-display .color-X` classes. Add new by adding CSS class + swatch in `remote.html`
- **Text parsing:** `remote.html` — `textToHtml()` (lines starting with `-` or `*` become bullets)

### YouTube
- **Supported formats:** `remote.html` — parser handles `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `?list=` playlists

### Recipes
- **Add recipes:** Add a Google Doc to the Drive folder. Appears automatically.
- **Change folder:** Update `folderId` in the Apps Script and redeploy

### Alarm
- **Sound:** `js/firebase-listener.js` — `playAlarmTone()`. Adjust `gain.gain.value` for volume, `osc.frequency.value` for pitch
- **Visual:** `css/style.css` — `.alarm-overlay`, `@keyframes alarm-pulse`

---

## How to Add a New Widget/App

### Step 1: Add overlay to the dashboard

In `index.html`, add a new overlay div with a back button:
```html
<div id="myapp-overlay" class="myapp-overlay hidden">
  <button class="overlay-back-btn" data-close="myapp-overlay">&larr; Back</button>
  <div id="myapp-content"></div>
</div>
```

### Step 2: Style it

In `css/style.css`:
```css
.myapp-overlay {
  position: fixed; inset: 0; z-index: 150;
  background: var(--bg-primary);
}
.myapp-overlay.hidden { display: none; }
```

### Step 3: Add icon to app drawer

In `index.html`, add a button inside `.apps-grid`:
```html
<button class="app-icon" data-app="myapp">
  <svg>...</svg>
  <span>My App</span>
</button>
```

### Step 4: Handle commands in Firebase listener

In `js/firebase-listener.js`:
1. Add cases in `handleCommand()` for `show-myapp` / `hide-myapp`
2. Add show/hide functions
3. Add `hideMyApp()` to the `wake` case
4. Add app drawer handler: `case "myapp": showMyApp(); break;`

### Step 5: Add controls to the remote

In `remote.html`:
1. Add HTML section with buttons/inputs
2. Add CSS
3. Add JS that calls `sendCommand({ action: "show-myapp", ... })`

### Step 6: Update Firebase rules

If the new app stores data, add a path in Firebase Console rules:
```json
"myapp": { ".read": true, ".write": true }
```

---

## How to Edit the Dashboard Overall

### Layout
- **Grid:** `css/style.css` — `.dashboard` (2x2 grid)
- **Gap:** CSS variable `--gap` in `:root`

### Theme
- **Colors:** CSS variables in `:root` (`--bg-primary`, `--bg-widget`, `--text-primary`, `--accent`, etc.)
- **Font:** `index.html` — Google Fonts link; `css/style.css` — `font-family`

### UI Buttons
- All overlay back buttons and widget fullscreen buttons auto-hide on touch devices
- Appear on any tap, fade after 3 seconds
- Positioned top-right corner

### Keep-Awake
- Hidden silent video loop in `dashboard.js` — `enableKeepAwake()` function
- Starts on first user tap (fullscreen button or any touch)

### Deployment
- Push to `main` triggers GitHub Actions deploy to GitHub Pages
- Takes 1-2 minutes to go live
- Portal may cache — use Refresh button on remote

---

## Technical Notes

- **No build tools.** Vanilla HTML/CSS/JS.
- **Firebase compat SDK.** Uses v9 compat loaded via `<script>` tags, not ES modules. Portal's old Android browser doesn't support modules.
- **`const` and `window`.** `const` declarations aren't on `window`. Use `typeof CONFIG === "undefined"`.
- **Protobuf decoding.** MTA Worker includes hand-written decoder — no npm dependencies.
- **Google Docs on Portal.** Can't use `/pub` URLs (requires cookies). Apps Script renders HTML directly.
- **Keep-awake.** Silent looping video (NoSleep.js technique) prevents Portal screen sleep.
- **Refresh loop prevention.** `lastTimestamp = Date.now()` ignores commands from before page load.
