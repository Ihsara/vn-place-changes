import { fillSlots, fmt } from "./format.js?v=0.4.0";
const d3 = window.d3;
const C = { arrived: "var(--arrived)", gone: "var(--gone)", ink: "var(--ink)", muted: "var(--muted)" };

function svg(el, h, m = { t: 12, r: 12, b: 28, l: 44 }) {
  const w = el.clientWidth || 640;
  const s = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%");
  s.append("defs").append("pattern").attr("id", `hatch-${el.id}`).attr("width", 6).attr("height", 6)
    .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)")
    .append("line").attr("y2", 6).attr("stroke", "var(--unconfirmed)").attr("stroke-width", 2);
  return { s, g: s.append("g").attr("transform", `translate(${m.l},${m.t})`), w: w - m.l - m.r, h: h - m.t - m.b, hatch: `url(#hatch-${el.id})` };
}
const monthLabel = (m) => fmt(m, "month").slice(0, 3);

function hero(el, st) {
  const { g, w, h, hatch } = svg(el, 300);
  const ms = st.f1.months, x = d3.scaleBand(ms.map((d) => d.month), [0, w]).padding(0.3);
  const top = d3.max(ms, (d) => d.arrived + d.flicker), bot = d3.max(ms, (d) => d.gone);
  const y = d3.scaleLinear([-bot, top], [h, 0]).nice();
  g.selectAll(".a").data(ms).join("rect").attr("x", (d) => x(d.month)).attr("width", x.bandwidth())
    .attr("y", (d) => y(d.arrived)).attr("height", (d) => y(0) - y(d.arrived)).attr("fill", C.arrived);
  g.selectAll(".f").data(ms).join("rect").attr("x", (d) => x(d.month)).attr("width", x.bandwidth())
    .attr("y", (d) => y(d.arrived + d.flicker)).attr("height", (d) => y(d.arrived) - y(d.arrived + d.flicker)).attr("fill", hatch);
  g.selectAll(".g").data(ms).join("rect").attr("x", (d) => x(d.month)).attr("width", x.bandwidth())
    .attr("y", y(0)).attr("height", (d) => y(-d.gone) - y(0)).attr("fill", C.gone);
  g.selectAll(".n").data(ms).join("line").attr("x1", (d) => x(d.month) - 4).attr("x2", (d) => x(d.month) + x.bandwidth() + 4)
    .attr("y1", (d) => y(d.net)).attr("y2", (d) => y(d.net)).attr("stroke", C.ink).attr("stroke-width", 2);
  g.append("line").attr("x2", w).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", C.ink);
  g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickFormat(monthLabel).tickSize(0));
  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((v) => d3.format("~s")(Math.abs(v))));
}

function stockLine(el, series, label, zero = true) {
  const { g, w, h, hatch } = svg(el, 220);
  const x = d3.scalePoint(series.map((d) => d.month), [0, w]).padding(0.3);
  const y = zero
    ? d3.scaleLinear([0, d3.max(series, (d) => d.stock)], [h, 0]).nice()
    : d3.scaleLinear(d3.extent(series, (d) => d.stock), [h, 0]).nice();
  const conf = series.filter((d) => !d.pending), pend = series.slice(-2);
  g.append("path").datum(conf).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 2)
    .attr("d", d3.line((d) => x(d.month), (d) => y(d.stock)));
  g.append("path").datum(pend).attr("fill", "none").attr("stroke", "var(--unconfirmed)").attr("stroke-dasharray", "4 3")
    .attr("d", d3.line((d) => x(d.month), (d) => y(d.stock)));
  g.selectAll("circle").data(series).join("circle").attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.stock)).attr("r", 4)
    .attr("fill", (d) => (d.pending ? hatch : C.ink)).attr("stroke", (d) => (d.pending ? "var(--unconfirmed)" : "none"));
  g.append("g").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickFormat(monthLabel).tickSize(0));
  g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("~s")));
  g.append("text").attr("x", w).attr("y", -2).attr("text-anchor", "end").attr("class", "note").text(label);
}

function hbars(el, rows, value, color, fmtv, opts = {}) {
  const rowH = 22, { g, w, h } = svg(el, rows.length * rowH + 30, { t: 8, r: 48, b: 20, l: opts.l ?? 110 });
  const ext = d3.extent([0, ...rows.map(value)]);
  const x = d3.scaleLinear(ext, ext[0] < 0 ? [52, w] : [0, w]).nice(), y = d3.scaleBand(rows.map((d) => d.name), [0, h]).padding(0.25);
  g.selectAll("rect").data(rows).join("rect").attr("y", (d) => y(d.name)).attr("height", y.bandwidth())
    .attr("x", (d) => x(Math.min(0, value(d)))).attr("width", (d) => Math.abs(x(value(d)) - x(0))).attr("fill", (d) => color(d));
  g.selectAll(".lbl").data(rows).join("text").attr("x", -6).attr("y", (d) => y(d.name) + y.bandwidth() / 2)
    .attr("dy", "0.35em").attr("text-anchor", "end").text((d) => d.name);
  g.selectAll(".val").data(rows).join("text").attr("x", (d) => x(value(d)) + (value(d) < 0 ? -4 : 4))
    .attr("y", (d) => y(d.name) + y.bandwidth() / 2).attr("dy", "0.35em")
    .attr("text-anchor", (d) => (value(d) < 0 ? "end" : "start")).attr("class", "num").text((d) => fmtv(value(d)));
  g.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y2", h).attr("stroke", C.ink);
}

function finance(el, st) {
  const label = { bank: "Banks", atm: "ATMs", investing: "Investment firms", financial_advising: "Financial advisers", college_university: "Universities" };
  const rows = st.f4.kinds.map((k) => ({ name: label[k.kind], v: k.rate }));
  rows.push({ name: "All places", v: st.f4.all_places_rate, ref: true });
  hbars(el, rows, (d) => d.v, (d) => (d.ref ? C.muted : d.v < 0 ? C.gone : C.arrived), (v) => `${fmt(v, "signedpct1")}%`, { l: 140 });
}

function flicker(el, st) {
  const rows = st.sidebar.flicker.map((f) => ({ name: fmt(f.month, "month"), v: f.flicker }));
  hbars(el, rows, (d) => d.v, () => "var(--unconfirmed)", (v) => fmt(v, "int"));
  d3.select(el).selectAll("rect").attr("fill", `url(#hatch-${el.id})`).attr("stroke", "var(--unconfirmed)");
}

function provinces(el, st) {
  const three = new Set(st.sidebar.bottom3.map((p) => p.name));
  const rows = st.sidebar.provinces.filter((p) => p.rate !== null).map((p) => ({ name: p.name, v: p.rate, hl: three.has(p.name) }));
  hbars(el, rows, (d) => d.v, (d) => (d.hl ? C.gone : C.muted), (v) => `${fmt(v, "signedpct1")}%`);
}

function check(st) {
  const ok = st.schema_version === 1 && st.f4.kinds.map((k) => k.kind).join() === "bank,atm,investing,financial_advising,college_university"
    && st.sidebar.flicker[2]?.month === "2026-07";
  if (!ok) throw new Error("story.json does not match this page (schema, finance order or July index)");
}

async function main() {
  const st = await (await fetch("data/story.json", { cache: "no-cache" })).json();
  check(st);
  fillSlots(document, st);
  hero(document.getElementById("hero"), st);
  stockLine(document.getElementById("vape-line"), st.f2.series, "listings, confirmed (hatched = not yet)");
  hbars(document.getElementById("vape-provinces"), st.f2.provinces.filter((p) => p.name !== "rest" || p.arrived > 0)
        .map((p) => (p.name === "rest" ? { ...p, name: "Other provinces" } : p)),
        (d) => d.arrived, () => C.arrived, (v) => fmt(v, "int"));
  finance(document.getElementById("finance-chart"), st);
  flicker(document.getElementById("flicker"), st);
  provinces(document.getElementById("provinces"), st);
  stockLine(document.getElementById("downtown"), st.sidebar.downtown.series, "hotels, restaurants, cafés in six wards", false);
}
main().catch((e) => {
  document.body.insertAdjacentHTML("afterbegin", `<p class="error">This story could not load its data: ${e.message}</p>`);
  console.error(e);
});
