import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { MapGeometry } from "../lib/geo";
import { fmtRate, rateColor, type Indicator, type Rec } from "../lib/data";
import { useI18n } from "../lib/i18n";

type Props = {
  geo: MapGeometry;
  indicator: Indicator;
  byCode: Map<string, Rec>;
  selected: string;
  onSelect: (code: string) => void;
  zoomed: boolean;
  onReset: () => void;
  hovered: string | null;
  onHover: (h: { code: string; x: number; y: number } | null) => void;
};

type VB = [number, number, number, number];
const DURATION = 750;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// 選択県の周囲を、地図全体と同じ縦横比で切り出す
function targetViewBox(geo: MapGeometry, code: string, zoomed: boolean): VB {
  const full: VB = [0, 0, geo.width, geo.height];
  const s = geo.shapes.find((x) => x.code === code);
  if (!zoomed || !s) return full;
  const a = geo.width / geo.height;
  const w = Math.max(s.bbox.w * 2.6, s.bbox.h * 2.6 * a, geo.width * 0.3);
  const h = w / a;
  const cx = s.bbox.x + s.bbox.w / 2;
  const cy = s.bbox.y + s.bbox.h / 2;
  return [cx - w / 2, cy - h / 2 + h * 0.08, w, h];
}

export function ChoroplethMap({ geo, indicator, byCode, selected, onSelect, zoomed, onReset, hovered, onHover }: Props) {
  const sel = geo.shapes.find((s) => s.code === selected);
  const { t, prefName } = useI18n();
  const label = t.ind[indicator];
  const hatch = `hatch-${indicator}`;
  const glow = `glow-${indicator}`;

  // viewBox をアニメーションしてズームイン／アウト
  const target = targetViewBox(geo, selected, zoomed);
  const [vb, setVb] = useState<VB>(target);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const key = target.map((v) => v.toFixed(2)).join(",");
  useEffect(() => {
    const from = vbRef.current;
    if (reduceMotion()) {
      setVb(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      const k = ease(t);
      setVb(from.map((f, i) => f + (target[i] - f) * k) as VB);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 傾けた地図上の県の位置（画面座標）を追跡して、HTMLラベルを置く
  const planeRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<SVGCircleElement>(null);
  const [labelPos, setLabelPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const box = planeRef.current?.parentElement?.getBoundingClientRect();
      if (a && box) setLabelPos({ x: a.left + a.width / 2 - box.left, y: a.top - box.top });
    };
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      measure();
      if (now - t0 < DURATION + 250) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [key, zoomed, selected]);

  // 地図は1つのタブ停止。←→↑↓ で都道府県コード順に選択を移動、Esc で全国表示へ
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const n = Number(selected);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = n >= 47 ? 1 : n + 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = n <= 1 ? 47 : n - 1;
    if (e.key === "Home") next = 1;
    if (e.key === "End") next = 47;
    if (e.key === "Escape" && zoomed) {
      e.preventDefault();
      onReset();
    }
    if (next != null) {
      e.preventDefault();
      onSelect(String(next).padStart(2, "0"));
    }
  };

  const ib = geo.insetBox;
  const selRec = byCode.get(selected);
  const selV = selRec ? selRec[indicator] : null;
  const zoomScale = geo.width / vb[2]; // 文字・光彩をズーム率で補正
  return (
    <>
    <div ref={planeRef} className={`map-plane${zoomed ? " is-tilted" : ""}`}>
      <svg
        className="map-svg"
        viewBox={vb.map((v) => v.toFixed(2)).join(" ")}
        role="application"
        aria-roledescription={t.mapRole}
        aria-label={t.mapAria(label, prefName(selRec), fmtRate(selV))}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerLeave={() => onHover(null)}
      >
        <defs>
          <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#3a3540" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#8a8490" strokeWidth="2" />
          </pattern>
          <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={3 / zoomScale} result="b1" />
            <feFlood floodColor="#ffd27a" floodOpacity="0.95" />
            <feComposite in2="b1" operator="in" result="g1" />
            <feGaussianBlur in="SourceAlpha" stdDeviation={10 / zoomScale} result="b2" />
            <feFlood floodColor="#ffb347" floodOpacity="0.7" />
            <feComposite in2="b2" operator="in" result="g2" />
            <feMerge>
              <feMergeNode in="g2" />
              <feMergeNode in="g1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g className={zoomed && selected !== "47" ? "is-zoomed-away" : ""}>
        <rect x={ib.x} y={ib.y} width={ib.w} height={ib.h} className="inset-box" />
        <text x={ib.x + 4} y={ib.y + ib.h + 12} className="inset-label">
          {t.okinawaInset}
        </text>
        </g>
        <g className={zoomed ? "prefs is-dim" : "prefs"}>
          {geo.shapes.map((s) => {
            const r = byCode.get(s.code);
            const v = r ? r[indicator] : null;
            return (
              <path
                key={s.code}
                d={s.d}
                fill={v == null ? `url(#${hatch})` : rateColor(v)}
                className={`pref${hovered === s.code ? " is-hover" : ""}`}
                onClick={() => onSelect(s.code)}
                onPointerMove={(e) => e.pointerType === "mouse" && onHover({ code: s.code, x: e.clientX, y: e.clientY })}
              />
            );
          })}
        </g>
        {sel && (
          <g className="pref-selected" aria-hidden="true">
            <path d={sel.d} fill={selV == null ? `url(#${hatch})` : rateColor(selV)} filter={`url(#${glow})`} />
            <path d={sel.d} className="pref-selected-line" />
            <circle
              ref={anchorRef}
              cx={sel.bbox.x + sel.bbox.w / 2}
              cy={sel.bbox.y}
              r={0.01}
              fill="none"
            />
          </g>
        )}
      </svg>
    </div>
    {/* 県名ラベルは傾けた面の外にHTMLで重ね、文字がにじまないようにする */}
    {zoomed && labelPos && sel && (
      <div className="pref-label" style={{ left: labelPos.x, top: labelPos.y }} aria-hidden="true">
        {prefName({ prefectureCode: sel.code, prefectureName: sel.name })} <b>{fmtRate(selV)}</b>
      </div>
    )}
    </>
  );
}
