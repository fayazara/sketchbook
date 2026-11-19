/** Who the site is about. Edit here; the layout and profile header read from it. */
export const site = {
	name: "Fayaz Ahmed",
	handle: "fayazara",
	location: "Bengaluru, India",
	links: {
		x: "https://x.com/fayazara",
		github: "https://github.com/fayazara",
	},
};

/** The feed tabs, in order. `kind` matches the collection slug. */
export const tabs = [
	{ key: "all", label: "All", href: "/" },
	{ key: "projects", label: "Projects", href: "/projects" },
	{ key: "posts", label: "Articles", href: "/posts" },
	{ key: "talks", label: "Talks", href: "/talks" },
	{ key: "videos", label: "Videos", href: "/videos" },
	{ key: "photos", label: "Photos", href: "/photos" },
	{ key: "uses", label: "Uses", href: "/uses" },
] as const;

export type TabKey = (typeof tabs)[number]["key"];
