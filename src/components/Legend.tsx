import { GRADIENT_STOPS } from "../lib/data";
import { useI18n } from "../lib/i18n";

type Marker = { label: string; value: number | null };

// 両地図共通の固定尺度 0〜100%
export function Legend({ markers }: { markers: Marker[] }) {
  const { t } = useI18n();
  const ticks = [0, 20, 40, 60, 80, 100];
  return (
    <figure className="legend" aria-label={t.gradAria}>
      <figcaption>{t.gradCaption}</figcaption>
      <svg viewBox="0 0 400 46" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="legend-grad" x1="0" x2="1">
            {GRADIENT_STOPS.map((s) => (
              <stop key={s.offset} offset={`${s.offset}%`} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <rect x="0" y="10" width="400" height="12" fill="url(#legend-grad)" rx="2" />
        {markers.map(
          (m) =>
            m.value != null && (
              <g key={m.label}>
                <line x1={m.value * 4} x2={m.value * 4} y1="4" y2="26" className="legend-marker" />
              </g>
            ),
        )}
        {ticks.map((t) => (
          <line key={t} x1={t * 4} x2={t * 4} y1="22" y2="27" className="legend-tick" />
        ))}
      </svg>
      <div className="legend-ticks" aria-hidden="true">
        {ticks.map((v) => (
          <span key={v} style={{ left: `${v}%` }}>
            {v}
          </span>
        ))}
      </div>
      <p className="legend-note">
        {t.gradNote}
        {markers.map((m, i) => (
          <span key={m.label}>
            {i > 0 && " / "}
            {m.label} {m.value?.toFixed(1)}%
          </span>
        ))}
      </p>
    </figure>
  );
}
