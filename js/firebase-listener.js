// ── Firebase Listener ─────────────────────────────────
// Listens for remote commands from the iPhone remote control
// and updates the Portal dashboard accordingly.
// Uses Firebase compat SDK for maximum browser compatibility.

(function () {
  "use strict";

  if (typeof CONFIG === "undefined" || !CONFIG.firebase || !CONFIG.firebase.apiKey) {
    console.log("Firebase not configured — remote control disabled");
    return;
  }

  if (typeof firebase === "undefined") {
    console.error("Firebase SDK not loaded");
    return;
  }

  var app = firebase.initializeApp(CONFIG.firebase);
  var db = firebase.database();
  // Ignore any commands from before page load to prevent refresh loops
  var lastTimestamp = Date.now();

  // ── Listen for commands ────────────────────────────────
  db.ref("portal/command").on("value", function (snap) {
    var cmd = snap.val();
    if (!cmd || cmd.timestamp <= lastTimestamp) return;
    lastTimestamp = cmd.timestamp;
    handleCommand(cmd);
  });

  // ── Listen for alarms ──────────────────────────────────
  var alarmCheckInterval = null;
  var activeAlarms = {};

  db.ref("portal/alarms").on("value", function (snap) {
    activeAlarms = snap.val() || {};
    if (Object.keys(activeAlarms).length > 0 && !alarmCheckInterval) {
      alarmCheckInterval = setInterval(checkAlarms, 1000);
    } else if (Object.keys(activeAlarms).length === 0 && alarmCheckInterval) {
      clearInterval(alarmCheckInterval);
      alarmCheckInterval = null;
    }
  });

  function checkAlarms() {
    var now = new Date();
    var currentHour = now.getHours();
    var currentMin = now.getMinutes();
    var currentSec = now.getSeconds();

    var keys = Object.keys(activeAlarms);
    for (var i = 0; i < keys.length; i++) {
      var alarm = activeAlarms[keys[i]];
      if (!alarm || alarm.fired) continue;

      if (alarm.hour === currentHour && alarm.minute === currentMin && currentSec < 2) {
        triggerAlarm(alarm);
        // Mark as fired
        db.ref("portal/alarms/" + keys[i] + "/fired").set(true);
      }
    }
  }

  var alarmAudio = null;

  function triggerAlarm(alarm) {
    var overlay = document.getElementById("alarm-overlay");
    var timeDisplay = document.getElementById("alarm-display-time");

    var now = new Date();
    var hours = now.getHours();
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    var minutes = now.getMinutes().toString();
    if (minutes.length < 2) minutes = "0" + minutes;
    timeDisplay.textContent = hours + ":" + minutes + " " + ampm;

    overlay.classList.remove("hidden");

    // Play alarm sound using Web Audio API
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      playAlarmTone(ctx);
    } catch (e) {
      console.log("Audio not available");
    }

    // Dismiss on tap
    overlay.onclick = function () {
      overlay.classList.add("hidden");
      if (alarmAudio) {
        clearInterval(alarmAudio);
        alarmAudio = null;
      }
      overlay.onclick = null;
    };
  }

  function playAlarmTone(ctx) {
    var count = 0;
    alarmAudio = setInterval(function () {
      if (count >= 60) { // Stop after 60 beeps (~30 seconds)
        clearInterval(alarmAudio);
        alarmAudio = null;
        return;
      }
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = (count % 2 === 0) ? 880 : 660;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      count++;
    }, 500);
  }

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
      case "play-youtube-playlist":
        playYouTubePlaylist(cmd.listId, cmd.videoId);
        break;
      case "stop-youtube":
        hideYouTube();
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
        hideAlarm();
        showAllWidgets();
        break;
      case "dismiss-alarm":
        hideAlarm();
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

    var fullscreenWidgets = document.querySelectorAll(".widget.fullscreen");
    for (var i = 0; i < fullscreenWidgets.length; i++) {
      fullscreenWidgets[i].classList.remove("fullscreen");
    }

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

  function playYouTubePlaylist(listId, videoId) {
    hideSleep();

    var overlay = document.getElementById("youtube-overlay");
    var container = document.getElementById("youtube-container");

    // If we have both a video ID and playlist, start at that video
    var src = "https://www.youtube.com/embed/";
    if (videoId) {
      src += videoId + "?autoplay=1&rel=0&modestbranding=1&list=" + listId;
    } else {
      src += "?listType=playlist&list=" + listId + "&autoplay=1&rel=0&modestbranding=1";
    }

    container.innerHTML = '<iframe ' +
      'src="' + src + '" ' +
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

  // ── Alarm ────────────────────────────────────────────
  function hideAlarm() {
    document.getElementById("alarm-overlay").classList.add("hidden");
    if (alarmAudio) {
      clearInterval(alarmAudio);
      alarmAudio = null;
    }
  }
})();
