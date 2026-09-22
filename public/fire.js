(function () {
  var canvas = document.getElementById("fire-overlay");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.remove();
    return;
  }

  var ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    canvas.remove();
    return;
  }

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  }

  resize();

  var buffer = document.createElement("canvas");
  buffer.width = canvas.width;
  buffer.height = canvas.height;
  var flameCtx = buffer.getContext("2d", { alpha: true });
  if (!flameCtx) {
    canvas.remove();
    return;
  }

  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  var flames = [];
  var embers = [];
  var smoke = [];
  var i;

  var span = Math.max(canvas.width, canvas.height);

  function spawnFlame(wide) {
    var angle = Math.random() * Math.PI * 2;
    var speed = (wide ? 0.22 + Math.random() * 0.45 : 0.55 + Math.random() * 0.95) * span;
    return {
      x: cx + (Math.random() - 0.5) * 30 * dpr,
      y: cy + (Math.random() - 0.5) * 30 * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: Math.random() * Math.PI * 2,
      width: (wide ? 55 + Math.random() * 80 : 24 + Math.random() * 46) * dpr,
      length: (wide ? 0.16 + Math.random() * 0.14 : 0.1 + Math.random() * 0.12) * span,
      life: wide ? 0.7 + Math.random() * 0.35 : 0.45 + Math.random() * 0.4,
      age: Math.random() * 0.03
    };
  }

  for (i = 0; i < 28; i += 1) flames.push(spawnFlame(true));
  for (i = 0; i < 64; i += 1) flames.push(spawnFlame(false));

  for (i = 0; i < 220; i += 1) {
    var angle = Math.random() * Math.PI * 2;
    var speed = (0.15 + Math.random() * 1.15) * span;
    embers.push({
      x: cx + (Math.random() - 0.5) * 12 * dpr,
      y: cy + (Math.random() - 0.5) * 12 * dpr,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (1.6 + Math.random() * 3.2) * dpr,
      life: 0.7 + Math.random() * 0.7,
      age: Math.random() * 0.1
    });
  }

  for (i = 0; i < 18; i += 1) {
    var smokeAngle = Math.random() * Math.PI * 2;
    smoke.push({
      x: cx,
      y: cy,
      vx: Math.cos(smokeAngle) * (40 + Math.random() * 90) * dpr,
      vy: Math.sin(smokeAngle) * (30 + Math.random() * 70) * dpr - 60 * dpr,
      size: (30 + Math.random() * 50) * dpr,
      life: 1.1 + Math.random() * 0.6,
      age: Math.random() * 0.08
    });
  }

  function drawFlame(g, flame, life) {
    var mag = Math.hypot(flame.vx, flame.vy) || 1;
    var nx = flame.vx / mag;
    var ny = flame.vy / mag;
    var px = -ny;
    var py = nx;
    var steps = 7;
    var s;

    for (s = 0; s < steps; s += 1) {
      var u = s / (steps - 1);
      var wobble = Math.sin(flame.phase + u * 5.5 + flame.age * 22) * flame.width * 0.45 * u;
      var reach = flame.length * (0.25 + u);
      var x = flame.x - nx * reach + px * wobble;
      var y = flame.y - ny * reach + py * wobble;
      var flicker = 0.82 + 0.18 * Math.sin(flame.age * 36 + flame.phase + s);
      var radius = flame.width * (1 - u * 0.78) * flicker;
      if (radius < 1) continue;

      var heat = (1 - u) * life;
      var red = 255;
      var green = Math.floor(40 + heat * 200);
      var blue = Math.floor(heat * heat * 160);
      var alpha = Math.max(0, (0.15 + heat * 0.8) * life * (1 - u * 0.35));
      var blob = g.createRadialGradient(x, y, 0, x, y, radius);
      blob.addColorStop(0, "rgba(" + red + "," + green + "," + blue + "," + alpha + ")");
      blob.addColorStop(0.45, "rgba(255," + Math.floor(30 + heat * 90) + ",0," + (alpha * 0.55) + ")");
      blob.addColorStop(1, "rgba(140,20,0,0)");
      g.fillStyle = blob;
      g.beginPath();
      g.arc(x, y, radius, 0, Math.PI * 2);
      g.fill();
    }
  }

  var start = performance.now();
  var duration = 2600;
  var last = start;

  function frame(now) {
    var t = (now - start) / duration;
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    var fade = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";

    smoke.forEach(function (puff) {
      puff.age += dt;
      var life = 1 - puff.age / puff.life;
      if (life <= 0) return;
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.vy -= 40 * dpr * dt;
      puff.vx *= 0.99;
      puff.size += 22 * dpr * dt;
      var alpha = life * fade * 0.22;
      var haze = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.size);
      haze.addColorStop(0, "rgba(48, 28, 18, " + alpha + ")");
      haze.addColorStop(0.6, "rgba(24, 16, 14, " + (alpha * 0.45) + ")");
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
      ctx.fill();
    });

    flameCtx.clearRect(0, 0, buffer.width, buffer.height);
    flameCtx.globalCompositeOperation = "lighter";
    flames.forEach(function (flame) {
      flame.age += dt;
      var life = 1 - flame.age / flame.life;
      if (life <= 0) return;
      flame.vx += Math.sin(flame.age * 13 + flame.phase) * 140 * dpr * dt;
      flame.vy += Math.cos(flame.age * 9 + flame.phase) * 70 * dpr * dt;
      flame.vy -= 70 * dpr * dt;
      flame.vx *= 0.988;
      flame.vy *= 0.988;
      flame.x += flame.vx * dt;
      flame.y += flame.vy * dt;
      drawFlame(flameCtx, flame, life * fade);
    });

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(" + Math.max(1, 1.4 * dpr) + "px)";
    ctx.drawImage(buffer, 0, 0);
    ctx.filter = "none";

    var core = Math.max(0, 1 - t * 1.8) * fade;
    if (core > 0.02) {
      var jitterX = Math.sin(now * 0.02) * 8 * dpr;
      var jitterY = Math.cos(now * 0.017) * 6 * dpr;
      var heartRadius = Math.min(canvas.width, canvas.height) * 0.28;
      var heart = ctx.createRadialGradient(cx + jitterX, cy + jitterY, 0, cx, cy, heartRadius);
      heart.addColorStop(0, "rgba(255,255,230," + (0.85 * core) + ")");
      heart.addColorStop(0.35, "rgba(255,170,40," + (0.55 * core) + ")");
      heart.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = heart;
      ctx.beginPath();
      ctx.arc(cx, cy, heartRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    embers.forEach(function (ember) {
      ember.age += dt;
      var life = 1 - ember.age / ember.life;
      if (life <= 0) return;
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      ember.vy += 30 * dpr * dt;
      ember.vx *= 0.992;
      ember.vy *= 0.992;
      var cool = 1 - life;
      var red = 255;
      var green = Math.floor(220 - cool * 190);
      var blue = Math.floor(160 * life * life);
      ctx.fillStyle = "rgba(" + red + "," + Math.max(green, 20) + "," + blue + "," + (life * fade) + ")";
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size * (0.4 + life), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    if (t < 1) {
      window.requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  window.requestAnimationFrame(frame);
})();
