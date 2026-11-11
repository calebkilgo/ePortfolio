// A small WebGL2 renderer written for exactly this drawing: an orthographic
// line-art globe, satellites as points, one orbit ring. No library.
//
// Occlusion is analytic. With an orthographic camera the globe covers the unit
// disc, so a fragment is behind the Earth when z < 0 and x² + y² < 1. That
// replaces the depth buffer and lets hidden lines be drawn dashed, the way a
// drafting standard would have them.

import { EXTENT, type Basis, type Vec3 } from '../../lib/orbit/math';

const LINE_VERTEX = `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec3 a;
layout(location = 2) in vec3 b;
layout(location = 3) in vec2 run;
uniform mat3 view;
uniform float scale;
uniform float px;
uniform float width;
out vec3 pos;
out float across;
out float along;
void main() {
  vec3 va = view * a;
  vec3 vb = view * b;
  vec2 d = (vb.xy - va.xy) * scale / px;
  float len = length(d);
  vec2 dir = len > 0.0001 ? d / len : vec2(1.0, 0.0);
  float reach = width * 0.5 + 1.0;
  vec2 p = mix(va.xy, vb.xy, corner.x) * scale + vec2(-dir.y, dir.x) * corner.y * reach * px;
  pos = mix(va, vb, corner.x);
  across = corner.y * reach;
  along = mix(run.x, run.y, corner.x);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const LINE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 pos;
in float across;
in float along;
uniform vec4 color;
uniform float width;
uniform float surface;
uniform vec3 sun;
uniform float night;
uniform float dash;
uniform float hidden;
out vec4 result;
void main() {
  float alpha = color.a * clamp(width * 0.5 + 0.5 - abs(across), 0.0, 1.0);
  if (surface > 0.5) {
    if (pos.z < 0.0) discard;
    alpha *= mix(night, 1.0, smoothstep(-0.1, 0.1, dot(normalize(pos), sun)));
    if (dash > 0.0) alpha *= step(0.5, fract(along / dash));
  } else if (pos.z < 0.0 && dot(pos.xy, pos.xy) < 1.0) {
    alpha *= hidden * step(0.5, fract(along / max(dash, 0.0001)));
  }
  if (alpha < 0.004) discard;
  result = vec4(color.rgb * alpha, alpha);
}`;

const POINT_VERTEX = `#version 300 es
layout(location = 0) in vec3 p;
uniform mat3 view;
uniform float scale;
uniform float size;
void main() {
  vec3 v = view * p;
  bool behind = v.z < 0.0 && dot(v.xy, v.xy) < 1.0;
  gl_Position = behind ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(v.xy * scale, 0.0, 1.0);
  gl_PointSize = size;
}`;

const POINT_FRAGMENT = `#version 300 es
precision highp float;
uniform vec4 color;
uniform float size;
uniform float shape;
uniform float stroke;
out vec4 result;
void main() {
  vec2 c = (gl_PointCoord - 0.5) * size;
  float alpha = 1.0;
  if (shape > 1.5) {
    alpha = clamp(stroke * 0.5 + 0.5 - min(abs(c.x), abs(c.y)), 0.0, 1.0);
  } else if (shape > 0.5) {
    alpha = clamp(stroke * 0.5 + 0.5 - abs(length(c) - (size * 0.5 - stroke)), 0.0, 1.0);
  }
  alpha *= color.a;
  if (alpha < 0.004) discard;
  result = vec4(color.rgb * alpha, alpha);
}`;

/** Near-white and International Orange, matching --white and --orange in tokens.css. */
const WHITE: Vec3 = [0.953, 0.953, 0.937];
const ORANGE: Vec3 = [1, 0.31, 0];

const IDENTITY: Basis = { e: [1, 0, 0], n: [0, 1, 0], u: [0, 0, 1] };
const FLOATS_PER_SEGMENT = 8;

interface LineSet {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  count: number;
}

interface LineStyle {
  color: Vec3;
  alpha: number;
  /** CSS pixels. */
  width: number;
  surface?: boolean;
  night?: number;
  dash?: number;
  hidden?: number;
}

export interface Frame {
  basis: Basis;
  /** Sun direction in the Earth-fixed frame. */
  sun: Vec3;
  /** Earth-fixed positions, xyz per satellite. Unusable ones are parked far away. */
  positions: Float32Array;
  target: Vec3 | null;
  site: Vec3;
  ring: Vec3[];
}

export interface Renderer {
  canvas: HTMLCanvasElement;
  /** CSS pixels per Earth radius. */
  radius(): number;
  resize(): void;
  draw(frame: Frame): void;
  destroy(): void;
}

function segments(strips: readonly (readonly Vec3[])[]): Float32Array {
  let total = 0;
  for (const strip of strips) total += Math.max(0, strip.length - 1);
  const out = new Float32Array(total * FLOATS_PER_SEGMENT);
  let o = 0;
  for (const strip of strips) {
    let run = 0;
    for (let i = 0; i + 1 < strip.length; i++) {
      const a = strip[i] as Vec3;
      const b = strip[i + 1] as Vec3;
      const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      out[o++] = a[0];
      out[o++] = a[1];
      out[o++] = a[2];
      out[o++] = b[0];
      out[o++] = b[1];
      out[o++] = b[2];
      out[o++] = run;
      run += length;
      out[o++] = run;
    }
  }
  return out;
}

function circle(a: Vec3, b: Vec3, steps: number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    points.push([a[0] * c + b[0] * s, a[1] * c + b[1] * s, a[2] * c + b[2] * s]);
  }
  return points;
}

/** Two unit vectors perpendicular to n and to each other. */
function perpendicular(n: Vec3): [Vec3, Vec3] {
  const seed: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let a: Vec3 = [n[1] * seed[2] - n[2] * seed[1], n[2] * seed[0] - n[0] * seed[2], n[0] * seed[1] - n[1] * seed[0]];
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  a = [a[0] / length, a[1] / length, a[2] / length];
  const b: Vec3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  return [a, b];
}

/**
 * Setup is spread over several turns of the event loop: `pause` is awaited
 * between stages so that no single step holds the main thread for long.
 */
export async function createRenderer(
  stage: HTMLElement,
  coast: readonly (readonly Vec3[])[],
  graticule: readonly (readonly Vec3[])[],
  satelliteCount: number,
  pause: () => Promise<void>,
): Promise<Renderer> {
  const canvas = document.createElement('canvas');
  canvas.className = 'scope__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!context) throw new Error('WebGL2 unavailable');
  const gl: WebGL2RenderingContext = context;

  const owned: { buffers: WebGLBuffer[]; arrays: WebGLVertexArrayObject[]; programs: WebGLProgram[] } = {
    buffers: [],
    arrays: [],
    programs: [],
  };

  /** Hand the shaders to the driver. Linking continues in the background. */
  function begin(vertexSource: string, fragmentSource: string): WebGLProgram {
    const made = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('shader allocation failed');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(made, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(made);
    owned.programs.push(made);
    return made;
  }

  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  /** Wait for a program without blocking, where the driver can say when it is done. */
  async function linked(made: WebGLProgram): Promise<void> {
    if (parallel) {
      for (let tries = 0; tries < 250 && !gl.getProgramParameter(made, parallel.COMPLETION_STATUS_KHR); tries++) {
        await pause();
      }
    }
    if (!gl.getProgramParameter(made, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(made) ?? 'program link failed');
    }
  }

  function release(): void {
    for (const item of owned.arrays) gl.deleteVertexArray(item);
    for (const item of owned.buffers) gl.deleteBuffer(item);
    for (const item of owned.programs) gl.deleteProgram(item);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  }

  function buffer(): WebGLBuffer {
    const made = gl.createBuffer();
    owned.buffers.push(made);
    return made;
  }

  function vertexArray(): WebGLVertexArrayObject {
    const made = gl.createVertexArray();
    owned.arrays.push(made);
    return made;
  }

  const lines = begin(LINE_VERTEX, LINE_FRAGMENT);
  const points = begin(POINT_VERTEX, POINT_FRAGMENT);
  try {
    await pause();
    await linked(lines);
    await linked(points);
    await pause();
  } catch (error) {
    release();
    throw error;
  }
  const uniform = (owner: WebGLProgram, name: string): WebGLUniformLocation | null => gl.getUniformLocation(owner, name);
  const lineUniforms = {
    view: uniform(lines, 'view'),
    scale: uniform(lines, 'scale'),
    px: uniform(lines, 'px'),
    width: uniform(lines, 'width'),
    color: uniform(lines, 'color'),
    surface: uniform(lines, 'surface'),
    sun: uniform(lines, 'sun'),
    night: uniform(lines, 'night'),
    dash: uniform(lines, 'dash'),
    hidden: uniform(lines, 'hidden'),
  };
  const pointUniforms = {
    view: uniform(points, 'view'),
    scale: uniform(points, 'scale'),
    size: uniform(points, 'size'),
    color: uniform(points, 'color'),
    shape: uniform(points, 'shape'),
    stroke: uniform(points, 'stroke'),
  };

  // One quad, instanced once per line segment.
  const quad = buffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

  function lineSet(data: Float32Array | number, usage: number): LineSet {
    const vao = vertexArray();
    const store = buffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, store);
    if (typeof data === 'number') gl.bufferData(gl.ARRAY_BUFFER, data * FLOATS_PER_SEGMENT * 4, usage);
    else gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const stride = FLOATS_PER_SEGMENT * 4;
    for (const [location, size, offset] of [
      [1, 3, 0],
      [2, 3, 12],
      [3, 2, 24],
    ] as const) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindVertexArray(null);
    return { vao, buffer: store, count: typeof data === 'number' ? 0 : data.length / FLOATS_PER_SEGMENT };
  }

  function refill(set: LineSet, strip: readonly Vec3[]): void {
    const data = segments([strip]);
    gl.bindBuffer(gl.ARRAY_BUFFER, set.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    set.count = data.length / FLOATS_PER_SEGMENT;
  }

  function pointSet(count: number): { vao: WebGLVertexArrayObject; buffer: WebGLBuffer } {
    const vao = vertexArray();
    const store = buffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, store);
    gl.bufferData(gl.ARRAY_BUFFER, count * 12, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { vao, buffer: store };
  }

  const RING_STEPS = 128;
  const coastSet = lineSet(segments(coast), gl.STATIC_DRAW);
  const graticuleSet = lineSet(segments(graticule), gl.STATIC_DRAW);
  const limbSet = lineSet(segments([circle([1, 0, 0], [0, 1, 0], 240)]), gl.STATIC_DRAW);
  const terminatorSet = lineSet(180, gl.DYNAMIC_DRAW);
  const ringSet = lineSet(RING_STEPS, gl.DYNAMIC_DRAW);
  const satellites = pointSet(satelliteCount);
  const marker = pointSet(1);
  const scratch = new Float32Array(3);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let ratio = 1;
  let side = 1;

  function resize(): void {
    // Cap the backing store: beyond 2x the extra pixels cost more than they show.
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    side = Math.max(1, stage.clientWidth);
    const pixels = Math.round(side * ratio);
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    gl.viewport(0, 0, pixels, pixels);
  }

  function matrix(b: Basis): Float32Array {
    // Column-major, so that view * p = (p·e, p·n, p·u).
    return new Float32Array([b.e[0], b.n[0], b.u[0], b.e[1], b.n[1], b.u[1], b.e[2], b.n[2], b.u[2]]);
  }

  function drawLines(set: LineSet, view: Float32Array, sun: Vec3, style: LineStyle): void {
    if (set.count === 0) return;
    gl.uniformMatrix3fv(lineUniforms.view, false, view);
    gl.uniform1f(lineUniforms.width, style.width * ratio);
    gl.uniform4f(lineUniforms.color, style.color[0], style.color[1], style.color[2], style.alpha);
    gl.uniform1f(lineUniforms.surface, style.surface ? 1 : 0);
    gl.uniform3f(lineUniforms.sun, sun[0], sun[1], sun[2]);
    gl.uniform1f(lineUniforms.night, style.night ?? 1);
    gl.uniform1f(lineUniforms.dash, style.dash ?? 0);
    gl.uniform1f(lineUniforms.hidden, style.hidden ?? 0);
    gl.bindVertexArray(set.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, set.count);
  }

  function drawPoints(
    vao: WebGLVertexArrayObject,
    count: number,
    size: number,
    color: Vec3,
    alpha: number,
    shape: 0 | 1 | 2,
    stroke: number,
  ): void {
    gl.uniform1f(pointUniforms.size, size * ratio);
    gl.uniform4f(pointUniforms.color, color[0], color[1], color[2], alpha);
    gl.uniform1f(pointUniforms.shape, shape);
    gl.uniform1f(pointUniforms.stroke, stroke * ratio);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  function draw(frame: Frame): void {
    const view = matrix(frame.basis);
    const identity = matrix(IDENTITY);
    const b = frame.basis;
    const s = frame.sun;
    const sunView: Vec3 = [
      s[0] * b.e[0] + s[1] * b.e[1] + s[2] * b.e[2],
      s[0] * b.n[0] + s[1] * b.n[1] + s[2] * b.n[2],
      s[0] * b.u[0] + s[1] * b.u[1] + s[2] * b.u[2],
    ];
    const scale = 1 / EXTENT;

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(lines);
    gl.uniform1f(lineUniforms.scale, scale);
    gl.uniform1f(lineUniforms.px, 2 / canvas.width);
    drawLines(graticuleSet, view, sunView, { color: WHITE, alpha: 0.17, width: 1, surface: true, night: 0.55 });
    drawLines(coastSet, view, sunView, { color: WHITE, alpha: 0.85, width: 1, surface: true, night: 0.42 });
    refill(terminatorSet, circle(...perpendicular(frame.sun), 180));
    drawLines(terminatorSet, view, sunView, { color: WHITE, alpha: 0.42, width: 1, surface: true, dash: 0.035 });
    drawLines(limbSet, identity, sunView, { color: WHITE, alpha: 1, width: 1.25 });
    if (frame.ring.length > 1) {
      refill(ringSet, frame.ring.slice(0, RING_STEPS + 1));
      drawLines(ringSet, view, sunView, { color: WHITE, alpha: 0.5, width: 1, dash: 0.03, hidden: 0.5 });
    }

    gl.useProgram(points);
    gl.uniformMatrix3fv(pointUniforms.view, false, view);
    gl.uniform1f(pointUniforms.scale, scale);
    gl.bindBuffer(gl.ARRAY_BUFFER, satellites.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.positions);
    // Smaller marks on a small drawing, so a phone-sized globe is not crowded.
    drawPoints(satellites.vao, satelliteCount, side < 420 ? 2.5 : 3.5, WHITE, 1, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, marker.buffer);
    scratch.set(frame.site);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, scratch);
    // The site lies on the surface: hide it with the far hemisphere.
    const siteDepth = frame.site[0] * b.u[0] + frame.site[1] * b.u[1] + frame.site[2] * b.u[2];
    if (siteDepth > 0) drawPoints(marker.vao, 1, 13, WHITE, 1, 2, 1.25);
    if (frame.target) {
      scratch.set(frame.target);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, scratch);
      drawPoints(marker.vao, 1, 15, ORANGE, 1, 1, 1.5);
    }
    gl.bindVertexArray(null);
  }

  await pause();
  resize();
  stage.append(canvas);
  return { canvas, radius: () => side / (2 * EXTENT), resize, draw, destroy: release };
}
