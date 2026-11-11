// Everything that runs on first load: two clocks, and the decision to fetch
// the orbit view. About a kilobyte; the heavy part is a separate chunk.

interface ZonedTime {
  time: string;
  /** Offset from UTC, minutes. */
  offset: number;
}

interface TemporalLike {
  Now: {
    zonedDateTimeISO(zone: string): { hour: number; minute: number; second: number; offsetNanoseconds: number };
  };
}

const two = (value: number): string => String(value).padStart(2, '0');

/**
 * Wall-clock time in a named zone. Temporal reads the time-zone database
 * directly and starts in well under a millisecond; Intl has to load locale
 * data first, which costs about 14 ms on a cold page. Intl is the fallback.
 */
function zoneClock(zone: string): () => ZonedTime {
  const temporal = (globalThis as { Temporal?: TemporalLike }).Temporal;
  if (temporal) {
    return () => {
      const now = temporal.Now.zonedDateTimeISO(zone);
      return { time: `${two(now.hour)}:${two(now.minute)}:${two(now.second)}`, offset: now.offsetNanoseconds / 6e10 };
    };
  }
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return () => {
    const now = new Date();
    const part: Record<string, number> = {};
    for (const { type, value } of format.formatToParts(now)) part[type] = Number(value);
    const local = Date.UTC(part['year'] ?? 0, (part['month'] ?? 1) - 1, part['day'] ?? 1, part['hour'] ?? 0, part['minute'] ?? 0, part['second'] ?? 0);
    return {
      time: `${two(part['hour'] ?? 0)}:${two(part['minute'] ?? 0)}:${two(part['second'] ?? 0)}`,
      offset: Math.round((local - now.getTime()) / 60_000),
    };
  };
}

function startClocks(): void {
  const strip = document.querySelector<HTMLElement>('.readout[data-zone]');
  const local = strip?.querySelector<HTMLElement>('[data-out="local"]');
  const utc = strip?.querySelector<HTMLElement>('[data-out="utc"]');
  const zone = strip?.dataset['zone'];
  if (!strip || !local || !utc || !zone) return;

  const standardOffset = Number(strip.dataset['zoneOffset']);
  const standard = strip.dataset['zoneStandard'] ?? '';
  const daylight = strip.dataset['zoneDaylight'] ?? '';
  let read: () => ZonedTime;
  try {
    read = zoneClock(zone);
    read();
  } catch {
    return;
  }

  let timer = 0;
  const tick = (): void => {
    const here = read();
    local.textContent = `${here.time} ${here.offset === standardOffset ? standard : daylight}`;
    utc.textContent = `${new Date().toISOString().slice(11, 19)} Z`;
    // Re-arm on the next whole second so the two clocks never drift apart.
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  };
  tick();
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (!document.hidden) tick();
  });
}

class OrbitScope extends HTMLElement {
  #stop: (() => void) | undefined;

  connectedCallback(): void {
    const load = (): void => {
      void import('./orbit/boot')
        .then(({ boot }) => boot(this))
        .then((stop) => {
          this.#stop = stop;
        })
        .catch(() => {
          // The static plate stays. Nothing else depends on this.
        });
    };
    // After the page has loaded and the main thread is free: never in the way of first paint.
    const whenIdle = (): void => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 2500 });
      else setTimeout(load, 300);
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });
  }

  disconnectedCallback(): void {
    this.#stop?.();
  }
}

/**
 * The stylesheet keeps sections below the first screen dormant
 * (content-visibility: auto), so the first render only pays for the hero and
 * every later frame only for what is on screen. A dormant section has an
 * estimated height, though, and a link that jumps past one would land in the
 * wrong place. So once the page has loaded and its fonts are in, each section
 * is rendered once, in its own short task, for the browser to remember its
 * true height (contain-intrinsic-size: auto), and then let go dormant again.
 */
function settle(): void {
  const pending = [...document.querySelectorAll<HTMLElement>('.sheet, .colophon, .part')];
  const next = (): void => {
    const section = pending.shift();
    if (!section) {
      document.documentElement.classList.add('settled');
      return;
    }
    section.style.contentVisibility = 'visible';
    // Reading a size lays the section out now, inside this task.
    void section.offsetHeight;
    // Heights are remembered at the end of a frame: wait for one, then release.
    requestAnimationFrame(() => {
      setTimeout(() => {
        section.style.removeProperty('content-visibility');
        setTimeout(next, 0);
      }, 0);
    });
  };
  const begin = (): void => {
    void document.fonts.ready.then(() => setTimeout(next, 0));
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}

startClocks();
settle();
customElements.define('orbit-scope', OrbitScope);
