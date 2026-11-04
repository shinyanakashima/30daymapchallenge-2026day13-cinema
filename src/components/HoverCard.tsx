import { diffPt, fmtPt, IND_LABEL, rateColor, type Indicator, type Rec } from "../lib/data";

export type HoverState = { code: string; x: number; y: number } | null;
type Props = { hover: HoverState; byCode: Map<string, Rec>; nation: Rec | undefined };

const W = 236;
const H = 132;

// 地図ホバー時にカーソル横へ出るミニグラフ（マウス操作の補助。値はカード・数値表でも確認可能）
export function HoverCard({ hover, byCode, nation }: Props) {
  if (!hover) return null;
  const r = byCode.get(hover.code);
  if (!r) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = hover.x + 16 + W > vw - 8 ? hover.x - 16 - W : hover.x + 16;
  const top = Math.min(Math.max(8, hover.y - H / 2), vh - H - 8);
  const inds: Indicator[] = ["cinemaRate", "outsideCinemaRate"];
  return (
    <div className="hovercard" style={{ left, top, width: W }} aria-hidden="true">
      <p className="hc-name">{r.prefectureName}</p>
      {inds.map((k) => {
        const v = r[k];
        const n = nation?.[k] ?? null;
        return (
          <div className="hc-row" key={k}>
            <span className="hc-label">{IND_LABEL[k]}</span>
            <span className="hc-track">
              <span className="hc-bar" style={{ width: `${v ?? 0}%`, background: rateColor(v) }} />
              {n != null && <i className="hc-nat" style={{ left: `${n}%` }} />}
            </span>
            <span className="hc-val">{v == null ? "—" : v.toFixed(1)}%</span>
            <span className="hc-diff">全国比 {fmtPt(diffPt(v, n))}</span>
          </div>
        );
      })}
      <p className="hc-foot">軸 0〜100%　縦線＝全国　クリックで選択</p>
    </div>
  );
}
