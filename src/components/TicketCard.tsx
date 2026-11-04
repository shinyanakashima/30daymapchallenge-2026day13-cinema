import { diffPt, fmtPt, fmtRate, IND_LABEL, IND_SUB, SEX_LABEL, type Indicator, type Rec, type Sex } from "../lib/data";

type Props = { pref: Rec | undefined; nation: Rec | undefined; sex: Sex; period: string };

export function TicketCard({ pref, nation, sex, period }: Props) {
  const inds: Indicator[] = ["cinemaRate", "outsideCinemaRate"];
  return (
    <section className="ticket" aria-live="polite" aria-label="選択中の都道府県">
      <div className="ticket-head">
        <p className="ticket-kicker">ADMIT ONE　{SEX_LABEL[sex]}</p>
        <h2 className="ticket-pref">{pref?.prefectureName ?? "—"}</h2>
        <p className="ticket-period">{period}</p>
      </div>
      <div className="ticket-body">
        {inds.map((k) => {
          const v = pref?.[k] ?? null;
          const n = nation?.[k] ?? null;
          const d = diffPt(v, n);
          return (
            <div className="stub" key={k}>
              <p className="stub-label">
                {IND_LABEL[k]}
                <span className="stub-sub">{IND_SUB[k]}</span>
              </p>
              <p className="stub-value">
                {v == null ? "—" : v.toFixed(1)}
                <small>%</small>
              </p>
              {v == null && pref?.missingReason && <p className="stub-missing">欠損：{pref.missingReason}</p>}
              <p className="stub-diff">
                全国 {fmtRate(n)} との差 <strong className={d == null ? "" : d > 0 ? "up" : d < 0 ? "down" : ""}>{fmtPt(d)}</strong>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
