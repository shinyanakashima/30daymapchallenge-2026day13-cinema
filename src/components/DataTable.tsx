import { diffPt, fmtRate, NATIONAL, type Rec, type Sex } from "../lib/data";
import { useI18n } from "../lib/i18n";

// スクリーンリーダー・数値確認用の表（折りたたみ）
export function DataTable({ rows, nation, sex }: { rows: Rec[]; nation: Rec | undefined; sex: Sex }) {
  const { t, prefName, fmtPt, num } = useI18n();
  const prefs = rows.filter((r) => r.prefectureCode !== NATIONAL).sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode));
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table>
          <caption>
            {t.tableCaption(t.sex[sex])}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t.th.code}</th>
              <th scope="col">{t.th.pref}</th>
              <th scope="col">{t.ind.cinemaRate}</th>
              <th scope="col">{t.th.vs}</th>
              <th scope="col">{t.ind.outsideCinemaRate}</th>
              <th scope="col">{t.th.vs}</th>
              <th scope="col">{t.th.sample}</th>
            </tr>
          </thead>
          <tbody>
            {nation && (
              <tr className="row-nation">
                <td>00</td>
                <th scope="row">{t.nationalRow}</th>
                <td>{fmtRate(nation.cinemaRate)}</td>
                <td>—</td>
                <td>{fmtRate(nation.outsideCinemaRate)}</td>
                <td>—</td>
                <td>{num(nation.sampleSize)}</td>
              </tr>
            )}
            {prefs.map((r) => (
              <tr key={r.prefectureCode}>
                <td>{r.prefectureCode}</td>
                <th scope="row">{prefName(r)}</th>
                <td>{fmtRate(r.cinemaRate)}</td>
                <td>{fmtPt(diffPt(r.cinemaRate, nation?.cinemaRate ?? null))}</td>
                <td>{fmtRate(r.outsideCinemaRate)}</td>
                <td>{fmtPt(diffPt(r.outsideCinemaRate, nation?.outsideCinemaRate ?? null))}</td>
                <td>{num(r.sampleSize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">{t.tableNote}</p>
    </div>
  );
}
