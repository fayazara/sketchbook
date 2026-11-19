/**
 * Stickers on /uses: drag one and it peels off the page, then stick it anywhere.
 *
 * Peeling is a fold, drawn with two copies of the sticker:
 *  - the base (the part still stuck down) is clipped to one side of the fold line
 *  - the flap (the part lifted so far) is clipped to the other side, mirrored across
 *    the fold, and drawn as the sticker's back: its silhouette in paper white
 * The fold line is perpendicular to the drag and travels across the sticker as you
 * pull, so the trailing edge lifts and folds over in the direction you are pulling.
 * Once it is far enough off, it becomes a free sticker on <body> (so it can sit on
 * the desk as well as the paper) that follows the pointer with a little weight.
 *
 * Drop a free sticker back on its own spot, or double-click it, to put it back.
 * Nothing is saved: a reload puts every sticker back where it was.
 */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DRAG_START = 4; // px of movement before a press becomes a peel
const PEEL_DIST = 110; // px of drag for a full peel
const DETACH_AT = 0.72; // peel progress at which it comes off
const FLOAT_MAX = 76; // longest side of a free sticker, px (the preview is 58)
const RETURN_RADIUS = 48; // drop this close to the spot to stick it back

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const easeOut = (t) => 1 - (1 - t) ** 3;
let zTop = 60;

/** Clips the W x H rectangle to the half-plane side * ((q - C) . u - f) >= 0. */
function halfPlane(W, H, ux, uy, f, side) {
	const cx = W / 2;
	const cy = H / 2;
	const pts = [
		[0, 0],
		[W, 0],
		[W, H],
		[0, H],
	];
	const s = ([x, y]) => side * ((x - cx) * ux + (y - cy) * uy - f);
	const out = [];
	for (let i = 0; i < 4; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % 4];
		const sa = s(a);
		const sb = s(b);
		if (sa >= 0) out.push(a);
		if (sa >= 0 !== sb >= 0) {
			const t = sa / (sa - sb);
			out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
		}
	}
	return out.length < 3 ? null : `polygon(${out.map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`).join(",")})`;
}

/** Draws the sticker peeled by p (0..1) along unit direction (ux, uy), scaled by s. */
function drawPeel(st, p, ux, uy, s) {
	const { W, H, el, base, flap, back, shade } = st;
	const E = (Math.abs(ux) * W + Math.abs(uy) * H) / 2; // half extent along u
	const f = -E + 2 * E * p; // fold line, as a distance from the centre along u
	const F = E + f; // the same, measured along the gradient line
	const angle = (Math.atan2(ux, -uy) * 180) / Math.PI;

	el.style.transform = `scale(${s})`;

	const baseClip = halfPlane(W, H, ux, uy, f, 1);
	base.style.visibility = baseClip ? "" : "hidden";
	base.style.clipPath = baseClip || "";
	// The flap casts a soft shadow just past the fold
	shade.style.background = `linear-gradient(${angle}deg, rgb(40 25 10 / 0) ${F - 1}px, rgb(40 25 10 / 0.3) ${F}px, rgb(40 25 10 / 0) ${F + 26}px)`;

	const flapClip = halfPlane(W, H, ux, uy, f, -1);
	flap.style.visibility = flapClip ? "" : "hidden";
	flap.style.clipPath = flapClip || "";
	// Mirror across the fold line: q' = (I - 2uu^T) q + 2 f u, about the centre
	const a = 1 - 2 * ux * ux;
	const b = -2 * ux * uy;
	const d = 1 - 2 * uy * uy;
	flap.style.transform = `matrix(${a},${b},${b},${d},${2 * f * ux},${2 * f * uy})`;
	// The back curls: darker toward the fold, with a bright crest on it
	back.style.backgroundImage = `linear-gradient(${angle}deg, rgb(0 0 0 / 0) ${F - 34}px, rgb(60 45 25 / 0.16) ${F - 7}px, rgb(255 255 255 / 0.75) ${F}px)`;
}

function resetPeel(st) {
	const { el, base, flap, shade, back } = st;
	el.classList.remove("is-peeling");
	el.style.transform = el.style.transformOrigin = "";
	base.style.clipPath = base.style.visibility = "";
	flap.style.clipPath = flap.style.visibility = flap.style.transform = "";
	shade.style.background = back.style.backgroundImage = "";
}

/* ---------- Free stickers ---------- */
function makeFloat(st, cx, cy, w, h, turn) {
	const node = document.createElement("div");
	node.className = "sticker-float is-lifted";
	node.setAttribute("aria-hidden", "true");
	node.style.cssText = `left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;z-index:${++zTop}`;
	const src = st.img.currentSrc || st.img.src;
	// A card with two faces, so it can turn over as it comes off the page
	const card = document.createElement("div");
	card.className = "sticker-float__card";
	const img = document.createElement("img");
	img.src = src;
	img.alt = "";
	img.draggable = false;
	const back = document.createElement("i");
	back.className = "sticker-float__back";
	back.style.setProperty("--img", `url("${src}")`);
	// Turn about the fold line, i.e. the axis perpendicular to the pull
	const axis = `${-turn.uy},${turn.ux},0`;
	back.style.transform = `rotate3d(${axis},180deg)`;
	card.append(img, back);
	node.append(card);
	document.body.append(node);
	if (!reduce) {
		card.style.transform = `rotate3d(${axis},${turn.deg}deg) scale(${turn.from})`;
		void card.offsetWidth;
		card.style.transform = "";
	}
	const fl = { node, st, x: cx - w / 2, y: cy - h / 2, w, h, tilt: (Math.random() * 2 - 1) * 6, rot: 0 };
	node.style.setProperty("--tilt", `${fl.tilt}deg`);
	node.addEventListener("pointerdown", (e) => grabFloat(fl, e));
	node.addEventListener("dblclick", () => putBack(fl));
	st.float = fl;
	return fl;
}

/** Glides a free sticker back into its spot, centre to centre, and presses it down. */
function putBack(fl) {
	const { node, st } = fl;
	const slot = st.slot.getBoundingClientRect();
	const dx = slot.left + scrollX + slot.width / 2 - (fl.x + fl.w / 2);
	const dy = slot.top + scrollY + slot.height / 2 - (fl.y + fl.h / 2);
	let finished = false;
	const done = () => {
		if (finished) return;
		finished = true;
		node.remove();
		st.slot.classList.remove("is-empty");
		st.float = null;
		if (reduce) return;
		st.el.classList.remove("is-restuck");
		void st.el.offsetWidth;
		st.el.classList.add("is-restuck");
		st.el.addEventListener("animationend", () => st.el.classList.remove("is-restuck"), { once: true });
	};
	if (reduce) return done();
	node.classList.remove("is-lifted", "is-slapped");
	node.classList.add("is-returning");
	node.style.rotate = "";
	node.style.setProperty("--tilt", st.el.style.getPropertyValue("--tilt") || "0deg");
	node.style.translate = `${dx}px ${dy}px`;
	node.style.scale = String(st.W / fl.w);
	node.addEventListener("transitionend", (e) => e.propertyName === "translate" && done());
	setTimeout(done, 500);
}

/** Moves a free sticker toward (tx, ty) with a little lag, leaning into the motion. */
function follow(fl, getTarget, isDone) {
	let last = performance.now();
	const tick = (now) => {
		const dt = Math.min(48, now - last) / 16.7;
		last = now;
		const [tx, ty] = getTarget();
		const k = reduce ? 1 : 1 - (1 - 0.32) ** dt;
		const vx = (tx - fl.x) * k;
		fl.x += vx;
		fl.y += (ty - fl.y) * k;
		fl.rot += (clamp(vx * 0.9, -14, 14) - fl.rot) * (reduce ? 1 : 0.2);
		fl.node.style.left = `${fl.x}px`;
		fl.node.style.top = `${fl.y}px`;
		fl.node.style.rotate = `${fl.tilt + fl.rot}deg`;
		if (!isDone()) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

function dragFloat(fl, e, offX, offY) {
	const id = e.pointerId;
	let px = (e.clientX + scrollX);
	let py = (e.clientY + scrollY);
	let done = false;
	fl.node.classList.add("is-lifted");
	fl.node.classList.remove("is-slapped");
	fl.node.style.zIndex = String(++zTop);
	follow(
		fl,
		() => [px - offX, py - offY],
		() => done,
	);
	const move = (ev) => {
		if (ev.pointerId !== id) return;
		px = (ev.clientX + scrollX);
		py = (ev.clientY + scrollY);
	};
	const up = (ev) => {
		if (ev.pointerId !== id) return;
		removeEventListener("pointermove", move);
		removeEventListener("pointerup", up);
		removeEventListener("pointercancel", up);
		done = true;
		// Keep it on the page
		const maxX = document.documentElement.scrollWidth - fl.w;
		const maxY = document.documentElement.scrollHeight - fl.h;
		fl.x = clamp(px - offX, 0, Math.max(0, maxX));
		fl.y = clamp(py - offY, 0, Math.max(0, maxY));
		fl.rot = 0;
		const { node } = fl;
		node.style.left = `${fl.x}px`;
		node.style.top = `${fl.y}px`;
		node.style.rotate = "";
		node.classList.remove("is-lifted");
		// Dropped on its own spot: stick it back
		const r = fl.st.el.getBoundingClientRect();
		const dx = fl.x + fl.w / 2 - (r.left + scrollX + r.width / 2);
		const dy = fl.y + fl.h / 2 - (r.top + scrollY + r.height / 2);
		if (Math.hypot(dx, dy) < RETURN_RADIUS) return putBack(fl);
		if (catCheck(fl)) return;
		void node.offsetWidth;
		node.classList.add("is-slapped");
	};
	addEventListener("pointermove", move);
	addEventListener("pointerup", up);
	addEventListener("pointercancel", up);
}

/* ---------- Cats do not want stickers ---------- */
let hiss = null;
/** If the sticker landed on a cat: hiss, let the cat react, and knock the sticker off. */
function catCheck(fl) {
	const left = fl.x - scrollX;
	const top = fl.y - scrollY;
	for (const cat of document.querySelectorAll("[data-cat], [data-walker] .walker__cat")) {
		const r = cat.getBoundingClientRect();
		if (!r.width) continue;
		// Only the cat itself, not the empty corners of its box
		const ix = Math.min(left + fl.w, r.right - r.width * 0.15) - Math.max(left, r.left + r.width * 0.15);
		const iy = Math.min(top + fl.h, r.bottom - r.height * 0.1) - Math.max(top, r.top + r.height * 0.25);
		if (ix <= 0 || iy <= 0) continue;

		try {
			hiss ??= new Audio("/sounds/cat-angry.mp3");
			hiss.currentTime = 0;
			hiss.volume = 0.6;
			hiss.play().catch(() => {});
		} catch {}
		cat.closest("[data-cat], [data-walker]")?.dispatchEvent(new CustomEvent("cat:angry"));

		// Swatted away from the cat's centre
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		let vx = left + fl.w / 2 - cx;
		let vy = top + fl.h / 2 - cy;
		const len = Math.hypot(vx, vy) || 1;
		vx /= len;
		vy /= len;
		const push = (Math.max(r.width, r.height) + Math.max(fl.w, fl.h)) * 0.6;
		const maxX = document.documentElement.scrollWidth - fl.w;
		const maxY = document.documentElement.scrollHeight - fl.h;
		fl.x = clamp(fl.x + vx * push, 0, Math.max(0, maxX));
		fl.y = clamp(fl.y + vy * push, 0, Math.max(0, maxY));
		fl.tilt += vx >= 0 ? 18 : -18;
		const { node } = fl;
		node.classList.add("is-swatted");
		node.style.left = `${fl.x}px`;
		node.style.top = `${fl.y}px`;
		node.style.setProperty("--tilt", `${fl.tilt}deg`);
		setTimeout(() => node.classList.remove("is-swatted"), 400);
		return true;
	}
	return false;
}

function grabFloat(fl, e) {
	if (e.button !== 0) return;
	e.preventDefault();
	dragFloat(fl, e, (e.clientX + scrollX) - fl.x, (e.clientY + scrollY) - fl.y);
}

/* ---------- Peeling a sticker off its spot ---------- */
function startPeel(st, e) {
	if (e.button !== 0 || st.float) return;
	e.preventDefault();
	const id = e.pointerId;
	const rect = st.el.getBoundingClientRect();
	st.W = st.el.offsetWidth;
	st.H = st.el.offsetHeight;
	// Where it was grabbed, in the sticker's own (unscaled) coordinates
	const gx = clamp(((e.clientX - rect.left) / rect.width) * st.W, 0, st.W);
	const gy = clamp(((e.clientY - rect.top) / rect.height) * st.H, 0, st.H);
	const T = Math.max(1, FLOAT_MAX / Math.max(st.W, st.H));
	const x0 = e.clientX;
	const y0 = e.clientY;
	let ux = 0;
	let uy = 1;
	let p = 0;
	let peeling = false;

	const smooth = (t) => t * t * (3 - 2 * t);
	// It lifts toward you a little as it peels, and a little more once it is off
	const scaleAt = (q) => 1 + 0.1 * smooth(clamp(q / DETACH_AT, 0, 1));

	const detach = (ev) => {
		cleanup();
		const s = scaleAt(p);
		const r = st.el.getBoundingClientRect();
		resetPeel(st);
		st.slot.classList.add("is-empty");
		// Start over the folded sticker, showing mostly its back, then turn it over
		// to its front while it settles under the pointer
		const shift = Math.max(st.W, st.H) * 0.3 * s;
		const fl = makeFloat(
			st,
			r.left + scrollX + r.width / 2 + ux * shift,
			r.top + scrollY + r.height / 2 + uy * shift,
			st.W * T,
			st.H * T,
			{ ux, uy, deg: 180 * p, from: s / T },
		);
		dragFloat(fl, ev, gx * T, gy * T);
	};

	const settle = () => {
		cleanup();
		if (reduce || p === 0) return resetPeel(st);
		const from = p;
		const t0 = performance.now();
		const tick = (now) => {
			const t = clamp((now - t0) / 220, 0, 1);
			const q = from * (1 - easeOut(t));
			drawPeel(st, q, ux, uy, scaleAt(q));
			if (t < 1) requestAnimationFrame(tick);
			else resetPeel(st);
		};
		requestAnimationFrame(tick);
	};

	const move = (ev) => {
		if (ev.pointerId !== id) return;
		const dx = ev.clientX - x0;
		const dy = ev.clientY - y0;
		const dist = Math.hypot(dx, dy);
		if (!peeling) {
			if (dist < DRAG_START) return;
			peeling = true;
			if (reduce) return detach(ev);
			st.el.classList.add("is-peeling");
			st.el.style.transformOrigin = `${gx}px ${gy}px`;
		}
		if (dist > 2) {
			ux = dx / dist;
			uy = dy / dist;
		}
		p = clamp(dist / PEEL_DIST, 0, 1);
		if (p >= DETACH_AT) return detach(ev);
		drawPeel(st, p, ux, uy, scaleAt(p));
	};
	const up = (ev) => {
		if (ev.pointerId === id) settle();
	};
	const cleanup = () => {
		removeEventListener("pointermove", move);
		removeEventListener("pointerup", up);
		removeEventListener("pointercancel", up);
	};
	addEventListener("pointermove", move);
	addEventListener("pointerup", up);
	addEventListener("pointercancel", up);
}

for (const el of document.querySelectorAll("[data-sticker]")) {
	const st = {
		el,
		slot: el.closest(".sticker-slot"),
		img: el.querySelector("img"),
		base: el.querySelector(".sticker__base"),
		shade: el.querySelector(".sticker__shade"),
		flap: el.querySelector(".sticker__flap"),
		back: el.querySelector(".sticker__back"),
		W: 0,
		H: 0,
		float: null,
	};
	el.addEventListener("pointerdown", (e) => startPeel(st, e));
}
