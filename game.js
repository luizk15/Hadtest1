const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const healthEl = document.getElementById('health');

const state = {
  running: false,
  time: 0,
  score: 0,
  wave: 1,
  lastSpawn: 0,
  best: 0,
  gameOver: false,
};

function showStartCard() {
  document.querySelector('.card .eyebrow').textContent = 'NEON ROGUE';
  document.querySelector('.card h1').textContent = 'VECTOR DRIFT';
  document.querySelector('.card .description').textContent =
    'Navegue pelo campo, abata drones e sobreviva às ondas até a linha de frente quebrar.';
  document.querySelector('.card ul').innerHTML =
    '<li>WASD / setas para mover</li><li>Mouse para mirar</li><li>Botão esquerdo / Espaço para atirar</li><li>R para reiniciar</li>';
  startButton.textContent = 'Iniciar';
}

function startMatch() {
  showStartCard();
  resetGame();
  overlay.classList.remove('visible');
}

const pointer = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  down: false,
};

const keys = {};
const stars = [];
const bullets = [];
const enemies = [];
const particles = [];
const pickups = [];

const effects = {
  flash: 0,
};

let player;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createPlayer() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: 260,
    health: 100,
    fireCooldown: 0,
    invuln: 0,
  };
}

function resetGame() {
  player = createPlayer();
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  pickups.length = 0;
  state.time = 0;
  state.running = true;
  state.score = 0;
  state.wave = 1;
  state.lastSpawn = 0;
  state.gameOver = false;
  effects.flash = 0;
  updateHud();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(240, Math.floor(rect.height));
  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (!player) {
    player = createPlayer();
  }

  player.x = clamp(player.x, 30, width - 30);
  player.y = clamp(player.y, 30, height - 30);
  pointer.x = clamp(pointer.x, 0, width);
  pointer.y = clamp(pointer.y, 0, height);
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(state.score));
  waveEl.textContent = String(state.wave);
  healthEl.textContent = `${Math.max(0, Math.ceil(player.health))}%`;
}

function makeStars() {
  const amount = 110;
  stars.length = 0;
  for (let i = 0; i < amount; i += 1) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.7 + 0.2,
      drift: Math.random() * 0.5 + 0.2,
    });
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = Math.random() * canvas.width;
    y = -30;
  } else if (side === 1) {
    x = canvas.width + 30;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + 30;
  } else {
    x = -30;
    y = Math.random() * canvas.height;
  }

  const roll = Math.random();
  let radius = 14;
  let speed = 70 + state.wave * 10;
  let health = 28 + state.wave * 3;
  let color = '#ff5e7d';
  let damage = 12;

  if (roll < 0.66) {
    radius = 16;
    speed = 85 + state.wave * 12;
    health = 32 + state.wave * 4;
    color = '#ff7293';
    damage = 15;
  } else if (roll < 0.9) {
    radius = 22;
    speed = 62 + state.wave * 8;
    health = 52 + state.wave * 6;
    color = '#ffb347';
    damage = 18;
  } else {
    radius = 18;
    speed = 110 + state.wave * 14;
    health = 24 + state.wave * 3;
    color = '#ff4fd8';
    damage = 20;
  }

  enemies.push({
    x,
    y,
    radius,
    speed,
    health,
    maxHealth: health,
    color,
    damage,
    spin: Math.random() * Math.PI * 2,
    type: roll < 0.66 ? 'drone' : roll < 0.9 ? 'brute' : 'hunter',
  });
}

function fireBullet() {
  if (!state.running || player.fireCooldown > 0) return;

  const angle = Math.atan2(pointer.y - player.y, pointer.x - player.x) || 0;
  const speed = 500;
  bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 5,
    life: 1.1,
    damage: 18,
  });
  player.fireCooldown = 0.14;
}

function addParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 110;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.8,
      maxLife: 0.5 + Math.random() * 0.8,
      color,
      radius: 2 + Math.random() * 3,
    });
  }
}

function maybeDropPickup(x, y) {
  if (Math.random() < 0.22) {
    pickups.push({
      x,
      y,
      radius: 7,
      type: Math.random() < 0.5 ? 'repair' : 'charge',
      pulse: Math.random() * Math.PI * 2,
    });
  }
}

function damagePlayer(amount) {
  if (!player || player.invuln > 0 || !state.running) return;
  player.health -= amount;
  player.invuln = 0.55;
  effects.flash = 0.22;
  addParticles(player.x, player.y, '#ff7fa9', 18);

  if (player.health <= 0) {
    player.health = 0;
    state.running = false;
    state.gameOver = true;
    state.best = Math.max(state.best, Math.floor(state.score));
    overlay.classList.add('visible');
    document.querySelector('.card .eyebrow').textContent = 'FIM DE JOGO';
    document.querySelector('.card h1').textContent = 'FALHA';
    document.querySelector('.card .description').textContent =
      `Pontuação final: ${Math.floor(state.score)}. A linha de frente caiu; tente novamente.`;
    document.querySelector('.card ul').innerHTML =
      '<li>R para reiniciar</li><li>Mouse para mirar</li><li>Espaço para disparar</li>';
    startButton.textContent = 'Reiniciar';
  }
}

function update(dt) {
  if (!state.running) return;

  state.time += dt;
  const width = canvas.width;
  const height = canvas.height;

  if (state.time - state.lastSpawn > Math.max(0.8, 1.8 - state.wave * 0.12)) {
    spawnEnemy();
    state.lastSpawn = state.time;
  }

  const moveX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const moveY = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const mag = Math.hypot(moveX, moveY) || 1;
  const nx = moveX / mag;
  const ny = moveY / mag;
  player.x += nx * player.speed * dt;
  player.y += ny * player.speed * dt;
  player.x = clamp(player.x, 26, width - 26);
  player.y = clamp(player.y, 26, height - 26);

  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);

  if (pointer.down) {
    fireBullet();
  }

  state.wave = Math.max(1, Math.floor(state.score / 120) + 1);

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (bullet.life <= 0 || bullet.x < -20 || bullet.y < -20 || bullet.x > width + 20 || bullet.y > height + 20) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const d = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
      if (d < bullet.radius + enemy.radius) {
        enemy.health -= bullet.damage;
        bullets.splice(i, 1);
        addParticles(bullet.x, bullet.y, '#71f8ff', 6);

        if (enemy.health <= 0) {
          const reward = enemy.type === 'brute' ? 30 : enemy.type === 'hunter' ? 22 : 18;
          state.score += reward;
          maybeDropPickup(enemy.x, enemy.y);
          addParticles(enemy.x, enemy.y, enemy.color, 18);
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speedFactor = enemy.type === 'hunter' ? 1.2 : enemy.type === 'brute' ? 0.82 : 1;
    enemy.x += (dx / dist) * enemy.speed * speedFactor * dt;
    enemy.y += (dy / dist) * enemy.speed * speedFactor * dt;
    enemy.spin += dt * 3;

    if (dist < enemy.radius + player.radius + 1) {
      damagePlayer(enemy.damage * dt * 18);
    }
  }

  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.pulse += dt * 5;
    const d = Math.hypot(player.x - pickup.x, player.y - pickup.y);
    if (d < player.radius + pickup.radius + 6) {
      if (pickup.type === 'repair') {
        player.health = clamp(player.health + 24, 0, 100);
      } else {
        player.fireCooldown = Math.min(player.fireCooldown, 0.04);
        state.score += 12;
      }
      addParticles(pickup.x, pickup.y, pickup.type === 'repair' ? '#b8ff7a' : '#71f8ff', 12);
      pickups.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const part = particles[i];
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.life -= dt;
    if (part.life <= 0) particles.splice(i, 1);
  }

  updateHud();
}

function drawBackground() {
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = '#040915';
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    star.y += star.drift;
    if (star.y > height + 4) {
      star.y = -4;
      star.x = Math.random() * width;
    }
    ctx.beginPath();
    ctx.fillStyle = `rgba(200, 230, 255, ${star.alpha})`;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(108, 155, 255, 0.08)';
  ctx.lineWidth = 1;
  const step = 36;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const dir = Math.atan2(pointer.y - player.y, pointer.x - player.x);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(dir);
  ctx.shadowColor = '#71f8ff';
  ctx.shadowBlur = 18;
  ctx.fillStyle = player.invuln > 0 ? '#d9f0ff' : '#71f8ff';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -12);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0b1d32';
  ctx.fillRect(-2, -4, 12, 8);
  ctx.restore();

  ctx.strokeStyle = 'rgba(113,248,255,0.4)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.spin);
  ctx.shadowColor = enemy.color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = enemy.color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  if (enemy.type === 'brute') {
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius * 0.8, enemy.radius * 0.5);
    ctx.lineTo(0, enemy.radius * 0.8);
    ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.5);
    ctx.closePath();
  } else if (enemy.type === 'hunter') {
    ctx.moveTo(-enemy.radius, 0);
    ctx.lineTo(0, -enemy.radius * 1.15);
    ctx.lineTo(enemy.radius, 0);
    ctx.lineTo(0, enemy.radius * 1.15);
    ctx.closePath();
  } else {
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 / 6) * i;
      const px = Math.cos(a) * enemy.radius;
      const py = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();

  const barWidth = enemy.radius * 2.1;
  const healthRatio = clamp(enemy.health / enemy.maxHealth, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(-barWidth / 2, enemy.radius + 10, barWidth, 4);
  ctx.fillStyle = '#ff7ca3';
  ctx.fillRect(-barWidth / 2, enemy.radius + 10, barWidth * healthRatio, 4);
  ctx.restore();
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.beginPath();
    ctx.fillStyle = '#71f8ff';
    ctx.shadowColor = '#71f8ff';
    ctx.shadowBlur = 16;
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawPickups() {
  for (const pickup of pickups) {
    const color = pickup.type === 'repair' ? '#b8ff7a' : '#71f8ff';
    ctx.save();
    ctx.translate(pickup.x, pickup.y);
    ctx.rotate(pickup.pulse);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, -pickup.radius * 1.4);
    ctx.lineTo(pickup.radius, 0);
    ctx.lineTo(0, pickup.radius * 1.4);
    ctx.lineTo(-pickup.radius, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVignette() {
  const grd = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    80,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.8,
  );
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
  drawBackground();
  drawPickups();
  drawBullets();
  for (const enemy of enemies) drawEnemy(enemy);
  drawPlayer();
  drawParticles();

  if (effects.flash > 0) {
    ctx.fillStyle = `rgba(255, 100, 140, ${effects.flash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    effects.flash = Math.max(0, effects.flash - 0.04);
  }

  drawVignette();
}

function tick(time) {
  const dt = Math.min(0.033, (time - (tick.last ?? time)) / 1000 || 0.016);
  tick.last = time;

  if (state.running) {
    update(dt);
  }

  render();
  requestAnimationFrame(tick);
}

function onPointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
}

function onPointerDown(event) {
  pointer.down = true;
  onPointerMove(event);
}

function onPointerUp() {
  pointer.down = false;
}

function enableInput() {
  window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'Space') {
      event.preventDefault();
      fireBullet();
    }
    if (event.code === 'KeyR') {
      startMatch();
    }
  });

  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  window.addEventListener('blur', () => {
    pointer.down = false;
    Object.keys(keys).forEach((key) => {
      keys[key] = false;
    });
  });
}

function init() {
  resizeCanvas();
  makeStars();
  player = createPlayer();
  state.running = false;
  overlay.classList.add('visible');
  updateHud();
  enableInput();

  startButton.addEventListener('click', startMatch);

  requestAnimationFrame(tick);
}

window.addEventListener('resize', resizeCanvas);
init();
