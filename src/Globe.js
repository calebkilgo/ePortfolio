import { useEffect, useRef } from "react";
import * as THREE from "three";

/* Wireframe globe with orbiting satellites — lazy-loaded so three.js
   stays out of the initial bundle. Rendering pauses while off-screen. */
export default function Globe() {
  const boxRef = useRef(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    box.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.x = 0.32;
    scene.add(root);

    const disposables = [];
    const lineMat = (opacity) => {
      const m = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity });
      disposables.push(m);
      return m;
    };
    const circleGeo = (radius, segments = 96) => {
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      disposables.push(g);
      return g;
    };

    // graticule: latitude rings
    for (let lat = -60; lat <= 60; lat += 30) {
      const rad = (lat * Math.PI) / 180;
      const ring = new THREE.Line(
        circleGeo(Math.cos(rad)),
        lineMat(lat === 0 ? 0.22 : 0.09)
      );
      ring.position.y = Math.sin(rad);
      root.add(ring);
    }
    // longitude rings
    for (let lon = 0; lon < 180; lon += 30) {
      const ring = new THREE.Line(circleGeo(1), lineMat(0.09));
      ring.rotation.z = Math.PI / 2;
      ring.rotation.y = (lon * Math.PI) / 180;
      root.add(ring);
    }

    // orbits + satellites
    const satGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    disposables.push(satGeo, satMat);
    const sats = [];
    const ORBITS = [
      { r: 1.28, inc: 51.6, raan: 0, speed: 0.50, phase: 0.0 },
      { r: 1.48, inc: 97.0, raan: 1.1, speed: 0.36, phase: 2.1 },
      { r: 1.70, inc: 22.0, raan: 2.3, speed: 0.26, phase: 4.2 },
    ];
    ORBITS.forEach((o) => {
      const g = new THREE.Group();
      g.rotation.order = "YXZ";
      g.rotation.y = o.raan;
      g.rotation.x = (o.inc * Math.PI) / 180;
      g.add(new THREE.Line(circleGeo(o.r, 128), lineMat(0.2)));
      const sat = new THREE.Mesh(satGeo, satMat);
      g.add(sat);
      root.add(g);
      sats.push({ sat, ...o, angle: o.phase });
    });

    // sizing — camera distance adapts so the outer orbit (r=1.70) never clips
    const setSize = () => {
      const w = box.clientWidth, h = box.clientHeight;
      camera.aspect = w / h;
      const halfFov = (camera.fov / 2) * (Math.PI / 180);
      camera.position.z = 1.95 / (Math.tan(halfFov) * Math.min(camera.aspect, 1));
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(box);

    // drag to rotate
    let dragging = false, lastX = 0, lastY = 0;
    const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onMove = (e) => {
      if (!dragging) return;
      root.rotation.y += (e.clientX - lastX) * 0.005;
      root.rotation.x = Math.max(-0.9, Math.min(0.9, root.rotation.x + (e.clientY - lastY) * 0.003));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onUp = () => { dragging = false; };
    box.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // render loop — only runs while the globe is on screen
    let raf = 0, running = false, prev = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!dragging && !reduced) root.rotation.y += dt * 0.07;
      sats.forEach((s) => {
        if (!reduced) s.angle += dt * s.speed;
        s.sat.position.set(Math.cos(s.angle) * s.r, 0, Math.sin(s.angle) * s.r);
      });
      renderer.render(scene, camera);
    };
    const start = () => {
      if (running) return;
      running = true;
      prev = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start(); else stop();
    });
    io.observe(box);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      box.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (box.contains(renderer.domElement)) box.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="globe-box" ref={boxRef} aria-hidden="true">
      <span className="globe-hint">DRAG TO ROTATE</span>
    </div>
  );
}
