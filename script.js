// Simple endless runner using canvas. Tap/click/space to jump. Restart on game over.
(() => {
  const canvas = document.getElementById("gameCanvas");
  const overlay = document.getElementById("overlay");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const ctx = canvas.getContext("2d");

  // image assets (background and obstacle). You can replace these files in /assets
  const bgImg = new Image();
  bgImg.src = "assets/bg.svg";
  const obsImg = new Image();
  obsImg.src = "assets/obstacle.svg";
  // player image (optional). Defaults to provided asset; user can replace via file input.
  let playerImg = new Image();
  playerImg.src = "assets/obj.png";

  // --- Audio (using WebAudio API). We synthesize simple tones so no external files are required.
  let audioCtx = null;
  let audioState = {
    unlocked: false,
    bgLoopId: null,
    activeNodes: new Set(),
  };

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("WebAudio not supported:", e);
      audioCtx = null;
    }
  }

  function playTone(
    freq,
    time = 0,
    duration = 0.12,
    type = "sine",
    volume = 0.12
  ) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime + time;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + duration + 0.02);
    audioState.activeNodes.add(o);
    o.onended = () => audioState.activeNodes.delete(o);
  }

  // Background music: simple repeating arpeggio using short tones
  // File-based audio elements (optional). If you add files named below in /assets they will be used.
  const bgAudio = new Audio("assets/bg.mp3");
  bgAudio.preload = "auto";
  const startAudio = new Audio("assets/back.mp3");
  startAudio.preload = "auto";
  const gameOverAudio = new Audio("assets/over.mp3");
  gameOverAudio.preload = "auto";
  const clickAudio = new Audio("assets/jump.mp3");
  clickAudio.preload = "auto";

  // synth fallback for background music
  function startBackgroundMusicSynth() {
    if (!audioCtx) return;
    if (audioState.bgLoopId) return; // already running
    const melody = [440, 550, 660, 880];
    let idx = 0;
    audioState.bgLoopId = setInterval(() => {
      playTone(melody[idx % melody.length], 0, 0.16, "sine", 0.09);
      playTone(
        melody[(idx + 2) % melody.length] * 0.5,
        0.06,
        0.18,
        "triangle",
        0.06
      );
      idx++;
    }, 360);
  }

  // unified start/stop that prefers audio files and falls back to synth
  function startBackgroundMusic() {
    // try file-based audio first
    try {
      if (bgAudio && bgAudio.src) {
        bgAudio.loop = true;
        const p = bgAudio.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {
            // fallback to synth
            initAudio();
            startBackgroundMusicSynth();
          });
          return;
        }
      }
    } catch (e) {
      // ignore and fallback
    }
    // fallback
    initAudio();
    startBackgroundMusicSynth();
  }

  function stopBackgroundMusic() {
    // stop file audio if playing
    try {
      if (bgAudio && !bgAudio.paused) {
        bgAudio.pause();
        bgAudio.currentTime = 0;
      }
    } catch (e) {}
    // stop synth if active
    if (audioState.bgLoopId) {
      clearInterval(audioState.bgLoopId);
      audioState.bgLoopId = null;
    }
  }

  function playGameOverMusic() {
    // try file-based audio first
    try {
      if (gameOverAudio && gameOverAudio.src) {
        gameOverAudio.currentTime = 0;
        const p = gameOverAudio.play();
        if (p && typeof p.then === "function") {
          p.catch(() => {
            // fallback to synth
            initAudio();
            // short descending sequence
            const base = 780;
            playTone(base, 0, 0.18, "sawtooth", 0.16);
            playTone(base * 0.8, 0.15, 0.22, "sawtooth", 0.12);
            playTone(base * 0.6, 0.34, 0.26, "sawtooth", 0.09);
          });
          return;
        }
      }
    } catch (e) {}
    // fallback synth
    initAudio();
    const base = 780;
    playTone(base, 0, 0.18, "sawtooth", 0.16);
    playTone(base * 0.8, 0.15, 0.22, "sawtooth", 0.12);
    playTone(base * 0.6, 0.34, 0.26, "sawtooth", 0.09);
  }

  // play start sound then begin background music; prefers file, falls back to synth
  function playStartSound() {
    try {
      if (startAudio && startAudio.src) {
        startAudio.currentTime = 0;
        const p = startAudio.play();
        if (p && typeof p.then === "function") {
          // when start audio finishes, start bg music
          startAudio.onended = () => {
            startAudio.onended = null;
            startBackgroundMusic();
          };
          p.catch(() => {
            // fallback to synth flourish then start bg
            initAudio();
            const base = 660;
            playTone(base, 0, 0.12, "sine", 0.12);
            playTone(base * 1.25, 0.12, 0.12, "triangle", 0.08);
            setTimeout(startBackgroundMusic, 220);
          });
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    // fallback synth flourish immediately then start bg
    initAudio();
    const base = 660;
    playTone(base, 0, 0.12, "sine", 0.12);
    playTone(base * 1.25, 0.12, 0.12, "triangle", 0.08);
    setTimeout(startBackgroundMusic, 220);
  }

  function playClickSound() {
    // try file-based audio first (clone so it can overlap)
    try {
      if (clickAudio && clickAudio.src) {
        const c = clickAudio.cloneNode();
        c.play().catch(() => {
          initAudio();
          playTone(1100, 0, 0.06, "square", 0.18);
        });
        return;
      }
    } catch (e) {}
    initAudio();
    playTone(1100, 0, 0.06, "square", 0.18);
  }

  // ensure user gesture unlocks audio on mobile browsers
  function unlockAudio() {
    if (audioState.unlocked) return;
    initAudio();
    if (audioCtx && typeof audioCtx.resume === "function") {
      audioCtx.resume().catch(() => {});
    }
    // some platforms require a user gesture to allow HTMLAudio playback - a short play attempt helps
    try {
      if (clickAudio && clickAudio.src) {
        // play muted then pause quickly to unlock on some browsers
        clickAudio.volume = 0;
        const p = clickAudio.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            clickAudio.pause();
            clickAudio.currentTime = 0;
            clickAudio.volume = 1;
          }).catch(() => {});
        }
      }
    } catch (e) {}
    audioState.unlocked = true;
  }

  // Hi-DPI support
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // Game constants
  const GROUND_Y_RATIO = 0.78; // portion of canvas height for ground line
  const GRAVITY = 2200; // px/s^2
  const JUMP_VELOCITY = -760; // px/s
  const PLAYER_SIZE = { w: 48, h: 48 };

  let width = () => canvas.clientWidth;
  let height = () => canvas.clientHeight;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Game state
  let player = {
    x: 80,
    y: 0,
    vy: 0,
    w: PLAYER_SIZE.w,
    h: PLAYER_SIZE.h,
    onGround: false,
  };
  let obstacles = [];
  let lastSpawn = 0;
  let spawnInterval = 1.0; // seconds
  let gameSpeed = 420; // px/s moving left
  let lastTime = 0;
  let running = false; // whether the game is in 'playing' state
  let score = 0;
  let best = Number(localStorage.getItem("simple-runner-best") || 0);

  bestEl.textContent = `Best: ${Math.floor(best)}`;

  function reset() {
    player.y = groundY() - player.h;
    player.vy = 0;
    player.onGround = true;
    obstacles = [];
    lastSpawn = 0;
    spawnInterval = 0.9;
    gameSpeed = 420;
    score = 0;
    running = true;
    overlay.classList.add("hidden");
    lastTime = performance.now();
    // audio: ensure audio unlocked and play start sound, then start background music
    unlockAudio();
    playStartSound();
  }

  function groundY() {
    return Math.floor(height() * GROUND_Y_RATIO);
  }

  function spawnObstacle() {
    // Vary obstacle height/width and gap (like hurdles)
    const h = Math.floor(rand(24, 90));
    const w = Math.floor(rand(20, 46));
    const y = groundY() - h;
    const x = width() + 20;
    obstacles.push({ x, y, w, h });
  }

  function step(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (running) {
      // physics
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y + player.h >= groundY()) {
        player.y = groundY() - player.h;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      // spawn logic
      lastSpawn += dt;
      if (lastSpawn > spawnInterval) {
        spawnObstacle();
        lastSpawn = 0;
        // gradually increase difficulty
        spawnInterval = Math.max(0.55, spawnInterval - 0.01);
        gameSpeed = Math.min(920, gameSpeed + 6);
      }

      // move obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= gameSpeed * dt;
        if (o.x + o.w < -20) obstacles.splice(i, 1);
      }

      // scoring (distance-based)
      score += dt * 100;
      scoreEl.textContent = `Score: ${Math.floor(score)}`;

      // collisions
      for (const o of obstacles) {
        if (rectsOverlap(player, o)) {
          running = false;
          overlay.classList.remove("hidden");
          overlay.textContent = `Game Over — Tap/Click/Space to restart`;
          // update best
          if (score > best) {
            best = Math.floor(score);
            localStorage.setItem("simple-runner-best", best);
          }
          bestEl.textContent = `Best: ${best}`;
          // audio: stop background and play game-over music
          stopBackgroundMusic();
          unlockAudio();
          playGameOverMusic();
          break;
        }
      }
    }

    draw();
    requestAnimationFrame(step);
  }

  function rectsOverlap(a, b) {
    return !(
      a.x + a.w < b.x ||
      a.x > b.x + b.w ||
      a.y + a.h < b.y ||
      a.y > b.y + b.h
    );
  }

  function draw() {
    const w = width();
    const h = height();
    // draw background image if available, otherwise clear + gradient
    if (bgImg.complete && bgImg.naturalWidth) {
      // draw the background to fill canvas
      ctx.drawImage(bgImg, 0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
      // fallback ground area and atmosphere if image not loaded
      ctx.fillStyle = "#bfe6ff";
      ctx.fillRect(0, 0, w, h);
    }

    // ground
    ctx.fillStyle = "#6A4C30";
    ctx.fillRect(0, groundY(), w, h - groundY());

    // draw player (simple square with eye)
    if (playerImg && playerImg.complete && playerImg.naturalWidth) {
      // draw user-provided player sprite
      ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
    } else {
      ctx.fillStyle = "#FF6B6B";
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = "#fff";
      ctx.fillRect(
        player.x + player.w * 0.55,
        player.y + player.h * 0.25,
        player.w * 0.12,
        player.h * 0.12
      );
    }

    // obstacles (draw sprite if loaded, otherwise fallback rectangle)
    for (const o of obstacles) {
      if (obsImg && obsImg.complete && obsImg.naturalWidth) {
        // draw obstacle image scaled to obstacle box
        ctx.drawImage(obsImg, o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = "#27496d";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // small highlight
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(
          o.x + 4,
          o.y + 6,
          Math.max(4, o.w - 8),
          Math.min(10, o.h - 8)
        );
      }
    }

    // optional ground line
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY());
    ctx.lineTo(w, groundY());
    ctx.stroke();
  }

  // Input handlers
  function jump() {
    // ensure audio is unlocked on the first user gesture
    unlockAudio();
    // play a small click/jump sound
    playClickSound();

    if (!running) {
      // restart
      reset();
      return;
    }
    if (player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
    }
  }

  // Touch & mouse
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      jump();
    },
    { passive: false }
  );
  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    jump();
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      jump();
    }
  });

  // File input handlers for user-provided images (player, obstacle, background)
  function readImageFile(file, cb) {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => cb(null, img);
      img.onerror = (err) => cb(err || new Error("image load error"));
      img.src = r.result;
    };
    r.onerror = (err) => cb(err || new Error("file read error"));
    r.readAsDataURL(file);
  }

  const playerFile = document.getElementById("playerFile");
  const obstacleFile = document.getElementById("obstacleFile");
  const bgFile = document.getElementById("bgFile");
  const clearPlayer = document.getElementById("clearPlayer");
  const clearObstacle = document.getElementById("clearObstacle");
  const clearBg = document.getElementById("clearBg");

  playerFile?.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    readImageFile(f, (err, img) => {
      if (err) {
        console.warn("player image load failed", err);
        return;
      }
      playerImg = img;
    });
  });

  obstacleFile?.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    readImageFile(f, (err, img) => {
      if (err) {
        console.warn("obstacle image load failed", err);
        return;
      }
      obsImg.src = img.src; // reuse obsImg variable so draw code uses it
      // assign natural dims when available
      obsImg.onload = () => {
        /* nothing else needed */
      };
    });
  });

  bgFile?.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    readImageFile(f, (err, img) => {
      if (err) {
        console.warn("bg image load failed", err);
        return;
      }
      bgImg.src = img.src; // replace background
    });
  });

  clearPlayer?.addEventListener("click", () => {
    playerImg = null;
    playerFile.value = "";
  });
  clearObstacle?.addEventListener("click", () => {
    obsImg.src = "assets/obstacle.svg";
    obstacleFile.value = "";
  });
  clearBg?.addEventListener("click", () => {
    bgImg.src = "assets/bg.svg";
    bgFile.value = "";
  });

  // initialize sizes and player position
  function initSizes() {
    resize();
    player.x = Math.max(48, width() * 0.12);
    player.w = Math.min(PLAYER_SIZE.w, Math.floor(width() * 0.08));
    player.h = Math.min(PLAYER_SIZE.h, Math.floor(height() * 0.09));
    player.y = groundY() - player.h;
  }
  initSizes();
  window.addEventListener("resize", initSizes);

  // Start paused with overlay instructions
  overlay.classList.remove("hidden");
  overlay.textContent =
    "Tap / Click / Space to jump — Tap to restart on Game Over";
  running = false;

  requestAnimationFrame(step);
})();
