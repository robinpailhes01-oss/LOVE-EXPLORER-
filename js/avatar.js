/* ═══════════════════════════════════════════
   Avatar 3D de Kia — cœur battant en WebGL
   Rendu procédural (Three.js embarqué, aucun asset externe) :
   cœur extrudé vernis rose, éclairages rose/or, particules
   dorées en orbite, battement cardiaque "lub-dub".
   KiaAvatar.mount(container) → true si le rendu 3D démarre,
   false si WebGL/Three.js indisponible (l'appelant affiche
   alors le repli CSS).
   ═══════════════════════════════════════════ */

const KiaAvatar = (() => {

  function heartShape() {
    // Tracé bézier classique du cœur (dessiné tête en bas, redressé ensuite)
    const s = new THREE.Shape();
    const x = 0, y = 0;
    s.moveTo(x + 5, y + 5);
    s.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    s.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    s.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    s.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    s.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    s.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
    return s;
  }

  /* Battement cardiaque : deux impulsions rapprochées ("lub-dub") par cycle */
  function beatScale(t) {
    const cycle = t % 1.7;
    const lub = Math.exp(-Math.pow((cycle - 0.18) / 0.09, 2));
    const dub = 0.55 * Math.exp(-Math.pow((cycle - 0.5) / 0.09, 2));
    return 1 + 0.055 * (lub + dub);
  }

  function init(container) {
    const width = container.clientWidth || 220;
    const height = container.clientHeight || 190;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 200);
    camera.position.set(0, 0, 46);

    // Éclairage : lumière chaude principale, contre-jour or, remplissage rose
    scene.add(new THREE.AmbientLight(0xffe9f0, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(6, 9, 12);
    scene.add(key);
    const gold = new THREE.PointLight(0xd4ab72, 900, 200);
    gold.position.set(-14, -5, 10);
    scene.add(gold);
    const rose = new THREE.PointLight(0xe0577f, 700, 200);
    rose.position.set(12, -8, -8);
    scene.add(rose);

    // Cœur vernis
    const geometry = new THREE.ExtrudeGeometry(heartShape(), {
      depth: 4.5,
      curveSegments: 28,
      steps: 2,
      bevelEnabled: true,
      bevelSegments: 10,
      bevelSize: 1.6,
      bevelThickness: 1.6,
    });
    geometry.center();
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe0577f,
      roughness: 0.18,
      metalness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
    const heart = new THREE.Mesh(geometry, material);
    heart.rotation.z = Math.PI;
    const group = new THREE.Group();
    group.add(heart);
    scene.add(group);

    // Particules dorées en orbite
    const COUNT = 90;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const radius = 15 + Math.random() * 9;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeo,
      new THREE.PointsMaterial({ color: 0xecd2ab, size: 0.4, transparent: true, opacity: 0.75 })
    );
    scene.add(particles);

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();

    function tick() {
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.y = Math.sin(t * 0.5) * 0.55;
        group.position.y = Math.sin(t * 1.1) * 0.8;
        const s = beatScale(t);
        group.scale.set(s, s, s);
        particles.rotation.y = t * 0.12;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
    return true;
  }

  function mount(container) {
    if (typeof THREE === "undefined") return false;
    try {
      return init(container);
    } catch (err) {
      console.warn("Avatar 3D indisponible, repli CSS :", err);
      return false;
    }
  }

  return { mount };
})();
