import type { Dataset } from "../lib/data";

// 「About the data」英語版（日本語版の説明と同じ内容）
export function AboutEn({ data }: { data: Dataset | null }) {
  return (
    <div className="about" lang="en">
      <p>
        Based on the 2021 Survey on Time Use and Leisure Activities by the Statistics Bureau of Japan (Ministry of Internal Affairs and
        Communications), this map shows the share of people aged 10 and over who watched a movie during the past 12 months (October 20,
        2020 – October 19, 2021). People who watched both at cinemas and outside cinemas are counted in both. The period includes the
        COVID-19 pandemic, so the figures do not directly describe today&apos;s viewing habits or personal preferences.
      </p>
      <ul>
        <li>
          “Outside cinemas” is the survey item “Watching movies other than at a cinema (TV, DVD, PC, etc.)”. It is not the same as
          streaming services or online video in general.
        </li>
        <li>
          The two rates are not mutually exclusive, so they cannot be added together or read as shares of a whole. The share of people who
          did both, or neither, cannot be derived from this table.
        </li>
        <li>
          Values are not adjusted for age structure. Differences from the national rate are differences between the displayed values (one
          decimal place) and do not indicate statistical significance. The causes of regional differences (preferences, distance to
          cinemas, income, etc.) cannot be determined from these data.
        </li>
        <li>The national value is the published figure for Japan as a whole, not a simple average of the 47 prefectures.</li>
        <li>
          In the 3D view, each prefecture has two pillars, at cinemas (gold) and outside cinemas (blue), whose heights show the
          participation rate on the same 0–100% scale. Rings around the pillars mark the national level. Pillars are placed as markers for
          each prefecture and do not represent specific locations. Because the map is viewed at an angle, pillars of the same height can
          look different in length near and far; exact values are shown in the card, bar chart and data table.
        </li>
        <li>
          Mercator projection, same scale for all prefectures. Okinawa is relocated into a separate box, and Tokyo&apos;s remote islands south
          of 30°N (e.g. the Ogasawara Islands) are omitted. “Side by side” shows two maps shaded on a shared 0–100% scale.
        </li>
      </ul>
      <dl className="source">
        <dt>Source</dt>
        <dd>
          Statistics Bureau of Japan, 2021 Survey on Time Use and Leisure Activities, Questionnaire A, Regional results,{" "}
          <a href={data?.source.url} target="_blank" rel="noreferrer">
            Table 93-2: Participation rate by type of hobby and amusement, by sex (aged 10 and over), Japan and prefectures
          </a>{" "}
          (e-Stat, published August 31, 2022; retrieved {data?.source.retrievedAt}). Table title translated; data processed by the author.
        </dd>
        <dt>Map</dt>
        <dd>
          Simplified from{" "}
          <a href="https://github.com/dataofjapan/land" target="_blank" rel="noreferrer">
            dataofjapan/land
          </a>
          , converted from Global Map Japan (Geospatial Information Authority of Japan).
        </dd>
      </dl>
    </div>
  );
}
