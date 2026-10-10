// The string searches -- indexOf, lastIndexOf, includes, startsWith,
// endsWith, split and replaceAll -- answer what a search written out in
// JavaScript answers, on narrow and wide strings, with empty needles and
// positions past either end.
import { assert } from "./assert.js";

function seeded(seed) {
    return () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function at(s, n, i) {           // does n occur in s at i, compared char by char
    if (i < 0 || i + n.length > s.length) return false;
    for (let k = 0; k < n.length; k++)
        if (s.charCodeAt(i + k) !== n.charCodeAt(k)) return false;
    return true;
}

function indexOf(s, n, from) {
    from = Math.min(Math.max(from | 0, 0), s.length);
    for (let i = from; i + n.length <= s.length; i++) if (at(s, n, i)) return i;
    return -1;
}

function lastIndexOf(s, n, from) {
    let i = Math.min(Math.max(from, 0), s.length - n.length);
    for (; i >= 0; i--) if (at(s, n, i)) return i;
    return -1;
}

function replaceAll(s, n, r) {
    if (n === "") {
        let out = r;
        for (let i = 0; i < s.length; i++) out += s[i] + r;
        return out;
    }
    let out = "", i = 0, j;
    while ((j = indexOf(s, n, i)) >= 0) { out += s.slice(i, j) + r; i = j + n.length; }
    return out + s.slice(i);
}

function split(s, n) {
    if (n === "") return Array.from({ length: s.length }, (_, i) => s[i]);
    const out = [];
    let i = 0, j;
    while ((j = indexOf(s, n, i)) >= 0) { out.push(s.slice(i, j)); i = j + n.length; }
    out.push(s.slice(i));
    return out;
}

const ALPHABETS = ["ab", "abc", "aéb", "a中b", "ÿĀa"];

function word(rnd, alpha, max) {
    let w = "";
    const n = Math.floor(rnd() * (max + 1));
    for (let i = 0; i < n; i++) w += alpha[Math.floor(rnd() * alpha.length)];
    return w;
}

const rnd = seeded(7);
for (let t = 0; t < 4000; t++) {
    const alpha = ALPHABETS[t % ALPHABETS.length];
    const s = word(rnd, alpha, 40);
    const n = rnd() < 0.5 ? word(rnd, alpha, 3)
            : s.slice(Math.floor(rnd() * s.length), Math.floor(rnd() * s.length) + 2);
    const from = Math.floor(rnd() * (s.length + 6)) - 3;
    const what = `${JSON.stringify(s)} / ${JSON.stringify(n)} from ${from}`;

    assert(s.indexOf(n), indexOf(s, n, 0), "indexOf " + what);
    assert(s.indexOf(n, from), indexOf(s, n, from), "indexOf from " + what);
    assert(s.lastIndexOf(n), lastIndexOf(s, n, s.length), "lastIndexOf " + what);
    assert(s.lastIndexOf(n, from), lastIndexOf(s, n, from), "lastIndexOf from " + what);
    assert(s.includes(n), indexOf(s, n, 0) >= 0, "includes " + what);
    assert(s.includes(n, from), indexOf(s, n, from) >= 0, "includes from " + what);
    const sw = Math.min(Math.max(from, 0), s.length);
    assert(s.startsWith(n, from), at(s, n, sw), "startsWith " + what);
    const ew = Math.min(Math.max(from, 0), s.length) - n.length;
    assert(s.endsWith(n, from), at(s, n, ew), "endsWith " + what);
    assert(s.replaceAll(n, "<>"), replaceAll(s, n, "<>"), "replaceAll " + what);
    assert(s.split(n).join("|"), split(s, n).join("|"), "split " + what);
}

// a search that finds nothing over a long narrow string is a memchr, not a
// comparison at every position
const big = "abcdefgh".repeat(1 << 18);
assert(big.indexOf("zq"), -1);
assert(big.includes("hab"), true);
assert(big.indexOf("gha", 5), 6);
assert((big + "zq").indexOf("zq"), big.length);
