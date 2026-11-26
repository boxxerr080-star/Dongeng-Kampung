// Daun Kompos — scene kartun-3d (three.js, render deterministik via renderAt(t))
// Gaya: video Warung Kopi (STUDI-OUTLINE.md) — outline hitam hangat 0x150c02
// (inverted hull) HANYA di karakter + properti utama, BUKAN di latar.
// Kepala = 1/3 tinggi badan, semua pria dewasa sama tinggi (satu rig).
// Kamera: DIAM dalam tiap shot, ganti skala lewat CUT, ~2 detik/shot,
// hanya 2 gerakan kontinu: crane-down+dolly-in pembuka + pull-back penutup.
// 576x1024, 30fps, durasi 60 detik. Beat (detik video, voiceover mulai t=1.0):
//   B1  1.00-4.50  HOOK     TIDAK DIBUANG
//   B2  4.50-11.88 SETUP    DAUN MENUMPUK
//   B3 11.88-22.38 TWIST    JANGAN DIBAKAR
//   B4 22.38-33.66 ESKALASI ASAP MENGEPUL
//   B5 33.66-37.04 KONTRAS  TETAP SUBUR
//   B6 37.04-50.76 MEKANISME JADI KOMPOS
//   B7 50.76-60.00 PAYOFF   YANG MENYUBURKAN

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261126);

const OUTLINE_COLOR = 0x150c02; // hitam hangat (studi: #150c02, bukan hitam murni)

let THREE = null;
let OUTLINE_MAT = null;
let GRADIENT_MAP = null;

function makeGradientMap() {
  // Toon 2-tone: 3 langkah
  const colors = new Uint8Array([110, 180, 255]);
  const tex = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: GRADIENT_MAP });
const mat = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, material);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
// Mesh hero: mesh + outline inverted hull (BackSide, skala 1,035) —
// tebal outline ~3-4% diameter objek, konsisten di semua jarak (studi G.1).
function heroMesh(geo, material, x = 0, y = 0, z = 0, outlineScale = 1.035) {
  const o = mesh(geo, material, x, y, z);
  const hull = new THREE.Mesh(geo, OUTLINE_MAT);
  hull.scale.setScalar(outlineScale);
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.raycast = () => {};
  o.add(hull);
  return o;
}
function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- Karakter kepala besar (satu rig, semua dewasa sama tinggi) ----------
function makeVillager(opts = {}) {
  const {
    skin = 0xe69956, shirt = 0x2c78b3, pants = 0x2a2f45,
    hair = 0x1a1a1a, glasses = false, beard = false, shoe = 0x3a2a1a,
    hijab = null, peci = false,
  } = opts;
  const root = new THREE.Group();
  const J = {};
  const M = {
    skin: toon(skin), shirt: toon(shirt), pants: toon(pants),
    hair: toon(hair), dark: toon(0x1a1a1a), white: toon(0xffffff),
    shoe: toon(shoe), grey: toon(0x9a9a9a),
    hijab: hijab ? toon(hijab) : null,
  };
  const cap = (r, len, m) => heroMesh(new THREE.CapsuleGeometry(r, len, 6, 12), m);

  const pelvis = pivot(root, 0, 0.62, 0); J.pelvis = pelvis;
  const hips = cap(0.17, 0.10, M.pants); hips.position.y = 0.02; pelvis.add(hips);
  const spine = pivot(pelvis, 0, 0.12, 0); J.spine = spine;
  const chest = pivot(spine, 0, 0.22, 0); J.chest = chest;
  const torso = cap(0.21, 0.22, M.shirt); torso.position.y = -0.02; chest.add(torso);
  const neck = pivot(chest, 0, 0.30, 0); J.neck = neck;
  const head = pivot(neck, 0, 0.13, 0); J.head = head;
  head.scale.setScalar(0.87); // kepala = 1/3 tinggi badan (studi Warung Kopi: Ø 0,30–0,33)
  const skull = heroMesh(new THREE.SphereGeometry(0.30, 28, 20), M.skin, 0, 0, 0);
  skull.scale.set(1, 1.05, 0.98); head.add(skull);

  if (hijab) {
    // Hijab: tudung menutupi atas + belakang kepala, wajah tetap terlihat
    const hood = heroMesh(new THREE.SphereGeometry(0.30, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hijab, 0, 0.02, -0.05);
    hood.scale.set(1.0, 0.92, 1.0); head.add(hood);
    const drape = heroMesh(new THREE.ConeGeometry(0.30, 0.45, 16), M.hijab, 0, -0.30, -0.08);
    drape.scale.set(1, 1, 0.7); chest.add(drape);
  } else if (hair !== null) {
    const hairCap = heroMesh(new THREE.SphereGeometry(0.305, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), M.hair, 0, 0.08, 0);
    hairCap.scale.set(1.02, 1, 1.02); head.add(hairCap);
  }
  if (peci) {
    const capTop = heroMesh(new THREE.CylinderGeometry(0.20, 0.21, 0.12, 16), M.dark, 0, 0.28, 0);
    head.add(capTop);
  }
  // Mata besar (bentuk datar, BUKAN outline)
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.055, 16, 12), M.white, s * 0.11, 0.03, 0.27);
    head.add(eye); eyes.push(eye);
    const pupil = mesh(new THREE.SphereGeometry(0.027, 12, 10), M.dark, s * 0.11, 0.03, 0.315);
    head.add(pupil);
    const glint = mesh(new THREE.SphereGeometry(0.009, 8, 6), M.white, s * 0.10, 0.045, 0.335);
    head.add(glint);
    const brow = mesh(new THREE.BoxGeometry(0.10, 0.022, 0.015), M.dark, s * 0.11, 0.115, 0.285); // alis = bentuk datar gelap (studi), bukan warna rambut
    head.add(brow);
  }
  // Hidung + mulut (bentuk datar)
  const nose = mesh(new THREE.SphereGeometry(0.028, 10, 8), M.skin, 0, -0.02, 0.295);
  head.add(nose);
  const mouth = mesh(new THREE.BoxGeometry(0.10, 0.016, 0.012), toon(0x5a2a2a), 0, -0.10, 0.285);
  head.add(mouth); J.mouth = mouth;

  if (glasses) {
    // Kacamata Raka = batang tipis melintang (studi: bukan lensa berbingkai)
    for (const s of [-1, 1]) {
      const cx = s * 0.11, cy = 0.03, cz = 0.30;
      const top = mesh(new THREE.BoxGeometry(0.17, 0.018, 0.012), M.dark, cx, cy + 0.075, cz);
      const bot = mesh(new THREE.BoxGeometry(0.17, 0.018, 0.012), M.dark, cx, cy - 0.075, cz);
      const lf = mesh(new THREE.BoxGeometry(0.018, 0.17, 0.012), M.dark, cx - 0.085, cy, cz);
      const rt = mesh(new THREE.BoxGeometry(0.018, 0.17, 0.012), M.dark, cx + 0.085, cy, cz);
      head.add(top, bot, lf, rt);
    }
    const bridge = mesh(new THREE.BoxGeometry(0.07, 0.016, 0.012), M.dark, 0, 0.03, 0.30);
    head.add(bridge);
  }
  if (beard) {
    const beardMesh = mesh(new THREE.SphereGeometry(0.20, 18, 12), M.grey, 0, -0.17, 0.10);
    beardMesh.scale.set(1, 0.8, 0.75); head.add(beardMesh);
    const mus = mesh(new THREE.BoxGeometry(0.13, 0.025, 0.02), M.grey, 0, -0.055, 0.29);
    head.add(mus);
  }

  // Lengan pendek
  function arm(side) {
    const sh = pivot(chest, side * 0.26, 0.20, 0);
    const up = cap(0.06, 0.14, M.shirt); up.position.y = -0.10; sh.add(up);
    const el = pivot(sh, 0, -0.22, 0);
    const fo = cap(0.05, 0.12, M.skin); fo.position.y = -0.09; el.add(fo);
    const wr = pivot(el, 0, -0.20, 0);
    const hand = heroMesh(new THREE.SphereGeometry(0.06, 12, 10), M.skin, 0, -0.04, 0);
    hand.scale.set(0.9, 1.1, 0.6); wr.add(hand);
    J[side < 0 ? 'lSh' : 'rSh'] = sh; J[side < 0 ? 'lEl' : 'rEl'] = el; J[side < 0 ? 'lWr' : 'rWr'] = wr;
  }
  arm(-1); arm(1);
  // Kaki pendek
  function leg(side) {
    const hip = pivot(pelvis, side * 0.11, -0.05, 0);
    const th = cap(0.075, 0.20, M.pants); th.position.y = -0.16; hip.add(th);
    const kn = pivot(hip, 0, -0.30, 0);
    const sh2 = cap(0.06, 0.18, M.pants); sh2.position.y = -0.14; kn.add(sh2);
    const an = pivot(kn, 0, -0.30, 0);
    const foot = heroMesh(new THREE.BoxGeometry(0.13, 0.07, 0.24), M.shoe, 0, -0.03, 0.05);
    an.add(foot);
    J[side < 0 ? 'lHip' : 'rHip'] = hip; J[side < 0 ? 'lKn' : 'rKn'] = kn;
  }
  leg(-1); leg(1);

  function setPose(pose) {
    for (const [name, rot] of Object.entries(pose)) {
      if (J[name]) J[name].rotation.set(rot[0], rot[1], rot[2]);
    }
  }
  function setFace({ blink = 0, smile = 0 } = {}) {
    for (const e of eyes) e.scale.y = Math.max(0.1, 1 - blink);
    mouth.scale.y = 1 + smile * 2.5;
    mouth.scale.x = 1 + smile * 0.4;
  }
  return { root, J, setPose, setFace, eyes };
}

// ---------- Properti hero (DENGAN outline) ----------
// Sapu lidi: gagang + kipas ijuk
function makeBroom() {
  const g = new THREE.Group();
  const stick = heroMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), toon(0x8a6b45), 0, 0.45, 0);
  g.add(stick);
  const fan = heroMesh(new THREE.ConeGeometry(0.11, 0.38, 8), toon(0xa8823a), 0, -0.12, 0);
  fan.scale.set(1, 1, 0.3);
  g.add(fan);
  return g;
}
// Keranjang: badan + bibir
function makeBasket() {
  const g = new THREE.Group();
  const body = heroMesh(new THREE.CylinderGeometry(0.22, 0.17, 0.3, 12), toon(0xa9803e), 0, 0, 0);
  g.add(body);
  const rim = heroMesh(new THREE.TorusGeometry(0.22, 0.025, 8, 16), toon(0x6b4a2a), 0, 0.15, 0);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  return g;
}
// Bak kompos: kotak bilah kayu (tanpa tutup) + papan nama KOMPOS
function makeCompostBin() {
  const g = new THREE.Group();
  const wood = toon(0x8a6b45);
  const woodDark = toon(0x6b4a2a);
  for (const [w, d, x, z] of [[1.6, 0.08, 0, -0.76], [1.6, 0.08, 0, 0.76], [0.08, 1.6, -0.76, 0], [0.08, 1.6, 0.76, 0]]) {
    const wall = heroMesh(new THREE.BoxGeometry(w, 0.7, d), wood, x, 0.35, z);
    g.add(wall);
  }
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    g.add(heroMesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), woodDark, x, 0.42, z));
  }
  // Lapisan daun (coklat) + hijau di dalam bak
  const layer1 = heroMesh(new THREE.BoxGeometry(1.4, 0.18, 1.4), toon(0xc8932a), 0, 0.18, 0);
  g.add(layer1);
  const layer2 = heroMesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), toon(0x4e9b3a), 0, 0.32, 0);
  g.add(layer2);
  const layer3 = heroMesh(new THREE.BoxGeometry(1.4, 0.15, 1.4), toon(0xb57e22), 0, 0.45, 0);
  g.add(layer3);
  // Papan nama kecil
  const board = heroMesh(new THREE.BoxGeometry(0.9, 0.4, 0.05), toon(0xe6be63), 0, 1.05, 0.8);
  g.add(board);
  const frameT = heroMesh(new THREE.BoxGeometry(0.96, 0.06, 0.06), toon(0x432005), 0, 1.27, 0.8);
  g.add(frameT);
  const frameB = heroMesh(new THREE.BoxGeometry(0.96, 0.06, 0.06), toon(0x432005), 0, 0.83, 0.8);
  g.add(frameB);
  return g;
}
// Tumpukan daun kering: gugusan bola pipih coklat keemasan (lonjong, bukan bola)
function makeLeafPile(s = 1) {
  const g = new THREE.Group();
  const cols = [0xc8932a, 0xb57e22, 0x9c6b1a, 0xd9a83c];
  const parts = [
    [0, 0.16, 0, 0.55, 0.32, 0.55],
    [0.35, 0.12, 0.15, 0.38, 0.24, 0.38],
    [-0.35, 0.12, 0.1, 0.38, 0.24, 0.38],
    [0.05, 0.3, -0.1, 0.4, 0.26, 0.4],
    [-0.15, 0.1, -0.3, 0.32, 0.2, 0.32],
  ];
  parts.forEach((p, i) => {
    const m = heroMesh(new THREE.SphereGeometry(1, 14, 10), toon(cols[i % cols.length]), p[0], p[1], p[2]);
    m.scale.set(p[3], p[4], p[5]);
    g.add(m);
  });
  // Daun-daun menonjol di permukaan tumpukan (tekstur, tanpa outline)
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.35;
    const leaf = mesh(new THREE.ConeGeometry(0.09, 0.22, 4), toon(cols[i % cols.length]), Math.cos(a) * r, 0.32 + rand() * 0.1, Math.sin(a) * r);
    leaf.rotation.set((rand() - 0.5) * 1.2, rand() * Math.PI, (rand() - 0.5) * 1.2);
    leaf.scale.set(1, 1, 0.3);
    g.add(leaf);
  }
  // Daun-daun di sisi tumpukan (terlihat dari kamera rendah, memecah siluet kentang)
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2, r = 0.45 + rand() * 0.2;
    const leaf = mesh(new THREE.ConeGeometry(0.09, 0.22, 4), toon(cols[(i + 2) % cols.length]), Math.cos(a) * r, 0.10 + rand() * 0.14, Math.sin(a) * r);
    leaf.rotation.set(Math.sin(a) * 1.0, rand() * Math.PI, -Math.cos(a) * 1.0);
    leaf.scale.set(1, 1, 0.3);
    g.add(leaf);
  }
  g.scale.setScalar(s);
  return g;
}
// Kompos matang: gundukan hitam
function makeBlackCompost() {
  const g = new THREE.Group();
  const m = heroMesh(new THREE.SphereGeometry(0.55, 16, 12), toon(0x241a12), 0, 0.14, 0);
  m.scale.set(1.15, 0.55, 1.0);
  g.add(m);
  const m2 = heroMesh(new THREE.SphereGeometry(0.3, 12, 10), toon(0x2e2118), 0.3, 0.22, 0.15);
  m2.scale.set(1, 0.6, 1);
  g.add(m2);
  return g;
}
// Gembor (penyiram): badan + moncong + gagang
function makeWateringCan() {
  const g = new THREE.Group();
  const body = heroMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.24, 12), toon(0x4a7a8a), 0, 0, 0);
  g.add(body);
  const spout = heroMesh(new THREE.CylinderGeometry(0.02, 0.03, 0.34, 8), toon(0x4a7a8a), 0.2, 0.05, 0);
  spout.rotation.z = -0.9;
  g.add(spout);
  const handle = heroMesh(new THREE.TorusGeometry(0.11, 0.018, 8, 14, Math.PI), toon(0x3a5a6a), -0.1, 0.1, 0);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  return g;
}

// ---------- Dunia (TANPA outline — latar sengaja polos, studi B) ----------
export function buildScene(THREEin, renderer) {
  THREE = THREEin;
  GRADIENT_MAP = makeGradientMap();
  OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4276e5);
  scene.fog = new THREE.Fog(0x4276e5, 16, 45);
  const camera = new THREE.PerspectiveCamera(46, 0.5625, 0.1, 120);

  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x8a6b45, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.4);
  sun.position.set(-6, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  scene.add(sun);
  // (tanpa lampu rim kedua — studi: satu DirectionalLight hangat saja)

  // Tanah halaman (tanpa outline)
  const ground = mesh(new THREE.PlaneGeometry(80, 80), mat(0x988c70, 0.95), 0, 0, -4);
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  scene.add(ground);
  // Jalan tanah setapak
  const path = mesh(new THREE.PlaneGeometry(1.6, 14), mat(0xa8946e, 0.95), 0.5, 0.01, -2);
  path.rotation.x = -Math.PI / 2; path.castShadow = false;
  scene.add(path);

  // Sawah di belakang (instanced, tanpa outline) — tinggi 0,55 m = 0,32x karakter (studi: 0,3–0,4x)
  const riceGeo = new THREE.ConeGeometry(0.13, 0.55, 5);
  const riceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const ricePts = [];
  for (let x = -9; x <= 9; x += 0.75)
    for (let z = -11; z <= -6.5; z += 0.75)
      ricePts.push([x + (rand() - 0.5) * 0.2, z + (rand() - 0.5) * 0.2]);
  const rice = new THREE.InstancedMesh(riceGeo, riceMat.clone(), ricePts.length);
  const dummy = new THREE.Object3D();
  const riceCols = [new THREE.Color(0x5aa843), new THREE.Color(0x6a9b3c), new THREE.Color(0x7aa83c)];
  ricePts.forEach((p, i) => {
    dummy.position.set(p[0], 0.28, p[1]);
    dummy.rotation.y = rand() * Math.PI;
    dummy.updateMatrix();
    rice.setMatrixAt(i, dummy.matrix);
    rice.setColorAt(i, riceCols[i % 3]);
  });
  rice.castShadow = true; rice.receiveShadow = true;
  scene.add(rice);

  // Kebun Pak Sastro (kiri-belakang): tanaman hijau subur (tanpa outline)
  const garden = new THREE.Group(); garden.position.set(-3.2, 0, -4.2); scene.add(garden);
  const plantGeo = new THREE.ConeGeometry(0.16, 0.5, 6);
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x3d8b37, roughness: 0.9 });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const p = mesh(plantGeo, plantMat, -0.9 + c * 0.45, 0.25, -0.6 + r * 0.5);
      garden.add(p);
    }
  for (const [x, z] of [[-1.3, 0.3], [0.9, -0.4], [0.2, 0.6]]) {
    const bush = mesh(new THREE.SphereGeometry(0.35, 10, 8), plantMat, x, 0.25, z);
    bush.scale.set(1, 0.7, 1);
    garden.add(bush);
  }

  // Rumah (tanpa outline — dinding + atap polos, studi B)
  const house = new THREE.Group(); house.position.set(-7.5, 0, -8); scene.add(house);
  house.add(mesh(new THREE.BoxGeometry(3.0, 2.0, 2.4), mat(0x99764d, 0.95), 0, 1.0, 0));
  const roof = mesh(new THREE.ConeGeometry(2.9, 0.72, 4), mat(0xc0591e, 1), 0, 2.36, 0); // bubungan 2,72 m = 1,6x tinggi karakter (studi)
  roof.rotation.y = Math.PI / 4;
  house.add(roof);
  house.add(mesh(new THREE.BoxGeometry(0.7, 1.2, 0.05), mat(0x2a1c10, 0.9), 0, 0.6, 1.22));
  house.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), mat(0x3a6a9a, 0.8), -0.9, 1.2, 1.22));

  // Pohon palem (tanpa outline)
  function palm(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.1, 8), mat(0x8a4613, 0.95), 0, 2.55, 0)); // batang 5,1 m = 3,0x karakter (studi)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const frond = mesh(new THREE.ConeGeometry(0.17, 1.8, 4), mat(0x428321, 0.9), Math.cos(a) * 0.75, 5.25, Math.sin(a) * 0.75);
      frond.rotation.z = Math.cos(a) * 1.1; frond.rotation.x = -Math.sin(a) * 1.1;
      frond.scale.set(1, 1, 0.28);
      g.add(frond);
    }
    scene.add(g);
  }
  palm(-8, -3, 1.1); palm(8, -4, 1.25); palm(-9, 2, 0.9); palm(7.5, 1, 1.0); palm(4, -8, 1.1);

  // Bukit jauh pipih (tanpa outline)
  for (const [x, z, r, h] of [[-15, -38, 9, 6], [0, -40, 11, 7], [15, -38, 8, 5.5]]) {
    const m = mesh(new THREE.ConeGeometry(r, h, 7), mat(0x5f8a6e, 1), x, h * 0.28 - 0.5, z);
    m.scale.y = 0.55;
    scene.add(m);
  }
  // Awan putih datar (tanpa outline) — MeshBasic supaya tetap putih bersih
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const c = mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false }), -9 + i * 6, 8.5 + (i % 2), -16 - i * 2);
    c.scale.set(1.6, 0.5, 1); c.castShadow = false;
    scene.add(c); clouds.push(c);
  }
  // Daun kering berserakan di halaman (instanced, tanpa outline — seperti rumput)
  const leafGeo = new THREE.ConeGeometry(0.07, 0.16, 4);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const leafPts = [];
  for (let i = 0; i < 130; i++)
    leafPts.push([-7 + rand() * 14, -5 + rand() * 7]);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat.clone(), leafPts.length);
  const leafCols = [new THREE.Color(0xc8932a), new THREE.Color(0xb57e22), new THREE.Color(0x9c6b1a)];
  leafPts.forEach((p, i) => {
    dummy.position.set(p[0], 0.05, p[1]);
    dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.6, rand() * Math.PI, 0);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, leafCols[i % 3]);
  });
  leaves.castShadow = false; leaves.receiveShadow = true;
  scene.add(leaves);

  // ---------- Properti hero (DENGAN outline) ----------
  const pileA = makeLeafPile(1.0); pileA.position.set(-2.5, 0, -1.5); scene.add(pileA);
  const pileB = makeLeafPile(0.85); pileB.position.set(2.0, 0, -2.5); scene.add(pileB);
  const burnPile = makeLeafPile(0.9); burnPile.position.set(5.2, 0, -2.0); scene.add(burnPile);
  const bin = makeCompostBin(); bin.position.set(4.5, 0, -3.5); scene.add(bin);
  const blackCompost = makeBlackCompost(); blackCompost.position.set(5.8, 0, -2.2); blackCompost.visible = false; scene.add(blackCompost);
  // Keranjang berisi daun (di dekat tumpukan A)
  const basket1 = makeBasket(); basket1.position.set(-1.6, 0.15, -0.6); scene.add(basket1);
  const basketLeaves = heroMesh(new THREE.SphereGeometry(0.18, 10, 8), toon(0xc8932a), -1.6, 0.32, -0.6);
  basketLeaves.scale.set(1, 0.5, 1); scene.add(basketLeaves);

  // Asap beat 4 (t 24-33.66): naik dari tumpukan yang dibakar
  const smoke = [];
  for (let i = 0; i < 12; i++) {
    const s = mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshBasicMaterial({ color: 0x9a938a, transparent: true, opacity: 0 }), 5.2, 0.5, -2.0);
    s.castShadow = false;
    scene.add(s); smoke.push(s);
  }
  // Tetes air dari gembor (tanpa outline)
  const drops = [];
  for (let i = 0; i < 12; i++) {
    const d = mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0x7ab8e0, transparent: true, opacity: 0 }), 0, 0, 0);
    d.castShadow = false;
    scene.add(d); drops.push(d);
  }

  // ---------- Karakter (satu rig, sama tinggi) ----------
  const raka = makeVillager({ shirt: 0x2c78b3, pants: 0x2a2f45, hair: 0x1a1a1a, glasses: true });
  const sastro = makeVillager({ shirt: 0x338344, pants: 0x3a2f25, hair: null, beard: true });
  const budi = makeVillager({ shirt: 0xb5953f, pants: 0x3a2f25, hair: 0x1a1a1a });
  const sari = makeVillager({ shirt: 0x5a7d9c, pants: 0x4a3a5a, hair: null, hijab: 0xf2a8bc });
  const dar = makeVillager({ shirt: 0xa34d2d, pants: 0x2a2f25, hair: 0x9a9a9a });
  const jono = makeVillager({ shirt: 0x6a863c, pants: 0x2a2f45, hair: null, peci: true });
  scene.add(raka.root, sastro.root, budi.root, sari.root, dar.root, jono.root);
  const CHARS = { raka, sastro, budi, sari, dar, jono };

  // Sapu di tangan kanan (hanya beat 2) — Budi, Sari, Dar, Raka
  const brooms = {};
  for (const [name, ch] of [['raka', raka], ['budi', budi], ['sari', sari], ['dar', dar]]) {
    const b = makeBroom();
    b.position.set(0, -0.12, 0.06);
    b.rotation.x = 0.5;
    ch.J.rWr.add(b);
    b.visible = false;
    brooms[name] = b;
  }
  // Keranjang di tangan kiri Budi (beat 2 jalan + beat 6)
  const budiBasket = makeBasket();
  budiBasket.position.set(0, -0.08, 0.05);
  budiBasket.scale.setScalar(0.6);
  budi.J.lWr.add(budiBasket);
  budiBasket.visible = false;
  // Gembor di tangan kanan Raka (beat 6 menyiram)
  const can = makeWateringCan();
  can.position.set(0, -0.1, 0.08);
  can.rotation.z = 0.4;
  raka.J.rWr.add(can);
  can.visible = false;

  // ---------- Pose ----------
  const IDLE = { spine: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], lSh: [0.12, 0, 0.12], rSh: [0.12, 0, -0.12], lEl: [-0.15, 0, 0], rEl: [-0.15, 0, 0], lHip: [0, 0, 0], rHip: [0, 0, 0], lKn: [0, 0, 0], rKn: [0, 0, 0] };
  const SWEEP = { ...IDLE, spine: [0.35, 0, 0], head: [0.12, 0, 0], rSh: [-0.9, 0, -0.2], rEl: [-0.3, 0, 0], lSh: [-0.9, 0, 0.2], lEl: [-0.3, 0, 0] };
  const CARRY = { ...IDLE, lSh: [-0.9, 0, 0.4], lEl: [-1.2, 0, 0], rSh: [0.1, 0, -0.1] };
  const GRUMBLE = { ...IDLE, lSh: [0.2, 0, 0.9], lEl: [-1.6, 0, 0], rSh: [0.2, 0, -0.9], rEl: [-1.6, 0, 0], head: [0.1, 0.3, 0] };
  const TALK = { ...IDLE, rSh: [-1.3, 0, -0.2], rEl: [-0.3, 0, 0], head: [-0.05, 0, 0] };
  const POINT = { ...IDLE, rSh: [-1.5, 0, -0.1], rEl: [-0.1, 0, 0] };
  const SHIELD = { ...IDLE, rSh: [-2.2, 0, -0.3], rEl: [-0.5, 0, 0], head: [-0.15, 0, 0] };
  const LAYER = { ...IDLE, spine: [0.45, 0, 0], head: [0.2, 0, 0], rSh: [-0.8, 0, -0.2], lSh: [-0.8, 0, 0.2], rEl: [-0.4, 0, 0], lEl: [-0.4, 0, 0] };
  const WATER = { ...IDLE, rSh: [-1.0, 0, -0.3], rEl: [-0.5, 0, 0], spine: [0.15, 0, 0] };
  const HOLD = { ...IDLE, rSh: [-0.9, 0, -0.3], lSh: [-0.9, 0, 0.3], rEl: [-0.6, 0, 0], lEl: [-0.6, 0, 0] };
  const BURN = { ...IDLE, rSh: [-1.2, 0, -0.2], rEl: [-0.2, 0, 0], spine: [0.2, 0, 0] };
  // Kunci per karakter: [pos, rotY, pose] per beat (1-7)
  const K = (pos, rotY, pose) => ({ pos, rotY, pose });
  const KEYS = {
    raka: [
      K([-1.2, 0, 1.0], 0.3, IDLE), K([-1.0, 0, -0.5], 0.4, SWEEP), K([-0.5, 0, 0.2], -0.2, GRUMBLE),
      K([2.5, 0, -1.0], 0.6, SHIELD), K([3.6, 0, -2.2], 0.2, IDLE), K([3.6, 0, -2.2], -0.5, WATER),
      K([1.5, 0, -0.5], -0.3, HOLD),
    ],
    sastro: [
      K([1.8, 0, -1.0], -0.3, IDLE), K([1.2, 0, -1.5], -0.4, SWEEP), K([2.2, 0, -0.8], -0.35, TALK),
      K([1.5, 0, -0.8], -0.3, IDLE), K([1.5, 0, -0.8], 0.3, IDLE), K([4.0, 0, -2.2], -0.6, LAYER),
      K([2.2, 0, -0.8], -0.2, HOLD),
    ],
    budi: [
      K([-1.5, 0, 0.8], -0.2, IDLE), K([0.5, 0, 0.8], 0.3, CARRY), K([2.5, 0, 1.5], -0.5, IDLE),
      K([-2.5, 0, 1.0], 0.4, SHIELD), K([-1.0, 0, 1.5], 0.2, IDLE), K([2.5, 0, -0.5], -0.4, CARRY),
      K([0.5, 0, 0.0], 0.1, IDLE),
    ],
    sari: [
      K([3.5, 0, 0.8], -0.4, IDLE), K([2.8, 0, -0.8], -0.3, SWEEP), K([2.0, 0, 1.5], -0.5, IDLE),
      K([-1.5, 0, 1.5], 0.5, SHIELD), K([-0.5, 0, 1.0], 0.3, IDLE), K([1.0, 0, 1.5], -0.5, LAYER),
      K([1.0, 0, 0.5], 0.0, IDLE),
    ],
    dar: [
      K([-4.5, 0, -1.5], 0.4, IDLE), K([-1.8, 0, -2.8], 0.3, SWEEP), K([-1.5, 0, 1.5], -0.3, IDLE),
      K([-3.8, 0, -1.0], 0.5, SHIELD), K([-2.0, 0, -2.5], -1.9, POINT), K([-3.5, 0, -2.5], -1.9, POINT),
      K([-0.5, 0, 0.5], 0.2, IDLE),
    ],
    jono: [
      K([5.5, 0, -1.0], -0.5, IDLE), K([4.5, 0, 0.5], -0.4, SWEEP), K([3.5, 0, 1.5], -0.3, IDLE),
      K([6.0, 0, -2.5], -0.6, BURN), K([4.0, 0, 0.0], -0.3, SHIELD), K([5.0, 0, -1.5], -0.4, IDLE),
      K([3.0, 0, 0.5], -0.2, IDLE),
    ],
  };
  // Jendela jalan (walk cycle): langkah 0,34 m mengikuti kecepatan (kaki nempel tanah);
  // ujung jalan HARUS sama dengan posisi lerp kunci di jam itu, supaya tidak lompat.
  const WALKS = [
    { ch: 'budi', s: 5.5, e: 9.0, from: [0.60, 0, 0.84], to: [1.82, 0, 1.26] },
  ];
  function lerpPose(a, b, k) {
    const out = {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const va = a[key] || [0, 0, 0], vb = b[key] || [0, 0, 0];
      out[key] = [lerp(va[0], vb[0], k), lerp(va[1], vb[1], k), lerp(va[2], vb[2], k)];
    }
    return out;
  }
  function applyKey(char, keys, beat, u, t) {
    const cur = keys[beat];
    const nxt = keys[Math.min(beat + 1, keys.length - 1)];
    const k = easeInOut(u);
    char.root.position.set(
      lerp(cur.pos[0], nxt.pos[0], k),
      cur.pos[1],
      lerp(cur.pos[2], nxt.pos[2], k),
    );
    char.root.rotation.y = lerp(cur.rotY, nxt.rotY, k);
    const pose = lerpPose(cur.pose, nxt.pose, k);
    pose.chest = pose.chest || [0, 0, 0];
    pose.chest = [pose.chest[0] + 0.02 * Math.sin(t * 1.8), pose.chest[1], pose.chest[2]];
    pose.head = pose.head || [0, 0, 0];
    pose.head = [pose.head[0], pose.head[1] + 0.06 * Math.sin(t * 0.5), pose.head[2]];
    char.setPose(pose);
    return pose;
  }
  function applyWalk(name, t) {
    const w = WALKS.find((x) => x.ch === name);
    if (!w || t < w.s || t > w.e) return false;
    const ch = CHARS[name];
    const u = clamp01((t - w.s) / (w.e - w.s));
    const walkDist = Math.hypot(w.to[0] - w.from[0], w.to[2] - w.from[2]);
    const walkSpeed = walkDist / (w.e - w.s);
    const ph = (t - w.s) * (walkSpeed / 0.34) * Math.PI; // langkah 0,34 m, kaki nempel tanah
    ch.root.position.set(lerp(w.from[0], w.to[0], u), Math.abs(Math.sin(ph)) * 0.02, lerp(w.from[2], w.to[2], u));
    ch.root.rotation.y = Math.atan2(w.to[0] - w.from[0], w.to[2] - w.from[2]) - 0.45; // hadap sedikit ke kamera
    const swing = Math.sin(ph);
    ch.J.lHip.rotation.x = swing * 0.5;
    ch.J.rHip.rotation.x = -swing * 0.5;
    ch.J.lKn.rotation.x = Math.max(0, -swing) * 0.7;
    ch.J.rKn.rotation.x = Math.max(0, swing) * 0.7;
    ch.J.spine.rotation.x = 0.1;
    if (name === 'budi') {
      // tangan kiri memegang keranjang (tetap), kanan mengayun
      ch.J.rSh.rotation.x = -swing * 0.4;
    } else {
      ch.J.lSh.rotation.x = swing * 0.4;
      ch.J.rSh.rotation.x = -swing * 0.4;
    }
    return true;
  }
  function blinkAt(t, off) {
    const ph = (t + off) % 3.7;
    return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
  }

  // ---------- Kamera: 24 shot ----------
  // 6 gerakan kontinu (zoom/pan nyata, bukan cut): S1 crane pembuka, S2a zoom-out,
  // S2b pan kiri-ke-kanan, S3a zoom-in, S4e pan kanan-ke-kiri, S7c pull-back penutup.
  // Shot lain DIAM; ganti skala lewat CUT.
  // Format: {s, e, fov, pos, target, move?: {pos2, target2, fov2}}
  const SHOTS = [
    // Beat 1 — HOOK: gerakan kontinu #1 (crane-down + dolly-in dari udara)
    { s: 1.00, e: 4.50, fov: 46, pos: [0, 7.5, 12], target: [0, 0.5, -3], move: { pos2: [0, 1.9, 7.0], target2: [0, 0.9, -1.0] } },
    // Beat 2 — SETUP: ZOOM OUT (S2a) + PAN kiri-ke-kanan mengikuti Budi (S2b) + 1 shot diam
    { s: 4.50, e: 7.00, fov: 46, pos: [-0.8, 1.8, 4.5], target: [-1.2, 1.0, 0.5], move: { pos2: [0, 3.5, 12.5], target2: [0, 0.7, -2.5], fov2: 52 } },
    { s: 7.00, e: 9.40, fov: 46, pos: [-0.2, 1.8, 6.2], target: [1.1, 0.9, 1.0], move: { pos2: [0.9, 1.8, 6.2], target2: [1.6, 0.9, 1.2] } }, // PAN kiri-ke-kanan mengikuti Budi (ditarik mundur supaya Budi tidak memenuhi frame)
    { s: 9.40, e: 11.88, fov: 42, pos: [-2.2, 2.2, 6.5], target: [-2.2, 0.6, -1.5] }, // S2c digeser barat supaya Raka tidak terpotong di tepi
    // Beat 3 — TWIST: ZOOM IN (S3a) + 3 shot diam
    { s: 11.88, e: 14.40, fov: 48, pos: [2.2, 1.7, 5.5], target: [-0.5, 1.0, -0.5], move: { pos2: [1.2, 1.5, 3.6], target2: [-0.5, 1.0, -0.5], fov2: 40 } },
    { s: 14.40, e: 17.00, fov: 42, pos: [2.6, 1.5, 3.2], target: [2.2, 1.1, -0.8] },
    { s: 17.00, e: 19.60, fov: 46, pos: [3.4, 1.8, 4.2], target: [1.6, 1.0, -1.2] },
    { s: 19.60, e: 22.38, fov: 42, pos: [1.0, 1.2, 1.5], target: [2.0, 0.4, -2.5] },
    // Beat 4 — ESKALASI: 4 shot diam + PAN kanan-ke-kiri (S4e)
    { s: 22.38, e: 24.60, fov: 46, pos: [1.5, 1.6, 2.5], target: [2.5, 1.0, -1.0] },
    { s: 24.60, e: 27.00, fov: 48, pos: [4.5, 2.4, 6.0], target: [5.0, 0.8, -2.5] },
    { s: 27.00, e: 29.20, fov: 42, pos: [4.2, 1.7, 3.0], target: [5.2, 1.0, -2.2] },
    { s: 29.20, e: 31.40, fov: 46, pos: [-1.0, 1.7, 4.5], target: [1.8, 1.0, -0.9] },
    { s: 31.40, e: 33.66, fov: 48, pos: [2.5, 3.0, 7.5], target: [4.5, 0.8, -2.5], move: { pos2: [-2.5, 3.0, 7.5], target2: [-3.5, 0.8, -2.5] } },
    // Beat 5 — KONTRAS: 2 shot diam (Dar menunjuk kebun)
    { s: 33.66, e: 35.30, fov: 48, pos: [-4.5, 2.6, 1.0], target: [-2.5, 0.7, -3.0] }, // S5a: dari barat-daya-tinggi — Dar profil 3/4 menunjuk ke kebun, tumpukan di bawah frame
    { s: 35.30, e: 37.04, fov: 46, pos: [-3.78, 2.0, 0.35], target: [-2.6, 0.9, -2.5] }, // S5b: dari barat-daya — profil penuh Dar, kebun di latar kiri, tumpukan di tepi kanan
    // Beat 6 — MEKANISME: 6 shot diam
    { s: 37.04, e: 39.30, fov: 46, pos: [3.2, 1.7, 1.8], target: [4.5, 0.8, -3.5] },
    { s: 39.30, e: 41.60, fov: 42, pos: [2.6, 1.7, 1.0], target: [3.8, 0.9, -2.6] },
    { s: 41.60, e: 43.90, fov: 46, pos: [2.0, 1.6, 2.5], target: [4.0, 0.8, -3.0] },
    { s: 43.90, e: 46.20, fov: 46, pos: [2.5, 2.5, 7.0], target: [3.0, 0.8, -2.5] }, // S6d ditarik jauh ke selatan — Raka + Sastro + bak muat, Sari/Budi/Jono keluar frame
    { s: 46.20, e: 48.50, fov: 46, pos: [1.2, 1.7, 2.8], target: [3.2, 0.9, -1.5] },
    { s: 48.50, e: 50.76, fov: 48, pos: [1.0, 2.6, 6.5], target: [3.0, 0.6, -3.0] },
    // Beat 7 — PAYOFF: 2 shot diam + gerakan kontinu #6 (pull-back penutup)
    { s: 50.76, e: 53.50, fov: 44, pos: [2.2, 1.6, 2.0], target: [3.3, 0.9, -2.0] },
    { s: 53.50, e: 56.00, fov: 48, pos: [0.8, 2.0, 6.8], target: [0.8, 1.0, 0.5] },
    { s: 56.00, e: 60.00, fov: 44, pos: [0, 1.8, 5.0], target: [0, 1.0, -2], move: { pos2: [0, 5.0, 15.5], target2: [0, 1.0, -4], fov2: 54 } }, // PULL-BACK penutup dilebarkan supaya barisan 6 warga muat
  ];
  const BEATS = [
    { s: 1.00, e: 4.50 }, { s: 4.50, e: 11.88 }, { s: 11.88, e: 22.38 }, { s: 22.38, e: 33.66 },
    { s: 33.66, e: 37.04 }, { s: 37.04, e: 50.76 }, { s: 50.76, e: 60.00 },
  ];
  function beatAt(t) {
    for (let i = 0; i < BEATS.length; i++)
      if (t < BEATS[i].e || i === BEATS.length - 1) return i;
    return 0;
  }
  function shotAt(t) {
    for (let i = 0; i < SHOTS.length; i++)
      if (t < SHOTS[i].e || i === SHOTS.length - 1) return SHOTS[i];
    return SHOTS[0];
  }

  // ---------- Pencahayaan siang -> senja ----------
  const DAY = { sun: new THREE.Color(0xffd9a0), sunI: 2.4, hemi: 1.5, sky: new THREE.Color(0x4276e5) };
  const GOLD = { sun: new THREE.Color(0xffb36b), sunI: 2.2, hemi: 1.2, sky: new THREE.Color(0xffc98a) };
  const SET = { sun: new THREE.Color(0xff9a4d), sunI: 2.0, hemi: 1.1, sky: new THREE.Color(0xec5711) };
  const tmpCol = new THREE.Color();
  function applyLight(t) {
    const kGold = clamp01((t - 33.66) / 1.5) * (1 - clamp01((t - 50.76) / 2));
    const kSet = clamp01((t - 50.76) / 2);
    tmpCol.copy(DAY.sky).lerp(GOLD.sky, kGold).lerp(SET.sky, kSet);
    scene.background.copy(tmpCol);
    scene.fog.color.copy(tmpCol);
    sun.color.copy(DAY.sun).lerp(GOLD.sun, kGold).lerp(SET.sun, kSet);
    sun.intensity = lerp(lerp(DAY.sunI, GOLD.sunI, kGold), SET.sunI, kSet);
    hemi.intensity = lerp(lerp(DAY.hemi, GOLD.hemi, kGold), SET.hemi, kSet);
    clouds.forEach((c) => { c.material.opacity = lerp(0.85, 0.5, kSet); });
  }

  // ---------- renderAt ----------
  const v3 = new THREE.Vector3();
  function renderAt(t) {
    const beat = beatAt(t);
    const sh = shotAt(t);
    const u = clamp01((t - sh.s) / (sh.e - sh.s));
    // Kamera: DIAM dalam shot (kecuali 6 gerakan kontinu, diinterpolasi easeInOut)
    let px = sh.pos[0], py = sh.pos[1], pz = sh.pos[2];
    let tx = sh.target[0], ty = sh.target[1], tz = sh.target[2];
    let fov = sh.fov;
    if (sh.move) {
      const k = easeInOut(u);
      px = lerp(sh.pos[0], sh.move.pos2[0], k);
      py = lerp(sh.pos[1], sh.move.pos2[1], k);
      pz = lerp(sh.pos[2], sh.move.pos2[2], k);
      tx = lerp(sh.target[0], sh.move.target2[0], k);
      ty = lerp(sh.target[1], sh.move.target2[1], k);
      tz = lerp(sh.target[2], sh.move.target2[2], k);
      if (sh.move.fov2) fov = lerp(sh.fov, sh.move.fov2, k);
    }
    camera.position.set(px, py, pz);
    v3.set(tx, ty, tz);
    camera.lookAt(v3);
    camera.fov = fov;
    camera.updateProjectionMatrix();

    applyLight(t);
    clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.05 + i * 2) * 0.002; });

    // Karakter: kunci per beat + sapuan menyapu + 1 jendela jalan
    const bU = clamp01((t - BEATS[beat].s) / (BEATS[beat].e - BEATS[beat].s));
    for (const [name, ch] of Object.entries(CHARS)) {
      applyKey(ch, KEYS[name], beat, bU, t);
      applyWalk(name, t);
    }
    // Ayunan sapu (beat 2): lengan kanan berayun
    if (beat === 1) {
      const sw = Math.sin(t * 2.5) * 0.3;
      for (const ch of [raka, budi, sari, dar]) ch.J.rSh.rotation.x += sw;
    }
    // Sapu terlihat hanya beat 2; keranjang Budi beat 2 + 6; gembor Raka beat 6
    const showBroom = beat === 1;
    for (const b of Object.values(brooms)) b.visible = showBroom;
    budiBasket.visible = beat === 1 || beat === 5;
    can.visible = beat === 5;
    // Wajah
    raka.setFace({ blink: blinkAt(t, 0), smile: beat === 6 ? 0.4 : (beat === 2 ? 0.2 : 0) });
    sastro.setFace({ blink: blinkAt(t, 1.3), smile: beat === 2 ? 0.8 : (beat >= 4 ? 0.5 : 0) });
    budi.setFace({ blink: blinkAt(t, 0.7), smile: beat === 6 ? 0.4 : 0 });
    sari.setFace({ blink: blinkAt(t, 2.1), smile: beat === 6 ? 0.3 : 0 });
    dar.setFace({ blink: blinkAt(t, 2.9), smile: beat === 4 ? 0.3 : 0 });
    jono.setFace({ blink: blinkAt(t, 1.9), smile: 0 });
    if (beat === 2) sastro.J.head.rotation.y += Math.sin(t * 2.2) * 0.12; // geleng halus

    // Tumpukan daun mengecil di beat 6-7 (daun dipakai jadi kompos); kompos hitam muncul
    const useK = clamp01((t - 37.04) / 8);
    pileA.scale.setScalar(lerp(1.0, 0.7, useK));
    pileB.scale.setScalar(lerp(0.85, 0.6, useK));
    blackCompost.visible = t >= 37.04;
    if (blackCompost.visible) blackCompost.scale.setScalar(lerp(0.3, 1.0, clamp01((t - 37.04) / 10)));
    // Kebun makin rimbun di beat 5-7
    const lush = 1 + 0.15 * clamp01((t - 33.66) / 3);
    garden.scale.setScalar(lush);

    // Asap beat 4 (t 24-33.66): naik dari tumpukan yang dibakar
    const smokeOn = t >= 24 && t < 33.66;
    smoke.forEach((s, i) => {
      if (!smokeOn) { s.material.opacity = 0; return; }
      const ph = ((t * 0.45 + i * 0.35) % 1);
      s.position.set(5.2 + Math.sin(i * 2.3) * 0.3 + ph * 0.9, 0.4 + ph * 2.6, -2.0 + Math.cos(i * 1.7) * 0.25);
      const sc = 0.45 + ph * 0.8;
      s.scale.set(sc, sc * 0.7, sc);
      s.material.opacity = 0.65 * (1 - ph) * clamp01((t - 24) / 1.5) * (1 - clamp01((t - 32) / 1.66));
    });
    // Tetes air beat 6 saat menyiram (t 41.6-43.9)
    const watering = t >= 41.6 && t < 43.9;
    drops.forEach((d, i) => {
      if (!watering) { d.material.opacity = 0; return; }
      const ph = ((t * 2.2 + i * 0.13) % 1);
      d.position.set(3.9 + ph * 0.55, 1.05 - ph * 0.85, -2.6 + Math.sin(i * 2.1) * 0.12);
      d.material.opacity = 0.85 * (1 - ph * 0.5);
    });

    renderer.render(scene, camera);
  }

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  return { scene, camera, renderAt, resize };
}
