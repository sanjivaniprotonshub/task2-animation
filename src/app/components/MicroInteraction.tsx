"use client";

import { useEffect, useRef, useState } from "react";

const testPath = "M 100 360 C 300 100, 900 600, 1180 360";

const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));

export default function MicroInteraction() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineGroupRef = useRef<SVGGElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
const [dotSize, setDotSize] = useState(16); // default safe size

useEffect(() => {
  const computeDotSize = () => {
    const vw = Math.max(window.innerWidth, 320);
    return clamp(Math.round(10 + (22 - 10) * ((vw - 320) / (1920 - 320))), 10, 22);
  };

  setDotSize(computeDotSize());

  const handleResize = () => setDotSize(computeDotSize());
  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);

  const computeDotSize = () => {
    const vw = Math.max(window.innerWidth, 320);
    return clamp(Math.round(10 + (22 - 10) * ((vw - 320) / (1920 - 320))), 10, 22);
  };

  const durations = { lineTravel: 800, morph: 350, dotTravel: 2000 };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let raf = 0;
    let start = performance.now();
    let stage = 0;
    const lineGroup = lineGroupRef.current!;
    const dot = dotRef.current!;
    const path = pathRef.current!;

    const centerX = 640;
    const lineStartX = 0;
    const lineEndX = centerX;

    const tick = (now: number) => {
      const t = now - start;

      if (stage === 0) {
        const p = Math.min(1, t / durations.lineTravel);
        const eased = Math.pow(p, 0.95);
        const currentX = lineStartX + (lineEndX - lineStartX) * eased;
        lineGroup.setAttribute("transform", `translate(${currentX},0)`);
        if (p >= 1) { stage = 1; start = now; }
      } else if (stage === 1) {
        const p = Math.min(1, (now - start) / durations.morph);
        const strokeVal = 6 * (1 - p);
        Array.from(lineGroup.querySelectorAll("line")).forEach((el) => {
          el.setAttribute("stroke-width", String(Math.max(0.5, strokeVal)));
          (el as SVGLineElement).style.opacity = String(1 - p);
        });
        const dotR = (computeDotSize() / 2) * (0.3 + 0.7 * p);
        dot.setAttribute("r", String(dotR));
        if (p >= 1) { stage = 2; start = now; lineGroup.style.opacity = "0"; }
      } else if (stage === 2) {
        const p = Math.min(1, (now - start) / durations.dotTravel);
        const pathLen = path.getTotalLength();
        const pos = path.getPointAtLength(pathLen * p);
        dot.setAttribute("cx", String(pos.x));
        dot.setAttribute("cy", String(pos.y));
        if (p >= 1) return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

//   const dotSize = computeDotSize();

  return (
    <div className="w-full h-full flex items-center justify-center relative bg-white">
      <svg
        ref={svgRef}
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="45%" stopColor="#ff0000" />
            <stop offset="70%" stopColor="#00ff00" />
            <stop offset="100%" stopColor="#0000ff" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="#fff" />

        {/* placeholder image */}
        <image
          href="./face3.svg"
          x="0"
          y="0"
          width="1280"
          height="720"
          preserveAspectRatio="xMidYMid meet"
        />

        <path ref={pathRef} d={testPath} fill="none" stroke="transparent" strokeWidth={2} />

        <g ref={lineGroupRef} transform="translate(0,360)">
          <line x1={0} x2={1280} y1={0} y2={0} stroke="#00f" strokeWidth={6} filter="url(#glow)" />
          <line x1={0} x2={1280} y1={0} y2={0} stroke="#0f0" strokeWidth={4} filter="url(#glow)" />
          <line x1={0} x2={1280} y1={0} y2={0} stroke="#f00" strokeWidth={2} filter="url(#glow)" />
        </g>

        <circle
          ref={dotRef}
          cx={640}
          cy={360}
          r={dotSize / 2}
          fill="url(#dotGrad)"
          filter="url(#glow)"
        />
      </svg>
    </div>
  );
}
