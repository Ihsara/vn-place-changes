// Pure formatting + slot filling for the story. Throws on non-finite numbers so a broken slot fails loudly.
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function resolve(obj, path) {
  return path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function num(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`not a finite number: ${v}`);
  return v;
}

export function fmt(v, kind) {
  switch (kind) {
    case "int": return Math.round(num(v)).toLocaleString("en-US");
    case "pct1": return num(v).toFixed(1);
    case "abs1": return Math.abs(num(v)).toLocaleString("en-US", { maximumFractionDigits: 1 });
    case "signedpct1": { const x = num(v); return x > 0 ? `+${x.toFixed(1)}` : x < 0 ? `\u2212${Math.abs(x).toFixed(1)}` : "0.0"; }
    case "share": return Math.round(num(v) * 100).toString();
    case "share1": return (num(v) * 100).toFixed(1);
    case "month": { const [y, m] = String(v).split("-"); if (!y || !m) throw new Error(`bad month ${v}`); return `${MONTHS[+m - 1]} ${y}`; }
    case "text": if (typeof v !== "string" || !v) throw new Error(`empty text slot`); return v;
    default: throw new Error(`unknown format ${kind}`);
  }
}

export function fillSlots(root, story) {
  for (const el of root.querySelectorAll("[data-n]")) {
    el.textContent = fmt(resolve(story, el.dataset.n), el.dataset.fmt || "int");
  }
}
