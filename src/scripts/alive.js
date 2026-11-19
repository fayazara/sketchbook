/**
 * The page's small living things. Everything here is optional decoration:
 * the site works without it, and reduced-motion users get the still versions.
 *
 *  - sun / moon: click to change the time of day
 *  - pen strokes draw themselves as they scroll into view
 *  - tape can be peeled; the avatar polaroid flips over
 *  - the cat on the "now" note wakes up and watches the cursor
 *  - the cat in the footer walks as you scroll, and sits by the desk
 *  - a paper plane is thrown once per visit and flown by a small glider simulation
 */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mod = (n, m) => ((n % m) + m) % m;

/* ---------- Time of day ---------- */
const times = ["dawn", "day", "dusk", "night"];
$("[data-skybody]")?.addEventListener("click", () => {
	const next = times[(times.indexOf(root.dataset.time) + 1) % times.length];
	root.dataset.time = next;
	try {
		sessionStorage.setItem("time", next);
	} catch {}
});

/* ---------- Strokes draw themselves ---------- */
const drawables = $$(".entry, .index li, .search, .foot");
if ("IntersectionObserver" in window && !reduce) {
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				e.target.classList.add("is-drawn");
				io.unobserve(e.target);
			}
		},
		{ threshold: 0.12 },
	);
	drawables.forEach((el) => io.observe(el));
} else {
	drawables.forEach((el) => el.classList.add("is-drawn"));
}

/* ---------- Peel the tape, flip the polaroid ---------- */
document.addEventListener(
	"click",
	(e) => {
		const tape = e.target.closest?.(".tape");
		if (tape) {
			// Prints are links; peeling must not follow them
			e.preventDefault();
			e.stopPropagation();
			tape.classList.add("is-peeled");
			const print = tape.closest(".print");
			if (print) {
				const left = $$(".tape", print).filter(
					(t) => !t.classList.contains("is-peeled") && getComputedStyle(t).display !== "none",
				);
				if (left.length === 0) print.classList.add("is-loose");
			}
			return;
		}
		const flip = e.target.closest?.("[data-flip]");
		if (flip) {
			const on = flip.classList.toggle("is-flipped");
			flip.setAttribute("aria-pressed", String(on));
		}
	},
	true,
);

/* ---------- The cat on the note ---------- */
const cat = $("[data-cat]");
if (cat) {
	const sprite = $(".cat__sprite", cat);
	const bubble = $(".cat__bubble", cat);
	let state = "sleep";
	let breathe = 0;
	let lastNear = 0;
	let stretchUntil = 0;
	const frame = (n) => sprite.style.setProperty("--f", n);
	const center = () => {
		const r = cat.getBoundingClientRect();
		return [r.left + r.width / 2, r.top + r.height * 0.6];
	};
	const stretch = (ms) => {
		stretchUntil = performance.now() + ms;
		frame(5);
		setTimeout(() => {
			if (state === "awake") frame(3);
		}, ms);
	};
	/* Hovering (mouse only) lets the cat purr and keeps it asleep: the cursor-watching is
	   suspended while the pointer is on it, and the sound fades in and out. */
	let purring = false;
	let purr = null;
	let fade = 0;
	const fadeTo = (target, done) => {
		cancelAnimationFrame(fade);
		const step = () => {
			const d = target - purr.volume;
			if (Math.abs(d) < 0.03) {
				purr.volume = target;
				done?.();
				return;
			}
			purr.volume += Math.sign(d) * 0.03;
			fade = requestAnimationFrame(step);
		};
		step();
	};
	cat.addEventListener("pointerenter", (e) => {
		if (e.pointerType !== "mouse") return;
		purring = true;
		if (!purr) {
			purr = new Audio("/sounds/cat-purr.mp3");
			purr.loop = true;
		}
		purr.volume = 0;
		// Browsers block audio until the visitor has interacted with the page; stay quiet if so.
		purr.play().then(() => fadeTo(0.5)).catch(() => {});
	});
	cat.addEventListener("pointerleave", () => {
		purring = false;
		lastNear = performance.now();
		if (purr) fadeTo(0, () => purr.pause());
	});
	frame(0);
	if (!reduce) {
		setInterval(() => {
			if (state !== "sleep") return;
			breathe ^= 1;
			frame(breathe);
		}, 1900);
	}
	addEventListener(
		"pointermove",
		(e) => {
			if (purring) return;
			const [cx, cy] = center();
			if (Math.hypot(e.clientX - cx, e.clientY - cy) > 180) return;
			lastNear = performance.now();
			if (state === "sleep") {
				state = "awake";
				stretch(700);
			}
			if (performance.now() < stretchUntil) return;
			const dx = e.clientX - cx;
			frame(dx < -36 ? 2 : dx > 36 ? 4 : 3);
		},
		{ passive: true },
	);
	setInterval(() => {
		if (state === "awake" && !purring && performance.now() - lastNear > 2600) {
			state = "sleep";
			frame(breathe);
		}
	}, 500);
	// A sticker dropped on it (stickers.js): wide awake, and not happy about it
	cat.addEventListener("cat:angry", () => {
		state = "awake";
		lastNear = performance.now();
		frame(3);
		cat.classList.remove("is-angry");
		void cat.offsetWidth;
		cat.classList.add("is-angry");
		const text = bubble.textContent;
		bubble.textContent = "hsss!";
		bubble.classList.remove("is-on");
		void bubble.offsetWidth;
		bubble.classList.add("is-on");
		setTimeout(() => {
			bubble.textContent = text;
			cat.classList.remove("is-angry");
		}, 1400);
	});
	cat.addEventListener("click", () => {
		state = "awake";
		lastNear = performance.now();
		stretch(900);
		bubble.classList.remove("is-on");
		void bubble.offsetWidth;
		bubble.classList.add("is-on");
	});
}

/* ---------- The cat that walks the footer ---------- */
const walker = $("[data-walker]");
const foot = $(".foot");
if (walker && foot) {
	const wc = $(".walker__cat", walker);
	const place = (p, y, dir) => {
		const desk = $(".foot__desk");
		const reserve = (desk ? desk.offsetWidth : 0) + 70;
		const max = Math.max(0, walker.clientWidth - reserve - wc.offsetWidth);
		const sitting = p > 0.985;
		walker.classList.toggle("walker--sit", sitting);
		wc.style.setProperty("--f", sitting ? 3 : mod(Math.floor(y / 18), 6));
		wc.style.transform = `translate3d(${p * max}px,0,0) scaleX(${sitting ? 1 : dir})`;
	};
	if (reduce) {
		place(1, 0, 1);
	} else {
		let lastY = scrollY;
		let dir = 1;
		let ticking = false;
		const update = () => {
			ticking = false;
			const y = scrollY;
			if (y !== lastY) {
				dir = y > lastY ? 1 : -1;
				lastY = y;
			}
			const r = foot.getBoundingClientRect();
			const p = clamp((innerHeight - r.top) / (r.height - 6), 0, 1);
			place(p, y, dir);
		};
		addEventListener(
			"scroll",
			() => {
				if (!ticking) {
					ticking = true;
					requestAnimationFrame(update);
				}
			},
			{ passive: true },
		);
		addEventListener("resize", update);
		update();
	}
}

/* ---------- The paper plane: a small glider, thrown from "hi, I'm Fayaz" ---------- */
// This is flown by physics, not drawn along a curve. A point-mass glider in 3D
// (x right, y up, z toward you) with lift, drag and gravity, so it does what a
// real paper plane does: it's thrown up, slows as it climbs, noses over, dives,
// pulls out and climbs again in a rolling wave (the "phugoid"), then settles
// into a glide, losing energy all the way. Gusts push it up, down and sideways,
// and a wandering bank angle turns it, so it drifts toward and away from you
// (shown by size, foreshortening and roll). Every flight is different.
//
// Flies on the first load of a visit, on a browser refresh, with ?plane
// (?plane=slow plays it six times slower, for looking at it), or whenever you
// click "hi, I'm Fayaz". A full-screen overlay so it can cross the desk as well
// as the paper; it never blocks clicks.
const PLANE_ART_ANGLE = -16; // the drawing's nose points ~16deg upward; correct for it
let planeFlying = false;
const throwPlane = () => {
	if (reduce || planeFlying) return;
	planeFlying = true;
	const w = innerWidth;
	const h = innerHeight;
	const wrap = document.createElement("div");
	wrap.className = "flight";
	wrap.setAttribute("aria-hidden", "true");
	wrap.innerHTML = `<svg class="flight__svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path class="flight__trail"/></svg><img class="flight__plane" src="/art/plane-solo.webp" width="68" height="35" alt="" draggable="false">`;
	document.body.appendChild(wrap);
	const trail = wrap.querySelector(".flight__trail");
	const plane = wrap.querySelector(".flight__plane");

	// Launch from the "hi, I'm Fayaz" note when it's on screen, else from off the left edge
	const hello = $("[data-plane]")?.getBoundingClientRect();
	const onScreen = hello && hello.top > 0 && hello.bottom < h && hello.right > 0;
	const S = onScreen ? [hello.left + hello.width * 0.55, hello.top + hello.height * 0.5] : [-110, h * 0.5];

	// The glider. Units are pixels and seconds; y is up in here.
	const G = 560; // gravity
	const V0 = 300; // trim speed: lift equals weight here
	const CD = G / (V0 * V0 * 6.5); // drag, for a lift/drag ratio of 6.5
	let x = S[0];
	let y = h - S[1];
	let z = 0;
	let v = 455; // thrown fast...
	let gam = 0.3 * clamp(S[1] / 200, 0.45, 1); // ...and upward (flight-path angle)
	let psi = (Math.random() - 0.5) * 0.3; // heading, 0 = straight across the screen
	const ph = [0, 0, 0, 0].map(() => Math.random() * Math.PI * 2);
	const gustX = (t) => 30 * Math.sin(0.7 * t + ph[2]);
	const gustUp = (t) => 38 * (Math.sin(0.9 * t + ph[0]) + 0.6 * Math.sin(2.3 * t + ph[1]));
	const bankAt = (t) => 0.38 * Math.sin(0.85 * t + ph[3]) * Math.min(1, t / 1.2);
	const step = (dt, t) => {
		const lift = (v * v) / (V0 * V0); // in g
		v = Math.max(120, v + (-G * Math.sin(gam) - CD * v * v) * dt);
		gam += ((G / v) * (lift - Math.cos(gam)) + (gustUp(t) / (v * 1.2)) * 0.9) * dt;
		psi += ((G / v) * Math.tan(bankAt(t)) - 1.4 * psi) * dt; // banking turns it; it drifts back to "forward"
		x += (v * Math.cos(gam) * Math.cos(psi) + gustX(t)) * dt;
		y += v * Math.sin(gam) * dt;
		z += v * Math.cos(gam) * Math.sin(psi) * dt;
	};

	const slow = /[?&]plane=slow/.test(location.search) ? 6 : 1;
	let prev = performance.now();
	let t = 0;
	let d = "";
	let last = null;
	const finish = () => {
		plane.remove();
		wrap.classList.add("is-done");
		setTimeout(() => {
			wrap.remove();
			planeFlying = false;
		}, 2600);
	};
	const frame = (now) => {
		let remaining = Math.min((now - prev) / 1000, 0.05) / slow;
		prev = now;
		while (remaining > 0) {
			const dt = Math.min(remaining, 1 / 120);
			step(dt, t);
			t += dt;
			remaining -= dt;
		}
		const sy = h - y;
		// Where it's heading on screen, and how it's posed
		const vx = v * Math.cos(gam) * Math.cos(psi) + gustX(t);
		const vy = -v * Math.sin(gam);
		const heading = (Math.atan2(vy, vx) * 180) / Math.PI;
		const pitchWobble = Math.sin(t * 3.1) * 3;
		const roll = bankAt(t) * 55;
		const size = clamp(1 + z / 700, 0.75, 1.2); // nearer = bigger
		const foreshorten = clamp(Math.cos(psi), 0.55, 1); // turned toward/away from you = shorter
		plane.style.transform = `translate(${x - 34}px,${sy - 17}px) perspective(520px) rotate(${heading - PLANE_ART_ANGLE + pitchWobble}deg) rotateX(${roll}deg) scale(${size * foreshorten},${size})`;
		if (!last || Math.hypot(x - last[0], sy - last[1]) > 5) {
			d += `${last ? "L" : "M"}${x.toFixed(1)} ${sy.toFixed(1)} `;
			trail.setAttribute("d", d);
			last = [x, sy];
		}
		if (x > w + 90 || sy > h + 80 || sy < -90 || t > 12) finish();
		else requestAnimationFrame(frame);
	};
	requestAnimationFrame(frame);
};

document.addEventListener("click", (e) => {
	if (e.target.closest?.("[data-plane]")) throwPlane();
});
let flew = false;
try {
	flew = sessionStorage.getItem("flew") === "1";
} catch {}
const nav = performance.getEntriesByType?.("navigation")?.[0];
if (!reduce && (!flew || nav?.type === "reload" || /[?&]plane/.test(location.search))) {
	setTimeout(throwPlane, 1200);
	try {
		sessionStorage.setItem("flew", "1");
	} catch {}
}
