// ── Portal Dashboard ─────────────────────────────────────
// Main application logic

(function () {
  "use strict";

  // ── Clock ────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById("clock-time");
    const secondsEl = document.getElementById("clock-seconds");
    const dateEl = document.getElementById("clock-date");
    const greetingEl = document.getElementById("clock-greeting");

    // Time
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    let ampm = "";

    if (!CONFIG.use24HourClock) {
      ampm = hours >= 12 ? " PM" : " AM";
      hours = hours % 12 || 12;
    }

    timeEl.textContent = `${hours}:${minutes}${ampm}`;
    secondsEl.textContent = CONFIG.showSeconds ? `:${seconds}` : "";

    // Date
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    dateEl.textContent = now.toLocaleDateString("en-US", options);

    // Greeting
    const hour = now.getHours();
    let greeting;
    if (hour < 5) greeting = "Good night";
    else if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else if (hour < 21) greeting = "Good evening";
    else greeting = "Good night";
    greetingEl.textContent = greeting;
  }

  // ── Photos ───────────────────────────────────────────────
  let currentPhoto = 0;
  let photoImages = [];

  async function initPhotos() {
    const container = document.getElementById("photo-container");
    const dotsContainer = document.getElementById("photo-dots");
    let photos = CONFIG.photos || [];

    // Fetch from Google Photos worker if configured
    if (photos.length === 0 && CONFIG.photosApiUrl) {
      try {
        const resp = await fetch(CONFIG.photosApiUrl);
        const data = await resp.json();
        if (data.photos && data.photos.length > 0) {
          photos = data.photos;
          // Shuffle so it's not the same order every time
          for (let i = photos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = photos[i]; photos[i] = photos[j]; photos[j] = tmp;
          }
        }
      } catch (err) {
        console.error("Photos fetch error:", err);
      }
    }

    if (photos.length === 0) return;

    // Clear placeholder
    container.innerHTML = "";
    dotsContainer.innerHTML = "";

    // Hide dots if too many photos
    if (photos.length > 20) {
      dotsContainer.style.display = "none";
    }

    // Create image elements — only preload first few, lazy-load rest
    photos.forEach((src, i) => {
      const img = document.createElement("img");
      img.alt = `Photo ${i + 1}`;
      if (i < 3) {
        img.src = src;
      } else {
        img.dataset.src = src;
      }
      img.loading = i < 3 ? "eager" : "lazy";
      if (i === 0) img.classList.add("active");
      container.appendChild(img);
      photoImages.push(img);

      // Dot indicator (only for small sets)
      if (photos.length <= 20) {
        const dot = document.createElement("div");
        dot.className = `photo-dot${i === 0 ? " active" : ""}`;
        dotsContainer.appendChild(dot);
      }
    });

    // Set transition duration from config
    const fadeDuration = CONFIG.photoFadeDuration || 1.5;
    photoImages.forEach((img) => {
      img.style.transitionDuration = `${fadeDuration}s`;
    });

    // Start rotation
    if (photos.length > 1) {
      setInterval(nextPhoto, (CONFIG.photoInterval || 30) * 1000);
    }
  }

  function nextPhoto() {
    if (photoImages.length === 0) return;
    const dots = document.querySelectorAll(".photo-dot");

    photoImages[currentPhoto].classList.remove("active");
    if (dots[currentPhoto]) dots[currentPhoto].classList.remove("active");

    currentPhoto = (currentPhoto + 1) % photoImages.length;

    // Lazy-load: set src from data-src if not yet loaded
    const nextImg = photoImages[currentPhoto];
    if (!nextImg.src && nextImg.dataset.src) {
      nextImg.src = nextImg.dataset.src;
    }
    // Also preload the one after
    const preloadIdx = (currentPhoto + 1) % photoImages.length;
    const preloadImg = photoImages[preloadIdx];
    if (!preloadImg.src && preloadImg.dataset.src) {
      preloadImg.src = preloadImg.dataset.src;
    }

    nextImg.classList.add("active");
    if (dots[currentPhoto]) dots[currentPhoto].classList.add("active");
  }

  // ── MTA Departures ───────────────────────────────────────
  const DEMO_MTA_DATA = {
    stations: [
      {
        name: "Fulton St",
        departures: [
          { line: "A", direction: "Uptown", times: [3, 9, 17] },
          { line: "A", direction: "Downtown", times: [1, 8, 14] },
          { line: "C", direction: "Uptown", times: [6, 15] },
          { line: "C", direction: "Downtown", times: [4, 12, 20] },
          { line: "2", direction: "Uptown", times: [2, 7, 13] },
          { line: "2", direction: "Downtown", times: [5, 11] },
          { line: "3", direction: "Uptown", times: [4, 10, 18] },
          { line: "3", direction: "Downtown", times: [2, 9, 16] },
        ],
      },
      {
        name: "Brooklyn Bridge\u2013City Hall",
        departures: [
          { line: "4", direction: "Uptown", times: [1, 6, 13] },
          { line: "4", direction: "Downtown", times: [3, 10, 17] },
          { line: "5", direction: "Uptown", times: [5, 12, 19] },
          { line: "5", direction: "Downtown", times: [2, 8, 15] },
          { line: "6", direction: "Uptown", times: [1, 4, 9] },
          { line: "6", direction: "Downtown", times: [3, 7, 14] },
        ],
      },
      {
        name: "World Trade Center",
        departures: [
          { line: "E", direction: "Uptown", times: [4, 11, 18] },
          { line: "E", direction: "Jamaica", times: [2, 8, 16] },
        ],
      },
      {
        name: "City Hall",
        departures: [
          { line: "R", direction: "Uptown", times: [5, 13] },
          { line: "R", direction: "Brooklyn", times: [3, 10, 19] },
        ],
      },
    ],
    alerts: [
      {
        lines: ["A"],
        message:
          "Delays of up to 10 minutes in both directions due to signal problems at West 4 St.",
      },
    ],
  };

  function renderMTA(data) {
    const stationsEl = document.getElementById("mta-stations");
    const alertsEl = document.getElementById("mta-alerts");
    const updatedEl = document.getElementById("mta-updated");

    // Update timestamp
    const now = new Date();
    updatedEl.textContent = `Updated ${now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;

    // Alerts
    alertsEl.innerHTML = "";
    if (data.alerts && data.alerts.length > 0) {
      data.alerts.forEach((alert) => {
        const div = document.createElement("div");
        div.className = "mta-alert";
        const lineLabels = alert.lines
          .map((l) => `<span class="mta-alert-line">${l}</span>`)
          .join(" ");
        div.innerHTML = `\u26a0\ufe0f ${lineLabels} ${alert.message}`;
        alertsEl.appendChild(div);
      });
    }

    // Stations — two-column layout (uptown / downtown)
    stationsEl.innerHTML = "";
    data.stations.forEach((station) => {
      const stationDiv = document.createElement("div");
      stationDiv.className = "mta-station";

      // Split departures into two direction groups
      const dirs = {};
      station.departures.forEach((dep) => {
        if (!dirs[dep.direction]) dirs[dep.direction] = [];
        dep.times.forEach((t) => {
          dirs[dep.direction].push({ line: dep.line, minutes: t });
        });
      });

      // Sort each direction by minutes
      for (const d in dirs) {
        dirs[d].sort((a, b) => a.minutes - b.minutes);
      }

      // Determine column labels (first is usually Uptown, second Downtown/Brooklyn/Jamaica)
      const dirNames = Object.keys(dirs);
      const uptownIdx = dirNames.indexOf("Uptown");
      let col1Name, col2Name;
      if (uptownIdx === 0) {
        col1Name = dirNames[0]; col2Name = dirNames[1];
      } else if (uptownIdx === 1) {
        col1Name = dirNames[1]; col2Name = dirNames[0];
      } else {
        col1Name = dirNames[0]; col2Name = dirNames[1];
      }

      let html = `<div class="mta-station-name">${station.name}</div>`;
      html += `<div class="mta-columns">`;

      // Column 1
      html += `<div class="mta-col">`;
      html += `<div class="mta-col-header">${col1Name || ""}</div>`;
      if (col1Name && dirs[col1Name]) {
        dirs[col1Name].forEach((dep) => {
          const timeStr = dep.minutes <= 1
            ? `<span class="mta-time-arriving">Arriving</span>`
            : `${dep.minutes} min`;
          html += `<div class="mta-dep-row"><span class="mta-line-badge line-${dep.line}">${dep.line}</span> ${timeStr}</div>`;
        });
      }
      html += `</div>`;

      // Column 2
      html += `<div class="mta-col">`;
      html += `<div class="mta-col-header">${col2Name || ""}</div>`;
      if (col2Name && dirs[col2Name]) {
        dirs[col2Name].forEach((dep) => {
          const timeStr = dep.minutes <= 1
            ? `<span class="mta-time-arriving">Arriving</span>`
            : `${dep.minutes} min`;
          html += `<div class="mta-dep-row"><span class="mta-line-badge line-${dep.line}">${dep.line}</span> ${timeStr}</div>`;
        });
      }
      html += `</div>`;

      html += `</div>`;

      stationDiv.innerHTML = html;
      stationsEl.appendChild(stationDiv);
    });
  }

  async function fetchMTAData() {
    if (!CONFIG.mtaProxyUrl) {
      // Use demo data with randomized times
      const data = JSON.parse(JSON.stringify(DEMO_MTA_DATA));
      data.stations.forEach((station) => {
        station.departures.forEach((dep) => {
          dep.times = dep.times.map(() =>
            Math.floor(Math.random() * 20) + 1
          );
          dep.times.sort((a, b) => a - b);
        });
      });
      renderMTA(data);
      return;
    }

    try {
      const response = await fetch(CONFIG.mtaProxyUrl);
      const data = await response.json();
      renderMTA(data);
    } catch (err) {
      console.error("MTA fetch error:", err);
      // Fallback to demo data
      renderMTA(DEMO_MTA_DATA);
    }
  }

  // ── Calendar ─────────────────────────────────────────────
  function initCalendar() {
    if (!CONFIG.googleCalendarUrl) return;

    const container = document.getElementById("calendar-container");

    // Build themed embed URL
    let url = CONFIG.googleCalendarUrl;

    // Add dark theme parameters if not already present
    if (!url.includes("bgcolor")) {
      const sep = url.includes("?") ? "&" : "?";
      url += `${sep}bgcolor=%230f0f1a&color=%236366f1&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1&mode=AGENDA`;
    }

    container.innerHTML = `<iframe src="${url}" frameborder="0" scrolling="no"></iframe>`;
  }

  // ── Fullscreen Toggle ────────────────────────────────────
  function initFullscreen() {
    const dashboard = document.getElementById("dashboard");

    document.querySelectorAll(".fullscreen-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const widget = btn.closest(".widget");

        if (widget.classList.contains("fullscreen")) {
          widget.classList.remove("fullscreen");
          dashboard.classList.remove("has-fullscreen");
        } else {
          // Close any other fullscreen widget first
          document.querySelectorAll(".widget.fullscreen").forEach((w) => {
            w.classList.remove("fullscreen");
          });
          widget.classList.add("fullscreen");
          dashboard.classList.add("has-fullscreen");
        }
      });
    });

    // ESC key to exit fullscreen
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".widget.fullscreen").forEach((w) => {
          w.classList.remove("fullscreen");
        });
        dashboard.classList.remove("has-fullscreen");
      }
    });
  }

  // ── Keep Awake (prevent Portal from sleeping) ───────
  // Uses a hidden silent video loop to prevent screen timeout.
  // Also tries Wake Lock API for modern browsers.
  let keepAwakeVideo = null;
  let wakeLock = null;

  function enableKeepAwake() {
    // Try Wake Lock API first (modern browsers)
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then(function (lock) {
        wakeLock = lock;
        console.log("Wake Lock active");
        // Re-acquire if released (e.g. tab switch)
        lock.addEventListener("release", function () {
          console.log("Wake Lock released, re-acquiring...");
          enableKeepAwake();
        });
      }).catch(function () {
        console.log("Wake Lock failed, using video fallback");
      });
    }

    // Video fallback — works on older Android browsers like Portal
    if (!keepAwakeVideo) {
      keepAwakeVideo = document.createElement("video");
      keepAwakeVideo.setAttribute("playsinline", "");
      keepAwakeVideo.setAttribute("muted", "");
      keepAwakeVideo.muted = true;
      keepAwakeVideo.loop = true;
      keepAwakeVideo.style.position = "fixed";
      keepAwakeVideo.style.top = "-1px";
      keepAwakeVideo.style.left = "-1px";
      keepAwakeVideo.style.width = "1px";
      keepAwakeVideo.style.height = "1px";
      keepAwakeVideo.style.opacity = "0.01";
      keepAwakeVideo.style.pointerEvents = "none";
      keepAwakeVideo.style.zIndex = "-1";

      // Tiny silent MP4 with audio track (base64 from NoSleep.js)
      var source = document.createElement("source");
      source.src = "data:video/mp4;base64,AAAAHGZ0eXBNNFYgAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAGF21kYXTeBAAAbGliZmFhYyAxLjI4AABCAJMgBDIARwAAArEGBf//qtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNDIgcjIgOTU2YzhkOCAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMTQgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz02IGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCB2YnZfbWF4cmF0ZT03NjggdmJ2X2J1ZnNpemU9MzAwMCBjcmZfbWF4PTAuMCBuYWxfaHJkPW5vbmUgZmlsbGVyPTAgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAFZliIQL8mKAAKvMnJycnJycnJycnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXiEASZACGQAjgCEASZACGQAjgAAAA1teleKAAAAAAAAAAAAAAAAAAAFBM0GBgAAABVqJBALoMflgAAAHdAwQ8CuVAAAAAkJaOOALEiw5IAAAAABYyuAAdQAAAAPaDQNQABGRgACOAK4AAAAACYoUAAnIAAAAAtQ4ABHAFcAAAAAEgB0AAAAAAO4EAAAAANvgAAAAAJPgAAAAAAUAAAA8AAAPy0lBQWTkAALpgAAFs0lBQWTkAALpgAAFs";
      source.type = "video/mp4";
      keepAwakeVideo.appendChild(source);
      document.body.appendChild(keepAwakeVideo);
    }

    keepAwakeVideo.play().then(function () {
      console.log("Keep-awake video playing");
    }).catch(function (err) {
      console.log("Keep-awake video failed:", err.message);
    });
  }

  // ── Browser Fullscreen (hides URL bar) ──────────────
  function initBrowserFullscreen() {
    const btn = document.getElementById("browser-fullscreen-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const el = document.documentElement;
      const rfs = el.requestFullscreen
        || el.webkitRequestFullscreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen;
      if (rfs) {
        rfs.call(el);
      }
      // Start keep-awake on this user gesture
      enableKeepAwake();
    });

    // Hide button once we're in fullscreen
    function onFSChange() {
      const isFS = document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement
        || document.msFullscreenElement;
      btn.classList.toggle("hidden", !!isFS);
    }

    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("webkitfullscreenchange", onFSChange);
    document.addEventListener("mozfullscreenchange", onFSChange);
    document.addEventListener("MSFullscreenChange", onFSChange);
  }

  // ── Initialize ───────────────────────────────────────────
  function init() {
    // Clock - update every second
    updateClock();
    setInterval(updateClock, 1000);

    // Photos
    initPhotos();

    // MTA - fetch immediately, then on interval
    fetchMTAData();
    setInterval(fetchMTAData, (CONFIG.mtaRefreshInterval || 30) * 1000);

    // Calendar
    initCalendar();

    // Fullscreen
    initFullscreen();

    // Browser fullscreen (hides URL bar)
    initBrowserFullscreen();

    // Also try keep-awake on any first touch (in case fullscreen button isn't used)
    var keepAwakeStarted = false;
    document.addEventListener("click", function () {
      if (!keepAwakeStarted) {
        keepAwakeStarted = true;
        enableKeepAwake();
      }
    }, { once: true });
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
