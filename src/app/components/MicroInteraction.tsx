"use client";

import React, { useEffect, useRef, useState } from "react";

/* Viewbox constants */
const VIEW_W = 1280;
const VIEW_H = 720;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;

const FACE_PATH_D =
  "M 380 160 C 480 120, 800 120, 900 160 C 960 200, 980 300, 900 360 C 800 420, 480 420, 380 360 C 320 320, 320 220, 380 160";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function MicroInteraction(): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lineGroupRef = useRef<SVGGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [dotSize, setDotSize] = useState<number>(16);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const vw = Math.max(window.innerWidth, 320);
      const t = (vw - 320) / (1920 - 320);
      return clamp(Math.round(10 + (22 - 10) * t), 10, 22);
    };
    setDotSize(compute());
    const onResize = () => setDotSize(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  // Add at the top
const CIRCLE_RADIUS = 345; // radius of the circular path

useEffect(() => {
  const lineGroup = lineGroupRef.current;
  const dot = dotRef.current;

  if (!lineGroup || !dot) return;

  if (reducedMotion) {
    // Place dot at circle end (angle = 0)
    dot.setAttribute("cx", String(CENTER_X + CIRCLE_RADIUS));
    dot.setAttribute("cy", String(CENTER_Y));
    dot.setAttribute("r", String(dotSize / 2));
    lineGroup.style.opacity = "0";
    return;
  }

  // Durations
  const DUR = {
    lineTravel: 900,
    morph: 400,
    moveToPathStart: 420,
    followPath: 2000,
  };

  let stage = 0;
  let start = performance.now();

  const initialX = -VIEW_W;
  const targetX = 0;

  lineGroup.setAttribute("transform", `translate(${initialX}, ${CENTER_Y})`);
  lineGroup.style.opacity = "1";

  dot.setAttribute("cx", String(CENTER_X));
  dot.setAttribute("cy", String(CENTER_Y));
  dot.setAttribute("r", String(Math.max(1, (dotSize / 2) * 0.12)));

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  const tick = (now: number) => {
    const t = now - start;

    if (stage === 0) {
      const p = Math.min(1, t / DUR.lineTravel);
      const eased = easeOutCubic(p);
      const curX = initialX + (targetX - initialX) * eased;
      lineGroup.setAttribute("transform", `translate(${curX}, ${CENTER_Y})`);

      if (p >= 1) {
        stage = 1;
        start = now;
      }
    } else if (stage === 1) {
      const p = Math.min(1, (now - start) / DUR.morph);
      const eased = easeInOutQuad(p);

      const strokeStarts = [6, 4, 2];
      Array.from(lineGroup.querySelectorAll<SVGLineElement>("line")).forEach((el, i) => {
        const sw = Math.max(0.4, strokeStarts[i] * (1 - eased));
        el.setAttribute("stroke-width", String(sw));
        el.style.opacity = String(1 - eased);
      });

      const r = (dotSize / 2) * (0.25 + 0.75 * eased);
      dot.setAttribute("r", String(r));

      if (p >= 1) {
        lineGroup.style.opacity = "0";
        stage = 2;
        start = now;
      }
    } else if (stage === 2) {
      // move dot from center -> circle perimeter start (angle=0)
      const p = Math.min(1, (now - start) / DUR.moveToPathStart);
      const eased = easeOutCubic(p);
      const curX = CENTER_X + CIRCLE_RADIUS * eased;
      const curY = CENTER_Y;
      dot.setAttribute("cx", String(curX));
      dot.setAttribute("cy", String(curY));

      if (p >= 1) {
        stage = 3;
        start = now;
      }
    } else {
      // stage 3: follow circular path (0 → 2π)
      const p = Math.min(1, (now - start) / DUR.followPath);
      const eased = easeInOutQuad(p);
      const angle = 2 * Math.PI * eased;

      const x = CENTER_X + CIRCLE_RADIUS * Math.cos(angle);
      const y = CENTER_Y + CIRCLE_RADIUS * Math.sin(angle);

      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", String(y));

      if (p >= 1) {
        cancelAnimationFrame(rafRef.current!);
        return;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  rafRef.current = requestAnimationFrame(tick);

  return () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
}, [dotSize, reducedMotion]);


  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        role="img"
        aria-label="Glowing RGB line morphing into a dot that traverses a face path"
        style={{ display: "block" }}
      >
        <defs>
          {/* strong glow */}
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* dot radial gradient RGB */}
          <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="45%" stopColor="#FF2D55" stopOpacity="1" />
            <stop offset="70%" stopColor="#00E676" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill="#000" />

        {/* <image
          href="/face3.svg"
          x="0"
          y="0"
          width={VIEW_W}
          height={VIEW_H}
          preserveAspectRatio="xMidYMid meet"
        //   opacity="0.14"
          style={{ pointerEvents: "none" }}
        /> */}

        <image
        href="/face3.svg"
        x="0"
        y="0"
        width={VIEW_W}
        height={VIEW_H}
        style={{
            filter: "invert(1)",
            // opacity: 0.14,
            pointerEvents: "none",
        }}
        />

        <path
          ref={pathRef}
          d={FACE_PATH_D}
          fill="none"
        //   stroke="transparent"
          strokeWidth={2}
        />

        <g ref={lineGroupRef} transform={`translate(${-VIEW_W}, ${CENTER_Y})`}>
          <line
            x1={0}
            x2={VIEW_W}
            y1={0}
            y2={0}
            stroke="#3B82F6"
            strokeWidth={6}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ mixBlendMode: "screen" }}
          />
          <line
            x1={0}
            x2={VIEW_W}
            y1={0}
            y2={0}
            stroke="#00E676"
            strokeWidth={4}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ mixBlendMode: "screen" }}
          />
          <line
            x1={0}
            x2={VIEW_W}
            y1={0}
            y2={0}
            stroke="#FF2D55"
            strokeWidth={2}
            strokeLinecap="round"
            filter="url(#glow)"
            style={{ mixBlendMode: "screen" }}
          />
        </g>

        <circle
          ref={dotRef}
          cx={CENTER_X}
          cy={CENTER_Y}
          r={dotSize / 2}
          fill="url(#dotGrad)"
          filter="url(#glow)"
          style={{ mixBlendMode: "screen" }}
        />
      </svg>
    </div>
  );
}
