// ── Firebase Listener ─────────────────────────────────
// Listens for remote commands from the iPhone remote control
// and updates the Portal dashboard accordingly.
// Uses Firebase compat SDK for maximum browser compatibility.

(function () {
  "use strict";

  if (!window.CONFIG || !CONFIG.firebase || !CONFIG.firebase.apiKey) {
    console.log("Firebase not configured — remote control disabled");
    return;
  }

  if (!window.firebase) {
    console.error("Firebase SDK not loaded");
    return;
  }

  var app = firebase.initializeApp(CONFIG.firebase);
  var db = firebase.database();
  var lastTimestamp = 0;

  db.ref("portal/command").on("value", function (snap) {
    var cmd = snap.val();
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

    var dashboard = document.getElementById("dashboard");
    var target = document.querySelector('[data-widget="' + widgetName + '"]');
    if (!target) return;

    // Close any existing fullscreen
    var fullscreenWidgets = document.querySelectorAll(".widget.fullscreen");
    for (var i = 0; i < fullscreenWidgets.length; i++) {
      fullscreenWidgets[i].classList.remove("fullscreen");
    }

    // Fullscreen the target widget
    target.classList.add("fullscreen");
    dashboard.classList.add("has-fullscreen");
  }

  function showAllWidgets() {
    hideYouTube();
    hideSleep();

    var dashboard = document.getElementById("dashboard");
    var fullscreenWidgets = document.querySelectorAll(".widget.fullscreen");
    for (var i = 0; i < fullscreenWidgets.length; i++) {
      fullscreenWidgets[i].classList.remove("fullscreen");
    }
    dashboard.classList.remove("has-fullscreen");
  }

  // ── YouTube ──────────────────────────────────────────
  function playYouTube(videoId) {
    hideSleep();

    var overlay = document.getElementById("youtube-overlay");
    var container = document.getElementById("youtube-container");

    container.innerHTML = '<iframe ' +
      'src="https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1" ' +
      'frameborder="0" ' +
      'allow="autoplay; encrypted-media; fullscreen" ' +
      'allowfullscreen></iframe>';

    overlay.classList.remove("hidden");
  }

  function hideYouTube() {
    var overlay = document.getElementById("youtube-overlay");
    var container = document.getElementById("youtube-container");
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
