const HEART_SHAPE = { x: 300, y: 290, scale: 14.7 };
const HEART_CENTER = { x: 300, y: 330 };
const PAPER = { count: 15, size: 250, offset: 35, twist: 25, delay: 0.3 };
const LEAVES_START = 3.5;
const FLOWERS_START = 5;

const PALETTES = {
  orange: ["#c2410a", "#d9550b", "#ec6a0e", "#f57f12", "#fa921c", "#fca82c", "#fdbd45"],
  gold: ["#c47a04", "#d98f07", "#e8a30c", "#f1b414", "#f6c321", "#f9d037", "#fbdc58"],
};

const HEART_OUTLINE = [
  [434, 116], [164, 117], [225, 122], [373, 123], [491, 142], [107, 144], [274, 158], [324, 160],
  [528, 191], [72, 193], [300, 216], [533, 253], [67, 256], [509, 309], [93, 311], [469, 356],
  [134, 358], [422, 398], [180, 400], [375, 439], [227, 441], [329, 485], [272, 487], [300, 540],
];

const HEART_FILL = [
  [135, 207], [201, 207], [399, 207], [465, 207], [168, 264], [234, 264], [366, 264], [432, 264],
  [201, 321], [267, 321], [333, 321], [399, 321], [234, 378], [300, 378], [366, 378], [300, 440],
];

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const random = (min, max) => min + Math.random() * (max - min);
const radians = (degrees) => (degrees * Math.PI) / 180;
const degrees = (angle) => (angle * 180) / Math.PI;

const heartPoint = (t) => ({
  x: HEART_SHAPE.x + HEART_SHAPE.scale * 16 * Math.sin(t) ** 3,
  y:
    HEART_SHAPE.y -
    HEART_SHAPE.scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
});

const outwardAngle = ({ x, y }) => degrees(Math.atan2(x - HEART_CENTER.x, HEART_CENTER.y - y));

const HEADS = [...HEART_OUTLINE, ...HEART_FILL]
  .sort(([, a], [, b]) => a - b)
  .map(([x, y]) => ({
    x: x + random(-4, 4),
    y: y + random(-4, 4),
    r: random(40, 46),
    palette: Math.random() < 0.3 ? "gold" : "orange",
  }));

const tonguePath = (halfWidth, length) =>
  `M${-halfWidth * 0.55},0C${-halfWidth * 1.05},${-length * 0.45} ${-halfWidth},${-length} 0,${-length}C${halfWidth},${-length} ${halfWidth * 1.05},${-length * 0.45} ${halfWidth * 0.55},0Z`;

function leafletPath(length) {
  const teeth = 7;
  const width = length * 0.14;
  const edge = (t) => width * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8;
  const points = [];
  for (let i = 0; i < teeth; i++) {
    const notch = (i + 0.3) / (teeth + 0.5);
    const tip = (i + 0.9) / (teeth + 0.5);
    points.push([edge(notch) * 0.8, -length * notch], [edge(tip) * 1.1, -length * tip]);
  }
  const left = points.map(([x, y]) => `L${-x},${y}`).join("");
  const right = points
    .reverse()
    .map(([x, y]) => `L${x},${y}`)
    .join("");
  return `M0,0${left}L0,${-length}${right}Z`;
}

function leafletMarkup(length, transform) {
  return `<g transform="${transform}"><path d="${leafletPath(length)}"/><path class="leaflet__vein" d="M0,0L0,${-length * 0.9}"/></g>`;
}

function leafMarkup({ x, y, angle, length, delay }) {
  const pairs = [
    { t: 0.3, size: 0.45, spread: 58 },
    { t: 0.55, size: 0.42, spread: 48 },
    { t: 0.78, size: 0.34, spread: 38 },
  ];
  const leaflets = pairs.flatMap(({ t, size, spread }) =>
    [-1, 1].map((side) =>
      leafletMarkup(length * size, `translate(0 ${-length * t}) rotate(${side * spread})`),
    ),
  );
  return `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="leaf" style="--d:${delay}s">
    <path class="leaf__rachis" d="M0,0Q${length * 0.05},${-length / 2} 0,${-length * 0.75}"/>
    ${leaflets.join("")}${leafletMarkup(length * 0.4, `translate(0 ${-length * 0.72})`)}</g></g>`;
}

function headMarkup({ r, palette }) {
  const disc = r * 0.22;
  const petalCount = Math.round(r * 3);
  const floretCount = Math.round(r * 0.8);
  const petals = [];
  for (let i = petalCount - 1; i >= 0; i--) {
    const t = Math.sqrt((i + 1) / petalCount);
    const radius = disc + (r * 0.72 - disc) * t;
    const length = r * (0.12 + 0.24 * t);
    const halfWidth = length * random(0.4, 0.46);
    const shade = Math.min(6, Math.max(0, Math.round(1 + t * 5 + random(-0.6, 0.6))));
    const cup =
      t < 0.7
        ? `<path class="petal__cup" d="${tonguePath(halfWidth * 0.6, length * 0.55)}" transform="translate(0 ${-length * 0.4})" opacity="${(0.7 - t) * 0.9}"/>`
        : "";
    petals.push(
      `<g transform="rotate(${degrees(i * GOLDEN_ANGLE) + 90}) translate(0 ${-(radius - length * 0.25)})"><path class="petal" d="${tonguePath(halfWidth, length)}" fill="url(#petal-${palette}-${shade})"/>${cup}</g>`,
    );
  }
  const florets = Array.from({ length: floretCount }, (_, j) => {
    const angle = j * GOLDEN_ANGLE;
    const distance = disc * 0.85 * Math.sqrt((j + 0.5) / floretCount);
    return `<circle class="floret" cx="${Math.cos(angle) * distance}" cy="${Math.sin(angle) * distance}" r="${disc * 0.14}"/>`;
  });
  return `<g><circle r="${r * 0.9}" fill="${PALETTES[palette][0]}"/>${petals.join("")}<circle class="disc" r="${disc}"/>${florets.join("")}<circle cx="${-r * 0.2}" cy="${-r * 0.25}" r="${r * 0.7}" fill="url(#head-light)"/></g>`;
}

function paperMarkup() {
  const half = PAPER.size / 2;
  return Array.from({ length: PAPER.count }, (_, index) => {
    const anchor = heartPoint((2 * Math.PI * index) / PAPER.count);
    const angle = outwardAngle(anchor);
    const x = anchor.x + Math.sin(radians(angle)) * PAPER.offset;
    const y = anchor.y - Math.cos(radians(angle)) * PAPER.offset;
    const bulge = random(4, 14);
    const edge = `M${-half},${-half}Q0,${-half - bulge} ${half},${-half}Q${half + bulge},0 ${half},${half}Q0,${half + bulge} ${-half},${half}Q${-half - bulge},0 ${-half},${-half}Z`;
    const color = index % 2 ? "morado" : "rosa";
    return `<g transform="translate(${x} ${y}) rotate(${angle + 45 + PAPER.twist})"><g class="sheet" style="--d:${PAPER.delay + index * 0.15}s">
      <path class="sheet__paper sheet--${color}" d="${edge}"/>
      <path class="sheet__fold" d="M${-half},${-half}L${half},${half}L${-half},${half}Z"/></g></g>`;
  }).join("");
}

const gradients = Object.entries(PALETTES).flatMap(([name, colors]) =>
  colors.map(
    (color, index) =>
      `<linearGradient id="petal-${name}-${index}" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" style="stop-color: color-mix(in srgb, ${color} 55%, #4a1200)"/>
        <stop offset="0.6" stop-color="${color}"/>
        <stop offset="1" style="stop-color: color-mix(in srgb, ${color} 85%, #fff2c0)"/>
      </linearGradient>`,
  ),
);
document.querySelector(".bouquet defs").insertAdjacentHTML("beforeend", gradients.join(""));

const foliage = Array.from({ length: 120 }, (_, i) => heartPoint((2 * Math.PI * i) / 120));
const collar = foliage.map(({ x, y }) => ({
  x: HEART_CENTER.x + (x - HEART_CENTER.x) * 1.15,
  y: HEART_CENTER.y + (y - HEART_CENTER.y) * 1.15,
}));
const toPoints = (points) => points.map(({ x, y }) => `${x},${y}`).join(" ");
const leaves = Array.from({ length: 30 }, (_, index) => {
  const anchor = heartPoint((2 * Math.PI * (index + random(0, 0.5))) / 30);
  const angle = outwardAngle(anchor);
  return leafMarkup({
    x: anchor.x - Math.sin(radians(angle)) * 30,
    y: anchor.y + Math.cos(radians(angle)) * 30,
    angle: angle + random(-20, 20),
    length: random(110, 135),
    delay: LEAVES_START + index * 0.06,
  });
});

const heads = HEADS.map((flower) => {
  const distance = Math.hypot(flower.x - HEART_CENTER.x, flower.y - HEART_CENTER.y);
  const delay = FLOWERS_START + (distance / 280) * 5 + random(0, 0.5);
  return `<g transform="translate(${flower.x} ${flower.y})"><g class="head" style="--d:${delay}s">${headMarkup(flower)}</g></g>`;
});

document.getElementById("paper").innerHTML = paperMarkup();
document.getElementById("collar").setAttribute("points", toPoints(collar));
document.getElementById("foliage").setAttribute("points", toPoints(foliage));
document.getElementById("leaves").innerHTML = leaves.join("");
document.getElementById("heads").innerHTML = heads.join("");

const sky = document.querySelector(".sky");
for (let i = 0; i < 220; i++) {
  const star = document.createElement("span");
  if (Math.random() < 0.35) star.className = "twinkle";
  star.style.cssText = `--x:${random(0, 100)}%;--y:${random(0, 90)}%;--s:${random(1, 2.8)}px;--o:${random(0.4, 1)};--t:${random(1.5, 6)}s;--d:${random(-6, 0)}s`;
  sky.append(star);
}

const SONG = { videoId: "e2c8NkNY41U", start: 153, end: 287 };
let song;

window.onYouTubeIframeAPIReady = () => {
  song = new YT.Player("song", {
    width: 1,
    height: 1,
    videoId: SONG.videoId,
    playerVars: { start: SONG.start, controls: 0, disablekb: 1, playsinline: 1 },
    events: {
      onReady: ({ target }) => {
        if (!document.body.classList.contains("waiting")) target.playVideo();
      },
    },
  });
};

document.querySelector(".start").addEventListener("click", () => {
  document.body.classList.remove("waiting");
  song?.playVideo?.();
});
