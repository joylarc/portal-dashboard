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
      case "show-recipe":
        showRecipe(cmd.url);
        break;
      case "hide-recipe":
        hideRecipe();
        break;
      case "show-notes":
        showNotes(cmd.html);
        break;
      case "hide-notes":
        hideNotes();
        break;
      case "show-weather":
        showWeather();
        break;
      case "hide-weather":
        hideWeather();
        break;
      case "show-todos":
        showTodos();
        break;
      case "hide-todos":
        hideTodos();
        break;
      case "show-calendar":
        showCalendar();
        break;
      case "hide-calendar":
        hideCalendar();
        break;
      case "show-timer":
        showTimerOverlay();
        break;
      case "add-timer":
        addTimer(cmd.label, cmd.seconds);
        break;
      case "clear-timers":
        db.ref("portal/timers").remove();
        break;
      case "show-pomodoro":
        showPomodoroOverlay();
        break;
      case "start-pomodoro":
        startPomodoro(cmd.workMin, cmd.breakMin);
        break;
      case "stop-pomodoro":
        stopPomodoro();
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
        hideRecipe();
        hideNotes();
        hideWeather();
        hideTodos();
        hideCalendar();
        hideTimerOverlay();
        hidePomodoroOverlay();
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

  // ── Notes ────────────────────────────────────────────
  function showNotes(html) {
    hideSleep();
    hideYouTube();
    hideRecipe();

    var overlay = document.getElementById("notes-overlay");
    var display = document.getElementById("notes-display");
    display.innerHTML = html;
    overlay.classList.remove("hidden");
  }

  function hideNotes() {
    document.getElementById("notes-overlay").classList.add("hidden");
    document.getElementById("notes-display").innerHTML = "";
  }

  // Also listen for notes content changes (for live updates while typing)
  db.ref("portal/notes").on("value", function (snap) {
    var data = snap.val();
    if (!data || !data.visible) {
      hideNotes();
      return;
    }
    if (data.html) {
      var overlay = document.getElementById("notes-overlay");
      var display = document.getElementById("notes-display");
      display.innerHTML = data.html;
      overlay.classList.remove("hidden");
    }
  });

  // ── Recipes ──────────────────────────────────────────
  function showRecipe(url) {
    hideSleep();
    hideYouTube();

    var overlay = document.getElementById("recipe-overlay");
    var container = document.getElementById("recipe-container");

    container.innerHTML = '<iframe src="' + url + '"></iframe>';
    overlay.classList.remove("hidden");
  }

  function hideRecipe() {
    var overlay = document.getElementById("recipe-overlay");
    var container = document.getElementById("recipe-container");
    overlay.classList.add("hidden");
    container.innerHTML = "";
  }

  // ── Weather ──────────────────────────────────────────
  function showWeather() {
    hideSleep(); hideYouTube(); hideRecipe(); hideNotes(); hideTodos(); hideCalendar();

    var overlay = document.getElementById("weather-overlay");
    var display = document.getElementById("weather-display");
    display.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:1.5rem;">Loading weather...</div>';
    overlay.classList.remove("hidden");

    // NYC coordinates
    var lat = 40.7128;
    var lon = -74.0060;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit" +
      "&wind_speed_unit=mph&timezone=America/New_York&forecast_days=7";

    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var current = data.current;
      var daily = data.daily;
      var weatherDesc = getWeatherDescription(current.weather_code);

      var html = '<div class="weather-current">';
      html += '<div class="weather-temp">' + Math.round(current.temperature_2m) + '&deg;</div>';
      html += '<div><div class="weather-info">' + weatherDesc + '</div>';
      html += '<div class="weather-detail">Feels like ' + Math.round(current.apparent_temperature) + '&deg; &bull; ';
      html += 'Wind ' + Math.round(current.wind_speed_10m) + ' mph &bull; ';
      html += 'Humidity ' + current.relative_humidity_2m + '%</div></div>';
      html += '</div>';

      html += '<div class="weather-forecast">';
      var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (var i = 0; i < daily.time.length; i++) {
        var d = new Date(daily.time[i] + "T12:00:00");
        var dayName = i === 0 ? "Today" : dayNames[d.getDay()];
        html += '<div class="weather-day">';
        html += '<div class="weather-day-name">' + dayName + '</div>';
        html += '<div class="weather-day-temp">' + Math.round(daily.temperature_2m_max[i]) + '&deg;</div>';
        html += '<div class="weather-day-low">' + Math.round(daily.temperature_2m_min[i]) + '&deg;</div>';
        html += '<div class="weather-day-desc">' + getWeatherDescription(daily.weather_code[i]) + '</div>';
        html += '</div>';
      }
      html += '</div>';

      display.innerHTML = html;
    }).catch(function () {
      display.innerHTML = '<div style="text-align:center;color:var(--red);font-size:1.5rem;">Failed to load weather</div>';
    });
  }

  function getWeatherDescription(code) {
    var descriptions = {
      0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
      45: "Foggy", 48: "Icy Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
      61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
      66: "Freezing Rain", 67: "Heavy Freezing Rain",
      71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
      80: "Light Showers", 81: "Showers", 82: "Heavy Showers",
      85: "Snow Showers", 86: "Heavy Snow Showers",
      95: "Thunderstorm", 96: "Thunderstorm w/ Hail", 99: "Severe Thunderstorm"
    };
    return descriptions[code] || "Unknown";
  }

  function hideWeather() {
    document.getElementById("weather-overlay").classList.add("hidden");
  }

  // ── To-Do List ──────────────────────────────────────
  function showTodos() {
    hideSleep(); hideYouTube(); hideRecipe(); hideNotes(); hideWeather(); hideCalendar();
    document.getElementById("todos-overlay").classList.remove("hidden");
    renderTodos();
  }

  function hideTodos() {
    document.getElementById("todos-overlay").classList.add("hidden");
  }

  function renderTodos() {
    db.ref("portal/todos").once("value", function (snap) {
      var todos = snap.val() || {};
      var display = document.getElementById("todos-display");

      // Group by category, sort by priority then creation
      var categories = {};
      var keys = Object.keys(todos);
      for (var i = 0; i < keys.length; i++) {
        var todo = todos[keys[i]];
        if (!todo) continue;
        todo._key = keys[i];
        var cat = todo.category || "Other";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(todo);
      }

      // Sort within categories: incomplete first, then by priority
      var priorityOrder = { high: 0, medium: 1, low: 2 };
      for (var c in categories) {
        categories[c].sort(function (a, b) {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          var pa = priorityOrder[a.priority || "low"] || 2;
          var pb = priorityOrder[b.priority || "low"] || 2;
          return pa - pb;
        });
      }

      var catOrder = ["Work", "Home", "Groceries", "Errands", "Other"];
      var html = '<div class="todos-header">To-Do</div>';
      html += '<div class="todos-columns">';

      for (var ci = 0; ci < catOrder.length; ci++) {
        var catName = catOrder[ci];
        if (!categories[catName] || categories[catName].length === 0) continue;

        html += '<div class="todo-category-group">';
        html += '<div class="todo-category-label cat-' + catName.toLowerCase() + '">' + catName + '</div>';

        for (var ti = 0; ti < categories[catName].length; ti++) {
          var t = categories[catName][ti];
          var completedClass = t.completed ? " completed" : "";
          var priorityClass = " todo-priority-" + (t.priority || "low");
          html += '<div class="todo-item' + completedClass + priorityClass + '" data-todo-key="' + t._key + '">';
          html += '<div class="todo-checkbox"></div>';
          html += '<span class="todo-text">' + escapeHtml(t.text) + '</span>';
          html += '</div>';

          // Sub-tasks
          if (t.subtasks) {
            var subKeys = Object.keys(t.subtasks);
            for (var si = 0; si < subKeys.length; si++) {
              var sub = t.subtasks[subKeys[si]];
              if (!sub) continue;
              var subCompleted = sub.completed ? " completed" : "";
              html += '<div class="todo-item todo-subtask-portal' + subCompleted + '" data-todo-key="' + t._key + '" data-sub-key="' + subKeys[si] + '">';
              html += '<div class="todo-checkbox"></div>';
              html += '<span class="todo-text">' + escapeHtml(sub.text) + '</span>';
              html += '</div>';
            }
          }
        }
        html += '</div>';
      }

      html += '</div>'; // close todos-columns

      if (keys.length === 0) {
        html += '<div style="text-align:center;color:var(--text-dim);font-size:1.3rem;margin-top:40px;">No tasks yet. Add some from the remote!</div>';
      }

      display.innerHTML = html;

      // Tap to toggle completion on Portal
      var items = display.querySelectorAll(".todo-item");
      for (var ii = 0; ii < items.length; ii++) {
        (function (item) {
          item.addEventListener("click", function () {
            var key = item.getAttribute("data-todo-key");
            var subKey = item.getAttribute("data-sub-key");
            var isCompleted = item.classList.contains("completed");
            if (subKey) {
              db.ref("portal/todos/" + key + "/subtasks/" + subKey + "/completed").set(!isCompleted);
            } else {
              db.ref("portal/todos/" + key + "/completed").set(!isCompleted);
            }
            setTimeout(renderTodos, 300);
          });
        })(items[ii]);
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Listen for to-do changes to re-render if overlay is open
  db.ref("portal/todos").on("value", function () {
    var overlay = document.getElementById("todos-overlay");
    if (!overlay.classList.contains("hidden")) {
      renderTodos();
    }
  }, function () {});

  // ── Calendar Overlay ────────────────────────────────
  function showCalendar() {
    hideSleep(); hideYouTube(); hideRecipe(); hideNotes(); hideWeather(); hideTodos();

    var overlay = document.getElementById("calendar-overlay");
    var display = document.getElementById("calendar-display");

    if (typeof CONFIG !== "undefined" && CONFIG.googleCalendarUrl) {
      var url = CONFIG.googleCalendarUrl;
      if (!url.includes("bgcolor")) {
        var sep = url.includes("?") ? "&" : "?";
        url += sep + "bgcolor=%230f0f1a&color=%236366f1&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=1&mode=AGENDA";
      }
      display.innerHTML = '<iframe src="' + url + '"></iframe>';
    } else {
      display.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:1.3rem;">Set googleCalendarUrl in config.js</div>';
    }
    overlay.classList.remove("hidden");
  }

  function hideCalendar() {
    document.getElementById("calendar-overlay").classList.add("hidden");
    document.getElementById("calendar-display").innerHTML = "";
  }

  // ── App Drawer Tap Handling ─────────────────────────
  var appIcons = document.querySelectorAll(".app-icon");
  for (var ai = 0; ai < appIcons.length; ai++) {
    (function (icon) {
      icon.addEventListener("click", function () {
        var app = icon.getAttribute("data-app");
        switch (app) {
          case "weather": showWeather(); break;
          case "todos": showTodos(); break;
          case "calendar": showCalendar(); break;
          case "recipes": showLastRecipe(); break;
          case "youtube": showYouTubePrompt(); break;
          case "notes": showLastNotes(); break;
          case "timer": showTimerOverlay(); break;
          case "pomodoro": showPomodoroOverlay(); break;
        }
      });
    })(appIcons[ai]);
  }

  function showLastRecipe() {
    // Show the recipe list info - actual recipe selection happens from remote
    hideSleep(); hideYouTube(); hideNotes(); hideWeather(); hideTodos(); hideCalendar();
    var overlay = document.getElementById("recipe-overlay");
    var container = document.getElementById("recipe-container");
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:1.5rem;">Select a recipe from the remote</div>';
    overlay.classList.remove("hidden");
  }

  function showYouTubePrompt() {
    hideSleep(); hideRecipe(); hideNotes(); hideWeather(); hideTodos(); hideCalendar();
    var overlay = document.getElementById("youtube-overlay");
    var container = document.getElementById("youtube-container");
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:1.5rem;background:#000;">Send a video from the remote</div>';
    overlay.classList.remove("hidden");
  }

  function showLastNotes() {
    // Show notes if there's existing content in Firebase
    hideSleep(); hideYouTube(); hideRecipe(); hideWeather(); hideTodos(); hideCalendar();
    db.ref("portal/notes").once("value", function (snap) {
      var data = snap.val();
      var overlay = document.getElementById("notes-overlay");
      var display = document.getElementById("notes-display");
      if (data && data.html) {
        display.innerHTML = data.html;
      } else {
        display.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:1.5rem;">Add notes from the remote</div>';
      }
      overlay.classList.remove("hidden");
    });
  }

  // ── Back Button Handling ────────────────────────────
  var backBtns = document.querySelectorAll(".overlay-back-btn");
  var fullscreenBtns = document.querySelectorAll(".fullscreen-btn");
  var uiBtnTimer = null;

  function showUIButtons() {
    var i;
    for (i = 0; i < backBtns.length; i++) {
      backBtns[i].classList.add("visible");
    }
    for (i = 0; i < fullscreenBtns.length; i++) {
      fullscreenBtns[i].classList.add("visible");
    }
    clearTimeout(uiBtnTimer);
    uiBtnTimer = setTimeout(function () {
      for (var j = 0; j < backBtns.length; j++) {
        backBtns[j].classList.remove("visible");
      }
      for (var k = 0; k < fullscreenBtns.length; k++) {
        fullscreenBtns[k].classList.remove("visible");
      }
    }, 3000);
  }

  // Show UI buttons on any touch/click
  document.addEventListener("click", showUIButtons);
  document.addEventListener("touchstart", showUIButtons);

  for (var bi = 0; bi < backBtns.length; bi++) {
    (function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var overlayId = btn.getAttribute("data-close");
        var overlay = document.getElementById(overlayId);
        if (overlay) {
          overlay.classList.add("hidden");
          if (overlayId === "youtube-overlay") {
            document.getElementById("youtube-container").innerHTML = "";
          }
          if (overlayId === "calendar-overlay") {
            document.getElementById("calendar-display").innerHTML = "";
          }
        }
        btn.classList.remove("visible");
      });
    })(backBtns[bi]);
  }

  // ── Timers ───────────────────────────────────────────
  var timerInterval = null;
  var timerAudioCtx = null;

  function showTimerOverlay() {
    hideSleep(); hideYouTube(); hideRecipe(); hideNotes(); hideWeather(); hideTodos(); hideCalendar(); hidePomodoroOverlay();
    document.getElementById("timer-overlay").classList.remove("hidden");
    startTimerRendering();
  }

  function hideTimerOverlay() {
    document.getElementById("timer-overlay").classList.add("hidden");
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function addTimer(label, seconds) {
    var key = db.ref("portal/timers").push().key;
    db.ref("portal/timers/" + key).set({
      label: label || "Timer",
      endsAt: Date.now() + (seconds * 1000),
      alerted: false
    });
    showTimerOverlay();
  }

  function startTimerRendering() {
    if (timerInterval) clearInterval(timerInterval);
    renderTimers();
    timerInterval = setInterval(renderTimers, 250);
  }

  function renderTimers() {
    db.ref("portal/timers").once("value", function (snap) {
      var timers = snap.val() || {};
      var display = document.getElementById("timer-display");
      var keys = Object.keys(timers);

      if (keys.length === 0) {
        display.innerHTML = '<div class="timer-empty">Set a timer from the remote</div>';
        return;
      }

      var html = '<div class="timer-list">';
      var now = Date.now();

      for (var i = 0; i < keys.length; i++) {
        var t = timers[keys[i]];
        if (!t) continue;
        var remaining = Math.max(0, Math.ceil((t.endsAt - now) / 1000));
        var isDone = remaining <= 0;
        var mins = Math.floor(remaining / 60);
        var secs = remaining % 60;
        var timeStr = mins + ":" + (secs < 10 ? "0" : "") + secs;

        if (isDone) timeStr = "Done!";

        html += '<div class="timer-entry' + (isDone ? " done" : "") + '">';
        html += '<div class="timer-label">' + escapeHtml(t.label) + '</div>';
        html += '<div class="timer-countdown">' + timeStr + '</div>';
        html += '</div>';

        // Trigger alarm sound when timer completes
        if (isDone && !t.alerted) {
          db.ref("portal/timers/" + keys[i] + "/alerted").set(true);
          playTimerAlarm();
        }
      }
      html += '</div>';
      display.innerHTML = html;
    });
  }

  function playTimerAlarm() {
    try {
      var ctx = timerAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      timerAudioCtx = ctx;
      var count = 0;
      var interval = setInterval(function () {
        if (count >= 20) { clearInterval(interval); return; }
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = (count % 2 === 0) ? 1000 : 750;
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
        count++;
      }, 300);
    } catch (e) {}
  }

  // Keep rendering timers if overlay is open
  db.ref("portal/timers").on("value", function () {
    var overlay = document.getElementById("timer-overlay");
    if (!overlay.classList.contains("hidden")) {
      renderTimers();
    }
  }, function () {});

  // ── Pomodoro ────────────────────────────────────────
  var pomodoroInterval = null;
  var pomodoroAudioCtx = null;

  function showPomodoroOverlay() {
    hideSleep(); hideYouTube(); hideRecipe(); hideNotes(); hideWeather(); hideTodos(); hideCalendar(); hideTimerOverlay();
    document.getElementById("pomodoro-overlay").classList.remove("hidden");
    startPomodoroRendering();
  }

  function hidePomodoroOverlay() {
    document.getElementById("pomodoro-overlay").classList.add("hidden");
    if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null; }
  }

  function startPomodoro(workMin, breakMin) {
    db.ref("portal/pomodoro").set({
      running: true,
      workMin: workMin,
      breakMin: breakMin,
      phase: "work",
      phaseEndsAt: Date.now() + (workMin * 60 * 1000),
      cycle: 1,
      alerted: false
    });
    showPomodoroOverlay();
  }

  function stopPomodoro() {
    db.ref("portal/pomodoro").set({ running: false });
  }

  function startPomodoroRendering() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    renderPomodoro();
    pomodoroInterval = setInterval(renderPomodoro, 250);
  }

  function renderPomodoro() {
    db.ref("portal/pomodoro").once("value", function (snap) {
      var pom = snap.val();
      var display = document.getElementById("pomodoro-display");

      if (!pom || !pom.running) {
        display.innerHTML = '<div class="pomodoro-phase stopped">Stopped</div>' +
          '<div class="pomodoro-time">--:--</div>' +
          '<div class="pomodoro-cycle">Start a session from the remote</div>';
        return;
      }

      var now = Date.now();
      var remaining = Math.max(0, Math.ceil((pom.phaseEndsAt - now) / 1000));
      var mins = Math.floor(remaining / 60);
      var secs = remaining % 60;
      var timeStr = (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;

      var phaseClass = pom.phase === "work" ? "work" : "break-phase";
      var phaseLabel = pom.phase === "work" ? "Focus" : "Break";

      display.innerHTML = '<div class="pomodoro-phase ' + phaseClass + '">' + phaseLabel + '</div>' +
        '<div class="pomodoro-time">' + timeStr + '</div>' +
        '<div class="pomodoro-cycle">Cycle ' + pom.cycle + '</div>';

      // Phase transition
      if (remaining <= 0 && !pom.alerted) {
        db.ref("portal/pomodoro/alerted").set(true);
        playPomodoroChime(pom.phase);

        // Switch phase after a brief delay
        setTimeout(function () {
          db.ref("portal/pomodoro").once("value", function (snap2) {
            var p = snap2.val();
            if (!p || !p.running) return;
            if (p.phase === "work") {
              db.ref("portal/pomodoro").update({
                phase: "break",
                phaseEndsAt: Date.now() + (p.breakMin * 60 * 1000),
                alerted: false
              });
            } else {
              db.ref("portal/pomodoro").update({
                phase: "work",
                phaseEndsAt: Date.now() + (p.workMin * 60 * 1000),
                cycle: (p.cycle || 1) + 1,
                alerted: false
              });
            }
          });
        }, 1500);
      }
    });
  }

  function playPomodoroChime(phase) {
    try {
      var ctx = pomodoroAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      pomodoroAudioCtx = ctx;
      // Different tone for work vs break
      var freqs = phase === "work" ? [523, 659, 784] : [784, 659, 523];
      for (var i = 0; i < freqs.length; i++) {
        (function (freq, delay) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          gain.gain.value = 0.25;
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.3);
        })(freqs[i], i * 0.35);
      }
    } catch (e) {}
  }

  // Keep rendering pomodoro if overlay is open
  db.ref("portal/pomodoro").on("value", function () {
    var overlay = document.getElementById("pomodoro-overlay");
    if (!overlay.classList.contains("hidden")) {
      renderPomodoro();
    }
  }, function () {});

  // ── Alarm ────────────────────────────────────────────
  function hideAlarm() {
    document.getElementById("alarm-overlay").classList.add("hidden");
    if (alarmAudio) {
      clearInterval(alarmAudio);
      alarmAudio = null;
    }
  }
})();
