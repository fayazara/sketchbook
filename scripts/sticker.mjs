/**
 * Turns a transparent PNG into a die-cut sticker: trimmed, scaled, with a white
 * border that follows the outline, saved as WebP.
 *
 *   node scripts/sticker.mjs <input.png> <output.webp> [--size 440] [--border 20] [--clean]
 *
 *   --size    longest side of the artwork in px, before the border (default 440)
 *   --border  white border in px at that size (default 20)
 *   --clean   drop faint pixels first. Use it on app icons and photos with a soft
 *             baked-in shadow, so the border hugs the object instead of the shadow.
 *
 * Needs a transparent background. For a photo, remove the background first
 * (macOS: `swift scripts/cutout.swift photo.jpg cutout.png`).
 */
import sharp from "sharp";

const args = process.argv.slice(2);
const [input, output] = args.filter((a) => !a.startsWith("--") && Number.isNaN(Number(a)));
const flag = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : Number(args[i + 1]);
};
const SIZE = flag("size", 440);
const BORDER = flag("border", 20);
const CLEAN = args.includes("--clean");

if (!input || !output) {
	console.error("usage: node scripts/sticker.mjs <input.png> <output.webp> [--size 440] [--border 20] [--clean]");
	process.exit(2);
}

// 1. Read raw RGBA at full resolution, optionally drop faint pixels (soft shadows),
//    and find the bounding box of what is left
const full = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = full;
const { width: w, height: h } = info;
let minX = w, minY = h, maxX = 0, maxY = 0;
for (let y = 0; y < h; y++) {
	for (let x = 0; x < w; x++) {
		const i = (y * w + x) * 4 + 3;
		if (CLEAN) data[i] = Math.round(255 * Math.min(1, Math.max(0, (data[i] - 100) / 60)));
		if (data[i] > 16) {
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}
}
if (maxX < minX) throw new Error("the image is fully transparent");

// 2. Crop to the artwork, scale it to SIZE, and leave room for the border
const pad = BORDER + 3;
const art = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
	.extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
	.resize(SIZE, SIZE, { fit: "inside", kernel: "lanczos3" })
	.extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
	.png()
	.toBuffer();
const meta = await sharp(art).metadata();

// 3. Grow the silhouette by BORDER px (blur, then threshold), round it off, soften the edge.
//    Each step is its own pipeline: sharp runs threshold before blur inside one chain.
const step = (buf, fn) => fn(sharp(buf)).toBuffer();
const alpha = await sharp(art).extractChannel(3).toBuffer();
const grown = await step(await step(alpha, (s) => s.blur(BORDER / 2.2)), (s) => s.threshold(4));
const rounded = await step(await step(grown, (s) => s.blur(BORDER / 3)), (s) => s.threshold(128));
const mask = await step(rounded, (s) => s.blur(0.7));

// 4. White sheet cut to that outline, with the artwork on top
const sheet = await sharp({
	create: { width: meta.width, height: meta.height, channels: 3, background: "#ffffff" },
})
	.joinChannel(mask)
	.png()
	.toBuffer();

await sharp(sheet)
	.composite([{ input: art }])
	.webp({ quality: 92, alphaQuality: 100, effort: 5 })
	.toFile(output);

console.log(`${output}  ${meta.width}x${meta.height}`);
