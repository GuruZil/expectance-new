/* =========================================================
   EXPECTANCE — Three.js glowing particle ring (HERO)
   An homage to the Google Antigravity homepage hero: a thick
   torus of thousands of small particles, cyan→blue→white,
   rendered with additive glow and spun slowly on a tilted
   axis so the points stream weightlessly around the ring.
   The whole ring eases its tilt toward the cursor.
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("particles");
  if (!canvas || typeof THREE === "undefined") {
    if (canvas) canvas.style.display = "none";
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
  camera.position.set(0, 0, 720);

  // nested groups: offset (place on screen) -> tilt (cursor) -> spin (auto)
  var offset = new THREE.Group(); scene.add(offset);
  var tilt = new THREE.Group(); offset.add(tilt);
  var spin = new THREE.Group(); tilt.add(spin);

  // ---- Tunables ----------------------------------------------------------
  var RING = 250;          // ring radius
  var TUBE = 80;           // tube (thickness) radius
  var SPIN_SPEED = 0.0024; // weightless rotation
  var BASE_TILT_X = 1.12;  // ~64° — view the ring on edge
  var BASE_TILT_Y = -0.22;

  function sprite() {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(c);
  }
  var tex = sprite();

  function rnd(s) { var v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function countFor(w) { return w < 600 ? 2600 : w < 1100 ? 4200 : 5600; }

  var pts, geo, mat, N = 0;
  var col = new THREE.Color();

  function build(w) {
    N = countFor(w);
    var pos = new Float32Array(N * 3);
    var cols = new Float32Array(N * 3);

    for (var i = 0; i < N; i++) {
      var th = rnd(i + 1) * Math.PI * 2;             // around the ring
      var ph = rnd(i + 1234) * Math.PI * 2;          // around the tube
      var tf = Math.pow(rnd(i + 77), 0.85);          // fill the tube, denser toward core
      var rr = RING + tf * TUBE * Math.cos(ph);
      pos[i * 3]     = rr * Math.cos(th);
      pos[i * 3 + 1] = rr * Math.sin(th);
      pos[i * 3 + 2] = tf * TUBE * Math.sin(ph);

      // cool gradient around the ring, brighter/whiter toward the core
      var hue = 0.54 + 0.07 * Math.sin(th) - 0.03 * Math.cos(th * 2);
      var sat = 0.72 - 0.5 * Math.pow(rnd(i + 9), 2.2);   // some particles wash to white
      var lig = 0.5 + (1 - tf) * 0.32 + rnd(i + 5) * 0.08;
      col.setHSL(hue, Math.max(0.05, sat), Math.min(0.9, lig));
      cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    }

    if (pts) { spin.remove(pts); geo.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    mat = new THREE.PointsMaterial({
      size: 4.6, map: tex, vertexColors: true,
      transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    pts = new THREE.Points(geo, mat);
    spin.add(pts);
  }

  // ---- Cursor (whole-window parallax of the tilt) -----------------------
  var ndcx = 0, ndcy = 0;
  window.addEventListener("pointermove", function (e) {
    ndcx = (e.clientX / window.innerWidth) * 2 - 1;
    ndcy = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function layout(w, h) {
    // sit the ring to the right beside the headline; centre it when narrow
    offset.position.x = w < 900 ? 0 : RING * 0.6;
    offset.position.y = w < 900 ? -h * 0.16 : 0;
    var s = w < 600 ? 0.6 : w < 900 ? 0.78 : 1;
    offset.scale.setScalar(s);
  }

  function resize() {
    var hero = canvas.parentElement;
    var w = hero ? hero.clientWidth : window.innerWidth;
    var h = hero ? hero.clientHeight : window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    build(w);
    layout(w, h);
  }

  var running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!reduceMotion) spin.rotation.z += SPIN_SPEED;
    var tx = BASE_TILT_X + (-ndcy) * 0.16;
    var ty = BASE_TILT_Y + ndcx * 0.3;
    tilt.rotation.x += (tx - tilt.rotation.x) * 0.05;
    tilt.rotation.y += (ty - tilt.rotation.y) * 0.05;
    renderer.render(scene, camera);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var was = running; running = e.isIntersecting;
        if (running && !was) frame();
      });
    }, { threshold: 0 });
    io.observe(canvas);
  }

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 160); });

  resize();
  frame();
})();
