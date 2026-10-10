// Appending to a long string keeps the rope shallow (a binary counter of
// closed leaves), and every way of building one reads back the same text.
import { assert } from "./assert.js";

function seeded(seed) {
    return () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function piece(rnd) {
    const k = rnd();
    const n = k < 0.6 ? 1 + Math.floor(rnd() * 8)        // short: merged into the open leaf
            : k < 0.85 ? 400 + Math.floor(rnd() * 300)    // around the leaf size
            : k < 0.97 ? 1000 + Math.floor(rnd() * 9000)  // longer than a leaf
            : 9000 + Math.floor(rnd() * 20000);           // past the first-rope threshold
    const c = String.fromCharCode(97 + Math.floor(rnd() * 26));
    const wide = rnd() < 0.05 ? "é中" : "";
    return (c.repeat(n) + wide).slice(0, n);
}

function check(seed, steps) {
    const rnd = seeded(seed);
    let s = "", parts = [], others = [];
    for (let i = 0; i < steps; i++) {
        const k = rnd();
        if (k < 0.8) {                       // append
            const p = piece(rnd); s += p; parts.push(p);
        } else if (k < 0.88) {               // prepend
            const p = piece(rnd); s = p + s; parts.unshift(p);
        } else if (k < 0.94 && others.length) { // append a rope built elsewhere
            const o = others[Math.floor(rnd() * others.length)];
            if (s.length + o.length < 4e6) { s += o; parts.push(o); }
        } else {                             // keep a copy to share later
            others.push(s);
        }
        if (s.length > 2e6) {                // start again, keeping what is shared
            assert(s === parts.join(""), true, "seed " + seed + " at " + i);
            s = ""; parts = [];
        }
        if (i % 97 === 0) {
            const at = Math.floor(rnd() * (s.length + 1));
            const ref = parts.join("");
            assert(s.length, ref.length);
            if (at < s.length) assert(s.charCodeAt(at), ref.charCodeAt(at));
            assert(s.slice(at, at + 50), ref.slice(at, at + 50));
        }
    }
    assert(s === parts.join(""), true, "seed " + seed);
    for (const o of others) assert(o.length >= 0, true);
}

for (let seed = 1; seed <= 40; seed++) check(seed, 1500);

// Many short appends: linear, not quadratic (the old rebalance walked every leaf
// each time the depth reached 60, every few dozen leaves).
let t = Date.now(), s = "";
for (let i = 0; i < 4e6; i++) s += ".(A)";
assert(s.length, 16e6);
assert(s.slice(-8), ".(A).(A)");
const small = Date.now() - t;
t = Date.now(); s = "";
for (let i = 0; i < 8e6; i++) s += ".(A)";
assert(s.length, 32e6);
const large = Date.now() - t;
assert(large < small * 3.5, true, `twice the appends took ${large} ms against ${small} ms`);
