// The orbit view. Loaded after first paint, on its own.
//
// It fetches the element sets, propagates them with SGP4, and keeps three
// things current: the drawing, the tags on it, and the telemetry strip.
// With WebGL2 it draws to a canvas and can be turned by hand. Without it,
// or on a constrained device, it moves the dots on the static plate once a
// second instead. Either way the numbers are real.

import { coastStrips, dotsPath, graticuleStrips, place, type Coastline } from '../../lib/orbit/draw';
import { fixed, signed } from '../../lib/orbit/format';
import { basis, EXTENT, HOME_VIEW, isVisible, toView, unit, type Basis, type Vec3 } from '../../lib/orbit/math';
import { gstime, jday, sunPos } from '../../lib/orbit/sgp4';
import { makeSat, positionAt, ringAt, shortName, telemetryAt, type Sat, type SatRow, type Site } from '../../lib/orbit/track';
import { createRenderer, type Renderer } from './gl';

interface Scene {
  fetched: string;
  site: Site & { label: string };
  targets: number[];
  sats: SatRow[];
  coast: Coastline;
}

/** Idle redraw interval. Low orbit moves about half a pixel a second at this scale. */
const IDLE_MS = 100;
const IDLE_MS_REDUCED = 1000;
/** Opening move: the scene runs forward from this far in the past and settles on now. */
const SWEEP_SPAN_MS = 16 * 60_000;
const SWEEP_MS = 2200;
const FAR: Vec3 = [9, 9, 9];

/** Let the browser breathe between setup steps so no single task runs long. */
function breathe(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** How many element sets to initialise per task. SGP4 setup is the costly part of start-up. */
const BATCH = 10;

function sunDirection(date: Date): Vec3 {
  const { rsun } = sunPos(jday(date));
  const angle = gstime(date);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const x = rsun.x * c + rsun.y * s;
  const y = -rsun.x * s + rsun.y * c;
  const length = Math.hypot(x, y, rsun.z) || 1;
  return [x / length, y / length, rsun.z / length];
}

export async function boot(host: HTMLElement): Promise<() => void> {
  const source = host.dataset['src'];
  if (!source) throw new Error('orbit view: no data source');
  const response = await fetch(source);
  if (!response.ok) throw new Error(`orbit view: ${response.status}`);
  const scene = (await response.json()) as Scene;
  await breathe();

  const sats: Sat[] = [];
  for (let i = 0; i < scene.sats.length; i += BATCH) {
    for (const row of scene.sats.slice(i, i + BATCH)) sats.push(makeSat(row));
    await breathe();
  }
  const first = sats.find((sat) => sat.norad === scene.targets[0]) ?? sats[0];
  if (!first) throw new Error('orbit view: no element sets');
  let target: Sat = first;
  await breathe();

  const life = new AbortController();
  const { signal } = life;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const frugal = connection?.saveData === true || (navigator.hardwareConcurrency ?? 8) <= 2;

  const site = unit(scene.site.longitude, scene.site.latitude);
  const positions = new Float32Array(sats.length * 3);
  let targetPosition: Vec3 | null = null;

  function propagate(date: Date): void {
    const gmst = gstime(date);
    targetPosition = null;
    for (let i = 0; i < sats.length; i++) {
      const sat = sats[i] as Sat;
      const p = positionAt(sat, date, gmst) ?? FAR;
      positions.set(p, i * 3);
      if (sat === target && p !== FAR) targetPosition = p;
    }
  }

  // ── Tags ────────────────────────────────────────────────────────────────
  const targetTag = host.querySelector<HTMLElement>('[data-tag="target"]');
  const siteTag = host.querySelector<HTMLElement>('[data-tag="site"]');

  // The stage is measured when it changes size, never inside the frame loop:
  // reading layout between style writes would force a reflow on every frame.
  let side = host.clientWidth;
  let taggedName = '';

  function moveTag(tag: HTMLElement | null, point: Vec3 | null, b: Basis, onSurface: boolean, dx: number, dy: number): void {
    if (!tag) return;
    const v = point ? toView(point, b) : null;
    const shown =
      v !== null &&
      (onSurface ? v[2] > 0.02 : isVisible(v)) &&
      Math.abs(v[0]) < EXTENT - 0.04 &&
      Math.abs(v[1]) < EXTENT - 0.04;
    if (tag.hidden === shown) tag.hidden = !shown;
    if (!shown || !v) return;
    const radius = side / (2 * EXTENT);
    tag.style.transform = `translate(${(side / 2 + v[0] * radius + dx).toFixed(1)}px, ${(side / 2 - v[1] * radius + dy).toFixed(1)}px)`;
  }

  function moveTags(b: Basis): void {
    if (targetTag && taggedName !== target.name) {
      taggedName = target.name;
      targetTag.textContent = shortName(target.name);
    }
    moveTag(targetTag, targetPosition, b, false, 12, -26);
    moveTag(siteTag, site, b, true, 10, 6);
  }

  // ── Telemetry strip ─────────────────────────────────────────────────────
  const strip = document.querySelector<HTMLElement>('.readout[data-zone]');
  const cell = (key: string): HTMLElement | null => strip?.querySelector<HTMLElement>(`[data-out="${key}"]`) ?? null;
  const cells = {
    target: cell('target'),
    latitude: cell('latitude'),
    longitude: cell('longitude'),
    altitude: cell('altitude'),
    velocity: cell('velocity'),
    look: cell('look'),
  };
  const words = {
    km: strip?.dataset['km'] ?? 'km',
    kms: strip?.dataset['kms'] ?? 'km/s',
    az: strip?.dataset['az'] ?? 'Az',
    el: strip?.dataset['el'] ?? 'El',
  };
  const write = (element: HTMLElement | null, text: string): void => {
    if (element && element.textContent !== text) element.textContent = text;
  };

  function readout(): void {
    write(cells.target, `${shortName(target.name)} ${target.norad}`);
    const now = telemetryAt(target, new Date(), scene.site);
    if (!now) return;
    write(cells.latitude, `${signed(now.lat, 3, 8)}°`);
    write(cells.longitude, `${signed(now.lon, 3, 8)}°`);
    write(cells.altitude, `${fixed(now.altKm, 1, 7)} ${words.km}`);
    write(cells.velocity, `${fixed(now.speedKms, 3, 6)} ${words.kms}`);
    write(cells.look, `${words.az} ${fixed(now.azimuth, 0, 3)}° ${words.el} ${signed(now.elevation, 0, 3)}°`);
  }

  let second = 0;
  const everySecond = (): void => {
    if (!document.hidden) readout();
    second = window.setTimeout(everySecond, 1000 - (Date.now() % 1000) + 20);
  };
  everySecond();

  // ── Target selection ────────────────────────────────────────────────────
  const picks = [...document.querySelectorAll<HTMLButtonElement>('.scope__pick')];
  let onTargetChange: () => void = () => {};
  for (const pick of picks) {
    pick.addEventListener(
      'click',
      () => {
        const chosen = sats.find((sat) => sat.norad === Number(pick.dataset['norad']));
        if (!chosen) return;
        target = chosen;
        for (const other of picks) other.setAttribute('aria-pressed', other === pick ? 'true' : 'false');
        readout();
        onTargetChange();
      },
      { signal },
    );
  }

  // ── Fallback: keep the static plate current ─────────────────────────────
  function runPlate(): () => void {
    const dots = host.querySelector<SVGPathElement>('.scope__dots');
    const ring = host.querySelector<SVGCircleElement>('.scope__target');
    const home = basis(HOME_VIEW.lon, HOME_VIEW.lat);
    function* each(): Generator<Vec3> {
      for (let i = 0; i < sats.length; i++) {
        yield [positions[i * 3] as number, positions[i * 3 + 1] as number, positions[i * 3 + 2] as number];
      }
    }
    const update = (): void => {
      if (document.hidden) return;
      side = host.clientWidth;
      propagate(new Date());
      dots?.setAttribute('d', dotsPath(each(), home));
      const mark = targetPosition ? place(targetPosition, home) : null;
      if (ring && mark) {
        ring.setAttribute('cx', String(mark.x));
        ring.setAttribute('cy', String(mark.y));
        ring.removeAttribute('visibility');
      } else {
        ring?.setAttribute('visibility', 'hidden');
      }
      moveTags(home);
    };
    onTargetChange = update;
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }

  // ── WebGL ───────────────────────────────────────────────────────────────
  function runCanvas(renderer: Renderer): () => void {
    const view = { lon: HOME_VIEW.lon as number, lat: HOME_VIEW.lat as number };
    const idle = reduced ? IDLE_MS_REDUCED : IDLE_MS;
    let running = false;
    let frameId = 0;
    let timerId = 0;
    let lastFrame = 0;
    let lastPropagation = -Infinity;
    let busyUntil = 0;
    let sweepStart = -1;
    let ring: Vec3[] = [];
    let ringStamp = -Infinity;
    let sun = sunDirection(new Date());
    let sunStamp = performance.now();
    let dragging = false;
    let pointer = -1;
    let lastX = 0;
    let lastY = 0;
    let lastMove = 0;
    let spinLon = 0;
    let spinLat = 0;
    let frames = 0;

    const turn = (dLon: number, dLat: number): void => {
      view.lon = ((((view.lon + dLon + 180) % 360) + 360) % 360) - 180;
      view.lat = Math.max(-72, Math.min(72, view.lat + dLat));
    };

    const sweepOffset = (t: number): number => {
      if (reduced || sweepStart < 0) return 0;
      const progress = (t - sweepStart) / SWEEP_MS;
      if (progress >= 1) return 0;
      // Decelerating: the scene arrives in the present and stops.
      return -SWEEP_SPAN_MS * 2 ** (-10 * progress);
    };

    const cancel = (): void => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
      frameId = 0;
      timerId = 0;
    };

    const schedule = (busy: boolean): void => {
      if (!running) return;
      if (busy) frameId = window.requestAnimationFrame(frame);
      else {
        timerId = window.setTimeout(() => {
          timerId = 0;
          frameId = window.requestAnimationFrame(frame);
        }, idle);
      }
    };

    /** Something changed: draw at display rate for a moment. */
    const wake = (forMs = 300): void => {
      busyUntil = Math.max(busyUntil, performance.now() + forMs);
      if (running && timerId) {
        cancel();
        frameId = window.requestAnimationFrame(frame);
      }
    };

    function frame(t: number): void {
      frameId = 0;
      const dt = Math.min(0.05, Math.max(0, (t - lastFrame) / 1000));
      lastFrame = t;

      if (!dragging && (Math.abs(spinLon) > 0.5 || Math.abs(spinLat) > 0.5)) {
        // Release with momentum, then let friction take it.
        turn(spinLon * dt, spinLat * dt);
        const friction = Math.exp(-dt / 0.3);
        spinLon *= friction;
        spinLat *= friction;
        wake(120);
      }

      if (sweepStart < 0) sweepStart = t;
      const sweeping = !reduced && t - sweepStart < SWEEP_MS;
      const date = new Date(Date.now() + sweepOffset(t));

      if (sweeping || t - lastPropagation >= IDLE_MS) {
        propagate(date);
        lastPropagation = t;
      }
      // The ring waits for the second frame, so the first one stays short.
      if (frames > 0 && (sweeping || t - ringStamp > 4000)) {
        ring = ringAt(target, date, 128);
        ringStamp = t;
      }
      frames++;
      if (t - sunStamp > 60_000) {
        sun = sunDirection(date);
        sunStamp = t;
      }

      const b = basis(view.lon, view.lat);
      renderer.draw({ basis: b, sun, positions, target: targetPosition, site, ring });
      moveTags(b);
      if (!('live' in host.dataset)) host.dataset['live'] = '';

      schedule(dragging || sweeping || t < busyUntil);
    }

    const start = (): void => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      frameId = window.requestAnimationFrame(frame);
    };
    const stop = (): void => {
      running = false;
      cancel();
    };

    onTargetChange = () => {
      ringStamp = -Infinity;
      lastPropagation = -Infinity;
      wake();
    };

    // Drag to turn. Touch turns in longitude only, so a vertical swipe still scrolls the page.
    host.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0) return;
        dragging = true;
        pointer = event.pointerId;
        host.setPointerCapture(pointer);
        lastX = event.clientX;
        lastY = event.clientY;
        lastMove = performance.now();
        spinLon = 0;
        spinLat = 0;
        wake();
      },
      { signal },
    );
    host.addEventListener(
      'pointermove',
      (event) => {
        if (!dragging || event.pointerId !== pointer) return;
        const degreesPerPixel = 180 / Math.PI / renderer.radius();
        const dLon = -(event.clientX - lastX) * degreesPerPixel;
        const dLat = event.pointerType === 'touch' ? 0 : (event.clientY - lastY) * degreesPerPixel;
        lastX = event.clientX;
        lastY = event.clientY;
        turn(dLon, dLat);
        const now = performance.now();
        const dt = Math.max(0.004, (now - lastMove) / 1000);
        lastMove = now;
        spinLon = 0.6 * spinLon + 0.4 * (dLon / dt);
        spinLat = 0.6 * spinLat + 0.4 * (dLat / dt);
        wake();
      },
      { signal },
    );
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== pointer) return;
      dragging = false;
      pointer = -1;
      // No throw if the hand had already stopped, and none at all under reduced motion.
      if (reduced || performance.now() - lastMove > 90) {
        spinLon = 0;
        spinLat = 0;
      }
      wake();
    };
    host.addEventListener('pointerup', release, { signal });
    host.addEventListener('pointercancel', release, { signal });

    host.addEventListener(
      'keydown',
      (event) => {
        const step = event.shiftKey ? 15 : 5;
        if (event.key === 'ArrowLeft') turn(-step, 0);
        else if (event.key === 'ArrowRight') turn(step, 0);
        else if (event.key === 'ArrowUp') turn(0, step);
        else if (event.key === 'ArrowDown') turn(0, -step);
        else if (event.key === 'Home') {
          view.lon = HOME_VIEW.lon;
          view.lat = HOME_VIEW.lat;
        } else return;
        event.preventDefault();
        wake();
      },
      { signal },
    );
    host.tabIndex = 0;
    host.setAttribute('role', 'group');
    if (host.dataset['hint']) host.setAttribute('aria-label', host.dataset['hint']);

    // Draw only while someone can see it.
    let onScreen = true;
    const sync = (): void => {
      if (onScreen && !document.hidden) start();
      else stop();
    };
    const watcher = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    watcher.observe(host);
    document.addEventListener('visibilitychange', sync, { signal });

    const sizer = new ResizeObserver(() => {
      side = host.clientWidth;
      renderer.resize();
      wake();
    });
    sizer.observe(host);

    sync();
    return () => {
      stop();
      watcher.disconnect();
      sizer.disconnect();
      delete host.dataset['live'];
      host.removeAttribute('tabindex');
      renderer.destroy();
    };
  }

  let stopView: () => void;
  let renderer: Renderer | null = null;
  if (!frugal) {
    try {
      await breathe();
      const coast = coastStrips(scene.coast);
      await breathe();
      renderer = await createRenderer(host, coast, graticuleStrips(), sats.length, breathe);
    } catch {
      renderer = null;
    }
  }
  if (renderer) {
    const canvas = renderer.canvas;
    stopView = runCanvas(renderer);
    // If the GPU takes the context away, fall back to the plate rather than a blank square.
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        stopView();
        stopView = runPlate();
      },
      { signal, once: true },
    );
  } else {
    stopView = runPlate();
  }

  const shutdown = (): void => {
    life.abort();
    window.clearTimeout(second);
    stopView();
  };
  // No teardown on pagehide: the loop already sleeps while the page is hidden,
  // and leaving the scene intact lets a back-navigation restore it instantly.
  return shutdown;
}
