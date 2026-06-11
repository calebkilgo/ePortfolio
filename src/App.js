import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import Lenis from "lenis";
import {
  motion,
  MotionConfig,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  animate,
} from "framer-motion";

/* ═══ Palette — monochrome ══════════════════════════════════════ */
const D = {
  bg:   "#0A0A0B",
  elev: "#101113",
  line: "#222426",
  lineHi: "#3A3D40",
  white: "#F4F5F6",
  text: "#9DA3A8",
  dim:  "#62686D",
};
const L = {
  bg:   "#F4F5F6",
  text: "#1A1C1E",
  body: "#43484D",
  dim:  "#787E83",
  line: "#D5D8DA",
};
const SANS = "'Barlow','Helvetica Neue',sans-serif";
const COND = "'Barlow Condensed','Barlow',sans-serif";
const MONO = "'IBM Plex Mono',monospace";

const EASE = [0.16, 1, 0.3, 1];

/* ═══ Global CSS ════════════════════════════════════════════════ */
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:auto}
body{
  background:${D.bg};color:${D.text};
  font:400 16px/1.7 ${SANS};
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
::selection{background:${D.white};color:${D.bg}}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:${D.bg}}
::-webkit-scrollbar-thumb{background:${D.line}}
:focus-visible{outline:2px solid ${D.white};outline-offset:3px}
.sec-w :focus-visible{outline-color:${L.text}}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
section{scroll-margin-top:72px}
.wrap{max-width:1240px;margin:0 auto;padding:0 20px}
.mono{font-family:${MONO}}

/* ── header ── */
.hdr{position:fixed;top:0;left:0;right:0;z-index:100;height:64px;display:flex;align-items:center;
  background:transparent;border-bottom:1px solid transparent;
  transition:background .3s,border-color .3s}
.hdr.on{background:rgba(10,10,11,.88);backdrop-filter:blur(12px);border-bottom-color:${D.line}}
.hdr-in{display:flex;align-items:center;justify-content:space-between;width:100%}
.brand{font-family:${SANS};font-weight:600;font-size:14px;letter-spacing:3.5px;color:${D.white};text-transform:uppercase}
.brand .full{display:none}
.hnav{display:flex;align-items:center;gap:8px}
.hnav a{font-family:${MONO};font-size:10.5px;letter-spacing:1.8px;color:${D.text};
  padding:8px 9px;position:relative;transition:color .2s}
.hnav a::after{content:"";position:absolute;left:9px;right:100%;bottom:3px;height:1px;background:${D.white};
  transition:right .25s cubic-bezier(.16,1,.3,1)}
.hnav a:hover{color:${D.white}}
.hnav a:hover::after{right:9px}
.hnav .cv{display:none;border:1px solid ${D.lineHi};padding:8px 16px;margin-left:10px;color:${D.white};
  transition:background .2s,color .2s,border-color .2s}
.hnav .cv:hover{background:${D.white};color:${D.bg};border-color:${D.white}}
.hnav .cv::after{display:none}
.progress{position:fixed;top:0;left:0;right:0;height:2px;background:${D.white};transform-origin:0 50%;z-index:101}

/* ── hero ── */
.hero{min-height:100vh;display:flex;align-items:center;position:relative;padding:110px 0 40px}
.hero-grid{display:grid;grid-template-columns:1fr;gap:24px;align-items:center;width:100%}
.kicker{display:flex;align-items:center;gap:14px;margin-bottom:26px}
.kicker .bar{width:36px;height:1px;background:${D.white}}
.kicker span{font-family:${MONO};font-size:11px;letter-spacing:3px;color:${D.text}}
.hero h1{font-family:${COND};font-weight:600;text-transform:uppercase;
  font-size:clamp(76px,16vw,200px);line-height:.98;letter-spacing:.005em;color:${D.white}}
.hero-sub{max-width:520px;margin-top:30px;font-size:clamp(15px,1.4vw,17px);line-height:1.75;color:${D.text}}
.hero-sub b{color:${D.white};font-weight:500}
.chip{display:inline-block;font-family:${MONO};font-size:.78em;letter-spacing:1.2px;
  text-transform:uppercase;color:${D.white};border:1px solid ${D.white};
  padding:3px 10px 4px;margin:0 2px;transform:translateY(-1px);white-space:nowrap;
  transition:background .2s,color .2s}
.chip:hover{background:${D.white};color:${D.bg}}
.hero-cta{display:flex;gap:14px;flex-wrap:wrap;margin-top:38px}
.globe-box{position:relative;height:clamp(300px,42vh,420px);touch-action:pan-y;cursor:grab}
.globe-box:active{cursor:grabbing}
.globe-box canvas{display:block}
.globe-hint{position:absolute;bottom:0;left:50%;transform:translateX(-50%);
  font-family:${MONO};font-size:9.5px;letter-spacing:2.5px;color:${D.dim};white-space:nowrap;pointer-events:none}
.scroll-cue{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;gap:10px}
.scroll-cue .ln{width:1px;height:44px;background:${D.lineHi};overflow:hidden;position:relative}
.scroll-cue .ln::after{content:"";position:absolute;top:-100%;left:0;width:1px;height:100%;background:${D.white};
  animation:cue 1.8s cubic-bezier(.16,1,.3,1) infinite}
@keyframes cue{to{top:100%}}
.scroll-cue span{font-family:${MONO};font-size:9px;letter-spacing:3px;color:${D.dim}}

/* ── click flybys ── */
.jets{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.jet{position:absolute;top:0;left:0;will-change:transform}
.jet-in{display:flex;align-items:center;gap:14px;transform-origin:center}
.jet svg{display:block;opacity:.6;flex-shrink:0}
.jet .trail{height:1px;width:130px;opacity:.45;flex-shrink:0;
  background:linear-gradient(90deg,transparent,${D.white}66)}

/* ── buttons ── */
.btn{display:inline-flex;align-items:center;gap:10px;font-family:${MONO};font-size:11.5px;
  letter-spacing:2px;padding:15px 26px;border:1px solid ${D.lineHi};color:${D.white};
  text-transform:uppercase;transition:background .22s,color .22s,border-color .22s}
.btn:hover{border-color:${D.white}}
.btn-solid{background:${D.white};color:${D.bg};border-color:${D.white};font-weight:600}
.btn-solid:hover{background:transparent;color:${D.white}}
.btn-line:hover{background:${D.white};color:${D.bg}}
.sec-w .btn{border-color:#B9BDC0;color:${L.text}}
.sec-w .btn-solid{background:${L.text};color:${L.bg};border-color:${L.text}}
.sec-w .btn-solid:hover{background:transparent;color:${L.text}}
.sec-w .btn-line:hover{background:${L.text};color:${L.bg};border-color:${L.text}}

/* ── sections ── */
.sec{padding:110px 0}
.sec-w{background:${L.bg};color:${L.body}}
.label{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.label .bar{width:36px;height:1px;background:currentColor;opacity:.5}
.label span{font-family:${MONO};font-size:11px;letter-spacing:3px}
.sec h2{font-family:${COND};font-weight:600;text-transform:uppercase;
  font-size:clamp(44px,7vw,92px);line-height:1.08;color:${D.white};margin-bottom:22px}
.sec-w h2{color:${L.text}}
.clip{overflow:hidden;padding:.06em 0 .08em}

/* ── featured ── */
.feat-intro{max-width:660px;font-size:clamp(16px,1.6vw,19px);line-height:1.7;color:${L.text}}
.feat-intro + p{max-width:660px;margin-top:16px;font-size:15px;color:${L.body}}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:${L.line};
  border-top:1px solid ${L.line};border-bottom:1px solid ${L.line};margin:56px 0}
.stat{background:${L.bg};padding:30px 24px 26px}
.stat .v{font-family:${COND};font-weight:600;font-size:clamp(44px,5.5vw,72px);line-height:1;color:${L.text}}
.stat .v small{font-size:.45em;font-weight:500;margin-left:2px}
.stat .k{font-family:${MONO};font-size:10px;letter-spacing:1.8px;color:${L.dim};margin-top:10px;text-transform:uppercase}
.feat-grid{display:grid;grid-template-columns:1fr;gap:56px}
.fh{font-family:${MONO};font-size:11px;letter-spacing:2.5px;color:${L.dim};text-transform:uppercase;
  padding-bottom:12px;border-bottom:1px solid ${L.line};margin-bottom:6px}
.how-row{display:grid;grid-template-columns:44px 1fr;gap:16px;padding:18px 0;border-bottom:1px solid ${L.line}}
.how-row .n{font-family:${COND};font-size:26px;font-weight:600;color:#C6CACC;line-height:1}
.how-row h4{font-size:14px;font-weight:600;color:${L.text};letter-spacing:.4px;text-transform:uppercase;margin-bottom:5px}
.how-row p{font-size:13.5px;line-height:1.65;color:${L.body}}
.ennote{padding:16px 0;border-bottom:1px solid ${L.line};font-size:13.5px;line-height:1.65;color:${L.body}}
.ennote b{color:${L.text};font-weight:600}
.specs .row{display:flex;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid ${L.line}}
.specs dt{font-family:${MONO};font-size:10px;letter-spacing:1.8px;color:${L.dim};flex-shrink:0;padding-top:2px}
.specs dd{font-family:${MONO};font-size:11.5px;color:${L.text};text-align:right;line-height:1.6}
.feat-cta{display:flex;gap:14px;flex-wrap:wrap;margin-top:34px}

/* ── projects ── */
.proj{border-bottom:1px solid ${D.line}}
.proj:first-of-type{border-top:1px solid ${D.line}}
.proj-head{display:grid;grid-template-columns:64px 1fr auto;gap:18px;align-items:center;
  width:100%;text-align:left;padding:30px 0;transition:padding-left .3s cubic-bezier(.16,1,.3,1)}
.proj-head:hover{padding-left:14px}
.proj-head .n{font-family:${COND};font-size:30px;font-weight:600;color:${D.dim};line-height:1;
  transition:color .25s}
.proj-head:hover .n,.proj.open .proj-head .n{color:${D.white}}
.proj-head .t{font-family:${COND};font-size:clamp(28px,4.5vw,52px);font-weight:600;
  text-transform:uppercase;line-height:1;color:${D.white};display:block}
.proj-head .s{font-family:${MONO};font-size:10px;letter-spacing:2px;color:${D.dim};margin-top:8px;display:block}
.proj-head .pm{font-family:${MONO};font-size:13px;color:${D.dim};border:1px solid ${D.line};
  width:38px;height:38px;display:flex;align-items:center;justify-content:center;
  transition:background .25s,color .25s,border-color .25s,transform .3s}
.proj-head:hover .pm{border-color:${D.white};color:${D.white}}
.proj.open .pm{background:${D.white};color:${D.bg};border-color:${D.white};transform:rotate(45deg)}
.proj-body{overflow:hidden}
.proj-body-in{padding:8px 0 48px;display:grid;gap:36px}
.proj-body .ov{font-size:15px;line-height:1.75;max-width:700px;color:${D.text}}
.pgrid{display:grid;grid-template-columns:1fr;gap:1px;background:${D.line};border:1px solid ${D.line}}
.pgrid > div{background:${D.bg};padding:18px 20px}
.pgrid dt{font-family:${MONO};font-size:10px;letter-spacing:2px;color:${D.dim};margin-bottom:8px;text-transform:uppercase}
.pgrid dd{font-size:13.5px;line-height:1.65;color:${D.text}}
.ph{font-family:${MONO};font-size:10.5px;letter-spacing:2.5px;color:${D.dim};text-transform:uppercase;margin-bottom:12px}
.psteps li{list-style:none;display:grid;grid-template-columns:34px 1fr;gap:12px;padding:11px 0;
  border-top:1px solid ${D.line};font-size:13.5px;line-height:1.65;color:${D.text}}
.psteps .n{font-family:${MONO};font-size:10.5px;color:${D.dim};padding-top:2px}
.psteps b{color:${D.white};font-weight:600}
.ptags{display:flex;flex-wrap:wrap;gap:8px}
.ptags span{font-family:${MONO};font-size:10.5px;letter-spacing:1px;padding:7px 14px;
  border:1px solid ${D.line};color:${D.text};transition:border-color .2s,color .2s}
.ptags span:hover{border-color:${D.white};color:${D.white}}
/* ── experience ── */
.xp{display:grid;grid-template-columns:1fr;gap:8px;padding:34px 0;border-bottom:1px solid ${D.line};
  transition:padding-left .3s cubic-bezier(.16,1,.3,1)}
.xp:first-of-type{border-top:1px solid ${D.line}}
.xp:hover{padding-left:14px}
.xp .when{font-family:${MONO};font-size:11px;letter-spacing:1.5px;color:${D.dim};padding-top:6px}
.xp .org{font-family:${MONO};font-size:10px;letter-spacing:2px;color:${D.dim};text-transform:uppercase;margin-bottom:8px}
.xp .role{font-family:${COND};font-size:clamp(22px,3vw,32px);font-weight:600;text-transform:uppercase;
  color:${D.white};line-height:1.1;margin-bottom:10px}
.xp p{font-size:14px;line-height:1.7;max-width:640px;color:${D.text};margin-bottom:12px}
.xp .tags{font-family:${MONO};font-size:10px;letter-spacing:1.5px;color:${D.dim}}

/* ── skills ── */
.skcat{padding:30px 0;border-bottom:1px solid ${D.line}}
.skcat:first-of-type{border-top:1px solid ${D.line}}
.skcat .ph{margin-bottom:16px}
.skwall{display:flex;flex-wrap:wrap;gap:4px 26px}
.skwall span{font-family:${COND};font-size:clamp(24px,3.4vw,42px);font-weight:600;
  text-transform:uppercase;line-height:1.3;color:#767C81;cursor:default;
  transition:color .18s,transform .25s cubic-bezier(.16,1,.3,1);display:inline-block}
.skwall span:hover{color:${D.white};transform:translateY(-3px)}

/* ── contact ── */
.bigmail{display:inline-block;font-family:${COND};font-weight:600;text-transform:lowercase;
  font-size:clamp(30px,5.6vw,84px);line-height:1.05;color:${D.white};position:relative;margin:18px 0 8px}
.bigmail::after{content:"";position:absolute;left:0;bottom:-6px;height:2px;width:100%;
  background:${D.white};transform:scaleX(0);transform-origin:0 50%;
  transition:transform .4s cubic-bezier(.16,1,.3,1)}
.bigmail:hover::after{transform:scaleX(1)}
.contact-links{display:flex;gap:14px;flex-wrap:wrap;margin-top:44px}
.contact-sub{max-width:520px;font-size:15px;line-height:1.7;color:${D.text}}

/* ── footer ── */
.ftr{border-top:1px solid ${D.line}}
.ftr-in{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:28px 0}
.ftr span{font-family:${MONO};font-size:10px;letter-spacing:1.5px;color:${D.dim}}

/* ── responsive ── */
@media(min-width:768px){
  .wrap{padding:0 40px}
  .brand .full{display:inline}
  .brand .short{display:none}
  .hnav{gap:14px}
  .hnav .cv{display:inline-flex}
  .stats{grid-template-columns:repeat(4,1fr)}
  .pgrid{grid-template-columns:1fr 1fr}
  .xp{grid-template-columns:170px 1fr;gap:36px}
  .skcat{display:grid;grid-template-columns:230px 1fr;gap:36px;align-items:start}
  .skcat .ph{margin-bottom:0;padding-top:14px}
  .sec{padding:130px 0}
}
@media(min-width:1024px){
  .wrap{padding:0 48px}
  .hero-grid{grid-template-columns:1.05fr .95fr;gap:40px}
  .globe-box{height:clamp(420px,72vh,660px)}
  .feat-grid{grid-template-columns:1.4fr 1fr;gap:72px}
}
@media(max-width:767px){
  .brand .short{display:inline}
  .hnav{gap:4px}
  .hnav a{font-size:9.5px;letter-spacing:1.5px;padding:14px 6px}
  .hnav a::after{left:6px}
  .hnav a:hover::after{right:6px}
  .sec{padding:72px 0}
  .hero{min-height:auto;padding:104px 0 56px}
  .hero h1{font-size:clamp(58px,17vw,200px)}
  .hero-sub{margin-top:22px}
  .hero-cta{margin-top:28px}
  .hero-cta .btn{flex:1 1 auto;justify-content:center}
  .globe-box{height:280px}
  .scroll-cue{display:none}
  .stats{margin:40px 0}
  .stat{padding:22px 16px}
  .feat-grid{gap:44px}
  .proj-head{grid-template-columns:36px 1fr auto;gap:12px;padding:22px 0}
  .proj-head:hover{padding-left:0}
  .proj-head .n{font-size:20px}
  .proj-head .pm{width:34px;height:34px}
  .xp{padding:26px 0}
  .xp:hover{padding-left:0}
  .contact-links .btn{flex:1 1 100%;justify-content:center}
  .ftr-in{justify-content:center;text-align:center}
}

/* ── reduced motion ── */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important}
}
`;

/* ═══ Lenis smooth scroll ═══════════════════════════════════════ */
function useLenis() {
  const lenisRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenisRef.current = lenis;
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenisRef.current = null; };
  }, []);
  return useCallback((target) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -64, duration: 1.1 });
    } else {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView();
    }
  }, []);
}

/* ═══ Globe — code-split so three.js loads after first paint ════ */
const Globe = lazy(() => import("./Globe"));

/* ═══ Click flybys — stealth wing crosses the screen ════════════ */
function JetFlybys() {
  const [jets, setJets] = useState([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e) => {
      if (e.target.closest("a,button,input,textarea,select,.globe-box,.sec-w,header")) return;
      const vw = window.innerWidth, vh = window.innerHeight, m = 240;
      const th = Math.random() * Math.PI * 2;
      const dx = Math.cos(th), dy = Math.sin(th);
      const px = e.clientX, py = e.clientY;
      // clip the flight line (through the click point, heading th) to the
      // expanded viewport so the jet starts and ends fully off-screen
      let t0 = -Infinity, t1 = Infinity;
      for (const [p, d, min, max] of [[px, dx, -m, vw + m], [py, dy, -m, vh + m]]) {
        if (Math.abs(d) < 1e-6) continue;
        let a = (min - p) / d, b = (max - p) / d;
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (!isFinite(t0) || !isFinite(t1) || t1 <= t0) return;
      const speed = 550 + Math.random() * 350;
      setJets((js) => [
        ...js.slice(-3),
        {
          id: Date.now() + Math.random(),
          sx: px + dx * t0, sy: py + dy * t0,
          ex: px + dx * t1, ey: py + dy * t1,
          rot: (th * 180) / Math.PI,
          dur: (t1 - t0) / speed,
          scale: 0.55 + Math.random() * 0.5,
        },
      ]);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
  const remove = (id) => setJets((js) => js.filter((j) => j.id !== id));
  return (
    <div className="jets" aria-hidden="true">
      {jets.map((j) => (
        <motion.div
          key={j.id}
          className="jet"
          initial={{ x: j.sx, y: j.sy }}
          animate={{ x: j.ex, y: j.ey }}
          transition={{ duration: j.dur, ease: "linear" }}
          onAnimationComplete={() => remove(j.id)}
        >
          <div
            className="jet-in"
            style={{ transform: `translate(-50%,-50%) rotate(${j.rot}deg) scale(${j.scale})` }}
          >
            <div className="trail" />
            {/* B-2 planform, nose pointing +x: long swept leading edges,
                short wingtip chords, double-sawtooth trailing edge */}
            <svg width="60" height="130" viewBox="0 0 60 130">
              <polygon
                points="54,65 8,4 1,8 22,22 6,36 26,50 10,65 26,80 6,94 22,108 1,122 8,126"
                fill={D.white}
              />
            </svg>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Shared motion helpers ═════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

function FadeIn({ children, delay = 0, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

function TitleReveal({ children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  return (
    <div className="clip" ref={ref}>
      <motion.h2
        initial={{ y: "105%" }}
        animate={inView ? { y: 0 } : { y: "105%" }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {children}
      </motion.h2>
    </div>
  );
}

function Label({ text }) {
  return (
    <FadeIn className="label">
      <span className="bar" aria-hidden="true" />
      <span className="mono">{text}</span>
    </FadeIn>
  );
}

/* ═══ Header ════════════════════════════════════════════════════ */
function Header({ scrollTo }) {
  const [on, setOn] = useState(false);
  const { scrollYProgress } = useScroll();
  useEffect(() => {
    const fn = () => setOn(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const nav = (e, target) => { e.preventDefault(); scrollTo(target); };
  return (
    <>
      <motion.div className="progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <header className={`hdr${on ? " on" : ""}`}>
        <div className="wrap hdr-in">
          <a href="#top" className="brand" onClick={(e) => nav(e, "#top")}>
            <span className="full">Caleb Kilgo</span>
            <span className="short">CK</span>
          </a>
          <nav className="hnav" aria-label="Main navigation">
            <a href="#featured" onClick={(e) => nav(e, "#featured")}>PROJECTS</a>
            <a href="#experience" onClick={(e) => nav(e, "#experience")}>EXPERIENCE</a>
            <a href="#skills" onClick={(e) => nav(e, "#skills")}>SKILLS</a>
            <a href="#contact" onClick={(e) => nav(e, "#contact")}>CONTACT</a>
            <a className="cv" href="/resume.pdf" download="Caleb_Kilgo_Resume.pdf">RÉSUMÉ</a>
          </nav>
        </div>
      </header>
    </>
  );
}

/* ═══ Hero ══════════════════════════════════════════════════════ */
function Hero({ scrollTo }) {
  const ref = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 110]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0.25]);
  return (
    <section className="hero" id="top" ref={ref} aria-label="Introduction">
      <div className="wrap hero-grid">
        <motion.div style={{ y, opacity }}>
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div className="kicker" variants={fadeUp}>
              <span className="bar" aria-hidden="true" />
              <span>CS @ UAH · AI &amp; SOFTWARE</span>
            </motion.div>
            <div className="clip">
              <motion.h1 variants={{ hidden: { y: "105%" }, show: { y: 0, transition: { duration: 0.9, ease: EASE } } }}>
                Caleb<br />Kilgo
              </motion.h1>
            </div>
            <motion.p className="hero-sub" variants={fadeUp}>
              Currently working on{" "}
              <a className="chip" href="#featured"
                onClick={(e) => { e.preventDefault(); scrollTo("#featured"); }}>
                Satellite Tracker
              </a>
              , along with RAG systems and NASA flight-software traceability.
            </motion.p>
            <motion.div className="hero-cta" variants={fadeUp}>
              <a className="btn btn-solid" href="#featured" onClick={(e) => { e.preventDefault(); scrollTo("#featured"); }}>
                View Projects
              </a>
              <a className="btn btn-line" href="/resume.pdf" download="Caleb_Kilgo_Resume.pdf">
                Résumé
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
        >
          <Suspense fallback={<div className="globe-box" aria-hidden="true" />}>
            <Globe />
          </Suspense>
        </motion.div>
      </div>
      <div className="scroll-cue" aria-hidden="true">
        <div className="ln" />
        <span>SCROLL</span>
      </div>
    </section>
  );
}

/* ═══ Animated stat counter ═════════════════════════════════════ */
function Stat({ value, suffix, label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, {
      duration: 1.3,
      ease: EASE,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => c.stop();
  }, [inView, value]);
  return (
    <div className="stat" ref={ref}>
      <div className="v">{n}{suffix && <small>{suffix}</small>}</div>
      <div className="k">{label}</div>
    </div>
  );
}

/* ═══ Featured project — Satellite Tracker (white section) ══════ */
function Featured() {
  const how = [
    ["TLE data", "Live element sets from CelesTrak, fetched in-browser with a FastAPI fallback proxy."],
    ["C++ → WASM", "Custom C++17 SGP4/SDP4 propagator (Vallado 2006), compiled with Emscripten."],
    ["Batch propagation", "One WASM call per frame over pre-allocated buffers — zero per-satellite JS overhead."],
    ["3D render", "CesiumJS globe via Resium: live telemetry, camera lock-on, ground tracks."],
  ];
  const specs = [
    ["TYPE", "Real-time orbital tracker"],
    ["REGIMES", "LEO · MEO · GEO"],
    ["GROUPS", "GPS · Starlink · ISS · weather · science"],
    ["PROPAGATOR", "SGP4/SDP4 — C++17 → WASM"],
    ["FRONTEND", "React 19 · Vite 8 · Cesium / Resium"],
    ["BACKEND", "Python 3.11 · FastAPI"],
    ["DEPLOY", "Vercel + Render"],
  ];
  const notes = [
    [<b key="1">Stutter-free tracking.</b>, " Camera lock-on via a preRender listener instead of Cesium's jittery trackedEntity."],
    [<b key="2">Cheap frames.</b>, " Coefficients pre-computed once per TLE — per-frame work is arithmetic plus one Newton–Raphson solve."],
    [<b key="3">Correct at the dateline.</b>, " Ground tracks split at the antimeridian; no streaks across the map."],
  ];
  return (
    <section className="sec sec-w" id="featured" aria-label="Featured project: Satellite Tracker">
      <div className="wrap">
        <Label text="FEATURED PROJECT" />
        <TitleReveal>Satellite Tracker</TitleReveal>
        <FadeIn>
          <p className="feat-intro">
            Live positions for GPS, Starlink, weather, and science satellites on a 3D globe —
            propagated by a custom C++ SGP4/SDP4 engine compiled to WebAssembly, running every
            frame in the browser. Click a satellite for live telemetry, lock the camera on,
            and trace its ground track across two full orbits.
          </p>
        </FadeIn>

        <div className="stats">
          <Stat value={5} label="Constellation groups" />
          <Stat value={1} label="WASM batch call per frame" />
          <Stat value={10} suffix="s" label="Ground track resolution" />
          <Stat value={2} suffix="×" label="Orbital periods per track" />
        </div>

        <div className="feat-grid">
          <FadeIn>
            <div className="fh">How it works</div>
            {how.map(([t, d], i) => (
              <div className="how-row" key={t}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div><h4>{t}</h4><p>{d}</p></div>
              </div>
            ))}
            <div className="fh" style={{ marginTop: 48 }}>Engineering notes</div>
            {notes.map((parts, i) => (
              <p className="ennote" key={i}>{parts}</p>
            ))}
          </FadeIn>
          <FadeIn delay={0.12}>
            <div className="fh">Specifications</div>
            <dl className="specs">
              {specs.map(([k, v]) => (
                <div className="row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <div className="feat-cta">
              <a className="btn btn-solid" href="https://satellite-tracker-gilt.vercel.app"
                target="_blank" rel="noopener noreferrer">Live Demo ↗</a>
              <a className="btn btn-line" href="https://github.com/calebkilgo/satellite-tracker"
                target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ═══ Project data ══════════════════════════════════════════════ */
const PROJECTS = [
  {
    id: "smart",
    title: "SMART Assistant",
    sub: "MULTIMODAL RAG · FULLY OFFLINE",
    overview:
      "A multimodal RAG assistant that answers questions about automotive technical manuals — typed, spoken, or image input — running entirely offline on a local LLM.",
    grid: [
      ["Problem", "Technicians need fast answers from huge manuals, but proprietary repair data can't go to cloud LLMs."],
      ["Role", "Sole developer — architecture, full pipeline, and evaluation."],
      ["Constraint", "Zero cloud calls at query time. Everything runs locally."],
      ["What I learned", "Page-prior image re-ranking beats raw CLIP similarity; naive chunking destroys table context."],
    ],
    steps: [
      ["Ingestion", "PyMuPDF splits manuals into text, tables, and captioned images with page metadata."],
      ["Dual indexing", "Text (nomic-embed-text) and images (CLIP) in separate FAISS indexes."],
      ["Retrieval", "Text expands to nearby pages; images re-ranked with page-prior scoring."],
      ["Generation", "Mistral 7B answers strictly from retrieved context; Whisper handles voice."],
    ],
    stack: ["Python", "FAISS", "CLIP", "Ollama", "Mistral 7B", "Whisper", "PyMuPDF", "Streamlit"],
  },
  {
    id: "cfs",
    title: "NASA cFS Traceability",
    sub: "FLIGHT SOFTWARE VERIFICATION · UAH RESEARCH",
    overview:
      "An automated pipeline mapping engineering requirements to source functions across NASA's Core Flight System — exposing what's implemented, what's tested, and where the gaps are.",
    grid: [
      ["Problem", "Requirement-to-code verification in large flight software repos is manual, slow, and error-prone."],
      ["Role", "Research assistant at UAH — extraction pipeline, datasets, visualizations."],
      ["Constraint", "Thousands of C files with inconsistent naming between production and test code."],
      ["What I learned", "Custom parsers beat regex for brace-matched languages; chord diagrams surface heavily-reused functions fast."],
    ],
    steps: [
      ["Extraction", "Requirements aligned with source functions from traceability matrices, repo-wide."],
      ["C parsing", "Brace-depth tracking that ignores comments and strings — full function bodies, not just names."],
      ["Datasets", "Requirement-function pairs exported ML-ready for similarity and contrastive learning."],
      ["Visualization", "Chord and Sankey diagrams reveal reuse, multi-module requirements, and coverage gaps."],
    ],
    stack: ["Python", "Pandas", "Holoviews", "Bokeh", "Plotly"],
  },
];

/* ═══ Projects (expandable) ═════════════════════════════════════ */
function Projects() {
  const [open, setOpen] = useState(null);
  return (
    <section className="sec" id="projects" aria-label="Projects">
      <div className="wrap">
        <Label text="PROJECTS" />
        <TitleReveal>More Work</TitleReveal>
        <FadeIn>
          <div style={{ marginTop: 28 }}>
            {PROJECTS.map((p, i) => {
              const isOpen = open === p.id;
              return (
                <article className={`proj${isOpen ? " open" : ""}`} key={p.id}>
                  <h3 style={{ margin: 0 }}>
                    <button className="proj-head" aria-expanded={isOpen}
                      aria-controls={`pb-${p.id}`}
                      onClick={() => setOpen(isOpen ? null : p.id)}>
                      <span className="n">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="t">{p.title}</span>
                        <span className="s">{p.sub}</span>
                      </span>
                      <span className="pm" aria-hidden="true">+</span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div className="proj-body" id={`pb-${p.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE }}>
                        <div className="proj-body-in">
                          <p className="ov">{p.overview}</p>
                          <dl className="pgrid">
                            {p.grid.map(([k, v]) => (
                              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                            ))}
                          </dl>
                          <div>
                            <div className="ph">How it works</div>
                            <ul className="psteps">
                              {p.steps.map(([t, d], j) => (
                                <li key={t}>
                                  <span className="n">{String(j + 1).padStart(2, "0")}</span>
                                  <span><b>{t}.</b> {d}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="ph">Stack</div>
                            <div className="ptags">
                              {p.stack.map((s) => <span key={s}>{s}</span>)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ═══ Experience ════════════════════════════════════════════════ */
function Experience() {
  const items = [
    {
      when: "2024 — PRESENT",
      org: "University of Alabama in Huntsville",
      role: "Undergraduate Data Science Research Assistant",
      desc: "Requirement-to-code traceability for NASA Core Flight System, ML-ready datasets, and interactive coverage visualizations.",
      tags: "PYTHON · NASA CFS · ML PIPELINE",
    },
    {
      when: "MAY — AUG 2024",
      org: "Fort Payne City Schools · Fort Payne, AL",
      role: "Information Technology Assistant",
      desc: "Diagnosed and repaired 500+ Chromebooks, managed district-wide device inventory and asset tracking, and resolved support tickets across software, network, and peripheral issues.",
      tags: "HARDWARE REPAIR · ASSET TRACKING · IT SUPPORT",
    },
    {
      when: "2023 — PRESENT",
      org: "University of Alabama in Huntsville",
      role: "B.S. Computer Science",
      desc: "Data Science focus, Mathematics minor. Expected 2029.",
      tags: "DATA SCIENCE · MATH MINOR · EXPECTED 2029",
    },
  ];
  return (
    <section className="sec" id="experience" aria-label="Experience and education">
      <div className="wrap">
        <Label text="EXPERIENCE" />
        <TitleReveal>Experience</TitleReveal>
        <div style={{ marginTop: 28 }}>
          {items.map((it, i) => (
            <FadeIn key={it.role} delay={i * 0.06}>
              <div className="xp">
                <div className="when">{it.when}</div>
                <div>
                  <div className="org">{it.org}</div>
                  <div className="role">{it.role}</div>
                  <p>{it.desc}</p>
                  <div className="tags">{it.tags}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ Skills ════════════════════════════════════════════════════ */
function Skills() {
  const cats = [
    ["AI / Machine Learning", ["LLMs", "RAG", "FAISS", "CLIP", "Embeddings", "Multimodal", "Contrastive Learning", "Evaluation"]],
    ["Data Science", ["Pandas", "NumPy", "Matplotlib", "Holoviews", "Plotly", "Statistics", "Feature Engineering"]],
    ["Software Engineering", ["Python", "C++", "React", "WebAssembly", "FastAPI", "REST APIs", "DSA", "Git", "Docker"]],
    ["Tools & Deployment", ["CesiumJS", "Vite", "Streamlit", "Supabase", "Ollama", "Whisper", "Hugging Face", "Vercel"]],
    ["Research", ["Requirements Engineering", "Traceability", "Pipeline Design", "Technical Writing", "Visualization"]],
  ];
  return (
    <section className="sec" id="skills" aria-label="Skills">
      <div className="wrap">
        <Label text="SKILLS" />
        <TitleReveal>Skills</TitleReveal>
        <div style={{ marginTop: 28 }}>
          {cats.map(([cat, skills], i) => (
            <FadeIn key={cat} delay={i * 0.05}>
              <div className="skcat">
                <div className="ph">{cat}</div>
                <div className="skwall">
                  {skills.map((s) => <span key={s}>{s}</span>)}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ Contact ═══════════════════════════════════════════════════ */
function Contact() {
  return (
    <section className="sec" id="contact" aria-label="Contact">
      <div className="wrap">
        <Label text="CONTACT" />
        <TitleReveal>Get In Touch</TitleReveal>
        <FadeIn>
          <p className="contact-sub">
            Open to research roles and software engineering internships.
          </p>
          <a className="bigmail" href="mailto:calebkilgo10@gmail.com">
            calebkilgo10@gmail.com
          </a>
          <div className="contact-links">
            <a className="btn btn-line" href="https://github.com/calebkilgo"
              target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a className="btn btn-line" href="https://linkedin.com/in/caleb-kilgo"
              target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
            <a className="btn btn-solid" href="/resume.pdf" download="Caleb_Kilgo_Resume.pdf">
              Download Résumé
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ═══ Footer ════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr-in">
        <span>© 2026 CALEB KILGO</span>
        <span>HUNTSVILLE, AL</span>
      </div>
    </footer>
  );
}

/* ═══ App ═══════════════════════════════════════════════════════ */
export default function App() {
  const scrollTo = useLenis();
  useEffect(() => {
    document.title = "Caleb Kilgo — AI & Software";
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <style>{CSS}</style>
      <JetFlybys />
      <Header scrollTo={scrollTo} />
      <main>
        <Hero scrollTo={scrollTo} />
        <Featured />
        <Projects />
        <Experience />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  );
}
