import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from "recharts";

// ─── CSV Parsers ───────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function parsePostsCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 4) return [];
  const headers = parseCSVLine(lines[2]);
  const idx = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  const colMap = {
    title: idx("post title"),
    link: idx("post link"),
    type: idx("post type"),
    campaign: idx("campaign name"),
    postedBy: idx("posted by"),
    date: idx("created date"),
    audience: idx("audience"),
    impressions: idx("impressions"),
    views: idx("views"),
    clicks: idx("clicks"),
    ctr: idx("click through"),
    likes: idx("likes"),
    comments: idx("comments"),
    reposts: idx("reposts"),
    follows: idx("follows"),
    engRate: idx("engagement rate"),
    contentType: idx("content type"),
  };

  return lines.slice(3).map((line, i) => {
    const cols = parseCSVLine(line);
    if (!cols[colMap.title] || cols[colMap.title].length < 3) return null;
    const date = cols[colMap.date] || "";
    return {
      id: i,
      title: cols[colMap.title] || "",
      link: cols[colMap.link] || "",
      type: cols[colMap.type] || "Organic",
      campaign: cols[colMap.campaign] || "",
      postedBy: cols[colMap.postedBy] || "",
      date,
      month: date ? date.slice(0, 2) + "/" + date.slice(6) : "",
      audience: cols[colMap.audience] || "",
      impressions: parseFloat(cols[colMap.impressions]) || 0,
      views: parseFloat(cols[colMap.views]) || 0,
      clicks: parseFloat(cols[colMap.clicks]) || 0,
      ctr: parseFloat(cols[colMap.ctr]) || 0,
      likes: parseFloat(cols[colMap.likes]) || 0,
      comments: parseFloat(cols[colMap.comments]) || 0,
      reposts: parseFloat(cols[colMap.reposts]) || 0,
      follows: parseFloat(cols[colMap.follows]) || 0,
      engRate: parseFloat(cols[colMap.engRate]) || 0,
      contentType: cols[colMap.contentType] || "",
      tag: null,
    };
  }).filter(Boolean);
}

function parseMetricsCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 4) return [];
  const headers = parseCSVLine(lines[2]);
  const idx = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  return lines.slice(3).map(line => {
    const cols = parseCSVLine(line);
    if (!cols[0]) return null;
    return {
      date: cols[0],
      impressionsOrganic: parseFloat(cols[idx("organic")]) || 0,
      impressionsSponsored: parseFloat(cols[idx("sponsored")]) || 0,
      impressionsTotal: parseFloat(cols[idx("total")]) || 0,
      clicksOrganic: parseFloat(cols[5]) || 0,
      clicksSponsored: parseFloat(cols[6]) || 0,
      clicksTotal: parseFloat(cols[7]) || 0,
      reactionsOrganic: parseFloat(cols[8]) || 0,
      reactionsSponsored: parseFloat(cols[9]) || 0,
      reactionsTotal: parseFloat(cols[10]) || 0,
      commentsOrganic: parseFloat(cols[11]) || 0,
      commentsTotal: parseFloat(cols[13]) || 0,
      repostsOrganic: parseFloat(cols[14]) || 0,
      repostsTotal: parseFloat(cols[16]) || 0,
      engRateOrganic: parseFloat(cols[17]) || 0,
      engRateSponsored: parseFloat(cols[18]) || 0,
      engRateTotal: parseFloat(cols[19]) || 0,
    };
  }).filter(Boolean);
}

// ─── Sample data for demo ─────────────────────────────────────────────────────
const DEMO_POSTS = [
  { id:0, title:"🗞️ Here's the latest edition of the Posit AI newsletter — your biweekly roundup of AI news from Posit and beyond. Includes: llama.cpp team joining Hugging Face, cloud-hosted vs local models, and more.", link:"https://linkedin.com/feed", type:"Organic", postedBy:"Isabella Velásquez", date:"02/27/2026", month:"02/2026", impressions:3365, clicks:132, likes:15, comments:0, reposts:1, engRate:0.044, contentType:"", tag:null },
  { id:1, title:"We often hear from teams looking for a smoother path from open-source theory to real-world clinical practice. Explore the Pharmaverse Examples site — a hands-on guide for orchestrating {admiral}, {sdtm.oak}, and {gtsummary} into reproducible pipelines.", link:"https://linkedin.com/feed", type:"Organic", postedBy:"Tyler Minear", date:"02/27/2026", month:"02/2026", impressions:4449, clicks:113, likes:40, comments:3, reposts:7, engRate:0.037, contentType:"Article", tag:null },
  { id:2, title:"posit::conf(2026) speakers have arrived! We're bringing together Wes McKinney, Christine Y. Zhang (NYT Graphics), Emily Riederer, and more. Register now — early bird ends soon.", link:"https://linkedin.com/feed", type:"Organic", postedBy:"Posit Page", date:"02/25/2026", month:"02/2026", impressions:12800, clicks:640, likes:198, comments:22, reposts:45, engRate:0.108, contentType:"", tag:null },
  { id:3, title:"Posit Connect makes it easy to deploy Shiny apps, R Markdown reports, Jupyter notebooks, and more — all in one secure enterprise platform. See how data science teams scale with Connect.", link:"https://linkedin.com/feed", type:"Sponsored", postedBy:"Posit Page", date:"02/20/2026", month:"02/2026", impressions:18500, clicks:742, likes:52, comments:7, reposts:12, engRate:0.035, contentType:"", tag:null },
  { id:4, title:"R 4.4 ships with improvements to the base pipe operator. Here's a quick breakdown of what changed and why it matters for your workflows. Full breakdown on the Posit blog.", link:"https://linkedin.com/feed", type:"Organic", postedBy:"Isabella Velásquez", date:"02/15/2026", month:"02/2026", impressions:9870, clicks:520, likes:143, comments:18, reposts:29, engRate:0.089, contentType:"", tag:null },
  { id:5, title:"Quarto 1.5 is here 🎉 New: improved typst rendering, better cross-reference support, live preview enhancements. Quarto is free and open-source — check out what's new!", link:"https://linkedin.com/feed", type:"Organic", postedBy:"Mine Çetinkaya-Rundel", date:"02/05/2026", month:"02/2026", impressions:14300, clicks:680, likes:267, comments:31, reposts:58, engRate:0.124, contentType:"", tag:null },
  { id:6, title:"Posit Workbench gives enterprise data science teams a centralized, secure environment for R, Python, and more. Access controls, audit logs, and governance built in.", link:"https://linkedin.com/feed", type:"Sponsored", postedBy:"Posit Page", date:"01/28/2026", month:"01/2026", impressions:22100, clicks:890, likes:41, comments:5, reposts:8, engRate:0.031, contentType:"", tag:null },
  { id:7, title:"tidymodels just got better. The new {stacks} release supports blending predictions from dozens of candidate models. Open-source, extensible, and fully integrated with the tidyverse.", link:"https://linkedin.com/feed", type:"Organic", postedBy:"Max Kuhn", date:"01/20/2026", month:"01/2026", impressions:8900, clicks:410, likes:189, comments:24, reposts:41, engRate:0.097, contentType:"", tag:null },
];

const DEMO_METRICS = Array.from({length: 60}, (_, i) => {
  const d = new Date(2026, 0, i + 1);
  const org = Math.round(3000 + Math.random() * 15000 + Math.sin(i/7) * 3000);
  const spon = Math.round(50000 + Math.random() * 80000 + Math.cos(i/5) * 10000);
  return {
    date: `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`,
    impressionsOrganic: org, impressionsSponsored: spon, impressionsTotal: org + spon,
    clicksOrganic: Math.round(org * 0.05), clicksTotal: Math.round((org+spon)*0.012),
    reactionsOrganic: Math.round(org * 0.04), reactionsTotal: Math.round((org+spon)*0.008),
    commentsOrganic: Math.round(org * 0.003), commentsTotal: Math.round((org+spon)*0.001),
    repostsOrganic: Math.round(org * 0.008), repostsTotal: Math.round((org+spon)*0.002),
    engRateOrganic: 0.04 + Math.random()*0.06, engRateSponsored: 0.006+Math.random()*0.01, engRateTotal: 0.01+Math.random()*0.02,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"k" : String(Math.round(n));
const pct = n => (n*100).toFixed(1)+"%";
const sum = (arr, k) => arr.reduce((a,x) => a+(x[k]||0), 0);
const avg = (arr, k) => arr.length ? sum(arr,k)/arr.length : 0;

const TAG_META = {
  "open-source": { label:"Open Source", color:"#10b981", bg:"#d1fae5", text:"#065f46", border:"#6ee7b7" },
  "enterprise":  { label:"Enterprise",  color:"#3b82f6", bg:"#dbeafe", text:"#1e40af", border:"#93c5fd" },
  "both":        { label:"Both",        color:"#8b5cf6", bg:"#ede9fe", text:"#4c1d95", border:"#c4b5fd" },
};

// ─── Components ───────────────────────────────────────────────────────────────
function Tag({ tag, size = "sm" }) {
  if (!tag) return <span style={{fontSize:size==="sm"?11:13,padding:"2px 8px",borderRadius:99,background:"#f3f4f6",color:"#9ca3af",border:"1px solid #e5e7eb",fontWeight:600,letterSpacing:"0.02em"}}>Untagged</span>;
  const m = TAG_META[tag];
  return <span style={{fontSize:size==="sm"?11:13,padding:"2px 8px",borderRadius:99,background:m.bg,color:m.text,border:`1px solid ${m.border}`,fontWeight:700,letterSpacing:"0.02em"}}>{m.label}</span>;
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"16px 20px",display:"flex",flexDirection:"column",gap:4}}>
      <div style={{fontSize:24,fontWeight:800,color:accent||"#111827",fontFamily:"'DM Serif Display',serif"}}>{value}</div>
      <div style={{fontSize:13,fontWeight:600,color:"#374151"}}>{label}</div>
      {sub && <div style={{fontSize:11,color:"#9ca3af"}}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:"#1f2937",border:"none",borderRadius:8,padding:"10px 14px",color:"#f9fafb",fontSize:12}}>
      <div style={{fontWeight:700,marginBottom:4,color:"#e5e7eb"}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginTop:2}}>
          <span style={{width:8,height:8,borderRadius:2,background:p.color,display:"inline-block"}}></span>
          <span style={{color:"#d1d5db"}}>{p.name}:</span>
          <span style={{fontWeight:700}}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [posts, setPosts] = useState(DEMO_POSTS);
  const [metrics, setMetrics] = useState(DEMO_METRICS);
  const [isDemo, setIsDemo] = useState(true);
  const [tab, setTab] = useState("overview");
  const [tagFilter, setTagFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedPost, setExpandedPost] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [metricsView, setMetricsView] = useState("impressions");

  const postsFileRef = useRef();
  const metricsFileRef = useRef();

  const handlePostsFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const parsed = parsePostsCSV(ev.target.result);
      if (parsed.length) { setPosts(parsed); setIsDemo(false); }
    };
    r.readAsText(file);
  };

  const handleMetricsFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      const parsed = parseMetricsCSV(ev.target.result);
      if (parsed.length) setMetrics(parsed);
    };
    r.readAsText(file);
  };

  const setTag = useCallback((id, tag) => {
    setPosts(prev => prev.map(p => p.id === id ? {...p, tag} : p));
    setExpandedPost(null);
  }, []);

  const exportCSV = () => {
    const cols = ["id","date","postedBy","type","impressions","clicks","likes","comments","reposts","engRate","contentType","tag","title","link"];
    const escape = v => typeof v === "string" && (v.includes(",") || v.includes('"') || v.includes("\n")) ? `"${v.replace(/"/g,'""')}"` : (v ?? "");
    const rows = posts.map(p => cols.map(c => escape(p[c])).join(","));
    const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], {type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "posit_linkedin_tagged.csv"; a.click();
  };

  // Derived data
  const taggedPosts = useMemo(() => posts.filter(p => p.tag), [posts]);

  const filteredPosts = useMemo(() => {
    let p = posts;
    if (tagFilter !== "all") p = p.filter(x => tagFilter === "untagged" ? !x.tag : x.tag === tagFilter);
    if (typeFilter !== "all") p = p.filter(x => x.type === typeFilter);
    if (search) p = p.filter(x => x.title.toLowerCase().includes(search.toLowerCase()) || x.postedBy.toLowerCase().includes(search.toLowerCase()));
    return [...p].sort((a,b) => {
      if (sortBy === "impressions") return b.impressions - a.impressions;
      if (sortBy === "engRate") return b.engRate - a.engRate;
      if (sortBy === "likes") return b.likes - a.likes;
      return b.id - a.id; // date
    });
  }, [posts, tagFilter, typeFilter, search, sortBy]);

  // Chart data: weekly aggregated metrics
  const weeklyMetrics = useMemo(() => {
    const weeks = {};
    metrics.forEach(m => {
      const [mo,,yr] = m.date.split("/");
      const key = `${yr}-${mo}`;
      if (!weeks[key]) weeks[key] = {label:`${mo}/${yr}`, imp:0, impOrg:0, impSpon:0, eng:[], clicks:0};
      weeks[key].imp += m.impressionsTotal;
      weeks[key].impOrg += m.impressionsOrganic;
      weeks[key].impSpon += m.impressionsSponsored;
      weeks[key].eng.push(m.engRateOrganic);
      weeks[key].clicks += m.clicksTotal;
    });
    return Object.values(weeks).map(w => ({
      label: w.label,
      "Total Impressions": w.imp,
      "Organic": w.impOrg,
      "Sponsored": w.impSpon,
      "Avg Eng Rate": avg(w.eng.map(v=>({v})),"v"),
      "Clicks": w.clicks,
    })).slice(-12);
  }, [metrics]);

  // Tag comparison
  const tagStats = useMemo(() => {
    const res = {};
    Object.keys(TAG_META).forEach(t => {
      const p = posts.filter(x => x.tag === t);
      res[t] = { count: p.length, impressions: sum(p,"impressions"), likes: sum(p,"likes"), comments: sum(p,"comments"), reposts: sum(p,"reposts"), engRate: avg(p,"engRate"), clicks: sum(p,"clicks") };
    });
    return res;
  }, [posts]);

  // Top posters
  const topPosters = useMemo(() => {
    const map = {};
    posts.forEach(p => {
      if (!p.postedBy) return;
      if (!map[p.postedBy]) map[p.postedBy] = {name:p.postedBy, count:0, impressions:0, engRate:[]};
      map[p.postedBy].count++;
      map[p.postedBy].impressions += p.impressions;
      map[p.postedBy].engRate.push(p.engRate);
    });
    return Object.values(map).map(x => ({...x, avgEng: avg(x.engRate.map(v=>({v})),"v")})).sort((a,b)=>b.impressions-a.impressions).slice(0,6);
  }, [posts]);

  const TABS = [
    {id:"overview", label:"Overview"},
    {id:"trends", label:"Daily Trends"},
    {id:"posts", label:"Tag Posts"},
    {id:"compare", label:"Tag Analysis"},
  ];

  const globalStats = {
    totalImpressions: sum(metrics, "impressionsTotal"),
    organicImpressions: sum(metrics, "impressionsOrganic"),
    totalPosts: posts.length,
    tagged: taggedPosts.length,
    avgEngOrganic: avg(metrics, "engRateOrganic"),
    totalClicks: sum(metrics, "clicksTotal"),
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#f8f9fb",minHeight:"100vh",color:"#111827"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .post-card:hover { border-color: #93c5fd !important; box-shadow: 0 2px 12px rgba(59,130,246,0.08); }
        .tag-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .tab-btn { transition: all 0.15s; }
      `}</style>

      {/* Top bar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#0a66c2",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2" fill="white"/></svg>
          </div>
          <div>
            <span style={{fontWeight:700,fontSize:15,color:"#111827"}}>Posit LinkedIn Analytics</span>
            {isDemo && <span style={{fontSize:10,background:"#fef3c7",color:"#92400e",padding:"2px 6px",borderRadius:4,marginLeft:8,fontWeight:600}}>DEMO DATA</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <label style={{cursor:"pointer"}}>
            <input type="file" accept=".csv" ref={postsFileRef} style={{display:"none"}} onChange={handlePostsFile}/>
            <span style={{fontSize:12,padding:"6px 12px",borderRadius:7,border:"1px solid #e5e7eb",background:"#f9fafb",color:"#374151",cursor:"pointer",fontWeight:500}}>📋 Load Posts CSV</span>
          </label>
          <label style={{cursor:"pointer"}}>
            <input type="file" accept=".csv" ref={metricsFileRef} style={{display:"none"}} onChange={handleMetricsFile}/>
            <span style={{fontSize:12,padding:"6px 12px",borderRadius:7,border:"1px solid #e5e7eb",background:"#f9fafb",color:"#374151",cursor:"pointer",fontWeight:500}}>📈 Load Metrics CSV</span>
          </label>
          <button onClick={exportCSV} style={{fontSize:12,padding:"6px 14px",borderRadius:7,background:"#0a66c2",color:"#fff",border:"none",cursor:"pointer",fontWeight:600}}>↓ Export Tagged</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 24px",display:"flex",gap:0}}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
            style={{padding:"12px 18px",fontSize:13,fontWeight:600,border:"none",borderBottom:`2px solid ${tab===t.id?"#0a66c2":"transparent"}`,color:tab===t.id?"#0a66c2":"#6b7280",background:"transparent",cursor:"pointer"}}>
            {t.label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,paddingBottom:4}}>
          <span style={{fontSize:11,color:"#9ca3af"}}>
            {globalStats.tagged}/{globalStats.totalPosts} posts tagged
          </span>
          <div style={{width:100,height:5,borderRadius:99,background:"#f3f4f6",overflow:"hidden"}}>
            <div style={{width:`${globalStats.totalPosts ? (globalStats.tagged/globalStats.totalPosts*100) : 0}%`,height:"100%",background:"#0a66c2",borderRadius:99,transition:"width 0.4s"}}></div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px"}}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
              <KpiCard label="Total Impressions" value={fmt(globalStats.totalImpressions)} sub="Organic + Sponsored" accent="#111827"/>
              <KpiCard label="Organic Impressions" value={fmt(globalStats.organicImpressions)} sub={`${pct(globalStats.organicImpressions/Math.max(globalStats.totalImpressions,1))} of total`} accent="#0a66c2"/>
              <KpiCard label="Avg Organic Eng Rate" value={pct(globalStats.avgEngOrganic)} sub="Last 12 months" accent="#10b981"/>
              <KpiCard label="Total Posts" value={fmt(globalStats.totalPosts)} sub={`${globalStats.tagged} tagged`} accent="#8b5cf6"/>
            </div>

            {/* Impressions chart */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15}}>Monthly Impressions</div>
                <div style={{display:"flex",gap:6}}>
                  {["impressions","engagement","clicks"].map(v=>(
                    <button key={v} onClick={()=>setMetricsView(v)}
                      style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #e5e7eb",background:metricsView===v?"#0a66c2":"#f9fafb",color:metricsView===v?"#fff":"#6b7280",cursor:"pointer",fontWeight:600,textTransform:"capitalize"}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                {metricsView === "impressions" ? (
                  <AreaChart data={weeklyMetrics}>
                    <defs>
                      <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a66c2" stopOpacity={0.3}/><stop offset="100%" stopColor="#0a66c2" stopOpacity={0}/></linearGradient>
                      <linearGradient id="sponGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:"#9ca3af"}}/>
                    <YAxis tickFormatter={fmt} tick={{fontSize:10,fill:"#9ca3af"}}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
                    <Area type="monotone" dataKey="Organic" stroke="#0a66c2" fill="url(#orgGrad)" strokeWidth={2}/>
                    <Area type="monotone" dataKey="Sponsored" stroke="#f59e0b" fill="url(#sponGrad)" strokeWidth={2}/>
                  </AreaChart>
                ) : metricsView === "engagement" ? (
                  <LineChart data={weeklyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:"#9ca3af"}}/>
                    <YAxis tickFormatter={v=>(v*100).toFixed(1)+"%"} tick={{fontSize:10,fill:"#9ca3af"}}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Line type="monotone" dataKey="Avg Eng Rate" stroke="#10b981" strokeWidth={2} dot={false}/>
                  </LineChart>
                ) : (
                  <BarChart data={weeklyMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:"#9ca3af"}}/>
                    <YAxis tickFormatter={fmt} tick={{fontSize:10,fill:"#9ca3af"}}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="Clicks" fill="#8b5cf6" radius={[3,3,0,0]}/>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Top posters */}
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Top Authors by Impressions</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {topPosters.map(p => (
                  <div key={p.name} style={{border:"1px solid #f3f4f6",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontWeight:600,fontSize:13,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                    <div style={{display:"flex",gap:12,fontSize:12,color:"#6b7280"}}>
                      <span>{p.count} posts</span>
                      <span style={{fontWeight:700,color:"#0a66c2"}}>{fmt(p.impressions)} impr.</span>
                      <span style={{color:"#10b981"}}>{pct(p.avgEng)} eng</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TRENDS ── */}
        {tab === "trends" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Daily Organic vs Sponsored Impressions</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={metrics.slice(-90).map(m=>({date:m.date, Organic:m.impressionsOrganic, Sponsored:m.impressionsSponsored}))}>
                  <defs>
                    <linearGradient id="og2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a66c2" stopOpacity={0.4}/><stop offset="100%" stopColor="#0a66c2" stopOpacity={0}/></linearGradient>
                    <linearGradient id="sp2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="date" tick={{fontSize:9,fill:"#9ca3af"}} interval={6}/>
                  <YAxis tickFormatter={fmt} tick={{fontSize:10,fill:"#9ca3af"}}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="Organic" stroke="#0a66c2" fill="url(#og2)" strokeWidth={1.5}/>
                  <Area type="monotone" dataKey="Sponsored" stroke="#f59e0b" fill="url(#sp2)" strokeWidth={1.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Organic Engagement Rate (Daily)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={metrics.slice(-90).map(m=>({date:m.date, "Eng Rate":m.engRateOrganic}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                    <XAxis dataKey="date" tick={{fontSize:9,fill:"#9ca3af"}} interval={9}/>
                    <YAxis tickFormatter={v=>pct(v)} tick={{fontSize:9,fill:"#9ca3af"}}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Line type="monotone" dataKey="Eng Rate" stroke="#10b981" strokeWidth={1.5} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Daily Reactions + Comments + Reposts</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={metrics.slice(-60).map(m=>({date:m.date, Reactions:m.reactionsOrganic, Comments:m.commentsOrganic, Reposts:m.repostsOrganic}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                    <XAxis dataKey="date" tick={{fontSize:9,fill:"#9ca3af"}} interval={6}/>
                    <YAxis tick={{fontSize:9,fill:"#9ca3af"}}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="Reactions" stackId="a" fill="#0a66c2" radius={0}/>
                    <Bar dataKey="Comments" stackId="a" fill="#10b981" radius={0}/>
                    <Bar dataKey="Reposts" stackId="a" fill="#8b5cf6" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── TAG POSTS ── */}
        {tab === "posts" && (
          <div>
            {/* Filters */}
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search posts or authors..."
                style={{flex:1,minWidth:200,padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,outline:"none"}}/>
              <select value={tagFilter} onChange={e=>setTagFilter(e.target.value)}
                style={{padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,color:"#374151",outline:"none",background:"#fff"}}>
                <option value="all">All Tags</option>
                <option value="untagged">Untagged</option>
                <option value="open-source">Open Source</option>
                <option value="enterprise">Enterprise</option>
                <option value="both">Both</option>
              </select>
              <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
                style={{padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,color:"#374151",outline:"none",background:"#fff"}}>
                <option value="all">Organic + Sponsored</option>
                <option value="Organic">Organic Only</option>
                <option value="Sponsored">Sponsored Only</option>
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{padding:"8px 10px",borderRadius:8,border:"1px solid #e5e7eb",fontSize:13,color:"#374151",outline:"none",background:"#fff"}}>
                <option value="date">Sort: Newest</option>
                <option value="impressions">Sort: Impressions</option>
                <option value="engRate">Sort: Engagement</option>
                <option value="likes">Sort: Likes</option>
              </select>
              <span style={{fontSize:12,color:"#9ca3af"}}>{filteredPosts.length} posts</span>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filteredPosts.slice(0,100).map(post => (
                <div key={post.id} className="post-card"
                  style={{background:"#fff",borderRadius:10,border:`1px solid ${expandedPost===post.id?"#93c5fd":"#e5e7eb"}`,overflow:"hidden",transition:"all 0.15s",cursor:"pointer"}}
                  onClick={()=>setExpandedPost(expandedPost===post.id ? null : post.id)}>
                  <div style={{padding:"12px 16px",display:"flex",alignItems:"flex-start",gap:14}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                        <Tag tag={post.tag}/>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{post.date}</span>
                        <span style={{fontSize:11,color:"#9ca3af"}}>·</span>
                        <span style={{fontSize:11,color:"#6b7280",fontWeight:500}}>{post.postedBy}</span>
                        {post.type === "Sponsored" && <span style={{fontSize:10,background:"#fef3c7",color:"#92400e",padding:"1px 6px",borderRadius:4,fontWeight:700}}>SPONSORED</span>}
                        {post.contentType && <span style={{fontSize:10,background:"#f3f4f6",color:"#6b7280",padding:"1px 6px",borderRadius:4}}>{post.contentType}</span>}
                      </div>
                      <p style={{fontSize:13,color:"#374151",lineHeight:1.5,margin:0,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                        {post.title}
                      </p>
                    </div>
                    <div style={{display:"flex",gap:16,flexShrink:0}}>
                      {[["Impressions",fmt(post.impressions)],["Eng Rate",pct(post.engRate)],["Likes",post.likes],["Clicks",post.clicks]].map(([l,v])=>(
                        <div key={l} style={{textAlign:"right"}}>
                          <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{v}</div>
                          <div style={{fontSize:10,color:"#9ca3af"}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {expandedPost === post.id && (
                    <div style={{borderTop:"1px solid #f3f4f6",padding:"12px 16px",background:"#fafafa"}}>
                      <p style={{fontSize:12,color:"#6b7280",marginBottom:12,lineHeight:1.6}}>{post.title}</p>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#374151",marginRight:4}}>Tag as:</span>
                        {Object.entries(TAG_META).map(([k,m]) => (
                          <button key={k} className="tag-btn" onClick={e=>{e.stopPropagation();setTag(post.id,k)}}
                            style={{padding:"6px 14px",borderRadius:8,border:`2px solid ${post.tag===k?m.color:"#e5e7eb"}`,background:post.tag===k?m.bg:"#fff",color:post.tag===k?m.text:"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>
                            {m.label}
                          </button>
                        ))}
                        {post.tag && (
                          <button className="tag-btn" onClick={e=>{e.stopPropagation();setTag(post.id,null)}}
                            style={{padding:"6px 12px",borderRadius:8,border:"2px solid #fecaca",background:"#fff",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                            Clear
                          </button>
                        )}
                        {post.link && (
                          <a href={post.link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                            style={{marginLeft:"auto",fontSize:11,color:"#0a66c2",textDecoration:"none",fontWeight:600}}>
                            View on LinkedIn ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredPosts.length > 100 && <div style={{textAlign:"center",fontSize:12,color:"#9ca3af",padding:12}}>Showing 100 of {filteredPosts.length} posts. Use filters to narrow results.</div>}
              {filteredPosts.length === 0 && <div style={{textAlign:"center",padding:48,color:"#9ca3af",fontSize:14}}>No posts match your filters.</div>}
            </div>
          </div>
        )}

        {/* ── TAG ANALYSIS ── */}
        {tab === "compare" && (
          <div>
            {taggedPosts.length === 0 ? (
              <div style={{textAlign:"center",padding:80,color:"#9ca3af"}}>
                <div style={{fontSize:48,marginBottom:12}}>🏷️</div>
                <div style={{fontSize:18,fontWeight:600,color:"#6b7280"}}>No posts tagged yet</div>
                <div style={{fontSize:13,marginTop:4}}>Head to the "Tag Posts" tab to start categorizing</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {/* Tag summary cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {Object.entries(TAG_META).map(([k,m]) => {
                    const s = tagStats[k];
                    return (
                      <div key={k} style={{background:"#fff",borderRadius:12,border:`1px solid ${m.border}`,padding:"20px 20px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                          <span style={{width:10,height:10,borderRadius:"50%",background:m.color,display:"inline-block"}}></span>
                          <span style={{fontWeight:700,fontSize:15}}>{m.label}</span>
                          <span style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{s.count} posts</span>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {[["Impressions",fmt(s.impressions)],["Avg Eng Rate",pct(s.engRate)],["Total Likes",fmt(s.likes)],["Total Clicks",fmt(s.clicks)]].map(([l,v])=>(
                            <div key={l} style={{background:m.bg,borderRadius:8,padding:"10px 12px"}}>
                              <div style={{fontSize:18,fontWeight:800,color:m.text,fontFamily:"'DM Serif Display',serif"}}>{v}</div>
                              <div style={{fontSize:10,color:m.text,opacity:0.8}}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comparison bar chart */}
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Impressions by Tag</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={Object.entries(TAG_META).map(([k,m])=>({name:m.label, Impressions:tagStats[k].impressions, fill:m.color}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="name" tick={{fontSize:12,fill:"#374151",fontWeight:600}}/>
                      <YAxis tickFormatter={fmt} tick={{fontSize:10,fill:"#9ca3af"}}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="Impressions" radius={[6,6,0,0]}>
                        {Object.entries(TAG_META).map(([k,m],i)=>(
                          <rect key={k} fill={m.color}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Engagement rate comparison */}
                <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Avg Engagement Rate by Tag</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {Object.entries(TAG_META).map(([k,m]) => {
                      const s = tagStats[k];
                      const maxEng = Math.max(...Object.values(tagStats).map(x=>x.engRate));
                      return s.count > 0 ? (
                        <div key={k} style={{display:"flex",alignItems:"center",gap:12}}>
                          <span style={{fontSize:12,fontWeight:600,width:90,color:"#374151"}}>{m.label}</span>
                          <div style={{flex:1,height:24,background:"#f3f4f6",borderRadius:6,overflow:"hidden"}}>
                            <div style={{width:`${maxEng>0?s.engRate/maxEng*100:0}%`,height:"100%",background:m.color,borderRadius:6,display:"flex",alignItems:"center",paddingLeft:8,transition:"width 0.6s"}}>
                              <span style={{fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>{pct(s.engRate)}</span>
                            </div>
                          </div>
                          <span style={{fontSize:11,color:"#9ca3af",width:50,textAlign:"right"}}>{s.count} posts</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Top posts per tag */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {["open-source","enterprise"].map(k => {
                    const m = TAG_META[k];
                    const top = posts.filter(p=>p.tag===k||p.tag==="both").sort((a,b)=>b.impressions-a.impressions).slice(0,3);
                    return (
                      <div key={k} style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px"}}>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:m.color,display:"inline-block"}}></span>
                          Top {m.label} Posts
                        </div>
                        {top.length === 0 ? <div style={{fontSize:12,color:"#9ca3af"}}>No posts tagged yet.</div> : top.map(p=>(
                          <div key={p.id} style={{padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                            <div style={{fontSize:12,color:"#374151",lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginBottom:4}}>{p.title}</div>
                            <div style={{display:"flex",gap:10,fontSize:11,color:"#9ca3af"}}>
                              <span>{fmt(p.impressions)} impressions</span>
                              <span>{pct(p.engRate)} eng</span>
                              <span>{p.likes} likes</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
