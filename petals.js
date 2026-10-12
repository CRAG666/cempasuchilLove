const NAME = "Jhoselin";
const PILE_TARGET = 0.7;
const COLUMN = 4;
const REPOSE = 0.35;
const SURFACE_PETALS = 900;
const MAX_SPAWN_PER_FRAME = 40;
const pileCurve = (progress) => 0.03 * progress + 0.97 * progress ** 4;
const FINALE_LEAD = 9.5;
const PILE_COLORS = ["#d9550b", "#ec6a0e", "#f57f12", "#fa921c", "#fca82c"];
const NAME_COLORS = ["#ffe066", "#ffd23f", "#ffc300", "#ffb000"];
const WRITE_SECONDS = 5;
const FINALE_HEART_RINGS = [
  { scale: 1, count: 24 },
  { scale: 0.68, count: 16 },
  { scale: 0.38, count: 8 },
  { scale: 0.1, count: 2 },
];
const FINALE_FLOWER_RADIUS = 13;
const SPRITE_SIZE = 64;
const SHAPES_PER_COLOR = 4;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const easeOut = (t) => 1 - (1 - t) ** 3;

function fitCanvas(canvas) {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  const context = canvas.getContext("2d");
  context.scale(devicePixelRatio, devicePixelRatio);
  return context;
}

const pile = fitCanvas(document.getElementById("pile"));
const air = fitCanvas(document.getElementById("air"));
const width = innerWidth;
const height = innerHeight;
const unit = Math.sqrt(width * height) / 100;

function petalOutline() {
  const halfWidth = 0.35;
  const ruffles = 5;
  const step = (2 * halfWidth) / ruffles;
  const base = { x: random(0.1, 0.3) * (Math.random() < 0.5 ? -1 : 1), y: 0.6 };
  const shape = new Path2D();
  shape.moveTo(base.x, base.y);
  shape.quadraticCurveTo(-random(0.3, 0.45), random(0.05, 0.3), -halfWidth, -0.3);
  for (let i = 1; i <= ruffles; i++) {
    const x = -halfWidth + step * i;
    shape.quadraticCurveTo(x - step / 2 + random(-0.03, 0.03), -random(0.48, 0.62), x, -random(0.3, 0.42));
  }
  shape.quadraticCurveTo(random(0.3, 0.45), random(0.05, 0.3), base.x, base.y);
  return { shape, base };
}

function petalSprite(color) {
  const canvas = new OffscreenCanvas(SPRITE_SIZE, SPRITE_SIZE);
  const context = canvas.getContext("2d");
  const { shape, base } = petalOutline();
  context.translate(SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  context.scale(SPRITE_SIZE * 0.8, SPRITE_SIZE * 0.8);
  context.lineWidth = 1.2 / SPRITE_SIZE;
  context.fillStyle = color;
  context.fill(shape);

  context.save();
  context.clip(shape);
  const fold = random(-0.15, 0.2);
  context.fillStyle = "rgba(120, 35, 0, 0.28)";
  context.beginPath();
  context.moveTo(base.x, base.y);
  context.lineTo(fold, -0.7);
  context.lineTo(0.8, -0.7);
  context.lineTo(0.8, 0.8);
  context.fill();
  context.strokeStyle = "rgba(110, 35, 0, 0.45)";
  for (const spread of [-0.2, 0, 0.2]) {
    context.beginPath();
    context.moveTo(base.x, base.y - 0.1);
    context.quadraticCurveTo(spread * 0.6, 0, spread + random(-0.05, 0.05), -random(0.25, 0.4));
    context.stroke();
  }
  context.restore();

  context.strokeStyle = "rgba(110, 35, 0, 0.5)";
  context.stroke(shape);
  return canvas;
}

const spritesFor = (colors) =>
  colors.flatMap((color) => Array.from({ length: SHAPES_PER_COLOR }, () => petalSprite(color)));
const PILE_SPRITES = spritesFor(PILE_COLORS);
const NAME_SPRITES = spritesFor(NAME_COLORS);

function drawPetal(context, { x, y, size, angle, sprite, flatten = 1, flip = 1 }) {
  const drawn = size * 1.5;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.scale(flip, flatten);
  context.drawImage(sprite, -drawn / 2, -drawn / 2, drawn, drawn);
  context.restore();
}

function pileTexture() {
  const tile = 256;
  const canvas = new OffscreenCanvas(tile * devicePixelRatio, tile * devicePixelRatio);
  const context = canvas.getContext("2d");
  context.scale(devicePixelRatio, devicePixelRatio);
  context.fillStyle = PILE_COLORS[0];
  context.fillRect(0, 0, tile, tile);
  const count = (tile * tile) / (unit * unit * 0.3);
  for (let i = 0; i < count; i++) {
    const petal = { x: random(0, tile), y: random(0, tile), size: random(1, 1.8) * unit, angle: random(0, Math.PI * 2), sprite: pick(PILE_SPRITES), flatten: 0.6 };
    for (const dx of [-tile, 0, tile]) {
      for (const dy of [-tile, 0, tile]) drawPetal(context, { ...petal, x: petal.x + dx, y: petal.y + dy });
    }
  }
  const pattern = pile.createPattern(canvas, "repeat");
  pattern.setTransform(new DOMMatrix().scale(1 / devicePixelRatio));
  return pattern;
}

const pilePattern = pileTexture();
const depthShade = pile.createLinearGradient(0, height * 0.3, 0, height);
depthShade.addColorStop(0, "rgba(60, 15, 0, 0)");
depthShade.addColorStop(1, "rgba(60, 15, 0, 0.35)");

const columns = Math.ceil(width / COLUMN);
const heights = new Float32Array(columns);
const surface = [];
const targetVolume = PILE_TARGET * width * height;
const petalVolume = (size) => size ** 2 * 0.4;
const columnAt = (x) => Math.min(columns - 1, Math.max(0, Math.floor(x / COLUMN)));

let falling = [];
let writing = [];
let spawning = false;
let depositedVolume = 0;
let airborneVolume = 0;
let startTime;
let lastFrame;
let writeStart;
let finaleStart;

function spawnPetal() {
  const size = random(1, 1.8) * unit;
  falling.push({
    x: random(0, width),
    y: -20,
    size,
    angle: random(0, Math.PI * 2),
    spin: random(-3, 3),
    speed: random(0.1, 0.16) * height,
    sway: random(0.5, 1.5) * unit * 3,
    phase: random(0, Math.PI * 2),
    sprite: pick(PILE_SPRITES),
  });
  airborneVolume += petalVolume(size);
  return petalVolume(size);
}

function deposit(petal, x) {
  const center = columnAt(x);
  const span = Math.max(1, Math.round((petal.size * 1.2) / COLUMN));
  const first = Math.max(0, center - Math.floor(span / 2));
  const last = Math.min(columns - 1, first + span - 1);
  const volume = petalVolume(petal.size);
  for (let i = first; i <= last; i++) heights[i] += volume / ((last - first + 1) * COLUMN);
  depositedVolume += volume;
  airborneVolume -= volume;
  surface.push({ ...petal, column: center, offset: x - center * COLUMN, depth: random(0, petal.size * 0.6) });
  if (surface.length > SURFACE_PETALS) surface.shift();
}

function relax() {
  const step = REPOSE * COLUMN;
  for (let pass = 0; pass < 4; pass++) {
    for (let k = 0; k < columns - 1; k++) {
      const i = pass % 2 ? columns - 2 - k : k;
      const difference = heights[i] - heights[i + 1];
      if (Math.abs(difference) <= step) continue;
      const flow = (difference - Math.sign(difference) * step) / 4;
      heights[i] -= flow;
      heights[i + 1] += flow;
    }
  }
}

function drawPile() {
  pile.clearRect(0, 0, width, height);
  pile.beginPath();
  pile.moveTo(0, height);
  for (let i = 0; i < columns; i++) pile.lineTo(i * COLUMN + COLUMN / 2, height - heights[i]);
  pile.lineTo(width, height);
  pile.closePath();
  pile.fillStyle = pilePattern;
  pile.fill();
  pile.fillStyle = depthShade;
  pile.fill();
  for (const petal of surface) {
    drawPetal(pile, {
      ...petal,
      x: petal.column * COLUMN + petal.offset,
      y: height - heights[petal.column] + petal.depth,
      flatten: 0.6,
    });
  }
}

function textTargets(fontSize, centerY) {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  context.font = `italic 900 ${fontSize}px Poppins`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(NAME, width / 2, centerY);
  const pixels = context.getImageData(0, 0, width, height).data;
  const step = Math.max(3, fontSize / 24);
  const targets = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 128) {
        targets.push({ x: x + random(-step / 3, step / 3), y: y + random(-step / 3, step / 3), size: step * 1.6 });
      }
    }
  }
  return targets;
}

function showFinaleHeart(top, size) {
  const svg = document.querySelector(".finale-heart");
  const center = { x: 0, y: 12 };
  const flowers = FINALE_HEART_RINGS.flatMap(({ scale, count }, ring) =>
    Array.from({ length: count }, (_, index) => {
      const t = (2 * Math.PI * index) / count;
      const x = center.x + scale * (4.2 * 16 * Math.sin(t) ** 3 - center.x);
      const y =
        center.y +
        scale * (-4.2 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - center.y);
      const flower = { r: FINALE_FLOWER_RADIUS, palette: Math.random() < 0.3 ? "gold" : "orange" };
      return `<g transform="translate(${x} ${y})"><g class="head" style="--d:${ring * 0.6 + index * 0.05}s">${headMarkup(flower)}</g></g>`;
    }),
  );
  svg.innerHTML = flowers.join("");
  svg.style.top = `${top}px`;
  svg.style.height = `${size}px`;
}

const songSeconds = (elapsed) => song?.getCurrentTime?.() || SONG.start + elapsed;

async function startFinale() {
  finaleStart = performance.now();
  document.body.classList.add("finale");
  await document.fonts.load("italic 900 100px Poppins");
  const fontSize = Math.min(width * 0.17, height * 0.16);
  const heartSize = fontSize * 1.6;
  const top = height / 2 - (heartSize + fontSize * 1.1) / 2;
  showFinaleHeart(top, heartSize);

  const targets = textTargets(fontSize, top + heartSize + fontSize * 0.6);
  const left = Math.min(...targets.map(({ x }) => x));
  const span = Math.max(...targets.map(({ x }) => x)) - left;
  writing = targets.map((target) => ({
    ...target,
    fromX: random(0, width),
    fromY: -random(20, 200),
    angle: random(0, Math.PI * 2),
    sprite: pick(NAME_SPRITES),
    delay: 2 + ((target.x - left) / span) * WRITE_SECONDS + random(0, 0.3),
    duration: random(1.2, 1.8),
  }));
  writeStart = performance.now();
  requestAnimationFrame(frame);
}

function frame(now) {
  const elapsed = (now - startTime) / 1000;
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  const songTime = songSeconds(elapsed);
  const progress = Math.min(1, Math.max(0, (songTime - SONG.start) / (SONG.end - FINALE_LEAD - SONG.start)));
  if (spawning) {
    let deficit = pileCurve(progress) * targetVolume - depositedVolume - airborneVolume;
    for (let count = 0; deficit > 0 && count < MAX_SPAWN_PER_FRAME; count++) deficit -= spawnPetal();
  }

  const fade = finaleStart ? Math.max(0, 1 - (now - finaleStart) / 1500) : 1;
  if (!fade) falling = [];
  air.clearRect(0, 0, width, height);
  air.globalAlpha = fade;
  falling = falling.filter((petal) => {
    petal.y += petal.speed * delta;
    petal.angle += petal.spin * delta;
    petal.phase += delta * 1.5;
    const x = petal.x + Math.sin(petal.phase) * petal.sway;
    if (petal.y >= height - heights[columnAt(x)]) {
      deposit(petal, x);
      return false;
    }
    drawPetal(air, { ...petal, x, flip: 0.35 + 0.65 * Math.abs(Math.cos(petal.phase * 1.3)) });
    return true;
  });
  air.globalAlpha = 1;

  if (!finaleStart) {
    relax();
    drawPile();
  }

  const writeElapsed = writeStart ? (now - writeStart) / 1000 : 0;
  let settled = true;
  for (const petal of writing) {
    const progress = Math.min(1, Math.max(0, (writeElapsed - petal.delay) / petal.duration));
    if (progress < 1) settled = false;
    if (progress === 0) continue;
    const eased = easeOut(progress);
    drawPetal(air, {
      ...petal,
      x: petal.fromX + (petal.x - petal.fromX) * eased,
      y: petal.fromY + (petal.y - petal.fromY) * eased,
      angle: petal.angle + (1 - eased) * 6,
    });
  }

  if (spawning && songTime >= SONG.end - FINALE_LEAD) {
    spawning = false;
    startFinale();
    return;
  }
  if (spawning || falling.length || !settled) {
    requestAnimationFrame(frame);
  } else if (writing.length) {
    document.body.classList.add("written");
  }
}

document.querySelector(".start").addEventListener("click", () => {
  spawning = true;
  startTime = lastFrame = performance.now();
  requestAnimationFrame(frame);
});
