/**
 * Every taped print gets its own arrangement of tape and its own slight tilt,
 * derived from a seed (the entry id) so it's stable between loads, and varied
 * from print to print. Layouts live in notebook.css as [data-tape="0".."5"].
 */
export const TAPE_LAYOUTS = 6;

function hash(seed: string): number {
	let h = 7;
	for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return h;
}

export function tapeFor(seed: string): { layout: number; tilt: number } {
	const h = hash(seed);
	return {
		layout: h % TAPE_LAYOUTS,
		// -0.8deg .. +0.8deg, in 0.2 steps
		tilt: (((h >> 3) % 9) - 4) * 0.2,
	};
}
