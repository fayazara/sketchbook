import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import { Features } from "lightningcss";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	vite: {
		css: {
			// Keep light-dark() native so the footer theme switcher works in
			// production. For older browsers, Lightning CSS otherwise rewrites
			// it into variables that follow only prefers-color-scheme, which the
			// :root.light / :root.dark color-scheme rules in Base.astro can't
			// reach. Browsers without light-dark() get the light fallback in
			// tokens.css.
			lightningcss: { exclude: Features.LightDark },
		},
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	fonts: [
		{
			// Allo (Josh Puckett, SIL OFL 1.1): body, UI, titles and labels. The "Friendly"
			// build is the variable font (weight 100-900, optical size) with roundness fixed
			// at 50, about half the size of the full one. Swap in AlloVariable.woff2 for ROND.
			provider: fontProviders.local(),
			name: "Allo",
			cssVariable: "--font-sans",
			fallbacks: ["system-ui", "sans-serif"],
			options: {
				variants: [
					{
						weight: "100 900",
						style: "normal",
						src: ["./src/assets/fonts/AlloVariableFriendly.woff2"],
					},
				],
			},
		},
		{
			provider: fontProviders.google(),
			// Code blocks only (real monospace); labels and dates use Allo's tabular figures.
			name: "Courier Prime",
			cssVariable: "--font-mono",
			weights: [400, 700],
			fallbacks: ["Courier New", "monospace"],
		},
		{
			provider: fontProviders.google(),
			name: "Caveat",
			cssVariable: "--font-hand",
			weights: [500],
			fallbacks: ["cursive"],
		},
	],
	devToolbar: { enabled: false },
});
