'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'KeyS', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de nave ─────────────────────────────────────────────────────────────
const SHIP_SKINS = [
  {
    name: 'CLASICA',
    stroke: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    points: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    cockpit: null,
  },
  {
    name: 'NEON',
    stroke: '#50dcff',
    flame: 'rgba(255, 209, 102, 0.9)',
    points: [[22, 0], [-11, -11], [-4, 0], [-11, 11]],
    cockpit: { x: 4, y: 0, radius: 3, color: '#ff5cff' },
  },
  {
    name: 'HALCON',
    stroke: '#ffd166',
    flame: 'rgba(80, 220, 255, 0.9)',
    points: [[22, 0], [-15, -7], [-5, -2], [-5, 2], [-15, 7]],
    cockpit: { x: 3, y: 0, radius: 2.5, color: '#fff' },
  },
  {
    name: 'TITAN',
    stroke: '#b7ff6a',
    flame: 'rgba(255, 100, 60, 0.9)',
    points: [[18, 0], [-8, -12], [-15, -5], [-11, 0], [-15, 5], [-8, 12]],
    cockpit: { x: 1, y: 0, radius: 3, color: '#b7ff6a' },
  },
];

let currentShipSkin = 0;

function getShipSkin() {
  return SHIP_SKINS[currentShipSkin];
}

function nextShipSkin() {
  currentShipSkin = (currentShipSkin + 1) % SHIP_SKINS.length;
}

function drawShipShape(scale = 1, thrusting = false) {
  const skin = getShipSkin();
  const points = skin.points;

  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.5 * scale;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0] * scale, points[0][1] * scale);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0] * scale, points[i][1] * scale);
  ctx.closePath();
  ctx.stroke();

  if (skin.cockpit) {
    ctx.fillStyle = skin.cockpit.color;
    ctx.beginPath();
    ctx.arc(
      skin.cockpit.x * scale,
      skin.cockpit.y * scale,
      skin.cockpit.radius * scale,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Llama del propulsor
  if (thrusting && Math.random() > 0.35) {
    ctx.beginPath();
    ctx.moveTo(-8 * scale, -4 * scale);
    ctx.lineTo((-8 - rand(6, 14)) * scale, 0);
    ctx.lineTo(-8 * scale, 4 * scale);
    ctx.strokeStyle = skin.flame;
    ctx.stroke();
  }
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Power-up ──────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 14;
    this.dead = false;
    this.pulse = 0;
  }

  update(dt) {
    this.pulse += dt * 5;
  }

  draw() {
    const glow = 0.55 + Math.sin(this.pulse) * 0.25;
    const isTripleShot = this.type === 'tripleShot';
    const color = isTripleShot ? '#ff7ad9' : '#50dcff';

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = isTripleShot
      ? `rgba(255, 122, 217, ${glow.toFixed(2)})`
      : `rgba(80, 220, 255, ${glow.toFixed(2)})`;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isTripleShot ? 'x3' : 'x2', 0, 1);
    ctx.restore();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño
const SHOOTING_STAR_POINTS = 150;
const SHOOTING_STAR_INTERVAL = 12;
const SHOOTING_STAR_TTL = 6;

class Asteroid {
  constructor(x, y, size = 3, type = 'normal') {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.type = type;
    this.radius = RADII[size];
    this.dead = false;
    this.ttl = type === 'shootingStar' ? SHOOTING_STAR_TTL : Infinity;

    const angle = rand(0, Math.PI * 2);
    const speed = type === 'shootingStar'
      ? SPEEDS[size] * 3.4 + rand(20, 50)
      : SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = type === 'shootingStar' ? rand(-4, 4) : rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    if (this.type === 'shootingStar') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
    }
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() {
    if (this.type === 'shootingStar') return [];
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.type === 'shootingStar' ? '#ffd166' : '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (this.type === 'shootingStar') {
      const speed = Math.hypot(this.vx, this.vy);
      const tx = speed > 0 ? this.vx / speed : 0;
      const ty = speed > 0 ? this.vy / speed : 0;
      const alpha = Math.max(0.2, Math.min(1, this.ttl / SHOOTING_STAR_TTL));

      ctx.strokeStyle = `rgba(255, 209, 102, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - tx * this.radius * 0.8, this.y - ty * this.radius * 0.8);
      ctx.lineTo(this.x - tx * this.radius * 3.4, this.y - ty * this.radius * 3.4);
      ctx.stroke();
    }
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoostTimer = 0;
    this.tripleShotTimer = 0;
    this.shieldTimer = 0;
    this.shieldCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.shieldTimer   > 0) this.shieldTimer   -= dt;
    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const speedMultiplier = this.speedBoostTimer > 0 ? 2 : 1;

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    }
    if (this.tripleShotTimer > 0) {
      this.tripleShotTimer = Math.max(0, this.tripleShotTimer - dt);
    }

    if ((pressed('ShiftLeft') || pressed('ShiftRight')) && this.shieldTimer <= 0 && this.shieldCooldown <= 0) {
      this.shieldTimer = SHIELD_DURATION;
      this.shieldCooldown = SHIELD_COOLDOWN;
    }

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * speedMultiplier * dt;
      this.vy += Math.sin(this.angle) * THRUST * speedMultiplier * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer <= 0) return [new Bullet(ox, oy, this.angle)];

    const SIDE_OFFSET = 10;
    const sideX = Math.cos(this.angle + Math.PI / 2) * SIDE_OFFSET;
    const sideY = Math.sin(this.angle + Math.PI / 2) * SIDE_OFFSET;
    return [
      new Bullet(ox, oy, this.angle),
      new Bullet(ox + sideX, oy + sideY, this.angle),
      new Bullet(ox - sideX, oy - sideY, this.angle),
    ];
  }

  absorbHit() {
    this.shieldTimer = 0;
    this.shieldCooldown = SHIELD_COOLDOWN;
  }

  get shieldActive() {
    return this.shieldTimer > 0;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.shieldActive) {
      const pulse = 0.55 + Math.sin(this.shieldTimer * 18) * 0.2;
      ctx.save();
      ctx.rotate(-this.angle);
      ctx.strokeStyle = `rgba(90, 180, 255, ${pulse.toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawShipShape(1, this.thrusting);
    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerUpTimer;
let tripleShotPowerUpTimer;
let shootingStarTimer;
const POWER_UP_INTERVAL = 15;
const SPEED_BOOST_DURATION = 5;
const TRIPLE_SHOT_POWER_UP_INTERVAL = 20;
const TRIPLE_SHOT_DURATION = 5;
const SHIELD_DURATION = 2.5;
const SHIELD_COOLDOWN = 7;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnSpeedPowerUp() {
  const MARGIN = 40;
  powerUps.push(new PowerUp(rand(MARGIN, W - MARGIN), rand(MARGIN, H - MARGIN), 'speed'));
}

function spawnTripleShotPowerUp() {
  const MARGIN = 40;
  powerUps.push(new PowerUp(rand(MARGIN, W - MARGIN), rand(MARGIN, H - MARGIN), 'tripleShot'));
}

function spawnShootingStar() {
  const MARGIN = 60;
  const side = randInt(0, 3);
  let x, y;

  if (side === 0) { x = -MARGIN; y = rand(0, H); }
  else if (side === 1) { x = W + MARGIN; y = rand(0, H); }
  else if (side === 2) { x = rand(0, W); y = -MARGIN; }
  else { x = rand(0, W); y = H + MARGIN; }

  const star = new Asteroid(x, y, 2, 'shootingStar');
  const angle = Math.atan2(
    rand(H * 0.25, H * 0.75) - y,
    rand(W * 0.25, W * 0.75) - x,
  ) + rand(-0.35, 0.35);
  const speed = rand(230, 300);
  star.vx = Math.cos(angle) * speed;
  star.vy = Math.sin(angle) * speed;
  asteroids.push(star);
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerUpTimer = POWER_UP_INTERVAL;
  tripleShotPowerUpTimer = TRIPLE_SHOT_POWER_UP_INTERVAL;
  shootingStarTimer = SHOOTING_STAR_INTERVAL;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  powerUpTimer = POWER_UP_INTERVAL;
  tripleShotPowerUpTimer = TRIPLE_SHOT_POWER_UP_INTERVAL;
  shootingStarTimer = SHOOTING_STAR_INTERVAL;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoostTimer = 0;
  ship.tripleShotTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    powerUps.forEach(p => p.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  powerUpTimer -= dt;
  if (powerUpTimer <= 0) {
    spawnSpeedPowerUp();
    powerUpTimer = POWER_UP_INTERVAL;
  }

  tripleShotPowerUpTimer -= dt;
  if (tripleShotPowerUpTimer <= 0) {
    spawnTripleShotPowerUp();
    tripleShotPowerUpTimer = TRIPLE_SHOT_POWER_UP_INTERVAL;
  }

  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    spawnShootingStar();
    shootingStarTimer = SHOOTING_STAR_INTERVAL + rand(-3, 4);
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  if (pressed('KeyS')) nextShipSkin();

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  asteroids = asteroids.filter(a => !a.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      if (p.type === 'speed') ship.speedBoostTimer = SPEED_BOOST_DURATION;
      if (p.type === 'tripleShot') ship.tripleShotTimer = TRIPLE_SHOT_DURATION;
      p.dead = true;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.type === 'shootingStar' ? SHOOTING_STAR_POINTS : POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldActive) {
          ship.absorbHit();
          a.dead = true;
          explode(a.x, a.y, a.size * 5);
        } else {
          killShip();
        }
        break;
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead);

  // Nivel completado
  if (!asteroids.some(a => a.type !== 'shootingStar')) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  drawShipShape(0.48, false);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  let statusY = 48;
  if (ship.speedBoostTimer > 0) {
    ctx.fillStyle = '#50dcff';
    ctx.fillText(`VELOCIDAD ${ship.speedBoostTimer.toFixed(1)}s`, W / 2, statusY);
    ctx.fillStyle = '#fff';
    statusY += 22;
  }

  if (ship.tripleShotTimer > 0) {
    ctx.fillStyle = '#ff7ad9';
    ctx.fillText(`TRIPLE SHOT ${ship.tripleShotTimer.toFixed(1)}s`, W / 2, statusY);
    ctx.fillStyle = '#fff';
    statusY += 22;
  }

  if (ship.shieldActive) {
    ctx.fillStyle = '#5ab4ff';
    ctx.fillText(`ESCUDO ${ship.shieldTimer.toFixed(1)}s`, W / 2, statusY);
    ctx.fillStyle = '#fff';
  } else if (ship.shieldCooldown > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`ESCUDO ${ship.shieldCooldown.toFixed(1)}s`, W / 2, statusY);
    ctx.fillStyle = '#fff';
  }

  ctx.textAlign = 'left';
  ctx.fillText(`SKIN ${getShipSkin().name}  S CAMBIAR`, 14, H - 16);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  powerUps.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
