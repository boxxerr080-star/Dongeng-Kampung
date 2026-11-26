// Katak Penjaga Padi — scene kartun-3d (three.js, render deterministik via renderAt(t))
// Gaya: low-poly kepala besar seperti video Warung Kopi. 576x1024, 30fps, durasi 60 detik.
// Beat (detik video, voiceover mulai t=1.0):
//   B1  1.00-4.06  HOOK     PENJAGA SAWAH
//   B2  4.06-14.34 SETUP    ATURAN SAWAH
//   B3 14.34-23.02 TWIST    JANGAN DIUSIR
//   B4 23.02-32.98 ESKALASI WERENG MELEDAK
//   B5 32.98-41.68 KONTRAS  TETAP HIJAU (malam)
//   B6 41.68-54.44 MEKANISME RATUSAN SERANGGA
//   B7 54.44-60.00 PAYOFF   YANG MENJAGA

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

const mat = (c, r = 0.85, m = 0) => new (THREE.MeshStandardMaterial)({ color: c, roughness: r, metalness: m });
function mesh(geo, material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, material);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
function pivot(parent, name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- Karakter kepala besar (gaya video Warung Kopi) ----------
function makeVillager(opts = {}) {
  const {
    skin = 0xe8b98a, shirt = 0x2f6fd0, pants = 0x2a2f45,
    hair = 0x1a1a1a, glasses = false, beard = false, shoe = 0x3a2a1a,
  } = opts;
  const root = new THREE.Group();
  const J = {};
  const M = {
    skin: mat(skin, 0.6), shirt: mat(shirt, 0.8), pants: mat(pants, 0.9),
    hair: mat(hair, 0.9), dark: mat(0x1a1a1a, 0.4), white: mat(0xffffff, 0.25),
    shoe: mat(shoe, 0.7), grey: mat(0x9a9a9a, 0.9),
  };
  const cap = (r, len, m) => mesh(new THREE.CapsuleGeometry(r, len, 6, 12), m);

  const pelvis = pivot(root, 'pelvis', 0, 0.62, 0); J.pelvis = pelvis;
  const hips = cap(0.17, 0.10, M.pants); hips.position.y = 0.02; pelvis.add(hips);
  const spine = pivot(pelvis, 'spine', 0, 0.12, 0); J.spine = spine;
  const chest = pivot(spine, 'chest', 0, 0.22, 0); J.chest = chest;
  const torso = cap(0.21, 0.22, M.shirt); torso.position.y = -0.02; chest.add(torso);
  const neck = pivot(chest, 'neck', 0, 0.30, 0); J.neck = neck;
  const head = pivot(neck, 'head', 0, 0.13, 0); J.head = head;
  const skull = mesh(new THREE.SphereGeometry(0.30, 28, 20), M.skin, 0, 0, 0);
  skull.scale.set(1, 1.05, 0.98); head.add(skull);

  if (hair !== null) {
    const hairCap = mesh(new THREE.SphereGeometry(0.305, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hair, 0, 0.05, 0);
    hairCap.scale.set(1.02, 1, 1.02); head.add(hairCap);
  }
  // Mata besar
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.055, 16, 12), M.white, s * 0.11, 0.03, 0.27);
    head.add(eye); eyes.push(eye);
    const pupil = mesh(new THREE.SphereGeometry(0.027, 12, 10), M.dark, s * 0.11, 0.03, 0.315);
    head.add(pupil);
    const glint = mesh(new THREE.SphereGeometry(0.009, 8, 6), M.white, s * 0.10, 0.045, 0.335);
    head.add(glint);
    const brow = mesh(new THREE.BoxGeometry(0.10, 0.022, 0.015), M.hair, s * 0.11, 0.115, 0.285);
    head.add(brow);
  }
  // Hidung + mulut
  const nose = mesh(new THREE.SphereGeometry(0.028, 10, 8), M.skin, 0, -0.02, 0.295);
  head.add(nose);
  const mouth = mesh(new THREE.BoxGeometry(0.10, 0.016, 0.012), mat(0x5a2a2a, 0.8), 0, -0.10, 0.285);
  head.add(mouth); J.mouth = mouth;

  if (glasses) {
    // Bingkai kacamata kotak dari bilah tipis
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
    const sh = pivot(chest, side < 0 ? 'lSh' : 'rSh', side * 0.26, 0.20, 0);
    const up = cap(0.06, 0.14, M.shirt); up.position.y = -0.10; sh.add(up);
    const el = pivot(sh, side < 0 ? 'lEl' : 'rEl', 0, -0.22, 0);
    const fo = cap(0.05, 0.12, M.skin); fo.position.y = -0.09; el.add(fo);
    const wr = pivot(el, side < 0 ? 'lWr' : 'rWr', 0, -0.20, 0);
    const hand = mesh(new THREE.SphereGeometry(0.06, 12, 10), M.skin, 0, -0.04, 0);
    hand.scale.set(0.9, 1.1, 0.6); wr.add(hand);
    J[side < 0 ? 'lSh' : 'rSh'] = sh; J[side < 0 ? 'lEl' : 'rEl'] = el; J[side < 0 ? 'lWr' : 'rWr'] = wr;
  }
  arm(-1); arm(1);
  // Kaki pendek
  function leg(side) {
    const hip = pivot(pelvis, side < 0 ? 'lHip' : 'rHip', side * 0.11, -0.05, 0);
    const th = cap(0.075, 0.20, M.pants); th.position.y = -0.16; hip.add(th);
    const kn = pivot(hip, side < 0 ? 'lKn' : 'rKn', 0, -0.30, 0);
    const sh2 = cap(0.06, 0.18, M.pants); sh2.position.y = -0.14; kn.add(sh2);
    const an = pivot(kn, side < 0 ? 'lAn' : 'rAn', 0, -0.30, 0);
    const foot = mesh(new THREE.BoxGeometry(0.13, 0.07, 0.24), M.shoe, 0, -0.03, 0.05);
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

// ---------- Katak ----------
function makeFrog() {
  const g = new THREE.Group();
  const green = mat(0x4caf50, 0.7);
  const body = mesh(new THREE.SphereGeometry(0.16, 18, 12), green, 0, 0.09, 0);
  body.scale.set(1, 0.62, 1.15); g.add(body);
  for (const s of [-1, 1]) {
    const bump = mesh(new THREE.SphereGeometry(0.055, 12, 10), green, s * 0.07, 0.20, 0.10);
    g.add(bump);
    const eye = mesh(new THREE.SphereGeometry(0.032, 10, 8), mat(0xffffff, 0.3), s * 0.07, 0.22, 0.145);
    g.add(eye);
    const pupil = mesh(new THREE.SphereGeometry(0.016, 8, 6), mat(0x1a1a1a, 0.3), s * 0.07, 0.22, 0.172);
    g.add(pupil);
    const leg = mesh(new THREE.SphereGeometry(0.06, 10, 8), green, s * 0.15, 0.04, -0.02);
    leg.scale.set(1, 0.5, 1.4); g.add(leg);
  }
  const mouth = mesh(new THREE.BoxGeometry(0.10, 0.012, 0.01), mat(0x2a4a2a, 0.8), 0, 0.10, 0.17);
  g.add(mouth);
  g.userData.mouth = mouth;
  return g;
}

// ---------- Dunia ----------
let THREE = null;

export function buildScene(THREEin, renderer) {
  THREE = THREEin;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec8ee);
  scene.fog = new THREE.Fog(0x8ec8ee, 14, 42);
  const camera = new THREE.PerspectiveCamera(38, 0.5625, 0.1, 120);

  const hemi = new THREE.HemisphereLight(0xbfdcff, 0x3a2f1e, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.4);
  sun.position.set(-6, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x88bbff, 0.7);
  rim.position.set(6, 4, -8);
  scene.add(rim);

  // Tanah sawah
  const ground = mesh(new THREE.PlaneGeometry(80, 80), mat(0x5da24a, 0.95), 0, 0, -4);
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  scene.add(ground);
  // Pemantang tanah (bund) — satu jalur vertikal saja
  const bund = mesh(new THREE.BoxGeometry(0.7, 0.16, 11), mat(0x8a6b45, 1), 0, 0.08, -1.5);
  scene.add(bund);

  // Padi: dua InstancedMesh (petak A kiri = Raka, petak B kanan = Pak Sastro)
  const riceGeo = new THREE.ConeGeometry(0.11, 0.48, 5);
  const riceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  function makeRice(x0, x1) {
    const pts = [];
    for (let x = x0; x <= x1; x += 0.6)
      for (let z = -6; z <= 3; z += 0.6)
        pts.push([x + (rand() - 0.5) * 0.15, z + (rand() - 0.5) * 0.15]);
    const inst = new THREE.InstancedMesh(riceGeo, riceMat.clone(), pts.length);
    const d = new THREE.Object3D();
    const col = new THREE.Color(0x4e9b3a);
    pts.forEach((p, i) => {
      d.position.set(p[0], 0.28, p[1]);
      d.rotation.y = rand() * Math.PI;
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, col);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    inst.userData.count = pts.length;
    scene.add(inst);
    return inst;
  }
  const riceA = makeRice(-5.5, -0.5);
  const riceB = makeRice(0.5, 5.5);
  const greenCol = new THREE.Color(0x5aa843);
  const yellowCol = new THREE.Color(0xc9a227);

  // Gubuk (di tepi kiri-belakang supaya tidak menutupi shot)
  const hut = new THREE.Group(); hut.position.set(-8.5, 0, -9); hut.scale.setScalar(0.9); scene.add(hut);
  hut.add(mesh(new THREE.BoxGeometry(2.8, 2.0, 2.4), mat(0x8a6b45, 0.95), 0, 1.0, 0));
  hut.add(mesh(new THREE.ConeGeometry(2.7, 1.4, 4), mat(0xa08050, 1), 0, 2.7, 0));
  hut.children[1].rotation.y = Math.PI / 4;
  hut.add(mesh(new THREE.BoxGeometry(0.7, 1.2, 0.05), mat(0x2a1c10, 0.9), 0, 0.6, 1.22));
  for (const [px, pz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]])
    hut.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), mat(0x6b4a2a, 0.95), px, 1.0, pz));

  // Pohon palem
  function palm(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    g.add(mesh(new THREE.CylinderGeometry(0.09, 0.13, 3.4, 8), mat(0x7a5a35, 0.95), 0, 1.7, 0));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const frond = mesh(new THREE.ConeGeometry(0.17, 1.8, 4), mat(0x3d8b37, 0.9), Math.cos(a) * 0.75, 3.55, Math.sin(a) * 0.75);
      frond.rotation.z = Math.cos(a) * 1.1; frond.rotation.x = -Math.sin(a) * 1.1;
      frond.scale.set(1, 1, 0.28);
      g.add(frond);
    }
    scene.add(g);
  }
  palm(-8, -3, 1.1); palm(8, -4, 1.25); palm(-9, 2, 0.9); palm(7.5, 1, 1.0); palm(4, -8, 1.1);

  // Bukit hijau jauh (bukan piramida abu-abu besar) — pipih supaya terbaca bukit
  for (const [x, z, r, h] of [[-15, -38, 9, 6], [0, -40, 11, 7], [15, -38, 8, 5.5]]) {
    const m = mesh(new THREE.ConeGeometry(r, h, 7), mat(0x5f8a6e, 1), x, h * 0.28 - 0.5, z);
    m.scale.y = 0.55;
    scene.add(m);
  }

  // Awan
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const c = mesh(new THREE.SphereGeometry(1.6, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 }), -9 + i * 6, 8.5 + (i % 2), -16 - i * 2);
    c.scale.set(1.6, 0.5, 1); c.castShadow = false;
    scene.add(c); clouds.push(c);
  }
  // Bintang + bulan (malam)
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 160; i++) {
    const a = rand() * Math.PI * 2, e = 0.25 + rand() * 1.1, r = 34;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 6);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0, fog: false }));
  scene.add(stars);
  const moon = mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0xf5f0d0, transparent: true, opacity: 0, fog: false }), 2.5, 10, -22);
  moon.castShadow = false; scene.add(moon);
  // Lentera hangat di dekat karakter (membaca saat malam)
  const lantern = new THREE.PointLight(0xffb36b, 0, 9, 1.6);
  lantern.position.set(0.4, 2.2, 0.5);
  scene.add(lantern);

  // ---------- Karakter ----------
  const raka = makeVillager({ shirt: 0x2f6fd0, pants: 0x2a2f45, hair: 0x1a1a1a, glasses: true });
  const sastro = makeVillager({ shirt: 0x3a7d44, pants: 0x3a2f25, hair: null, beard: true });
  scene.add(raka.root, sastro.root);

  // Penyemprot (tank di punggung + selang di tangan kanan Raka)
  const sprayer = new THREE.Group();
  const tank = mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.26, 12), mat(0x7a8a7a, 0.6), 0, 0.05, -0.30);
  const wand = new THREE.Group();
  const wandTube = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), mat(0x555555, 0.5), 0, 0, 0.25);
  wandTube.rotation.x = Math.PI / 2;
  wand.add(wandTube);
  sprayer.add(tank);
  raka.J.chest.add(sprayer);
  raka.J.rWr.add(wand);
  // Partikel semprot (anak dari wand, mengarah +z lokal)
  const sprayPts = [];
  for (let i = 0; i < 26; i++) {
    const p = mesh(new THREE.SphereGeometry(0.02, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }), 0, 0, 0);
    p.castShadow = false;
    wand.add(p); sprayPts.push(p);
  }

  // ---------- Katak ----------
  const frogs = [makeFrog(), makeFrog(), makeFrog(), makeFrog()];
  frogs.forEach((f) => scene.add(f));

  // ---------- Wereng ----------
  const WERENG_N = 80;
  const wereng = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.035, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 }),
    WERENG_N,
  );
  wereng.castShadow = false;
  const werengBase = [];
  for (let i = 0; i < WERENG_N; i++)
    werengBase.push([-5 + rand() * 4.5, 0.4 + rand() * 0.9, -3 + rand() * 4]);
  scene.add(wereng);

  // ---------- Beat, kamera, pose ----------
  const SHOTS = [
    { s: 0.00, e: 4.06, fov: 42, pA: [0, 2.0, 9.5], pB: [0, 1.9, 8.5], tA: [0, 0.9, -4], tB: [0, 0.9, -4] },
    { s: 4.06, e: 14.34, fov: 48, pA: [2.8, 1.6, 4.8], pB: [2.4, 1.5, 4.2], tA: [-0.2, 0.8, -1.0], tB: [-0.2, 0.8, -1.0] },
    { s: 14.34, e: 23.02, fov: 50, pA: [-3.0, 1.8, 4.8], pB: [-2.5, 1.7, 4.2], tA: [0.1, 1.0, -0.5], tB: [0.1, 1.0, -0.5] },
    { s: 23.02, e: 32.98, fov: 44, pA: [1.5, 2.2, 5.5], pB: [1.0, 2.0, 4.8], tA: [-2.0, 0.9, 0.2], tB: [-2.0, 0.9, 0.2] },
    { s: 32.98, e: 41.68, fov: 48, pA: [2.4, 1.9, 5.4], pB: [2.0, 1.7, 4.8], tA: [0.0, 0.7, -0.8], tB: [0.0, 0.7, -0.8] },
    { s: 41.68, e: 54.44, fov: 42, pA: [1.0, 1.2, 1.9], pB: [0.8, 1.0, 1.5], tA: [0, 0.15, -0.9], tB: [0, 0.15, -0.9] },
    { s: 54.44, e: 60.00, fov: 44, pA: [-2.2, 2.0, 6.4], pB: [-1.8, 1.9, 5.8], tA: [0.6, 1.0, -2.0], tB: [0.6, 1.0, -2.0] },
  ];
  function beatAt(t) {
    for (let i = 0; i < SHOTS.length; i++)
      if (t < SHOTS[i].e || i === SHOTS.length - 1) return i;
    return 0;
  }
  const IDLE = { spine: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], lSh: [0.12, 0, 0.12], rSh: [0.12, 0, -0.12], lEl: [-0.15, 0, 0], rEl: [-0.15, 0, 0], lHip: [0, 0, 0], rHip: [0, 0, 0], lKn: [0, 0, 0], rKn: [0, 0, 0] };
  const RAKA_KEYS = [
    { pos: [-1.4, 0, 1.2], rotY: 0.3, pose: IDLE },
    { pos: [-0.7, 0, -0.6], rotY: -0.2, pose: { ...IDLE, spine: [0.28, 0, 0], head: [0.15, 0, 0], rSh: [-1.2, 0, -0.3], rEl: [-0.2, 0, 0] } },
    { pos: [-0.7, 0, 0.2], rotY: 0.15, pose: { ...IDLE, rSh: [-0.9, 0, -0.4], rEl: [-0.5, 0, 0], lSh: [0.3, 0, 0.3] } },
    { pos: [-2.2, 0, 0.8], rotY: 0.5, pose: { ...IDLE, rSh: [-1.1, 0, -0.3], rEl: [-0.4, 0, 0] } },
    { pos: [-0.6, 0, 0.2], rotY: 0.2, pose: { ...IDLE, head: [0.35, 0, 0], spine: [0.12, 0, 0] } },
    { pos: [-0.6, 0, 0.2], rotY: 0.2, pose: { ...IDLE, head: [0.35, 0, 0] } },
    { pos: [0.0, 0, 0.6], rotY: -0.15, pose: IDLE },
  ];
  const SASTRO_KEYS = [
    { pos: [1.8, 0, -1.0], rotY: -0.3, pose: IDLE },
    { pos: [1.5, 0, -1.2], rotY: -0.4, pose: { ...IDLE, lSh: [0.3, 0, 0.5], rSh: [0.3, 0, -0.5], lEl: [-0.4, 0, 0], rEl: [-0.4, 0, 0] } },
    { pos: [0.8, 0, -0.5], rotY: -0.35, pose: { ...IDLE, rSh: [-1.4, 0, -0.2], rEl: [-0.3, 0, 0], head: [-0.08, 0, 0] } },
    { pos: [1.6, 0, -0.4], rotY: -0.3, pose: { ...IDLE, lSh: [-0.4, 0, 0.9], rSh: [-0.4, 0, -0.9], lEl: [-0.9, 0, 0], rEl: [-0.9, 0, 0] } },
    { pos: [1.0, 0, -0.6], rotY: -0.3, pose: IDLE },
    { pos: [1.0, 0, -0.6], rotY: -0.3, pose: IDLE },
    { pos: [1.1, 0, 0.3], rotY: -0.2, pose: IDLE },
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
    // napas + gerak kecil
    pose.chest = pose.chest || [0, 0, 0];
    pose.chest = [pose.chest[0] + 0.02 * Math.sin(t * 1.8), pose.chest[1], pose.chest[2]];
    pose.head = pose.head || [0, 0, 0];
    pose.head = [pose.head[0], pose.head[1] + 0.06 * Math.sin(t * 0.5 + (char === raka ? 0 : 2)), pose.head[2]];
    char.setPose(pose);
    return pose;
  }
  function blinkAt(t, off) {
    const ph = (t + off) % 3.7;
    return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
  }

  // ---------- Pencahayaan siang / malam / senja ----------
  const DAY = { sun: new THREE.Color(0xffd9a0), sunI: 2.4, hemi: 1.5, sky: new THREE.Color(0x8ec8ee) };
  const NIGHT = { sun: new THREE.Color(0x8fb0ff), sunI: 0.9, hemi: 0.55, sky: new THREE.Color(0x0b1233) };
  const GOLD = { sun: new THREE.Color(0xffb36b), sunI: 2.2, hemi: 1.2, sky: new THREE.Color(0xffc98a) };
  const tmpCol = new THREE.Color();
  function applyLight(t) {
    const kNight = clamp01((t - 32.5) / 1.3) * (1 - clamp01((t - 41.2) / 1.2));
    const kGold = clamp01((t - 54.0) / 1.5);
    tmpCol.copy(DAY.sky).lerp(NIGHT.sky, kNight).lerp(GOLD.sky, kGold);
    scene.background.copy(tmpCol);
    scene.fog.color.copy(tmpCol);
    sun.color.copy(DAY.sun).lerp(NIGHT.sun, kNight).lerp(GOLD.sun, kGold);
    sun.intensity = lerp(lerp(DAY.sunI, NIGHT.sunI, kNight), GOLD.sunI, kGold);
    hemi.intensity = lerp(lerp(DAY.hemi, NIGHT.hemi, kNight), GOLD.hemi, kGold);
    stars.material.opacity = kNight;
    moon.material.opacity = kNight;
    lantern.intensity = kNight * 14;
    clouds.forEach((c) => { c.material.opacity = lerp(0.85, 0.15, kNight); });
    return kNight;
  }

  // ---------- renderAt ----------
  const dummy = new THREE.Object3D();
  const v3 = new THREE.Vector3();
  function renderAt(t) {
    const beat = beatAt(t);
    const sh = SHOTS[beat];
    const u = clamp01((t - sh.s) / (sh.e - sh.s));
    const k = easeInOut(u);
    // Kamera
    camera.position.set(
      lerp(sh.pA[0], sh.pB[0], k) + Math.sin(t * 0.9) * 0.012,
      lerp(sh.pA[1], sh.pB[1], k) + Math.cos(t * 0.7) * 0.008,
      lerp(sh.pA[2], sh.pB[2], k),
    );
    v3.set(lerp(sh.tA[0], sh.tB[0], k), lerp(sh.tA[1], sh.tB[1], k), lerp(sh.tA[2], sh.tB[2], k));
    camera.lookAt(v3);
    camera.fov = sh.fov || 42;
    camera.updateProjectionMatrix();

    applyLight(t);
    clouds.forEach((c, i) => { c.position.x += Math.sin(t * 0.05 + i * 2) * 0.002; });

    // Karakter
    applyKey(raka, RAKA_KEYS, beat, u, t);
    applyKey(sastro, SASTRO_KEYS, beat, u, t);
    raka.setFace({ blink: blinkAt(t, 0), smile: beat === 6 ? 0.3 : 0 });
    let sastroSmile = beat === 2 ? 0.8 : (beat >= 4 ? 0.5 : 0);
    if (beat === 2) sastro.J.head.rotation.y += Math.sin(t * 2.2) * 0.15; // geleng halus
    sastro.setFace({ blink: blinkAt(t, 1.3), smile: sastroSmile });
    // Sapuan semprot Raka di beat 4
    if (beat === 3) raka.J.rSh.rotation.y += Math.sin(t * 1.2) * 0.45;

    // Penyemprot hanya beat 3-4
    const showSprayer = t >= 14.34 && t < 32.98;
    sprayer.visible = showSprayer;
    wand.visible = showSprayer;
    const spraying = t >= 23.5 && t < 32.0;
    sprayPts.forEach((p, i) => {
      if (!spraying) { p.visible = false; return; }
      p.visible = true;
      const ph = ((t * 7 + i * 0.37) % 1);
      const spread = 0.03 + ph * 0.16;
      const ang = (i / sprayPts.length) * Math.PI * 2 + i;
      p.position.set(Math.cos(ang) * spread, Math.sin(ang) * spread * 0.7 - ph * 0.08, 0.5 + ph * 0.9);
      p.material.opacity = 0.7 * (1 - ph);
    });

    // Padi petak A menguning di beat 4 (24-30 detik)
    const yk = clamp01((t - 24) / 6);
    if (yk > 0) {
      tmpCol.copy(greenCol).lerp(yellowCol, yk);
      for (let i = 0; i < riceA.userData.count; i++) riceA.setColorAt(i, tmpCol);
      riceA.instanceColor.needsUpdate = true;
    } else if (riceA.instanceColor) {
      for (let i = 0; i < riceA.userData.count; i++) riceA.setColorAt(i, greenCol);
      riceA.instanceColor.needsUpdate = true;
    }

    // Katak
    const hop = (tt, amp = 0.12, f = 2) => Math.abs(Math.sin(tt * f)) * amp;
    // frog0 = hero
    const f0 = frogs[0];
    if (beat === 0) {
      f0.position.set(-0.3 + Math.sin(t * 0.4) * 0.2, 0.14 + hop(t), -1.8);
      f0.rotation.y = 0.4;
    } else if (beat === 1) {
      f0.position.set(-0.5, 0.52, -1.4); f0.rotation.y = -0.5;
    } else if (beat === 2) {
      f0.position.set(-0.5, 0.14, -1.9); f0.rotation.y = 0.2;
    } else if (beat === 3) {
      f0.visible = false;
    } else if (beat === 4) {
      f0.visible = true;
      const kk = easeInOut((t - 32.98) / 8.7);
      f0.position.set(lerp(-0.6, 0.1, kk), 0.14 + hop(t, 0.10, 2.4), lerp(-1.6, -1.0, kk));
      f0.rotation.y = lerp(0.3, -0.4, kk);
      f0.userData.mouth.scale.y = 1 + Math.max(0, Math.sin(t * 3)) * 2;
    } else if (beat === 5) {
      f0.visible = true;
      f0.position.set(0, 0.14, -0.9); f0.rotation.y = 0.15;
      f0.userData.mouth.scale.y = 1 + Math.max(0, Math.sin(t * 3.2)) * 3;
      f0.userData.mouth.scale.x = 1 + Math.max(0, Math.sin(t * 3.2)) * 0.6;
    } else {
      f0.visible = true;
      f0.position.set(0.4, 0.14, -0.5); f0.rotation.y = -0.3;
      f0.userData.mouth.scale.y = 1;
    }
    // frog1-3: di petak B, aktif malam hari
    const fPos = [[1.2, -2.2], [2.4, -1.4], [0.8, -2.8]];
    frogs.slice(1).forEach((f, i) => {
      const [fx, fz] = fPos[i];
      if (beat <= 2) { f.visible = true; f.position.set(fx, 0.14, fz); f.rotation.y = 0.5 + i; }
      else if (beat === 3) { f.visible = false; }
      else {
        f.visible = true;
        f.position.set(fx + Math.sin(t * 0.3 + i * 2) * 0.15, 0.14 + (beat === 4 ? hop(t + i, 0.09, 2.2) : 0), fz);
        f.rotation.y = 0.5 + i;
        if (beat === 4) f.userData.mouth.scale.y = 1 + Math.max(0, Math.sin(t * 3 + i)) * 2;
        else f.userData.mouth.scale.y = 1;
      }
    });

    // Wereng
    let wCount = 0;
    if (t >= 23 && t < 26) wCount = Math.round(80 * clamp01((t - 23) / 3));
    else if (t >= 26 && t < 34) wCount = 80;
    else if (t >= 34 && t < 41) wCount = Math.round(lerp(80, 12, clamp01((t - 34) / 7)));
    else if (t >= 41 && t < 54.44) wCount = 12;
    wereng.count = wCount;
    for (let i = 0; i < wCount; i++) {
      const b = werengBase[i];
      dummy.position.set(
        b[0] + Math.sin(t * 2 + i) * 0.15,
        b[1] + Math.sin(t * 3 + i * 1.7) * 0.10,
        b[2] + Math.cos(t * 1.6 + i) * 0.15,
      );
      dummy.updateMatrix();
      wereng.setMatrixAt(i, dummy.matrix);
    }
    wereng.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  return { scene, camera, renderAt, resize };
}
