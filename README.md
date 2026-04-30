# Portal Dashboard

A custom smart display dashboard for a Meta Portal device, controlled from an iPhone. The Portal's built-in browser loads a full-screen web page with widgets for time, transit, photos, calendar, and more — all controllable via a phone-based remote.

## Live URLs

- **Dashboard (Portal):** https://joylarc.github.io/portal-dashboard/
- **Remote (iPhone):** https://joylarc.github.io/portal-dashboard/remote.html

## Architecture

```
iPhone Remote ──> Firebase Realtime DB ──> Portal Dashboard
                         ^                       |
                         |                       v
                    (commands,              Cloudflare Worker
                     alarms,               (MTA GTFS-RT feeds)
                     notes)                       |
                                            Google Apps Script
                                           (recipe list from Drive)
```

The system has four components:

### 1. Dashboard (`index.html`, `js/dashboard.js`, `css/style.css`)

Static web page hosted on GitHub Pages. This is what the Portal displays. It renders widgets (clock, MTA, photos, calendar) and listens for remote commands via Firebase.

- `index.html` — widget layout, overlays for YouTube/recipes/notes/alarm/sleep
- `js/dashboard.js` — clock updates, photo slideshow, MTA rendering, calendar embed, widget fullscreen toggle, browser fullscreen button
- `js/firebase-listener.js` — listens for commands from Firebase and acts on them (switch widgets, play YouTube, show recipes/notes, alarm, sleep/wake)
- `css/style.css` — all styling, responsive grid, MTA line colors, overlays
- `config.js` — all configuration: Firebase credentials, MTA proxy URL, recipes API URL, photo list, calendar URL, display preferences

### 2. Remote Control (`remote.html`)

iPhone-optimized web page, also hosted on GitHub Pages. Sends commands to Firebase, which the dashboard picks up in real time.

**Sections on the remote:**
- **Display** — switch Portal to show any single widget fullscreen, or show all four
- **Notes** — type text/bullets, pick a color, show/hide on Portal
- **Alarm** — set/delete alarms with a time picker
- **YouTube** — paste a video, Shorts, or playlist URL to play on Portal; stop button
- **Recipes** — tappable list of recipes from Google Drive folder
- **Actions** — refresh, sleep, wake

### 3. Firebase Realtime Database

Free-tier Firebase project (`portal-4e3e3`) that acts as the communication bridge between the remote and the dashboard. No backend server needed.

**Database paths:**
- `portal/command` — latest command from the remote (widget switch, YouTube, refresh, etc.)
- `portal/alarms` — list of set alarms with hour, minute, fired status
- `portal/notes` — current notes text, rendered HTML, color, visibility

**Security rules** (set in Firebase Console > Realtime Database > Rules):
```json
{
  "rules": {
    "portal": {
      "command": { ".read": true, ".write": true },
      "alarms": { ".read": true, ".write": true },
      "notes": { ".read": true, ".write": true }
    }
  }
}
```

**Console:** https://console.firebase.google.com/project/portal-4e3e3

### 4. Cloudflare Worker (`portal-mta`)

Fetches MTA subway GTFS-RT protobuf feeds, decodes them, filters for specific stations, and returns JSON with CORS headers. The dashboard fetches this every 30 seconds.

**Worker URL:** https://portal-mta.joy-arcangeli.workers.dev/

**Source code:** `portal-mta-worker/src/worker-standalone.js` (in separate local directory, not in this repo). Also stored at `/Users/joyarcangeli/portal-mta-worker/`.

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

### 5. Google Apps Script (recipes)

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
    dashboard.js          # Widget logic (clock, MTA, photos, calendar)
    firebase-listener.js  # Receives commands from remote via Firebase
  photos/                 # Drop photo files here for slideshow
  apps-script-recipe.js   # Reference copy of the Google Apps Script
  .github/
    workflows/            # GitHub Pages deployment
```

---

## How to Edit Existing Widgets

### Clock
- **Hide/show greeting:** `css/style.css` — `.clock-greeting` has `display: none` (currently hidden)
- **Font sizes (fullscreen):** `css/style.css` — `.widget.fullscreen .clock-time` and `.widget.fullscreen .clock-date`
- **12/24 hour format:** `config.js` — `use24HourClock: true/false`
- **Show/hide seconds:** `config.js` — `showSeconds: true/false`

### MTA Departures
- **Add/remove stations:** Edit the `STATIONS` object in the Cloudflare Worker (`worker-standalone.js`), and update `mtaStations` in `config.js`. You'll need the GTFS stop ID — find it at https://data.ny.gov/Transportation/MTA-Subway-Stations/39hk-dx4f
- **Change refresh interval:** `config.js` — `mtaRefreshInterval` (in seconds)
- **Font sizes:** `css/style.css` — `.mta-station-name`, `.mta-dep-row`, `.mta-col-header`
- **Layout:** `js/dashboard.js` — `renderMTA()` function builds the two-column Uptown/Downtown layout
- **Line badge colors:** `css/style.css` — `.mta-line-badge.line-X` classes

### Photos
- **Add photos:** Drop image files into `photos/` folder, then list their paths in `config.js` under the `photos` array
- **Slide duration:** `config.js` — `photoInterval` (seconds per photo)
- **Transition speed:** `config.js` — `photoFadeDuration` (seconds)

### Calendar
- **Connect calendar:** `config.js` — paste your Google Calendar embed URL as `googleCalendarUrl`
- **Get the URL:** Google Calendar > Settings > your calendar > Integrate calendar > copy the iframe src URL

### Notes
- **Display styling:** `css/style.css` — `.notes-display` (font size, line height), `.notes-display ul li` (bullet styling)
- **Available colors:** `css/style.css` — `.notes-display .color-X` classes. Add new colors by adding a CSS class and a swatch button in `remote.html`
- **Text parsing:** `remote.html` — `textToHtml()` function converts plain text to HTML (lines starting with `-` or `*` become bullets)

### YouTube
- **Supported URL formats:** `remote.html` — the YouTube parser handles `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, and `?list=` playlists

### Recipes
- **Add recipes:** Add a Google Doc to the Drive folder. It appears automatically on the remote.
- **Change folder:** Update `folderId` in the Apps Script and redeploy
- **Recipe display styling:** Apps Script's `convertDocToHtml()` function controls the HTML/CSS of rendered recipes

### Alarm
- **Sound:** `js/firebase-listener.js` — `playAlarmTone()` function generates the beep tone. Adjust `gain.gain.value` for volume, `osc.frequency.value` for pitch
- **Visual:** `css/style.css` — `.alarm-overlay`, `@keyframes alarm-pulse`

---

## How to Add a New Widget

### Step 1: Add the overlay to the dashboard

In `index.html`, add a new overlay div (like the notes/recipe/YouTube overlays):
```html
<div id="mywidget-overlay" class="mywidget-overlay hidden">
  <div id="mywidget-content"></div>
</div>
```

### Step 2: Style it

In `css/style.css`, add styles for the overlay:
```css
.mywidget-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: var(--bg-primary);
}
.mywidget-overlay.hidden { display: none; }
```

### Step 3: Handle commands in the Firebase listener

In `js/firebase-listener.js`, add a case in `handleCommand()`:
```js
case "show-mywidget":
  showMyWidget(cmd.someData);
  break;
case "hide-mywidget":
  hideMyWidget();
  break;
```

And add the show/hide functions. Also add `hideMyWidget()` to the `wake` case.

### Step 4: Add controls to the remote

In `remote.html`:
1. Add an HTML section with buttons/inputs
2. Add CSS for the new section
3. Add JavaScript that calls `sendCommand({ action: "show-mywidget", someData: value })`

### Step 5: Update Firebase rules

If the new widget stores data in Firebase (like notes/alarms do), add a path in the Firebase Console rules:
```json
"mywidget": { ".read": true, ".write": true }
```

---

## How to Edit the Dashboard Overall

### Layout
- **Grid:** `css/style.css` — `.dashboard` controls the 2x2 grid. Change `grid-template-columns` and `grid-template-rows` to adjust.
- **Portrait mode:** same file, `@media (orientation: portrait)` section
- **Gap between widgets:** CSS variable `--gap` in `:root`

### Theme
- **Colors:** `css/style.css` — CSS variables in `:root` (`--bg-primary`, `--bg-widget`, `--text-primary`, `--accent`, etc.)
- **Font:** `index.html` — Google Fonts link; `css/style.css` — `font-family` in `html, body`
- **Border radius:** CSS variable `--radius`

### Deployment
- Pushing to `main` triggers GitHub Actions to deploy to GitHub Pages
- Changes typically take 1-2 minutes to go live
- The Portal may cache aggressively — use the Refresh button on the remote, or manually refresh the browser

### Adding a widget to the 2x2 grid
The grid currently has 4 widgets (clock, photos, MTA, calendar). To add a 5th as a grid widget (not just an overlay), you'd add a new `.widget` div in `index.html` and adjust the grid template in CSS. Note: more than 4 widgets in a 2x2 grid requires changing to a different layout.

---

## Technical Notes

- **No build tools.** Everything is vanilla HTML/CSS/JS. No npm, no bundler, no framework.
- **Firebase compat SDK.** Uses the compat (v9) Firebase SDK loaded via `<script>` tags, not ES modules. The Portal's old Android browser doesn't support ES modules.
- **`const` and `window`.** Variables declared with `const` are not properties of `window`. Use `typeof CONFIG === "undefined"` instead of `!window.CONFIG`.
- **Protobuf decoding.** The Cloudflare Worker includes a hand-written minimal protobuf decoder — no dependencies needed. Only decodes the GTFS-RT fields we use.
- **Google Docs on Portal.** The Portal browser can't access Google Docs `/pub` URLs (requires cookies/sign-in). The Apps Script works around this by rendering doc content as plain HTML.
