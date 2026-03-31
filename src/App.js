import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

const C = { bg:"#0A0A0A", white:"#F5F5F5", accent:"#00E5FF", text:"#999", dim:"#444", line:"#1A1A1A", dark:"#111", amber:"#EDAE49", green:"#34D399", rose:"#FB7185", violet:"#A78BFA" };
const F = { sans:"'Outfit',sans-serif", mono:"'JetBrains Mono',monospace" };

function useReveal(t = 0.1) {
  const r = useRef(null);
  const [v, s] = useState(false);
  useEffect(() => { const el = r.current; if (!el) return; const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { s(true); o.unobserve(el); } }, { threshold: t }); o.observe(el); return () => o.disconnect(); }, [t]);
  return [r, v];
}

/* ─── Hand-coded letter point generator ─── */
function getLetterPoints(letter, offsetX) {
  const pts = [];
  const s = 0.22; /* scale */
  const add = (x, y) => pts.push({ x: x * s + offsetX, y: y * s });

  /* Each letter defined as a set of (x,y) coordinates on a ~5x7 grid */
  const letters = {
    C: [[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[2,6],[3,6],[4,1],[4,5]],
    A: [[2,0],[1,1],[3,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3],[4,3],[0,4],[4,4],[0,5],[4,5],[0,6],[4,6]],
    L: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,6],[2,6],[3,6],[4,6]],
    E: [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[0,4],[0,5],[0,6],[1,6],[2,6],[3,6],[4,6]],
    B: [[0,0],[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3],[0,4],[4,4],[0,5],[4,5],[0,6],[1,6],[2,6],[3,6],[4,0],[4,3],[4,6]],
  };
  (letters[letter] || []).forEach(([x, y]) => add(x, -y + 3));
  return pts;
}

function ParticleMorph() {
  const mountRef = useRef(null);
  const scrollRef = useRef(0);
  const mouseRef = useRef({x:.5,y:.5});

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65,window.innerWidth/window.innerHeight,.1,100);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({alpha:true,antialias:false});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.setClearColor(0x000000,0); mount.appendChild(renderer.domElement);

    const textPts = [];
    const word="CALEB", sp=1.3, tw=word.length*sp;
    word.split("").forEach((ch,ci)=>{
      const ox=ci*sp-tw/2+sp/2;
      getLetterPoints(ch,ox).forEach(p=>{
        for(let j=0;j<4;j++) textPts.push({x:p.x+(Math.random()-.5)*.07,y:p.y+(Math.random()-.5)*.07});
      });
    });
    /* Shuffle so all letters get even particle coverage */
    for(let i=textPts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[textPts[i],textPts[j]]=[textPts[j],textPts[i]];}

    const N=200;
    const positions=new Float32Array(N*3), colors=new Float32Array(N*3);
    const tS=new Float32Array(N*3), tT=new Float32Array(N*3), tR=new Float32Array(N*3);
    const tV=new Float32Array(N*3), tP=new Float32Array(N*3), tE=new Float32Array(N*3);
    const vel=new Float32Array(N*3);
    const angles=new Float32Array(N); /* for vortex swirl */

    for(let i=0;i<N;i++){
      const i3=i*3, t=i/N;
      tS[i3]=(Math.random()-.5)*10; tS[i3+1]=(Math.random()-.5)*8; tS[i3+2]=(Math.random()-.5)*6;
      const tp=textPts[i%textPts.length];
      tT[i3]=tp.x; tT[i3+1]=tp.y; tT[i3+2]=(Math.random()-.5)*.12;
      const ta=t*Math.PI*2, tb=((i*7)%N)/N*Math.PI*2;
      tR[i3]=(2+.6*Math.cos(tb))*Math.cos(ta); tR[i3+1]=.6*Math.sin(tb); tR[i3+2]=(2+.6*Math.cos(tb))*Math.sin(ta);
      /* Vortex — tight singularity at origin */
      const vr=.05+Math.random()*.15;
      const va=Math.random()*Math.PI*2;
      tV[i3]=Math.cos(va)*vr; tV[i3+1]=Math.sin(va)*vr; tV[i3+2]=(Math.random()-.5)*.1;
      /* Spiral */
      const arm=i%3, d=.3+t*2.5, sa=t*Math.PI*5+arm*(Math.PI*2/3);
      tP[i3]=Math.cos(sa)*d+(Math.random()-.5)*.2; tP[i3+1]=(Math.random()-.5)*.12; tP[i3+2]=Math.sin(sa)*d+(Math.random()-.5)*.2;
      /* End formation — DNA double helix */
      const helixT = t * Math.PI * 8;
      const strand = i % 2;
      const helixR = 1.6;
      tE[i3] = Math.cos(helixT + strand * Math.PI) * helixR;
      tE[i3+1] = (t - 0.5) * 5;
      tE[i3+2] = Math.sin(helixT + strand * Math.PI) * helixR;
      positions[i3]=tS[i3]; positions[i3+1]=tS[i3+1]; positions[i3+2]=tS[i3+2];
      colors[i3]=.655*t; colors[i3+1]=.898*(1-t)+.545*t; colors[i3+2]=1*(1-t)+.984*t;
      angles[i]=Math.random()*Math.PI*2;
    }

    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
    geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false});
    const pts=new THREE.Points(geo,mat); scene.add(pts);

    const onScroll=()=>{const m=document.documentElement.scrollHeight-window.innerHeight;scrollRef.current=m>0?window.scrollY/m:0;};
    const onMouse=(e)=>{mouseRef.current.x=e.clientX/window.innerWidth;mouseRef.current.y=e.clientY/window.innerHeight;};
    const onResize=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);};
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("mousemove",onMouse,{passive:true});
    window.addEventListener("resize",onResize);

    const ss=(x)=>{const c=Math.max(0,Math.min(1,x));return c*c*(3-2*c);};
    let time=0;
    const lp=(a,b,u,i3)=>[a[i3]*(1-u)+b[i3]*u, a[i3+1]*(1-u)+b[i3+1]*u, a[i3+2]*(1-u)+b[i3+2]*u];

    /* Export vortex intensity for DOM glow ring */
    window.__vortexIntensity = 0;

    const animate=()=>{
      requestAnimationFrame(animate); time+=.004;
      const s=scrollRef.current, pos=geo.attributes.position.array;
      const mx3=(mouseRef.current.x-.5)*6, my3=-(mouseRef.current.y-.5)*4;

      const vp = window.__vortexProgress || 0;
      const onHome = window.__page === "home" || !window.__page;
      const inText=onHome&&s>.10&&s<.28;
      const textBlend=inText?ss(Math.min((s-.10)/.05,1,s<.22?1:(.28-s)/.06)):0;

      /* Swirl: ramps with vortex collapse, drops on explode */
      const vCollapse = onHome ? Math.min(vp / 0.3, 1) : 0;
      const vExplode = onHome && vp > 0.6 ? Math.min((vp - 0.6) / 0.4, 1) : 0;
      let swirlAmount = onHome ? vCollapse * (1 - vExplode) : 0;
      window.__vortexIntensity = swirlAmount;

      for(let i=0;i<N;i++){
        const i3=i*3; let tx,ty,tz;

        if (!onHome) {
          /* Detail pages — gentle scattered float */
          tx=tS[i3]; ty=tS[i3+1]; tz=tS[i3+2];
        } else if (vp > 0.01 && vp < 0.99) {
          /*── Inside vortex sticky section ──*/
          if (vp < 0.3) {
            /* Smooth collapse: wherever particles were (torus) → singularity */
            const u = ss(vp / 0.3);
            tx=tR[i3]*(1-u)+tV[i3]*u; ty=tR[i3+1]*(1-u)+tV[i3+1]*u; tz=tR[i3+2]*(1-u)+tV[i3+2]*u;
          } else if (vp < 0.6) {
            /* Hold: singularity */
            tx=tV[i3]; ty=tV[i3+1]; tz=tV[i3+2];
          } else {
            /* Explode: singularity → scattered positions */
            const u = ss((vp - 0.6) / 0.4);
            tx=tV[i3]*(1-u)+tS[i3]*u; ty=tV[i3+1]*(1-u)+tS[i3+1]*u; tz=tV[i3+2]*(1-u)+tS[i3+2]*u;
          }
        } else if (vp >= 0.99) {
          /*── After vortex: scattered → spiral based on how far past vortex ──*/
          const postScroll = Math.max(0, Math.min(1, (s - 0.65) / 0.25));
          const u = ss(postScroll);
          tx=tS[i3]*(1-u)+tE[i3]*u; ty=tS[i3+1]*(1-u)+tE[i3+1]*u; tz=tS[i3+2]*(1-u)+tE[i3+2]*u;
        } else {
          /*── Before vortex: normal scroll formations ──*/
          /* scattered(0–.12) → CALEB(.12–.24) → torus(.24+) */
          if(s<.12){const u=ss(s/.12);[tx,ty,tz]=lp(tS,tT,u,i3);}
          else if(s<.24){const u=ss((s-.12)/.12);[tx,ty,tz]=lp(tT,tR,u,i3);}
          else { tx=tR[i3];ty=tR[i3+1];tz=tR[i3+2]; /* hold at torus until vortex begins */ }
        }

        tx+=Math.sin(time+i*.1)*.008; ty+=Math.cos(time+i*.07)*.008;

        /* Swirl — tangential velocity during collapse/hold */
        if(swirlAmount>0.01){
          angles[i]+=(.03+swirlAmount*.1);
          const cr=Math.sqrt(pos[i3]*pos[i3]+pos[i3+1]*pos[i3+1]);
          if(cr>.01){
            const swirlF=swirlAmount*.05*(1/(cr+.3));
            vel[i3]+=-pos[i3+1]/cr*swirlF;
            vel[i3+1]+=pos[i3]/cr*swirlF;
          }
        }

        /* Explosion burst velocity */
        if (vExplode > 0.01 && vExplode < 0.5) {
          const bx=pos[i3], by=pos[i3+1], bz=pos[i3+2];
          const br=Math.sqrt(bx*bx+by*by+bz*bz);
          if(br>.01){
            vel[i3]+=bx/br*vExplode*.2;
            vel[i3+1]+=by/br*vExplode*.2;
            vel[i3+2]+=bz/br*vExplode*.15+(Math.random()-.5)*vExplode*.1;
          }
        }

        /* Cursor repulsion */
        const dx=pos[i3]-mx3,dy=pos[i3+1]-my3,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<1.5&&dist>.01){const f=(1-dist/1.5)*.025;vel[i3]+=dx/dist*f;vel[i3+1]+=dy/dist*f;}
        vel[i3]*=.94;vel[i3+1]*=.94;vel[i3+2]*=.94;
        pos[i3]+=(tx+vel[i3]-pos[i3])*.07;
        pos[i3+1]+=(ty+vel[i3+1]-pos[i3+1])*.07;
        pos[i3+2]+=(tz+vel[i3+2]-pos[i3+2])*.07;
      }
      geo.attributes.position.needsUpdate=true;

      const rs=1-textBlend*.95;
      const vortexSpin=time*.02*rs+swirlAmount*time*.18;
      pts.rotation.y+=((mouseRef.current.x-.5)*.2*rs-pts.rotation.y)*.02;
      pts.rotation.x+=(-(mouseRef.current.y-.5)*.12*rs-pts.rotation.x)*.02;
      pts.rotation.z=vortexSpin;

      mat.opacity=.55+swirlAmount*.35;

      renderer.render(scene,camera);
    };
    animate();
    return()=>{window.removeEventListener("scroll",onScroll);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement);geo.dispose();mat.dispose();renderer.dispose();};
  },[]);
  return(<div ref={mountRef} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>);
}

/* ─── Vortex Section — transparent zone where particle vortex happens ─── */
function VortexSection() {
  const containerRef = useRef(null);
  const progressRef = useRef(0);
  const hasExploded = useRef(false);
  const coreRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const loaderRef = useRef(null);
  const pctRef = useRef(null);
  const flashRef = useRef(null);
  const loaderGroupRef = useRef(null);

  const loaderR = 52;
  const loaderCirc = 2 * Math.PI * loaderR;

  useEffect(() => {
    const onScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = -rect.top / (rect.height - vh);
      const p = Math.max(0, Math.min(1, raw));
      progressRef.current = p;
      window.__vortexProgress = p;

      const collapsePhase = Math.min(p / 0.3, 1);
      const loaderProg = p >= 0.3 && p <= 0.6 ? (p - 0.3) / 0.3 : p > 0.6 ? 1 : 0;
      const explodePhase = p > 0.6 ? Math.min((p - 0.6) / 0.4, 1) : 0;
      const intensity = collapsePhase * (1 - explodePhase);

      /* Direct DOM updates — no React re-render */
      if (coreRef.current) {
        const s = 60 + intensity * 50;
        coreRef.current.style.width = s + "px";
        coreRef.current.style.height = s + "px";
        coreRef.current.style.background = `radial-gradient(circle, rgba(0,0,0,${0.5+intensity*0.5}) 0%, transparent 70%)`;
      }
      if (ring1Ref.current) {
        const s = 180 + intensity * 120;
        const a = Math.round(intensity * 60).toString(16).padStart(2,"0");
        const a2 = Math.round(intensity * 30).toString(16).padStart(2,"0");
        const a3 = Math.round(intensity * 12).toString(16).padStart(2,"0");
        ring1Ref.current.style.width = s + "px";
        ring1Ref.current.style.height = s + "px";
        ring1Ref.current.style.borderColor = intensity > 0.1 ? C.accent + a : "transparent";
        ring1Ref.current.style.boxShadow = intensity > 0.1 ? `0 0 ${30+intensity*70}px ${C.accent}${a2}, inset 0 0 ${15+intensity*35}px ${C.accent}${a3}` : "none";
      }
      if (ring2Ref.current) {
        const s = 280 + intensity * 160;
        const a = Math.round(intensity * 25).toString(16).padStart(2,"0");
        const a2 = Math.round(intensity * 12).toString(16).padStart(2,"0");
        ring2Ref.current.style.width = s + "px";
        ring2Ref.current.style.height = s + "px";
        ring2Ref.current.style.borderColor = intensity > 0.1 ? C.violet + a : "transparent";
        ring2Ref.current.style.boxShadow = intensity > 0.1 ? `0 0 ${50+intensity*90}px ${C.violet}${a2}` : "none";
      }
      if (loaderRef.current) {
        loaderRef.current.setAttribute("stroke-dashoffset", String(loaderCirc - loaderCirc * loaderProg));
      }
      if (pctRef.current) {
        pctRef.current.textContent = loaderProg > 0.01 ? Math.round(loaderProg * 100) + "%" : "";
        pctRef.current.style.opacity = loaderProg > 0.01 ? "0.6" : "0";
      }
      if (loaderGroupRef.current) {
        loaderGroupRef.current.style.opacity = (p >= 0.32 && p <= 0.62) ? "1" : "0";
      }
      if (flashRef.current) {
        if (explodePhase > 0) {
          const fs = 200 + explodePhase * 600;
          flashRef.current.style.width = fs + "px";
          flashRef.current.style.height = fs + "px";
          flashRef.current.style.opacity = String(Math.max(0, 1 - explodePhase));
          flashRef.current.style.display = "block";
        } else {
          flashRef.current.style.display = "none";
        }
      }

      /* Auto-scroll to explosion the moment loader hits ~100% */
      if (p >= 0.59 && p < 0.68 && !hasExploded.current && containerRef.current && !window.__navScrolling) {
        hasExploded.current = true;
        const targetScroll = window.scrollY + rect.top + (rect.height - vh);
        /* Use requestAnimationFrame for smoother programmatic scroll */
        const start = window.scrollY;
        const dist = targetScroll - start;
        const duration = 1200;
        let startTime = null;
        const step = (ts) => {
          if (!startTime) startTime = ts;
          const elapsed = ts - startTime;
          const t = Math.min(elapsed / duration, 1);
          const ease = t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
          window.scrollTo(0, start + dist * ease);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      if (p < 0.15) hasExploded.current = false;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={containerRef} style={{ height:"300vh", position:"relative", zIndex:2 }}>
      <div style={{ position:"sticky", top:0, height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        <div ref={coreRef} style={{ width:60, height:60, borderRadius:"50%", position:"absolute", pointerEvents:"none", transition:"width .12s, height .12s" }} />
        <div ref={loaderGroupRef} style={{ position:"absolute", pointerEvents:"none", opacity:0, transition:"opacity .3s" }}>
          <svg width="120" height="120" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="60" cy="60" r={loaderR} fill="none" stroke={C.accent} strokeOpacity={0.08} strokeWidth={2} />
            <circle ref={loaderRef} cx="60" cy="60" r={loaderR} fill="none" stroke={C.accent} strokeWidth={2} strokeDasharray={loaderCirc} strokeDashoffset={loaderCirc} strokeLinecap="round" style={{ filter:`drop-shadow(0 0 6px ${C.accent}66)` }} />
          </svg>
        </div>
        <div ref={pctRef} style={{ position:"absolute", fontFamily:F.mono, fontSize:11, color:C.accent, letterSpacing:"2px", opacity:0.6, pointerEvents:"none" }}>0%</div>
        <div ref={ring1Ref} style={{ width:180, height:180, borderRadius:"50%", position:"absolute", border:`1px solid transparent`, pointerEvents:"none", transition:"width .12s, height .12s" }} />
        <div ref={ring2Ref} style={{ width:280, height:280, borderRadius:"50%", position:"absolute", border:`1px solid transparent`, pointerEvents:"none", transition:"width .12s, height .12s" }} />
        <div ref={flashRef} style={{ display:"none", width:200, height:200, borderRadius:"50%", position:"absolute", background:`radial-gradient(circle, ${C.accent}15 0%, transparent 60%)`, pointerEvents:"none" }} />
      </div>
    </div>
  );
}
function Marquee({ items, speed = 30 }) {
  const d = [...items, ...items, ...items];
  return (
    <div style={{ overflow:"hidden", whiteSpace:"nowrap", padding:"18px 0", borderTop:`1px solid ${C.line}`, borderBottom:`1px solid ${C.line}` }}>
      <div style={{ display:"inline-flex", gap:40, animation:`marquee ${speed}s linear infinite`, willChange:"transform" }}>
        {d.map((t, i) => (<span key={i} style={{ fontFamily:F.mono, fontSize:11, color:C.dim, letterSpacing:"2px", textTransform:"uppercase", flexShrink:0 }}>{t}<span style={{ color:C.accent, margin:"0 8px" }}>·</span></span>))}
      </div>
    </div>
  );
}

function StaggerText({ text, baseDelay = 0, fontSize }) {
  const [ref, vis] = useReveal(0.15);
  return (
    <div ref={ref} style={{ display:"flex", flexWrap:"wrap", overflow:"hidden" }}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ fontFamily:F.sans, fontSize, fontWeight:900, color:C.white, lineHeight:0.9, letterSpacing:"-4px", textTransform:"uppercase", display:"inline-block", opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(100%)", transition:`opacity .6s cubic-bezier(.16,1,.3,1) ${baseDelay+i*35}ms, transform .6s cubic-bezier(.16,1,.3,1) ${baseDelay+i*35}ms`, width:ch===" "?"clamp(16px,3vw,40px)":"auto" }}>{ch === " " ? "\u00A0" : ch}</span>
      ))}
    </div>
  );
}

function Hero() {
  const [ld, set] = useState(false);
  const contentRef = useRef(null);
  useEffect(() => { setTimeout(() => set(true), 100); }, []);
  useEffect(() => {
    const fn = (e) => {
      if (!contentRef.current) return;
      const mx = (e.clientX / window.innerWidth - 0.5) * 10;
      const my = (e.clientY / window.innerHeight - 0.5) * 8;
      contentRef.current.style.transform = `translate3d(${mx}px,${my}px,0)`;
    };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => window.removeEventListener("mousemove", fn);
  }, []);
  return (
    <section style={{ minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", position:"relative", zIndex:2, padding:"80px 48px", overflow:"hidden" }}>
      <style>{`
        .nav-link { font-family:${F.mono}; font-size:10px; color:${C.dim}; letter-spacing:2px; text-transform:uppercase; text-decoration:none; transition:color .3s, text-shadow .3s; cursor:pointer; }
        .nav-link:hover { color:${C.accent}; text-shadow:0 0 8px ${C.accent}44; }
      `}</style>
      <div style={{ position:"absolute", top:0, left:0, right:0, padding:"24px 48px", display:"flex", justifyContent:"space-between", alignItems:"center", opacity:ld?1:0, transition:"opacity 1s ease 0.5s", zIndex:10 }}>
        <span style={{ fontFamily:F.mono, fontSize:11, color:C.dim, letterSpacing:"2px" }}>PORTFOLIO · 2026</span>
        <div style={{ display:"flex", gap:28 }}>
          {["projects","research","skills"].map(l => (
            <a key={l} className="nav-link" onClick={e=>{e.preventDefault();window.__navScrolling=true;const el=document.getElementById(l);if(el){const y=el.getBoundingClientRect().top+window.scrollY-60;window.scrollTo({top:y,behavior:"smooth"});setTimeout(()=>{window.__navScrolling=false;},1500);}}}>{l}</a>
          ))}
        </div>
      </div>
      <div ref={contentRef} style={{ maxWidth:1100, margin:"0 auto", width:"100%", position:"relative", zIndex:1, transition:"transform 0.12s ease-out", willChange:"transform" }}>
        <StaggerText text="CALEB" baseDelay={300} fontSize="clamp(72px,16vw,200px)" />
        <StaggerText text="KILGO" baseDelay={600} fontSize="clamp(72px,16vw,200px)" />
        <div style={{ marginTop:28, display:"flex", gap:8, alignItems:"center", opacity:ld?1:0, transition:"opacity 0.8s ease 2s" }}>
          <div style={{ height:2, background:C.accent, width:ld?40:0, transition:"width 1s cubic-bezier(.16,1,.3,1) 1.8s" }} />
          <span style={{ fontFamily:F.mono, fontSize:11, color:C.accent, letterSpacing:"2px" }}>STUDENT AT THE UNIVERSITY OF ALABAMA IN HUNTSVILLE</span>
        </div>
        <div style={{ height:1, background:`linear-gradient(90deg, ${C.accent}44, transparent)`, width:ld?"50%":"0%", transition:"width 1.5s cubic-bezier(.16,1,.3,1) 2s", marginTop:44, marginBottom:28 }} />
        <div style={{ display:"flex", gap:48, flexWrap:"wrap", opacity:ld?1:0, transition:"opacity 1s ease 2.2s" }}>
          {[["DEGREE","B.S. Computer Science"],["MINOR","Mathematics"],["FOCUS","Data Science"],["GRAD","2029"]].map(([l,v],i) => (
            <div key={i}><div style={{ fontFamily:F.mono, fontSize:8, color:C.dim, letterSpacing:"2.5px", marginBottom:3 }}>{l}</div><div style={{ fontFamily:F.sans, fontSize:13, color:C.text, fontWeight:500 }}>{v}</div></div>
          ))}
        </div>
      </div>
      <div style={{ position:"absolute", bottom:32, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:8, opacity:ld?0.4:0, transition:"opacity 1s ease 3s" }}>
        <div style={{ width:1, height:40, background:`linear-gradient(${C.accent}00, ${C.accent})`, animation:"scrollPulse 2s ease-in-out infinite" }} />
        <span style={{ fontFamily:F.mono, fontSize:8, color:C.dim, letterSpacing:"3px" }}>SCROLL</span>
      </div>
    </section>
  );
}

function ResearchSection({ setPage }) {
  const [ref, vis] = useReveal(0.05);
  return (
    <section id="research" ref={ref} style={{ padding:"140px 48px", position:"relative", zIndex:2, opacity:vis?1:0, transition:"opacity 0.8s" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontFamily:F.mono, fontSize:10, color:C.accent, letterSpacing:"3px", marginBottom:12 }}>ACTIVE RESEARCH</div>
        <StaggerText text="RESEARCH" baseDelay={0} fontSize="clamp(32px,5vw,56px)" />
        <div style={{ display:"flex", gap:20, marginTop:48, flexWrap:"wrap" }}>
          <ResearchCard num="01" title="SMART Assistant" sub="Multimodal RAG System" color={C.amber} desc="Local-first multimodal RAG system for automotive manuals. Structure-aware PDF ingestion, dual FAISS indexes for text and images, CLIP-based visual retrieval with page-prior re-ranking, and grounded LLM generation via Ollama." stats={[["Input","Text · Image · Voice"],["Deploy","Local-First / Offline"]]} tags={["FAISS","CLIP","Ollama","Whisper","Streamlit","PyMuPDF"]} onClick={() => { setPage("smart"); window.scrollTo({top:0,behavior:"smooth"}); }} />
          <ResearchCard num="02" title="NASA cFS" sub="Requirement Traceability" color={C.violet} desc="Automated requirement-to-code traceability for NASA Core Flight System. ML pipeline that extracts, aligns, and verifies requirement-function relationships across thousands of source files." stats={[["Scale","1000s of req-function pairs"],["Target","Flight Software Verification"]]} tags={["Python","Pandas","Regex","Holoviews","Plotly","ML Pipeline"]} onClick={() => { setPage("cfs"); window.scrollTo({top:0,behavior:"smooth"}); }} />
        </div>
      </div>
    </section>
  );
}

/* ResearchCard — uses CSS custom property for glow position, no setState on mousemove */
function ResearchCard({ num, title, sub, color, desc, stats, tags, onClick }) {
  const [h, s] = useState(false);
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--gx", (e.clientX - r.left) + "px");
    ref.current.style.setProperty("--gy", (e.clientY - r.top) + "px");
  }, []);
  return (
    <div ref={ref} onClick={onClick} onMouseEnter={() => s(true)} onMouseLeave={() => s(false)} onMouseMove={onMove}
      style={{ flex:"1 1 min(100%,480px)", borderRadius:20, border:`1px solid ${h?color+"44":C.line}`, background:C.bg, position:"relative", overflow:"hidden", cursor:"pointer", display:"flex", flexDirection:"column", transition:"border-color 0.3s, transform 0.4s cubic-bezier(.16,1,.3,1)", transform:h?"scale(1.01)":"scale(1)", "--gx":"0px", "--gy":"0px" }}>
      {h && <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(500px circle at var(--gx) var(--gy), ${color}0C, transparent 50%)` }} />}
      <div style={{ position:"absolute", top:-20, right:16, fontFamily:F.sans, fontSize:180, fontWeight:900, color:C.white, opacity:0.02, lineHeight:1, pointerEvents:"none" }}>{num}</div>
      <div style={{ padding:32, position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:14, flex:1 }}>
        <div style={{ fontFamily:F.mono, fontSize:10, color, letterSpacing:"3px" }}>{sub.toUpperCase()}</div>
        <h3 style={{ fontFamily:F.sans, fontSize:26, fontWeight:700, color:C.white, letterSpacing:"-1px", lineHeight:1.1, transform:h?"translateX(6px)":"none", transition:"transform 0.4s cubic-bezier(.16,1,.3,1)" }}>{title}</h3>
        <p style={{ fontFamily:F.sans, fontSize:13, color:C.text, lineHeight:1.6, fontWeight:300 }}>{desc}</p>
        <div style={{ display:"flex", gap:24 }}>{stats.map(([l,v],i) => (<div key={i}><div style={{ fontFamily:F.mono, fontSize:8, color:C.dim, letterSpacing:"2px", marginBottom:2 }}>{l.toUpperCase()}</div><div style={{ fontFamily:F.sans, fontSize:12, color:C.text }}>{v}</div></div>))}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:"auto" }}>{tags.map(t => (<span key={t} style={{ fontFamily:F.mono, fontSize:10, padding:"4px 12px", borderRadius:100, border:`1px solid ${C.line}`, color:C.text }}>{t}</span>))}</div>
        <div style={{ fontFamily:F.mono, fontSize:11, color, marginTop:6, opacity:h?1:0, transform:h?"none":"translateX(-8px)", transition:"all 0.3s cubic-bezier(.16,1,.3,1)" }}>VIEW DETAILS →</div>
      </div>
    </div>
  );
}

function ProjectSection() {
  const [ref, vis] = useReveal(0.05);
  return (
    <section id="projects" ref={ref} style={{ padding:"80px 48px 100px", position:"relative", zIndex:2, opacity:vis?1:0, transition:"opacity 0.8s" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontFamily:F.mono, fontSize:10, color:C.accent, letterSpacing:"3px", marginBottom:12 }}>PROJECTS</div>
        <StaggerText text="COMING SOON" baseDelay={0} fontSize="clamp(28px,4vw,48px)" />
        <div style={{ display:"flex", gap:20, marginTop:40, flexWrap:"wrap" }}>
          {[{color:C.green,label:"PROJECT 01"},{color:C.rose,label:"PROJECT 02"}].map((p,i) => (<ComingSoonCard key={i} color={p.color} label={p.label} />))}
        </div>
      </div>
    </section>
  );
}

function ComingSoonCard({ color, label }) {
  return (
    <div style={{ flex:"1 1 min(100%,480px)", height:200, borderRadius:20, border:`1px solid ${C.line}`, background:C.bg, position:"relative", overflow:"hidden", cursor:"default", display:"flex", alignItems:"center", justifyContent:"center", transition:"border-color 0.3s" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 30% 40%, ${color}04, transparent 60%)`, pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
        <div style={{ fontFamily:F.mono, fontSize:9, color:C.dim, letterSpacing:"3px", marginBottom:16 }}>{label}</div>
        <div style={{ width:36, height:36, border:`1px solid ${color}44`, borderRadius:8, margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke={color} strokeOpacity="0.5" strokeWidth="1.2"/><path d="M5 7V5a3 3 0 116 0v2" stroke={color} strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily:F.mono, fontSize:10, color, letterSpacing:"2px", opacity:0.5 }}>COMING SOON</div>
      </div>
    </div>
  );
}
function SkillShowcase() {
  const [ref, vis] = useReveal(0.05);
  const categories = [
    { label:"Languages", color:C.accent, cls:"sk-accent", skills:["Python","C++","HTML"] },
    { label:"Software Engineering", color:C.green, cls:"sk-green", skills:["OOP","DSA","Modular Design","REST APIs","Git","Docker"] },
    { label:"Machine Learning & AI", color:C.amber, cls:"sk-amber", skills:["LLMs","RAG","FAISS","Multimodal","Evaluation","Embeddings"] },
    { label:"Tools & Frameworks", color:C.violet, cls:"sk-violet", skills:["PyTorch","React","Streamlit","Supabase"] },
  ];
  let idx = 0;
  return (
    <section id="skills" ref={ref} style={{ padding:"140px 48px", position:"relative", zIndex:2, opacity:vis?1:0, transition:"opacity 0.8s" }}>
      <style>{`
        .sk-item { position:relative; padding:4px 0; cursor:default; opacity:1; transition:opacity .4s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1); }
        .sk-item span { font-family:${F.sans}; font-size:clamp(22px,2.8vw,34px); font-weight:600; color:${C.white}; letter-spacing:-1px; line-height:1.6; transition:color .3s ease, font-weight .3s ease, text-shadow .3s ease; }
        .sk-item .sk-line { position:absolute; bottom:2px; left:0; height:2px; border-radius:1px; width:0%; opacity:0; transition:width .35s cubic-bezier(.16,1,.3,1), opacity .3s ease; }
        .sk-wrap:hover .sk-item { opacity:0.12; transition:opacity .3s ease; }
        .sk-wrap:hover .sk-item:hover { opacity:1; transition:opacity .15s ease; }
        .sk-wrap .sk-item { transition:opacity .5s ease; }
        .sk-item:hover span { font-weight:800; }
        .sk-item:hover .sk-line { width:100%; opacity:0.6; }
        .sk-accent:hover span { color:${C.accent}; text-shadow:0 0 28px ${C.accent}40; }
        .sk-accent .sk-line { background:${C.accent}; }
        .sk-green:hover span { color:${C.green}; text-shadow:0 0 28px ${C.green}40; }
        .sk-green .sk-line { background:${C.green}; }
        .sk-amber:hover span { color:${C.amber}; text-shadow:0 0 28px ${C.amber}40; }
        .sk-amber .sk-line { background:${C.amber}; }
        .sk-violet:hover span { color:${C.violet}; text-shadow:0 0 28px ${C.violet}40; }
        .sk-violet .sk-line { background:${C.violet}; }
      `}</style>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontFamily:F.mono, fontSize:10, color:C.accent, letterSpacing:"3px", marginBottom:12 }}>TOOLKIT</div>
        <StaggerText text="SKILLS" baseDelay={0} fontSize="clamp(32px,5vw,56px)" />
        <div style={{ display:"flex", flexDirection:"column", gap:36, marginTop:48 }}>
          {categories.map((cat) => (
            <div key={cat.label}>
              <div style={{ fontFamily:F.mono, fontSize:9, color:cat.color, letterSpacing:"2px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:6, height:6, borderRadius:3, background:cat.color, opacity:0.7 }} />
                {cat.label.toUpperCase()}
              </div>
              <div className="sk-wrap" style={{ display:"flex", flexWrap:"wrap", gap:"0 24px" }}>
                {cat.skills.map((name) => {
                  const i = idx++;
                  return (
                    <div key={name} className={`sk-item ${cat.cls}`} style={{
                      opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(12px)",
                      transitionDelay:`${i*25}ms`,
                    }}>
                      <span>{name}</span>
                      <div className="sk-line" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Foot() {
  const links = [
    { label:"Email", href:"mailto:calebkilgo10@gmail.com" },
    { label:"LinkedIn", href:"https://linkedin.com/in/caleb-kilgo" },
    { label:"GitHub", href:"https://github.com/calebkilgo" },
  ];
  return (
    <footer style={{ position:"relative", zIndex:2, borderTop:`1px solid ${C.line}` }}>
      <div style={{ padding:"32px 48px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
        <span style={{ fontFamily:F.mono, fontSize:11, color:C.dim, letterSpacing:"2px" }}>CALEB KILGO · 2026</span>
        <div style={{ display:"flex", gap:24 }}>
          {links.map(l => (<a key={l.label} href={l.href} target={l.label !== "Email" ? "_blank" : undefined} rel="noopener noreferrer" style={{ fontFamily:F.mono, fontSize:11, color:C.dim, letterSpacing:"1px", textDecoration:"none", transition:"color 0.3s" }} onMouseEnter={e => { e.target.style.color = C.accent; }} onMouseLeave={e => { e.target.style.color = C.dim; }}>{l.label}</a>))}
        </div>
      </div>
    </footer>
  );
}

/* ─── Project Detail ─── */
function ProjectDetail({ data, setPage }) {
  const [ld, set] = useState(false);
  useEffect(() => { setTimeout(() => set(true), 100); window.scrollTo(0,0); }, []);
  return (
    <div style={{ position:"relative", zIndex:2 }}>
      {/* Fixed nav */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, padding:"16px 48px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(10,10,10,0.95)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.line}` }}>
        <button onClick={() => { setPage("home"); window.scrollTo({top:0}); }} style={{ fontFamily:F.mono, fontSize:11, color:C.accent, letterSpacing:"2px", background:"none", border:"none", cursor:"pointer", transition:"opacity .2s" }}>← BACK</button>
        <span style={{ fontFamily:F.mono, fontSize:10, color:C.dim, letterSpacing:"2px" }}>{data.tag}</span>
      </div>

      {/* Hero */}
      <section style={{ minHeight:"50vh", display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"120px 48px 48px" }}>
        <div style={{ maxWidth:900 }}>
          <div style={{ fontFamily:F.mono, fontSize:10, color:data.color, letterSpacing:"3px", marginBottom:16, opacity:ld?1:0, transition:"opacity .5s ease .2s" }}>{data.tag}</div>
          <StaggerText text={data.title} baseDelay={200} fontSize="clamp(36px,7vw,80px)" />
        </div>
      </section>

      {/* Overview */}
      <section style={{ padding:"0 48px 60px" }}>
        <div style={{ maxWidth:700 }}>
          <p style={{ fontFamily:F.sans, fontSize:16, color:C.text, lineHeight:1.8, fontWeight:300, opacity:ld?1:0, transition:"opacity .8s ease .8s" }}>{data.overview}</p>
        </div>
      </section>

      {/* Quick stats grid */}
      <section style={{ padding:"0 48px 60px" }}>
        <div style={{ maxWidth:900, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:12 }}>
          {data.quickStats.map(([l,v],i) => (
            <div key={i} style={{ padding:"20px", borderRadius:12, border:`1px solid ${C.line}`, position:"relative", overflow:"hidden", opacity:ld?1:0, transform:ld?"translateY(0)":"translateY(10px)", transition:`all .5s cubic-bezier(.16,1,.3,1) ${1000+i*100}ms` }}>
              <div style={{ position:"absolute", top:0, left:16, right:16, height:2, background:data.color, opacity:0.2, borderRadius:1 }} />
              <div style={{ fontFamily:F.mono, fontSize:8, color:C.dim, letterSpacing:"2px", marginBottom:6 }}>{l.toUpperCase()}</div>
              <div style={{ fontFamily:F.sans, fontSize:15, color:C.white, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section style={{ padding:"0 48px 60px" }}>
        <div style={{ maxWidth:900 }}>
          <div style={{ fontFamily:F.mono, fontSize:9, color:data.color, letterSpacing:"3px", marginBottom:16 }}>TECH STACK</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {data.stack.map(t => (
              <span key={t} style={{ fontFamily:F.mono, fontSize:11, padding:"6px 16px", borderRadius:100, border:`1px solid ${data.color}22`, color:C.text, background:data.color+"06" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section style={{ padding:"40px 48px 60px" }}>
        <div style={{ maxWidth:900 }}>
          <div style={{ fontFamily:F.mono, fontSize:9, color:data.color, letterSpacing:"3px", marginBottom:32 }}>HOW IT WORKS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {data.pipeline.map((step, i) => (
              <div key={i} style={{ display:"flex", gap:20, position:"relative" }}>
                {/* Vertical connector line */}
                {i < data.pipeline.length - 1 && (
                  <div style={{ position:"absolute", left:15, top:36, bottom:-4, width:1, background:`linear-gradient(${data.color}33, ${C.line})` }} />
                )}
                {/* Step number circle */}
                <div style={{ width:32, height:32, borderRadius:16, border:`1px solid ${data.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.mono, fontSize:10, color:data.color, flexShrink:0, background:C.bg, position:"relative", zIndex:1 }}>
                  {String(i+1).padStart(2,"0")}
                </div>
                {/* Content */}
                <div style={{ paddingBottom:28, flex:1 }}>
                  <div style={{ fontFamily:F.sans, fontSize:16, color:C.white, fontWeight:600, marginBottom:4 }}>{step.label}</div>
                  <div style={{ fontFamily:F.sans, fontSize:13, color:C.text, lineHeight:1.7, fontWeight:300 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key highlights */}
      <section style={{ padding:"40px 48px 120px" }}>
        <div style={{ maxWidth:900 }}>
          <div style={{ fontFamily:F.mono, fontSize:9, color:data.color, letterSpacing:"3px", marginBottom:24 }}>KEY HIGHLIGHTS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:12 }}>
            {data.highlights.map((h, i) => (
              <div key={i} style={{ padding:"20px", borderRadius:12, border:`1px solid ${C.line}`, background:data.color+"04" }}>
                <div style={{ fontFamily:F.sans, fontSize:14, color:C.white, fontWeight:500, lineHeight:1.5 }}>{h}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const smartData = {
  tag:"RESEARCH 01", color:C.amber, title:"SMART ASSISTANT",
  overview:"SMART Assistant is a local-first, multimodal Retrieval-Augmented Generation system built to help users ask questions about automotive manuals and receive grounded, procedure-focused answers. It processes dense technical PDFs page-by-page, separating text, tables, and images into structured representations. The system supports text, image, and voice input through an interactive Streamlit interface, with all inference running locally via Ollama.",
  quickStats:[["Type","Multimodal RAG"],["Input","Text · Image · Voice"],["Deploy","Local-First / Offline"],["LLM","Mistral 7B via Ollama"],["Vision","Qwen3-VL + CLIP"],["Speech","Whisper STT"]],
  stack:["Python","FAISS","CLIP","Ollama","Mistral 7B","Qwen3-VL","nomic-embed-text","Whisper","PyMuPDF","Streamlit","NumPy","Pillow","Hugging Face","Pickle","SciPy"],
  pipeline:[
    {label:"PDF Ingestion & Structure Parsing",desc:"PyMuPDF opens manuals and extracts text blocks, tables, and images page-by-page. Tables are converted to markdown. Images are saved with nearby captions associated. Page-level metadata is preserved throughout."},
    {label:"Structure-Aware Chunking",desc:"Table detection, region filtering to avoid duplicating table text, long-text splitting with regex, and caption-to-image association. Each chunk carries page number, document ID, and chunk type metadata."},
    {label:"Dual Embedding & Indexing",desc:"Text chunks embedded with nomic-embed-text, images embedded with CLIP (ViT-B/32). Two separate FAISS indexes are built and persisted to disk alongside pickle metadata for reuse."},
    {label:"Multimodal Retrieval & Re-Ranking",desc:"Text retrieval finds the best chunks, then expands to nearby pages. Image retrieval combines CLIP cosine similarity with page-prior scoring and distance penalties — because the right diagram is often near the right procedure page."},
    {label:"Grounded Generation",desc:"Mistral 7B generates answers strictly from retrieved context. The prompt enforces procedural numbered-step formatting, prohibits outside knowledge, and requires explicit uncertainty when the answer isn't in the manual."},
    {label:"Voice & Vision Input",desc:"Whisper transcribes spoken questions with a full audio preprocessing pipeline (stereo→mono, format normalization, 16kHz resample). Qwen3-VL analyzes uploaded images to refine the retrieval query rather than answering directly."},
    {label:"Interactive Interface",desc:"Streamlit chat UI with PDF upload, processing controls, typed/spoken/image-based queries, answer display with retrieved context inspection, and supporting manual visuals — all with custom CSS styling."},
  ],
  highlights:["Structure-aware ingestion that understands tables, captions, and page layout","Dual FAISS indexes for text and image modalities","Page-prior image re-ranking beyond simple CLIP similarity","Fully grounded generation — no hallucination, only manual content","Complete voice pipeline with audio preprocessing","Local-first architecture — runs entirely offline after initial model cache"],
};

const cfsData = {
  tag:"RESEARCH 02", color:C.violet, title:"NASA CFS",
  overview:"This project explores how machine learning and automated analysis can help engineers verify requirement-to-code relationships within NASA's Core Flight System — a large C-language flight software repository. The system analyzes engineering requirements and source code functions to detect implementation relationships, helping answer which functions implement a given requirement, which requirements are covered by tests, and where traceability gaps exist.",
  quickStats:[["Type","Traceability Pipeline"],["Scale","1000s of Req-Function Pairs"],["Target","Flight Software Verification"],["Code","Python + C Analysis"],["Viz","Chord & Sankey Diagrams"],["ML","Embeddings + Classification"]],
  stack:["Python","Pandas","Regex","Custom C Parser","Holoviews","Bokeh","Plotly","NumPy","Git","CSV/JSON","Pathlib"],
  pipeline:[
    {label:"Requirement & Code Extraction",desc:"Requirement documents are parsed and aligned with code functions from traceability matrices. The system scans the entire cFS repository to locate corresponding production and test function implementations."},
    {label:"Code Block Parsing",desc:"A custom C parser detects function definitions via regex, tracks opening/closing braces, ignores braces inside comments and strings, and extracts complete function blocks — not just names but full logic."},
    {label:"Repository-Wide Indexing",desc:"Recursively scans the cFS repo, separates production code from unit tests, maps function names to file locations, and handles cases where test functions use different naming conventions."},
    {label:"Dataset Construction",desc:"Structured datasets linking requirement ID, description, function name, production file path, production function block, test file path, and test function block. Exported as CSV, JSON, and ML-ready formats."},
    {label:"ML Pipeline Preparation",desc:"Datasets designed for semantic similarity models, logistic regression classifiers, embedding-based retrieval, and contrastive learning approaches (InfoNCE) to determine valid requirement-function implementation relationships."},
    {label:"Visualization & Analysis",desc:"Chord diagrams (Holoviews/Bokeh) visualize requirement-function connections. Sankey diagrams (Plotly) show data flow. These identify highly reused functions, multi-module requirements, and coverage gaps."},
  ],
  highlights:["Automated dataset generation from traceability matrices to real source code","Custom C parser that handles comments, strings, and nested braces","Production and test code alignment for cross-layer traceability","Interactive chord and Sankey diagrams for relationship exploration","Supports semantic similarity, classification, and contrastive learning approaches","Potential applications in flight software verification and safety certification"],
};
export default function App() {
  const [page, setPage] = useState("home");
  useEffect(() => { window.__page = page; window.__vortexProgress = 0; }, [page]);
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body { background:#0A0A0A; -webkit-font-smoothing:antialiased; overflow-x:hidden; }
        a { text-decoration:none; color:inherit; }
        ::selection { background:#00E5FF33; color:#fff; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0A0A0A; }
        ::-webkit-scrollbar-thumb { background:#1A1A1A; border-radius:2px; }
        @keyframes marquee { 0% { transform:translateX(0); } 100% { transform:translateX(-33.333%); } }
        @keyframes gravPulse { 0%,100% { transform:scale(1); opacity:0.4; } 50% { transform:scale(1.4); opacity:0.1; } }
        @keyframes scrollPulse { 0%,100% { opacity:0.2; } 50% { opacity:0.6; } }
      `}</style>
      <ParticleMorph />
      {page === "home" && (
        <>
          <Hero />
          
          <ProjectSection />
          <VortexSection />
          <ResearchSection setPage={setPage} />
          <SkillShowcase />
          <Foot />
        </>
      )}
      {page === "smart" && (<><ProjectDetail data={smartData} setPage={setPage} /><Foot /></>)}
      {page === "cfs" && (<><ProjectDetail data={cfsData} setPage={setPage} /><Foot /></>)}
    </div>
  );
}