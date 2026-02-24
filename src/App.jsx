import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, set, update } from "firebase/database";

// ─── Constants & Logic ──────────────────────────────────
const checkAdminPassword = (input) => {
  const secret = import.meta.env.VITE_ADMIN_PASS || "admin1234";
  return input === secret;
};

const DEFAULT_TEAMS = {
  A: ["G-BEAT", "KOZY", "UNDER MANGO TREE", "BANGMOD Z"],
  B: ["LTF", "SI COBRA", "CHOCOBO", "KINGKONG"],
  C: ["BANGMOD", "KMUTT", "WATTANA", "KMUTT SENIOR"],
  D: ["RIFF2POINT X DECHA", "XYZ", "JAGUAR B", "SORNANANKUL"],
};

function generateGroupMatches(groups) {
  const matches = [];
  let id = 1;
  Object.entries(groups).forEach(([group, teams]) => {
    for (let i = 0; i < teams.length; i++)
      for (let j = i + 1; j < teams.length; j++)
        matches.push({ id: id++, round: 1, group, home: teams[i], away: teams[j], homeScore: null, awayScore: null, played: false });
  });
  return matches;
}

const KO_TEMPLATE = [
  { id: 100, round: 2, label: "Quarter Finals 1", shortLabel: "QF1", home: "1A", away: "2C", homeScore: null, awayScore: null, played: false },
  { id: 101, round: 2, label: "Quarter Finals 2", shortLabel: "QF2", home: "1D", away: "2B", homeScore: null, awayScore: null, played: false },
  { id: 102, round: 2, label: "Quarter Finals 3", shortLabel: "QF3", home: "1B", away: "2D", homeScore: null, awayScore: null, played: false },
  { id: 103, round: 2, label: "Quarter Finals 4", shortLabel: "QF4", home: "1C", away: "2A", homeScore: null, awayScore: null, played: false },
  { id: 200, round: 3, label: "Semi Finals 1", shortLabel: "SF1", home: "W-QF1", away: "W-QF2", homeScore: null, awayScore: null, played: false },
  { id: 201, round: 3, label: "Semi Finals 2", shortLabel: "SF2", home: "W-QF3", away: "W-QF4", homeScore: null, awayScore: null, played: false },
  { id: 300, round: 4, label: "3rd Place", shortLabel: "3rd", home: "L-SF1", away: "L-SF2", homeScore: null, awayScore: null, played: false },
  { id: 301, round: 4, label: "Grand Final", shortLabel: "FINAL", home: "W-SF1", away: "W-SF2", homeScore: null, awayScore: null, played: false },
];

const MATCH_SCHEDULE = {
  19: { matchNo: 1, dateLabel: "เสาร์ 28 ก.พ.", time: "13:00" },
  12: { matchNo: 2, dateLabel: "เสาร์ 28 ก.พ.", time: "14:10" },
  18: { matchNo: 3, dateLabel: "เสาร์ 28 ก.พ.", time: "15:40" },
  3: { matchNo: 4, dateLabel: "เสาร์ 28 ก.พ.", time: "16:50" },
  4: { matchNo: 5, dateLabel: "อาทิตย์ 1 มี.ค.", time: "13:00" },
  7: { matchNo: 6, dateLabel: "อาทิตย์ 1 มี.ค.", time: "14:10" },
  13: { matchNo: 7, dateLabel: "อาทิตย์ 1 มี.ค.", time: "15:40" },
  24: { matchNo: 8, dateLabel: "อาทิตย์ 1 มี.ค.", time: "16:50" },
  20: { matchNo: 9, dateLabel: "อาทิตย์ 15 มี.ค.", time: "13:00" },
  2: { matchNo: 10, dateLabel: "อาทิตย์ 15 มี.ค.", time: "14:10" },
  14: { matchNo: 11, dateLabel: "อาทิตย์ 15 มี.ค.", time: "15:40" },
  8: { matchNo: 12, dateLabel: "อาทิตย์ 15 มี.ค.", time: "16:50" },
  16: { matchNo: 13, dateLabel: "เสาร์ 21 มี.ค.", time: "13:00" },
  23: { matchNo: 14, dateLabel: "เสาร์ 21 มี.ค.", time: "14:10" },
  5: { matchNo: 15, dateLabel: "เสาร์ 21 มี.ค.", time: "15:40" },
  9: { matchNo: 16, dateLabel: "เสาร์ 21 มี.ค.", time: "16:50" },
  10: { matchNo: 17, dateLabel: "อาทิตย์ 22 มี.ค.", time: "13:00" },
  21: { matchNo: 18, dateLabel: "อาทิตย์ 22 มี.ค.", time: "14:10" },
  1: { matchNo: 19, dateLabel: "อาทิตย์ 22 มี.ค.", time: "15:40" },
  17: { matchNo: 20, dateLabel: "อาทิตย์ 22 มี.ค.", time: "16:50" },
  22: { matchNo: 21, dateLabel: "เสาร์ 28 มี.ค.", time: "13:00" },
  11: { matchNo: 22, dateLabel: "เสาร์ 28 มี.ค.", time: "14:10" },
  6: { matchNo: 23, dateLabel: "เสาร์ 28 มี.ค.", time: "15:40" },
  15: { matchNo: 24, dateLabel: "เสาร์ 28 มี.ค.", time: "16:50" },
  100: { matchNo: 25, dateLabel: "อาทิตย์ 29 มี.ค.", time: "13:00" },
  101: { matchNo: 26, dateLabel: "อาทิตย์ 29 มี.ค.", time: "14:10" },
  102: { matchNo: 27, dateLabel: "อาทิตย์ 29 มี.ค.", time: "15:40" },
  103: { matchNo: 28, dateLabel: "อาทิตย์ 29 มี.ค.", time: "16:50" },
  200: { matchNo: 29, dateLabel: "เสาร์ 4 เม.ย.", time: "16:00" },
  201: { matchNo: 30, dateLabel: "เสาร์ 4 เม.ย.", time: "17:00" },
  300: { matchNo: 31, dateLabel: "อาทิตย์ 5 เม.ย.", time: "16:00" },
  301: { matchNo: 32, dateLabel: "อาทิตย์ 5 เม.ย.", time: "17:00" },
};

const GROUP_COLORS = {
  A: { badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", dot: "bg-orange-400", ring: "border-l-orange-500", header: "from-orange-600/15 to-transparent", icon: "bg-orange-500" },
  B: { badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", dot: "bg-blue-400", ring: "border-l-blue-500", header: "from-blue-600/15 to-transparent", icon: "bg-blue-500" },
  C: { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400", ring: "border-l-emerald-500", header: "from-emerald-600/15 to-transparent", icon: "bg-emerald-500" },
  D: { badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", dot: "bg-purple-400", ring: "border-l-purple-500", header: "from-purple-600/15 to-transparent", icon: "bg-purple-500" },
};

// ─── Logic Functions ──────────────────────────────────────────────────────────
function breakTie(tiedTeams, allMatches) {
  if (tiedTeams.length <= 1) return tiedTeams;
  const h2h = {};
  const set_ = new Set(tiedTeams.map(t => t.team));
  tiedTeams.forEach(t => { h2h[t.team] = { pts: 0, pf: 0, pa: 0 }; });
  allMatches.forEach(m => {
    if (!m.played || m.round !== 1 || !set_.has(m.home) || !set_.has(m.away)) return;
    const isHF = m.homeScore === 0 && m.awayScore === 20;
    const isAF = m.awayScore === 0 && m.homeScore === 20;
    h2h[m.home].pf += m.homeScore; h2h[m.home].pa += m.awayScore;
    h2h[m.away].pf += m.awayScore; h2h[m.away].pa += m.homeScore;
    if (m.homeScore > m.awayScore) { h2h[m.home].pts += 3; h2h[m.away].pts += isAF ? 0 : 1; }
    else if (m.awayScore > m.homeScore) { h2h[m.away].pts += 3; h2h[m.home].pts += isHF ? 0 : 1; }
  });
  return [...tiedTeams].sort((a, b) => {
    const ha = h2h[a.team], hb = h2h[b.team];
    if (hb.pts !== ha.pts) return hb.pts - ha.pts;
    const dA = ha.pf - ha.pa, dB = hb.pf - hb.pa;
    if (dA !== dB) return dB - dA;
    const odA = a.pf - a.pa, odB = b.pf - b.pa;
    if (odA !== odB) return odB - odA;
    return b.pf - a.pf;
  });
}

function computeStandings(teams, matches) {
  if (!teams || !matches) return {};
  const stats = {};
  Object.entries(teams).forEach(([g, ts]) => ts.forEach(t => {
    stats[t] = { team: t, group: g, played: 0, wins: 0, losses: 0, pts: 0, pf: 0, pa: 0 };
  }));
  matches.forEach(m => {
    if (!m.played || m.round !== 1) return;
    const h = stats[m.home], a = stats[m.away];
    if (!h || !a) return;
    h.played++; a.played++;
    h.pf += m.homeScore; h.pa += m.awayScore;
    a.pf += m.awayScore; a.pa += m.homeScore;
    const isHF = m.homeScore === 0 && m.awayScore === 20;
    const isAF = m.awayScore === 0 && m.homeScore === 20;
    if (m.homeScore > m.awayScore) { h.wins++; h.pts += 3; a.losses++; a.pts += isAF ? 0 : 1; }
    else if (m.awayScore > m.homeScore) { a.wins++; a.pts += 3; h.losses++; h.pts += isHF ? 0 : 1; }
  });
  const grouped = {};
  Object.keys(teams).forEach(g => {
    const sorted = [...teams[g].map(t => stats[t])].sort((a, b) => b.pts - a.pts);
    const result = [];
    let i = 0;
    while (i < sorted.length) {
      let j = i + 1;
      while (j < sorted.length && sorted[j].pts === sorted[i].pts) j++;
      result.push(...breakTie(sorted.slice(i, j), matches));
      i = j;
    }
    grouped[g] = result;
  });
  return grouped;
}

function resolveKoMatches(koMatches, standings, groupMatches) {
  const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.played);
  const hasStandings = Object.keys(standings).length > 0;
  const fromStandings = code => standings[code[1]]?.[parseInt(code[0]) - 1]?.team || code;
  const fromKo = (code, resolved) => {
    const [outcome, label] = code.split("-");
    const m = resolved.find(r => r.shortLabel === label);
    if (!m || !m.played) return code;
    const homeWon = m.homeScore > m.awayScore;
    return outcome === "W" ? (homeWon ? m.resolvedHome : m.resolvedAway)
      : outcome === "L" ? (homeWon ? m.resolvedAway : m.resolvedHome) : code;
  };
  const resolved = [];
  for (const m of koMatches) {
    let rHome = m.home, rAway = m.away;
    if (hasStandings && allGroupDone) {
      if (/^[1-4][A-D]$/.test(m.home)) rHome = fromStandings(m.home);
      if (/^[1-4][A-D]$/.test(m.away)) rAway = fromStandings(m.away);
      if (m.home.includes("-")) rHome = fromKo(m.home, resolved);
      if (m.away.includes("-")) rAway = fromKo(m.away, resolved);
    }
    resolved.push({ ...m, resolvedHome: rHome, resolvedAway: rAway });
  }
  return { resolved, allGroupDone };
}

// ─── UI Components (แก้บั๊กรูปไม่ขึ้นแล้ว) ──────────────────────────────────
const getTeamGradient = name => {
  const g = ["from-orange-500 to-red-700", "from-blue-600 to-indigo-900", "from-emerald-600 to-teal-900", "from-purple-600 to-fuchsia-900", "from-amber-500 to-yellow-800", "from-rose-600 to-pink-900", "from-cyan-600 to-blue-800", "from-slate-500 to-slate-800"];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return g[Math.abs(h) % g.length];
};

function TeamAvatar({ name, size = "md" }) {
  const [err, setErr] = useState(false);

  // 🌟 บังคับรีเซ็ต Error ใหม่ทุกครั้งที่มีการเปลี่ยนชื่อทีม
  useEffect(() => {
    setErr(false);
  }, [name]);

  const gradient = useMemo(() => getTeamGradient(name || "?"), [name]);
  const sz = {
    xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 sm:w-11 sm:h-11 text-sm", lg: "w-14 h-14 sm:w-16 sm:h-16 text-xl"
  };

  const cleanName = (name || "").trim().toUpperCase().replace(/\s+/g, "_");
  const imagePath = `/photo/${cleanName}.jpg`;
  const isActualTeam = name && name !== "TBD" && !/^[1-4][A-D]$/.test(name) && !/^[WL]-[A-Z0-9]+$/.test(name);

  return (
    <div className={`${sz[size]} rounded-full flex items-center justify-center font-black text-white shadow-inner border border-white/10 shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}>
      {!err && isActualTeam ? (
        <img src={imagePath} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <span style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{(name || "?")[0].toUpperCase()}</span>
      )}
    </div>
  );
}

function Badge({ children, className }) {
  return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${className}`}>{children}</span>;
}

// ─── Sections ────────────────────────────────────────────────────────────

function StandingsTab({ standings }) {
  return (
    <div className="space-y-6 pb-10 animate-scale-in">
      {Object.entries(standings).map(([group, teams]) => {
        const gc = GROUP_COLORS[group];
        return (
          <div key={group} className="bg-[#0f0f0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r ${gc.header}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${gc.icon} flex items-center justify-center text-xl font-black text-white shadow-lg`}>{group}</div>
                <div>
                  <h3 className="font-black text-white text-sm uppercase tracking-tighter">Group {group}</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Standings</p>
                </div>
              </div>
              <Badge className="bg-white/5 text-gray-400 border-white/10">Stage 1</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/40 border-y border-white/5 text-[10px] text-gray-500 font-black uppercase">
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-2 py-3">Team</th>
                    <th className="px-2 py-3 text-center w-10 text-emerald-500">W</th>
                    <th className="px-2 py-3 text-center w-10 text-rose-500">L</th>
                    <th className="px-2 py-3 text-center">+/-</th>
                    <th className="px-4 py-3 text-center text-white">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teams.map((t, i) => {
                    const q = i < 2;
                    return (
                      <tr key={t.team} className={`${q ? "bg-white/[0.02]" : ""} group transition-colors hover:bg-white/[0.05]`}>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block w-6 h-6 rounded-md leading-6 text-[11px] font-black ${i === 0 ? "bg-orange-500 text-white" : i === 1 ? "bg-white/20 text-white" : "text-gray-600"}`}>{i + 1}</span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <TeamAvatar name={t.team} size="md" />
                            <div className="min-w-0">
                              <div className={`text-sm font-bold truncate ${q ? "text-white" : "text-gray-500"}`}>{t.team}</div>
                              {q && <div className="text-[8px] font-black text-orange-500 uppercase">Qualified</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center font-mono text-xs font-black text-emerald-500 w-10">{t.wins}</td>
                        <td className="px-2 py-3 text-center font-mono text-xs font-black text-rose-500 w-10">{t.losses}</td>
                        <td className={`px-2 py-3 text-center font-mono text-xs font-bold ${t.pf - t.pa > 0 ? "text-emerald-500" : "text-gray-600"}`}>
                          {t.pf - t.pa > 0 ? "+" : ""}{t.pf - t.pa}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-lg text-white">{t.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchesTab({ matches, isAdmin, onEditScore }) {
  const [filterGroup, setFilterGroup] = useState("all");

  const filtered = matches.filter(m => filterGroup === "all" || (filterGroup === "ko" ? m.round > 1 : m.group === filterGroup));
  const byDate = {};
  filtered.forEach(m => {
    const key = MATCH_SCHEDULE[m.id]?.dateLabel || "TBD";
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(m);
  });

  const dateOrder = Array.from(new Set(Object.values(MATCH_SCHEDULE).map(s => s.dateLabel)));
  const sortedDates = Object.keys(byDate).sort((a, b) => dateOrder.indexOf(a) - dateOrder.indexOf(b));

  return (
    <div className="space-y-6 pb-10 animate-scale-in">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        {["all", "A", "B", "C", "D", "ko"].map(f => (
          <button key={f} onClick={() => setFilterGroup(f)}
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all shrink-0 border ${filterGroup === f ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20" : "bg-white/5 border-white/10 text-gray-500"}`}>
            {f === "all" ? "ทั้งหมด" : f === "ko" ? "Knockout" : `Group ${f}`}
          </button>
        ))}
      </div>

      {sortedDates.map(date => (
        <div key={date} className="space-y-3">
          <div className="sticky top-[125px] sm:top-[135px] z-20 flex items-center gap-3 bg-[#050505]/80 backdrop-blur-md py-2">
            <span className="px-3 py-1 bg-white/10 rounded-md text-[10px] font-black text-gray-300 uppercase">{date}</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>
          {byDate[date].map(m => {
            const sched = MATCH_SCHEDULE[m.id] || {};
            const gc = GROUP_COLORS[m.group] || { ring: "border-l-orange-500" };
            const hw = m.played && m.homeScore > m.awayScore;
            const aw = m.played && m.awayScore > m.homeScore;

            return (
              <div key={m.id} className={`bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-lg border-l-4 ${gc.ring}`}>
                <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-600">#{sched.matchNo || m.id}</span>
                    {m.group ? <Badge className={GROUP_COLORS[m.group].badge}>Group {m.group}</Badge> : <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{m.shortLabel}</Badge>}
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase italic tracking-wider">{sched.time} น.</span>
                </div>
                <div className="p-4 grid grid-cols-7 items-center gap-2">
                  <div className="col-span-3 flex flex-col items-center gap-2 text-center">
                    <TeamAvatar name={m.resolvedHome} size="md" />
                    <p className={`text-[11px] font-black uppercase truncate w-full ${m.played && !hw ? "text-gray-600" : "text-white"}`}>{m.resolvedHome}</p>
                  </div>
                  <div className="col-span-1 flex flex-col items-center">
                    {m.played ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          {/* คะแนนฝั่ง Home */}
                          <span className={`text-xl font-black italic leading-none ${hw ? "text-orange-500" : "text-gray-600"}`}>
                            {m.homeScore}
                          </span>

                          <span className="text-gray-800 text-sm">:</span>

                          {/* คะแนนฝั่ง Away */}
                          <span className={`text-xl font-black italic leading-none ${aw ? "text-orange-500" : "text-gray-600"}`}>
                            {m.awayScore}
                          </span>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 scale-75">Final</Badge>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-gray-800 italic uppercase">VS</span>
                    )}
                    {isAdmin && (
                      <button onClick={() => onEditScore(m)} className="mt-2 text-[10px] font-black text-gray-400 border-b border-gray-400/30 pb-0.5">Edit</button>
                    )}
                  </div>
                  <div className="col-span-3 flex flex-col items-center gap-2 text-center">
                    <TeamAvatar name={m.resolvedAway} size="md" />
                    <p className={`text-[11px] font-black uppercase truncate w-full ${m.played && !aw ? "text-gray-600" : "text-white"}`}>{m.resolvedAway}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BracketTab({ resolvedKo, isAdmin, onEditScore, allGroupDone }) {
  const get = id => resolvedKo.find(x => x.id === id);
  const Node = ({ match }) => {
    if (!match) return null;
    const h = match.resolvedHome;
    const a = match.resolvedAway;
    const hw = match.played && match.homeScore > match.awayScore;
    const aw = match.played && match.awayScore > match.homeScore;
    const isFinal = match.shortLabel === "FINAL";

    return (
      <div className={`w-44 shrink-0 rounded-2xl border ${isFinal ? "border-orange-500/40 bg-orange-500/5" : "border-white/5 bg-[#0f0f0f]"} overflow-hidden shadow-xl`}>
        <div className="px-3 py-1.5 flex justify-between bg-black/40 border-b border-white/5 items-center">
          <span className="text-[9px] font-black uppercase text-gray-500">{match.shortLabel}</span>
          {match.played && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow" />}
        </div>
        {[{ n: h, s: match.homeScore, w: hw }, { n: a, s: match.awayScore, w: aw }].map((t, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2 ${t.w ? "bg-white/5" : ""}`}>
            <div className="flex items-center gap-2 min-w-0">
              <TeamAvatar name={t.n} size="xs" />
              <span className={`text-[10px] font-bold truncate ${t.w ? "text-white" : "text-gray-500"}`}>{t.n}</span>
            </div>
            <span className={`text-[11px] font-mono font-black ${t.w ? "text-orange-500" : "text-gray-700"}`}>
              {match.played ? t.s : "—"}
            </span>
          </div>
        ))}
        {isAdmin && (
          <button onClick={() => onEditScore(match)} className="w-full py-1.5 border-t border-white/5 text-[9px] font-black text-gray-500 hover:text-white uppercase transition-colors">Update Score</button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 overflow-hidden animate-scale-in">
      {!allGroupDone && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-black text-orange-500 uppercase animate-pulse">Waiting for Group Stage Completion...</p>
        </div>
      )}

      <div className="overflow-x-auto pb-10 no-scrollbar -mx-4 px-4 cursor-grab active:cursor-grabbing">
        <div className="flex gap-8 items-start min-w-[700px] py-4">
          {/* QF */}
          <div className="flex flex-col gap-6 pt-4">
            <div className="text-[10px] font-black text-gray-600 uppercase text-center mb-2 tracking-widest">Quarter Finals</div>
            <Node match={get(100)} />
            <Node match={get(101)} />
            <Node match={get(102)} />
            <Node match={get(103)} />
          </div>
          {/* SF */}
          <div className="flex flex-col gap-24 pt-16">
            <div className="text-[10px] font-black text-gray-600 uppercase text-center mb-2 tracking-widest">Semi Finals</div>
            <Node match={get(200)} />
            <Node match={get(201)} />
          </div>
          {/* Final */}
          <div className="flex flex-col gap-10 pt-32">
            <div className="text-[10px] font-black text-orange-500 uppercase text-center mb-2 tracking-[0.2em] italic">Championship</div>
            <Node match={get(301)} />
            <div className="mt-4 border-t border-white/5 pt-4">
              <div className="text-[9px] font-black text-gray-600 uppercase text-center mb-2">3rd Place</div>
              <Node match={get(300)} />
            </div>
          </div>
        </div>
      </div>

      {/* Prize Card */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full" />
        <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-4 flex items-center gap-2">
          <span className="text-xl">🏆</span> Prize Pool
        </h4>
        <div className="space-y-3">
          {[
            { r: "🥇 Winner", p: "20,000", c: "text-orange-500" },
            { r: "🥈 1st Runner-up", p: "9,000", c: "text-gray-300" },
            { r: "🥉 2nd Runner-up", p: "6,000", c: "text-orange-800" }
          ].map(p => (
            <div key={p.r} className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-gray-400">{p.r}</span>
              <span className={`font-black text-lg ${p.c}`}>{p.p} <span className="text-[10px]">THB</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("standings");
  const [isAdmin, setIsAdmin] = useState(false);
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [scoreModal, setScoreModal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const dataRef = ref(db, "tournament_data");
    return onValue(dataRef, snap => {
      const data = snap.val();
      if (data) setAppData(data);
      else set(dataRef, { teams: DEFAULT_TEAMS, groupMatches: generateGroupMatches(DEFAULT_TEAMS), koMatches: KO_TEMPLATE });
      setLoading(false);
    });
  }, []);

  const handleSaveScore = (id, h, a, isReset = false) => {
    const path = id < 100 ? "groupMatches" : "koMatches";
    const idx = appData[path].findIndex(m => m.id === id);

    const updates = isReset ? {
      [`tournament_data/${path}/${idx}/homeScore`]: null,
      [`tournament_data/${path}/${idx}/awayScore`]: null,
      [`tournament_data/${path}/${idx}/played`]: false,
    } : {
      [`tournament_data/${path}/${idx}/homeScore`]: h,
      [`tournament_data/${path}/${idx}/awayScore`]: a,
      [`tournament_data/${path}/${idx}/played`]: true,
    };

    update(ref(db), updates).then(() => {
      setToast({
        message: isReset ? "Score Reset! 🔄" : "Score Updated! 🏀",
        type: "success"
      });
      setTimeout(() => setToast(null), 3000);
    });
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black text-orange-500 animate-pulse uppercase tracking-[0.5em] text-xs">Loading...</div>;

  const { teams, groupMatches, koMatches } = appData;
  const standings = computeStandings(teams, groupMatches);
  const { resolved: resolvedKo, allGroupDone } = resolveKoMatches(koMatches, standings, groupMatches);
  const allMatches = [
    ...groupMatches.map(m => ({ ...m, resolvedHome: m.home, resolvedAway: m.away })),
    ...resolvedKo
  ];
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      <style>{`
        @keyframes scale-in { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-scale-in { animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .shadow-glow { box-shadow: 0 0 15px currentColor; }
      `}</style>

      {/* Modern Header */}
      <header className="relative pt-12 pb-10 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-b from-orange-500/20 to-transparent pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-orange-500 blur-[40px] opacity-20" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl border border-white/20">
              <img src="/logo.png" alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain -rotate-12" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-4xl sm:text-7xl font-black italic tracking-tighter uppercase leading-none">
              Bangmod Cup <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-300">#1</span>
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-white/20" />
              <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-[0.5em] italic">Championship 2026</p>
              <div className="h-px w-8 bg-white/20" />
            </div>
          </div>
        </div>
      </header>

      {/* Floating Navigation */}
      <nav className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 flex justify-between">
          {[
            { id: "standings", label: "Table", icon: "📊" },
            { id: "matches", label: "Schedule", icon: "🗓️" },
            { id: "bracket", label: "Bracket", icon: "⚡" }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all relative ${tab === t.id ? "text-orange-500" : "text-gray-500 hover:text-gray-300"}`}>
              <span className="text-lg">{t.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
              {tab === t.id && <div className="absolute bottom-0 w-12 h-1 bg-orange-500 rounded-t-full shadow-glow shadow-orange-500/50" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-2xl mx-auto px-4 pt-8 min-h-[60vh]">
        {tab === "standings" && <StandingsTab standings={standings} />}
        {tab === "matches" && <MatchesTab matches={allMatches} isAdmin={isAdmin} onEditScore={setScoreModal} />}
        {tab === "bracket" && <BracketTab resolvedKo={resolvedKo} isAdmin={isAdmin} onEditScore={setScoreModal} allGroupDone={allGroupDone} />}
      </main>

      {/* Footer / Admin Button */}
      <footer className="max-w-2xl mx-auto px-4 py-12 text-center opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] mb-4">Official Tournament Hub</p>
        <button onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)} className="text-[8px] font-bold uppercase hover:text-white transition-colors">
          {isAdmin ? "Admin Logout" : "ADMIN"}
        </button>
      </footer>

      {/* Modals */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-xs text-center shadow-2xl">
            <h3 className="text-xl font-black mb-6 italic uppercase">Admin Access</h3>
            <input type="password" autoFocus className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center mb-4 focus:border-orange-500 outline-none font-black" placeholder="••••••••"
              onKeyDown={e => { if (e.key === "Enter") { if (checkAdminPassword(e.target.value)) { setIsAdmin(true); setShowAdminLogin(false); } } }} />
            <button onClick={() => setShowAdminLogin(false)} className="text-[10px] font-black uppercase text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setScoreModal(null)}>
          <div className="bg-[#111] border border-white/10 p-6 rounded-[2.5rem] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{scoreModal.label || "Set Score"}</p>
              <h4 className="text-lg font-black italic uppercase">Match Result</h4>
            </div>

            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex-1 flex flex-col items-center gap-2">
                <TeamAvatar name={scoreModal.resolvedHome} size="lg" />
                <span className="text-[10px] font-black uppercase truncate w-20 text-center">{scoreModal.resolvedHome}</span>
                <input type="number" id="hS" defaultValue={scoreModal.homeScore} className="w-16 h-16 bg-black border-2 border-white/10 rounded-2xl text-center text-3xl font-black focus:border-orange-500 outline-none" />
              </div>
              <span className="text-xl font-black text-gray-800">VS</span>
              <div className="flex-1 flex flex-col items-center gap-2">
                <TeamAvatar name={scoreModal.resolvedAway} size="lg" />
                <span className="text-[10px] font-black uppercase truncate w-20 text-center">{scoreModal.resolvedAway}</span>
                <input type="number" id="aS" defaultValue={scoreModal.awayScore} className="w-16 h-16 bg-black border-2 border-white/10 rounded-2xl text-center text-3xl font-black focus:border-orange-500 outline-none" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const h = parseInt(document.getElementById("hS").value);
                  const a = parseInt(document.getElementById("aS").value);
                  handleSaveScore(scoreModal.id, h, a, false);
                  setScoreModal(null);
                }}
                className="w-full py-4 bg-orange-500 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                Save Score
              </button>

              {/* ปุ่ม Reset คะแนน */}
              <button
                onClick={() => {
                  if (window.confirm("ต้องการล้างคะแนนแมตช์นี้ใช่ไหม?")) {
                    handleSaveScore(scoreModal.id, null, null, true);
                    setScoreModal(null);
                  }
                }}
                className="w-full py-3 bg-white/5 hover:bg-rose-500/20 border border-white/5 hover:border-rose-500/30 rounded-2xl font-black text-gray-500 hover:text-rose-500 text-[10px] uppercase tracking-[0.2em] transition-all">
                Reset Match Data
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-white text-black text-[10px] font-black rounded-full shadow-2xl animate-bounce uppercase tracking-widest">
          {toast.message}
        </div>
      )}
    </div>
  );
}