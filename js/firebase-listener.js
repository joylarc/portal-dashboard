// ── Firebase Listener ─────────────────────────────────
// Listens for remote commands from the iPhone remote control
// and updates the Portal dashboard accordingly.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

(function () {
  "use strict";

  if (!window.CONFIG || !CONFIG.firebase || !CONFIG.firebase.apiKey) {
    console.log("Firebase not configured — remote control disabled");
    return;
  }

  const app = initializeApp(CONFIG.firebase);
  const db = getDatabase(app);

  let lastTimestamp = 0;

  onValue(ref(db, "portal/command"), (snap) => {
    const cmd = snap.val();
    if (!cmd || cmd.timestamp <= lastTimestamp) return;
    lastTimestamp = cmd.timestamp;

    handleCommand(cmd);
  });

  function handleCommand(cmd) {
    switch (cmd.action) {
      case "show-widget":
        showWidget(cmd.widget);
        break;
      case "show-all":
        showAllWidgets();
        break;
      case "play-youtube":
        playYouTube(cmd.videoId);
        break;
      case "refresh":
        window.location.reload();
        break;
      case "sleep":
        showSleep();
        break;
      case "wake":
        hideSleep();
        hideYouTube();
        showAllWidgets();
        break;
    }
  }

  // ── Widget Switching ─────────────────────────────────
  function showWidget(widgetName) {
    hideYouTube();
    hideSleep();

    const dashboard = document.getElementById("dashboard");
    const target = document.querySelector(`[data-widget="${widgetName}"]`);
    if (!target) return;

    // Close any existing fullscreen
    document.querySelectorAll(".widget.fullscreen").forEach((w) => {
      w.classList.remove("fullscreen");
    });

    // Fullscreen the target widget
    target.classList.add("fullscreen");
    dashboard.classList.add("has-fullscreen");
  }

  function showAllWidgets() {
    hideYouTube();
    hideSleep();

    const dashboard = document.getElementById("dashboard");
    document.querySelectorAll(".widget.fullscreen").forEach((w) => {
      w.classList.remove("fullscreen");
    });
    dashboard.classList.remove("has-fullscreen");
  }

  // ── YouTube ──────────────────────────────────────────
  function playYouTube(videoId) {
    hideSleep();

    const overlay = document.getElementById("youtube-overlay");
    const container = document.getElementById("youtube-container");

    container.innerHTML = `<iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
      frameborder="0"
      allow="autoplay; encrypted-media; fullscreen"
      allowfullscreen
    ></iframe>`;

    overlay.classList.remove("hidden");
  }

  function hideYouTube() {
    const overlay = document.getElementById("youtube-overlay");
    const container = document.getElementById("youtube-container");
    overlay.classList.add("hidden");
    container.innerHTML = "";
  }

  // ── Sleep / Wake ─────────────────────────────────────
  function showSleep() {
    document.getElementById("sleep-overlay").classList.remove("hidden");
  }

  function hideSleep() {
    document.getElementById("sleep-overlay").classList.add("hidden");
  }
})();
