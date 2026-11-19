import { getEmDashCollection, type ContentEntry } from "emdash";

export type Kind = "projects" | "posts" | "talks" | "videos" | "photos";

// Entry data shapes are generated per-site (emdash-env.d.ts); the feed only
// needs loose access to a handful of fields, so it treats them as records.
// biome-ignore lint/suspicious/noExplicitAny: collections are dynamic
export type AnyEntry = ContentEntry<any>;

export interface FeedEntry {
	kind: Kind;
	entry: AnyEntry;
	date: Date;
	pinned: boolean;
}

/** Which date orders an entry in the feed. Collections differ on purpose. */
function feedDate(kind: Kind, e: AnyEntry): Date {
	const d = e.data as Record<string, unknown>;
	const pick =
		kind === "projects" ? d.sort_date :
		kind === "talks" || kind === "videos" ? d.date :
		kind === "photos" ? d.taken_at :
		undefined;
	const v = (pick ?? d.publishedAt ?? d.createdAt) as Date | string | undefined;
	return v ? new Date(v) : new Date(0);
}

/**
 * Loads one or more collections and merges them, newest first. The main feed
 * only shows projects flagged `featured`, so 40 side projects don't drown out
 * everything else; /projects shows them all.
 */
export async function loadFeed(
	kinds: Kind[],
	opts: { limit?: number; onlyFeaturedProjects?: boolean } = {},
) {
	const { limit = 40, onlyFeaturedProjects = false } = opts;
	const hints: unknown[] = [];

	const groups = await Promise.all(
		kinds.map(async (kind) => {
			const { entries, cacheHint } = await getEmDashCollection(kind, { limit: 100 });
			hints.push(cacheHint);
			return entries
				.filter((e: AnyEntry) =>
					kind === "projects" && onlyFeaturedProjects ? Boolean(e.data.featured) : true,
				)
				.map<FeedEntry>((entry: AnyEntry) => ({
					kind,
					entry,
					date: feedDate(kind, entry),
					pinned: Boolean((entry.data as Record<string, unknown>).pinned),
				}));
		}),
	);

	const items = groups
		.flat()
		.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.getTime() - a.date.getTime())
		.slice(0, limit);

	return { items, hints };
}

export function youtubeId(url: string | undefined | null): string | null {
	if (!url) return null;
	try {
		const u = new URL(url);
		if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
		if (u.hostname.endsWith("youtube.com")) {
			if (u.pathname === "/watch") return u.searchParams.get("v");
			const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
			return m ? m[1] : null;
		}
	} catch {}
	return null;
}

export function hostOf(url: string | undefined | null): string {
	try {
		return new URL(url ?? "").hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}

export function shortDate(d: Date): string {
	const now = new Date();
	const opts: Intl.DateTimeFormatOptions =
		d.getFullYear() === now.getFullYear()
			? { month: "short", day: "numeric" }
			: { month: "short", day: "numeric", year: "numeric" };
	return d.toLocaleDateString("en-US", opts);
}

export function compactNumber(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
	return String(n);
}
