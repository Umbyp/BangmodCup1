import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import { ref, onValue, set, update } from "firebase/database";

// ─── Password ─────────────────────────────────────────────────────────────────
const checkAdminPassword = (input) => {
  const secret = import.meta.env.VITE_ADMIN_PASS || "admin1234";
  return input === secret;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
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
  { id: 200, round: 3, label: "Semi Finals 1",    shortLabel: "SF1",   home: "W-QF1", away: "W-QF2", homeScore: null, awayScore: null, played: false },
  { id: 201, round: 3, label: "Semi Finals 2",    shortLabel: "SF2",   home: "W-QF3", away: "W-QF4", homeScore: null, awayScore: null, played: false },
  { id: 300, round: 4, label: "3rd Place",        shortLabel: "3rd",   home: "L-SF1", away: "L-SF2", homeScore: null, awayScore: null, played: false },
  { id: 301, round: 4, label: "Grand Final",      shortLabel: "FINAL", home: "W-SF1", away: "W-SF2", homeScore: null, awayScore: null, played: false },
];

const MATCH_SCHEDULE = {
  19:{matchNo:1,  dateLabel:"เสาร์ 28 ก.พ.",    time:"13:00"},
  12:{matchNo:2,  dateLabel:"เสาร์ 28 ก.พ.",    time:"14:10"},
  18:{matchNo:3,  dateLabel:"เสาร์ 28 ก.พ.",    time:"15:40"},
   3:{matchNo:4,  dateLabel:"เสาร์ 28 ก.พ.",    time:"16:50"},
   4:{matchNo:5,  dateLabel:"อาทิตย์ 1 มี.ค.",  time:"13:00"},
   7:{matchNo:6,  dateLabel:"อาทิตย์ 1 มี.ค.",  time:"14:10"},
  13:{matchNo:7,  dateLabel:"อาทิตย์ 1 มี.ค.",  time:"15:40"},
  24:{matchNo:8,  dateLabel:"อาทิตย์ 1 มี.ค.",  time:"16:50"},
  20:{matchNo:9,  dateLabel:"อาทิตย์ 15 มี.ค.", time:"13:00"},
   2:{matchNo:10, dateLabel:"อาทิตย์ 15 มี.ค.", time:"14:10"},
  14:{matchNo:11, dateLabel:"อาทิตย์ 15 มี.ค.", time:"15:40"},
   8:{matchNo:12, dateLabel:"อาทิตย์ 15 มี.ค.", time:"16:50"},
  16:{matchNo:13, dateLabel:"เสาร์ 21 มี.ค.",   time:"13:00"},
  23:{matchNo:14, dateLabel:"เสาร์ 21 มี.ค.",   time:"14:10"},
   5:{matchNo:15, dateLabel:"เสาร์ 21 มี.ค.",   time:"15:40"},
   9:{matchNo:16, dateLabel:"เสาร์ 21 มี.ค.",   time:"16:50"},
  10:{matchNo:17, dateLabel:"อาทิตย์ 22 มี.ค.", time:"13:00"},
  21:{matchNo:18, dateLabel:"อาทิตย์ 22 มี.ค.", time:"14:10"},
   1:{matchNo:19, dateLabel:"อาทิตย์ 22 มี.ค.", time:"15:40"},
  17:{matchNo:20, dateLabel:"อาทิตย์ 22 มี.ค.", time:"16:50"},
  22:{matchNo:21, dateLabel:"เสาร์ 28 มี.ค.",   time:"13:00"},
  11:{matchNo:22, dateLabel:"เสาร์ 28 มี.ค.",   time:"14:10"},
   6:{matchNo:23, dateLabel:"เสาร์ 28 มี.ค.",   time:"15:40"},
  15:{matchNo:24, dateLabel:"เสาร์ 28 มี.ค.",   time:"16:50"},
 100:{matchNo:25, dateLabel:"อาทิตย์ 29 มี.ค.", time:"13:00"},
 101:{matchNo:26, dateLabel:"อาทิตย์ 29 มี.ค.", time:"14:10"},
 102:{matchNo:27, dateLabel:"อาทิตย์ 29 มี.ค.", time:"15:40"},
 103:{matchNo:28, dateLabel:"อาทิตย์ 29 มี.ค.", time:"16:50"},
 200:{matchNo:29, dateLabel:"เสาร์ 4 เม.ย.",    time:"16:00"},
 201:{matchNo:30, dateLabel:"เสาร์ 4 เม.ย.",    time:"17:00"},
 300:{matchNo:31, dateLabel:"อาทิตย์ 5 เม.ย.",  time:"16:00"},
 301:{matchNo:32, dateLabel:"อาทิตย์ 5 เม.ย.",  time:"17:00"},
};

const GROUP_COLORS = {
  A: { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",      dot: "bg-amber-400",   ring: "border-l-amber-500",   header: "from-amber-600/15 to-transparent",   icon: "bg-amber-500"   },
  B: { badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",          dot: "bg-blue-400",    ring: "border-l-blue-500",    header: "from-blue-600/15 to-transparent",    icon: "bg-blue-500"    },
  C: { badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400", ring: "border-l-emerald-500", header: "from-emerald-600/15 to-transparent", icon: "bg-emerald-500" },
  D: { badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",    dot: "bg-purple-400",  ring: "border-l-purple-500",  header: "from-purple-600/15 to-transparent",  icon: "bg-purple-500"  },
};

// ─── Standings logic ──────────────────────────────────────────────────────────
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

// ─── UI Helpers ───────────────────────────────────────────────────────────────
const getTeamGradient = name => {
  const g = ["from-orange-500 to-red-700","from-blue-600 to-indigo-900","from-emerald-600 to-teal-900","from-purple-600 to-fuchsia-900","from-amber-500 to-yellow-800","from-rose-600 to-pink-900","from-cyan-600 to-blue-800","from-slate-500 to-slate-800"];
  let h = 0;
  for (let i = 0; i < (name||"").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return g[Math.abs(h) % g.length];
};

function TeamAvatar({ name, size = "md" }) {
  const [err, setErr] = useState(false);
  const gradient = useMemo(() => getTeamGradient(name || "?"), [name]);
  const sz = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-16 h-16 text-xl" };
  return (
    <div className={`${sz[size]} rounded-full flex items-center justify-center font-black text-white shadow border border-white/20 shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}>
      {!err
        ? <img src={`/photo/${(name||"").replace(/\s+/g,"_")}.jpg`} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        : <span style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{(name||"?")[0].toUpperCase()}</span>}
    </div>
  );
}

function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  const s = { success: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400", error: "bg-rose-500/10 border-rose-500/50 text-rose-400", info: "bg-blue-500/10 border-blue-500/50 text-blue-400" };
  return <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full border backdrop-blur-xl text-sm font-bold shadow-2xl animate-slide-up ${s[type]}`}>{message}</div>;
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function AdminLoginModal({ onClose, onSuccess }) {
  const [pw, setPw] = useState("");
  const attempt = () => { if (checkAdminPassword(pw)) { onSuccess(); onClose(); } else setPw(""); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-xs shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-black text-white">ADMIN LOGIN</h3>
        </div>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password" autoFocus
          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-center text-white outline-none focus:border-orange-500 mb-4 placeholder-gray-600" />
        <button onClick={attempt} className="w-full py-3 rounded-lg bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">Login</button>
      </div>
    </div>
  );
}

function ScoreModal({ match, onClose, onSave }) {
  const [h, setH] = useState(match.homeScore ?? "");
  const [a, setA] = useState(match.awayScore ?? "");
  const dHome = match.resolvedHome || match.home;
  const dAway = match.resolvedAway || match.away;
  const handleSave = () => { if (h === "" || a === "") return; onSave(match.id, parseInt(h), parseInt(a)); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-white">✕</button>
        <p className="text-center text-[10px] font-black text-gray-500 uppercase tracking-widest mb-5">{match.label || `Match #${match.id}`}</p>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex flex-col items-center flex-1 gap-2">
            <TeamAvatar name={dHome} size="lg" />
            <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[90px] text-center">{dHome}</p>
            <button onClick={() => { setH(20); setA(0); }} className="text-[9px] font-black text-emerald-500 hover:text-emerald-400">ชนะบาย (20-0)</button>
            <input type="number" value={h} onChange={e => setH(e.target.value)} autoFocus
              className="w-16 h-12 bg-gray-800 border border-gray-700 rounded-lg text-center text-2xl font-black text-white focus:border-orange-500 outline-none tabular-nums" placeholder="-" />
          </div>
          <span className="text-gray-700 text-xl font-black shrink-0">VS</span>
          <div className="flex flex-col items-center flex-1 gap-2">
            <TeamAvatar name={dAway} size="lg" />
            <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[90px] text-center">{dAway}</p>
            <button onClick={() => { setH(0); setA(20); }} className="text-[9px] font-black text-emerald-500 hover:text-emerald-400">ชนะบาย (20-0)</button>
            <input type="number" value={a} onChange={e => setA(e.target.value)}
              className="w-16 h-12 bg-gray-800 border border-gray-700 rounded-lg text-center text-2xl font-black text-white focus:border-orange-500 outline-none tabular-nums" placeholder="-" />
          </div>
        </div>
        <button onClick={handleSave} disabled={h === "" || a === ""}
          className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]">
          Confirm Result
        </button>
      </div>
    </div>
  );
}

function ResetMatchModal({ match, onClose, onConfirm }) {
  const dHome = match.resolvedHome || match.home;
  const dAway = match.resolvedAway || match.away;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-rose-500/30 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="font-black text-white text-sm">Reset ผลแมทช์นี้?</p>
          <p className="text-[11px] text-gray-400 mt-1 font-mono">{dHome} vs {dAway}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-xs font-bold hover:bg-gray-800 transition-colors">ยกเลิก</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-colors">Reset</button>
        </div>
      </div>
    </div>
  );
}

function ResetAllModal({ onClose, onConfirm }) {
  const [confirm, setConfirm] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-rose-500/40 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🚨</div>
          <p className="font-black text-white">Reset คะแนนทั้งหมด?</p>
          <p className="text-[10px] text-orange-400 mt-3 font-bold">พิมพ์ RESET เพื่อยืนยัน</p>
        </div>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="RESET"
          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-center text-white outline-none focus:border-rose-500 text-xs font-mono mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-xs font-bold hover:bg-gray-800 transition-colors">ยกเลิก</button>
          <button onClick={() => { if (confirm === "RESET") { onConfirm(); onClose(); } }} disabled={confirm !== "RESET"}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white text-xs font-black transition-colors">Reset</button>
        </div>
      </div>
    </div>
  );
}

// ─── Standings Tab ────────────────────────────────────────────────────────────
function StandingsTab({ standings }) {
  return (
    <div className="space-y-6">
      {Object.entries(standings).map(([group, teams]) => {
        const gc = GROUP_COLORS[group];
        return (
          <div key={group} className={`border border-gray-800 rounded-3xl overflow-hidden bg-gray-900 border-l-4 ${gc.ring}`}>
            <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r ${gc.header} border-b border-gray-800`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${gc.icon} flex items-center justify-center text-xl font-black text-white`}>{group}</div>
                <div>
                  <h3 className={`font-black text-sm uppercase tracking-widest ${gc.dot.replace("bg-","text-")}`}>Group {group}</h3>
                  <p className="text-[10px] text-gray-500">อันดับ 1-2 ผ่านรอบ</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md border text-[10px] font-bold bg-gray-800 text-gray-400 border-gray-700">
                {Math.floor(teams.reduce((s, t) => s + t.played, 0) / 2)}/{teams.length * (teams.length - 1) / 2} แมทช์
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-950/60 border-b border-gray-800 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-4 py-3 text-left w-10 text-gray-600">#</th>
                    <th className="px-4 py-3 text-left text-gray-600">Team</th>
                    <th className="px-3 py-3 text-center w-10 text-gray-500">P</th>
                    <th className="px-3 py-3 text-center w-10 text-emerald-700">W</th>
                    <th className="px-3 py-3 text-center w-10 text-rose-800">L</th>
                    <th className="px-3 py-3 text-center w-14 text-gray-500">+/-</th>
                    <th className="px-4 py-3 text-center w-16 text-white">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {teams.map((t, i) => {
                    const qualified = i < 2;
                    const diff = t.pf - t.pa;
                    return (
                      <tr key={t.team} className={`group transition-colors ${qualified ? "bg-orange-500/[0.03] hover:bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-4">
                          <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black group-hover:scale-110 transition-transform ${i === 0 ? "bg-yellow-500 text-black" : i === 1 ? "bg-gray-400 text-black" : "bg-gray-800/50 text-gray-600"}`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TeamAvatar name={t.team} size="md" />
                            <div>
                              <div className={`text-sm font-bold ${qualified ? "text-white" : "text-gray-400"}`}>{t.team}</div>
                              {qualified && <span className={`text-[8px] font-black uppercase ${gc.dot.replace("bg-","text-")}`}>Qualified ✓</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center text-sm font-bold text-gray-400 font-mono">{t.played}</td>
                        <td className="px-3 py-4 text-center text-sm font-black font-mono text-emerald-400">{t.wins}</td>
                        <td className="px-3 py-4 text-center text-sm font-bold font-mono text-rose-400">{t.losses}</td>
                        <td className="px-3 py-4 text-center">
                          <span className={`text-sm font-black font-mono ${diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-gray-600"}`}>{diff > 0 ? "+" : ""}{diff}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-xl font-black font-mono ${qualified ? gc.dot.replace("bg-","text-") : "text-gray-600"}`}>{t.pts}</span>
                        </td>
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

// ─── Matches Tab ──────────────────────────────────────────────────────────────
function MatchCard({ m, isAdmin, onEditScore, onResetScore }) {
  const dHome = m.resolvedHome || m.home;
  const dAway = m.resolvedAway || m.away;
  const hw = m.played && m.homeScore > m.awayScore;
  const aw = m.played && m.awayScore > m.homeScore;
  const gc    = m.group ? GROUP_COLORS[m.group] : null;
  const sched = MATCH_SCHEDULE[m.id] || {};

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all border-l-4 ${gc ? gc.ring : "border-l-orange-500/40"}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-950/50 border-b border-gray-800/60 text-[9px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">#{sched.matchNo || m.id}</span>
          {m.group && gc
            ? <span className={`px-2 py-0.5 rounded border font-black uppercase tracking-wider ${gc.badge}`}>กลุ่ม {m.group}</span>
            : m.shortLabel && <span className="px-2 py-0.5 rounded border font-black uppercase bg-orange-500/20 text-orange-400 border-orange-500/30">{m.shortLabel}</span>}
          {m.played
            ? <span className="text-emerald-400 font-bold">✓ จบแล้ว</span>
            : <span className="text-gray-600">รอแข่ง</span>}
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          {sched.dateLabel && <span>{sched.dateLabel}</span>}
          {sched.time && <span className="text-gray-400">{sched.time}</span>}
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* Home */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <TeamAvatar name={dHome} size="md" />
          <div className="min-w-0">
            <p className={`text-xs font-bold truncate ${m.played && !hw ? "text-gray-500" : "text-white"}`}>{dHome}</p>
            {hw && <span className="text-[8px] text-green-400 font-black uppercase">Winner ✓</span>}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center shrink-0 min-w-[68px]">
          {m.played
            ? <div className="flex items-center gap-1 tabular-nums">
                <span className={`text-2xl font-black ${hw ? "text-white" : "text-gray-500"}`}>{m.homeScore}</span>
                <span className="text-gray-700 px-0.5">:</span>
                <span className={`text-2xl font-black ${aw ? "text-white" : "text-gray-500"}`}>{m.awayScore}</span>
              </div>
            : <span className="text-lg font-black tracking-widest text-gray-800">VS</span>}
          {isAdmin && (
            <div className="flex gap-2 mt-1">
              <button onClick={() => onEditScore({ ...m, resolvedHome: dHome, resolvedAway: dAway })}
                className="text-[9px] text-orange-400 hover:text-orange-300 font-bold">{m.played ? "✏️" : "+ คะแนน"}</button>
              {m.played && <button onClick={() => onResetScore({ ...m, resolvedHome: dHome, resolvedAway: dAway })}
                className="text-[9px] text-rose-500 hover:text-rose-400 font-bold">✕</button>}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
          <div className="min-w-0 text-right">
            <p className={`text-xs font-bold truncate ${m.played && !aw ? "text-gray-500" : "text-white"}`}>{dAway}</p>
            {aw && <span className="text-[8px] text-green-400 font-black uppercase">Winner ✓</span>}
          </div>
          <TeamAvatar name={dAway} size="md" />
        </div>
      </div>
    </div>
  );
}

function MatchesTab({ matches, isAdmin, onEditScore, onResetScore }) {
  const [filterGroup,  setFilterGroup]  = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const sorted = [...matches].sort((a, b) => (MATCH_SCHEDULE[a.id]?.matchNo || 999) - (MATCH_SCHEDULE[b.id]?.matchNo || 999));

  const filtered = sorted.filter(m => {
    const gOk = filterGroup === "all" || (filterGroup === "ko" ? m.round > 1 : m.group === filterGroup);
    const sOk = filterStatus === "all" || (filterStatus === "played" ? m.played : !m.played);
    return gOk && sOk;
  });

  const totalPlayed = matches.filter(m => m.played).length;

  // Group by date label
  const byDate = {};
  filtered.forEach(m => {
    const key = MATCH_SCHEDULE[m.id]?.dateLabel || "TBD";
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(m);
  });

  // Preserve date order from schedule
  const dateOrder = [];
  Object.values(MATCH_SCHEDULE).forEach(s => { if (!dateOrder.includes(s.dateLabel)) dateOrder.push(s.dateLabel); });
  const sortedDateKeys = Object.keys(byDate).sort((a, b) => dateOrder.indexOf(a) - dateOrder.indexOf(b));

  const filters = [
    { id: "all", label: "ทั้งหมด" },
    { id: "A",   label: "กลุ่ม A" },
    { id: "B",   label: "กลุ่ม B" },
    { id: "C",   label: "กลุ่ม C" },
    { id: "D",   label: "กลุ่ม D" },
    { id: "ko",  label: "Knockout" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "ทั้งหมด", value: matches.length,                color: "text-white" },
          { label: "จบแล้ว",  value: totalPlayed,                   color: "text-emerald-400" },
          { label: "รอแข่ง",  value: matches.length - totalPlayed,  color: "text-orange-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-xl py-2.5">
            <p className={`text-sm font-black ${color}`}>{value}</p>
            <p className="text-[9px] text-gray-500 uppercase">{label}</p>
          </div>
        ))}
      </div>

      {/* Group filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {filters.map(f => {
          const gc = GROUP_COLORS[f.id];
          const active = filterGroup === f.id;
          return (
            <button key={f.id} onClick={() => setFilterGroup(f.id)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border whitespace-nowrap flex-shrink-0 transition-all ${active ? (gc ? `${gc.badge}` : "bg-orange-500/20 text-orange-400 border-orange-500/30") : "bg-gray-900 text-gray-600 border-gray-800 hover:border-gray-600"}`}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5">
        {[["all","ทั้งหมด","text-white"],["played","จบแล้ว","text-emerald-400"],["pending","รอแข่ง","text-orange-400"]].map(([v,l,tc]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${filterStatus === v ? `bg-gray-800 ${tc} border-gray-700` : "border-transparent text-gray-600 hover:text-gray-400"}`}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="text-center py-12 text-gray-600 text-xs">ไม่พบแมทช์</div>}

      {sortedDateKeys.map(dateKey => {
        const dayMatches = byDate[dateKey];
        const allDone = dayMatches.every(m => m.played);
        return (
          <div key={dateKey} className="space-y-2">
            <div className="flex items-center gap-3 sticky top-[53px] z-20 bg-[#050505]/95 backdrop-blur py-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-black ${allDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-gray-900 border-gray-800 text-gray-400"}`}>
                📅 {dateKey} {allDone && <span className="text-[9px]">✓</span>}
              </div>
              <span className="text-[9px] text-gray-700 font-mono">{dayMatches.filter(m => m.played).length}/{dayMatches.length}</span>
            </div>
            {dayMatches.map(m => <MatchCard key={m.id} m={m} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bracket Tab ──────────────────────────────────────────────────────────────
function BracketNode({ match, isAdmin, onEditScore, onResetScore }) {
  const dHome = match.resolvedHome || match.home;
  const dAway = match.resolvedAway || match.away;
  const hw = match.played && match.homeScore > match.awayScore;
  const aw = match.played && match.homeScore < match.awayScore;
  const isFinal = match.shortLabel === "FINAL";
  const isReady = (dHome !== match.home || dAway !== match.away) && !match.played;

  return (
    <div className={`rounded-xl overflow-hidden border w-44 flex-shrink-0 transition-all bg-gray-900 ${isFinal ? "border-orange-500/50" : "border-gray-800 hover:border-gray-600"}`}>
      <div className={`px-3 py-1.5 flex items-center justify-between border-b ${isFinal ? "border-orange-500/20 bg-orange-950/30" : "border-gray-800 bg-gray-950/40"}`}>
        <span className={`text-[9px] font-black uppercase ${isFinal ? "text-orange-400" : "text-gray-500"}`}>{match.shortLabel}</span>
        {match.played && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
        {isReady && <span className="text-[8px] text-blue-400 font-bold">READY</span>}
      </div>
      {[{ name: dHome, wins: hw, score: match.homeScore }, { name: dAway, wins: aw, score: match.awayScore }].map((team, i) => (
        <div key={i}>
          {i === 1 && <div className="h-px bg-gray-800 mx-2" />}
          <div className={`flex items-center justify-between px-3 py-2 gap-1 ${team.wins ? "bg-orange-500/10" : ""}`}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TeamAvatar name={team.name} size="sm" />
              <span className={`text-[10px] font-bold truncate ${team.wins ? "text-white" : "text-gray-400"}`}>{team.name}</span>
            </div>
            <span className={`text-[11px] font-black font-mono shrink-0 ${team.wins ? "text-orange-400" : "text-gray-600"}`}>
              {match.played ? team.score : "—"}
            </span>
          </div>
        </div>
      ))}
      {isAdmin && (
        <div className="flex border-t border-gray-800/70">
          <button onClick={() => onEditScore({ ...match, resolvedHome: dHome, resolvedAway: dAway })}
            className="flex-1 py-1.5 text-[9px] text-orange-400 hover:bg-orange-500/10 font-bold text-center">
            {match.played ? "✏️" : "+ คะแนน"}
          </button>
          {match.played && (
            <button onClick={() => onResetScore({ ...match, resolvedHome: dHome, resolvedAway: dAway })}
              className="px-3 py-1.5 text-[9px] text-rose-500 hover:bg-rose-500/10 font-bold border-l border-gray-800">✕</button>
          )}
        </div>
      )}
    </div>
  );
}

function BracketTab({ resolvedKo, isAdmin, onEditScore, onResetScore, allGroupDone }) {
  const scrollRef = useRef(null);
  const get = id => resolvedKo.find(x => x.id === id) || { id, home:"TBD", away:"TBD", resolvedHome:"TBD", resolvedAway:"TBD", played:false, homeScore:null, awayScore:null, shortLabel:"?" };

  return (
    <div className="space-y-5">
      {!allGroupDone && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 px-5 py-4 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">รอรอบกลุ่มจบก่อน</p>
            <p className="text-[10px] text-gray-600 mt-0.5">สายจะอัปเดตอัตโนมัติเมื่อทุกแมทช์กลุ่มจบ</p>
          </div>
        </div>
      )}

      <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest text-center animate-pulse">← เลื่อนดูสาย →</p>

      <div ref={scrollRef} className="overflow-x-auto pb-6 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-start gap-8 min-w-[680px] pt-2">

          {/* QF */}
          <div className="flex flex-col gap-4">
            <p className="text-[9px] font-black text-gray-600 uppercase text-center">QF</p>
            <div className="flex flex-col gap-4 relative">
              <BracketNode match={get(100)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
              <div className="absolute right-[-20px] top-[25%] bottom-[25%] w-[20px] border-r border-t border-b border-gray-700 rounded-r-lg" />
              <BracketNode match={get(101)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
            </div>
            <div className="flex flex-col gap-4 relative mt-4">
              <BracketNode match={get(102)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
              <div className="absolute right-[-20px] top-[25%] bottom-[25%] w-[20px] border-r border-t border-b border-gray-700 rounded-r-lg" />
              <BracketNode match={get(103)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
            </div>
          </div>

          {/* SF */}
          <div className="flex flex-col gap-32 mt-16">
            <p className="text-[9px] font-black text-gray-600 uppercase text-center -mt-14 mb-2">SF</p>
            <div className="relative">
              <div className="absolute left-[-20px] top-1/2 w-[20px] border-t border-gray-700" />
              <BracketNode match={get(200)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
              <div className="absolute right-[-20px] top-1/2 h-[120px] w-[20px] border-r border-t border-gray-700 rounded-tr-lg" />
            </div>
            <div className="relative">
              <div className="absolute left-[-20px] top-1/2 w-[20px] border-t border-gray-700" />
              <BracketNode match={get(201)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
              <div className="absolute right-[-20px] bottom-1/2 h-[120px] w-[20px] border-r border-b border-gray-700 rounded-br-lg" />
            </div>
          </div>

          {/* Final */}
          <div className="flex flex-col gap-10 mt-44">
            <p className="text-[9px] font-black text-gray-600 uppercase text-center -mt-14 mb-2">FINAL</p>
            <div className="relative">
              <div className="absolute left-[-20px] top-1/2 w-[20px] border-t border-gray-700" />
              <p className="text-[10px] text-yellow-500 font-black uppercase text-center mb-2 animate-pulse">🏆 Grand Final</p>
              <BracketNode match={get(301)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
            </div>
            <div className="relative opacity-70 mt-4">
              <p className="text-[9px] text-gray-600 uppercase text-center mb-2">3rd Place</p>
              <BracketNode match={get(300)} isAdmin={isAdmin} onEditScore={onEditScore} onResetScore={onResetScore} />
            </div>
          </div>

        </div>
      </div>

      {/* Prize */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4">
        <p className="font-black text-white text-xs mb-3 uppercase tracking-wider">🏆 เงินรางวัล</p>
        {[["🥇 ชนะเลิศ","20,000 บาท","text-yellow-300"],["🥈 รองชนะเลิศ อันดับ 1","9,000 บาท","text-gray-300"],["🥉 รองชนะเลิศ อันดับ 2","6,000 บาท","text-orange-400"]].map(([r,p,c]) => (
          <div key={r} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0">
            <span className="text-xs text-gray-400">{r}</span>
            <span className={`font-black text-sm ${c}`}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,            setTab]            = useState("standings");
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [appData,        setAppData]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showResetAll,   setShowResetAll]   = useState(false);
  const [scoreModal,     setScoreModal]     = useState(null);
  const [resetModal,     setResetModal]     = useState(null);
  const [toast,          setToast]          = useState(null);

  useEffect(() => {
    const dataRef = ref(db, "tournament_data");
    return onValue(dataRef, snap => {
      const data = snap.val();
      if (data) setAppData(data);
      else set(dataRef, { teams: DEFAULT_TEAMS, groupMatches: generateGroupMatches(DEFAULT_TEAMS), koMatches: KO_TEMPLATE });
      setLoading(false);
    });
  }, []);

  const handleSaveScore = (id, h, a) => {
    const path = id < 100 ? "groupMatches" : "koMatches";
    const idx  = appData[path].findIndex(m => m.id === id);
    update(ref(db), {
      [`tournament_data/${path}/${idx}/homeScore`]: h,
      [`tournament_data/${path}/${idx}/awayScore`]: a,
      [`tournament_data/${path}/${idx}/played`]:    true,
    }).then(() => setToast({ message: "✅ บันทึกผลแล้ว", type: "success" }));
  };

  const handleResetMatch = (id) => {
    const path = id < 100 ? "groupMatches" : "koMatches";
    const idx  = appData[path].findIndex(m => m.id === id);
    update(ref(db), {
      [`tournament_data/${path}/${idx}/homeScore`]: null,
      [`tournament_data/${path}/${idx}/awayScore`]: null,
      [`tournament_data/${path}/${idx}/played`]:    false,
    }).then(() => setToast({ message: "🗑️ Reset แมทช์แล้ว", type: "info" }));
  };

  const handleResetAll = () => {
    set(ref(db, "tournament_data"), {
      teams: appData.teams || DEFAULT_TEAMS,
      groupMatches: generateGroupMatches(appData.teams || DEFAULT_TEAMS),
      koMatches: KO_TEMPLATE,
    }).then(() => setToast({ message: "🚨 Reset ทั้งหมดแล้ว", type: "error" }));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <p className="text-gray-600 text-xs font-mono animate-pulse">กำลังโหลด...</p>
    </div>
  );

  const { teams, groupMatches, koMatches } = appData;
  const standings = computeStandings(teams, groupMatches);
  const { resolved: resolvedKo, allGroupDone } = resolveKoMatches(koMatches, standings, groupMatches);
  const allMatches = [
    ...groupMatches.map(m => ({ ...m, resolvedHome: m.home, resolvedAway: m.away })),
    ...resolvedKo,
  ];

  const tabs = [
    { id: "standings", icon: "📊", label: "ตาราง" },
    { id: "matches",   icon: "📅", label: "แมทช์" },
    { id: "bracket",   icon: "⚡", label: "สาย", notify: allGroupDone },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
      <style>{`
        @keyframes scale-in { from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slide-up  { from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards }
        .animate-slide-up  { animation: slide-up 0.25s ease-out forwards }
      `}</style>

      {/* Header */}
      <header className="px-4 pt-10 pb-5 text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-white/10" onError={e => e.target.style.display="none"} />
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter">
            BANGMOD CUP #1 <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">2026</span>
          </h1>
        </div>
        <p className="text-gray-600 text-xs uppercase tracking-widest mt-1">Official Basketball Championship</p>

        {/* Admin bar */}
        {isAdmin && (
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md border text-[10px] font-bold bg-purple-500/10 text-purple-400 border-purple-500/20">Admin Mode</span>
            <button onClick={() => setShowResetAll(true)} className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black hover:bg-rose-500/20">🚨 Reset ทั้งหมด</button>
            <button onClick={() => setIsAdmin(false)} className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-[10px] font-bold hover:bg-gray-700">Logout</button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 mb-6">
        <div className="max-w-2xl mx-auto px-4 flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-xs font-bold tracking-widest uppercase transition-all relative ${tab === t.id ? "text-orange-400" : "text-gray-500 hover:text-gray-300"}`}>
              {tab === t.id && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
              <span className={`text-lg relative ${tab === t.id ? "scale-110" : ""} transition-transform`}>
                {t.icon}
                {t.notify && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              </span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4">
        {tab === "standings" && <StandingsTab standings={standings} />}
        {tab === "matches"   && <MatchesTab   matches={allMatches} isAdmin={isAdmin} onEditScore={setScoreModal} onResetScore={setResetModal} />}
        {tab === "bracket"   && <BracketTab   resolvedKo={resolvedKo} isAdmin={isAdmin} onEditScore={setScoreModal} onResetScore={setResetModal} allGroupDone={allGroupDone} />}
      </main>

      {/* Admin toggle */}
      <footer className="text-center py-10">
        <button
          onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)}
          className={`text-[9px] font-bold uppercase tracking-widest transition-all ${isAdmin ? "text-red-500" : "text-gray-800 opacity-20 hover:opacity-100 hover:text-white"}`}>
          {isAdmin ? "Logout" : "Admin"}
        </button>
      </footer>

      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} onSuccess={() => { setIsAdmin(true); setToast({ message: "🔓 Welcome Admin", type: "success" }); }} />}
      {showResetAll   && <ResetAllModal  onClose={() => setShowResetAll(false)} onConfirm={handleResetAll} />}
      {scoreModal     && <ScoreModal     match={scoreModal} onClose={() => setScoreModal(null)} onSave={handleSaveScore} />}
      {resetModal     && <ResetMatchModal match={resetModal} onClose={() => setResetModal(null)} onConfirm={() => handleResetMatch(resetModal.id)} />}
      {toast          && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}