import { copyFile, cp, mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("dist/browser", { recursive: true });
await build({
  entryPoints: ["browser/content.js"],
  outfile: "dist/browser/content.js",
  bundle: true,
  format: "iife",
});
await build({
  entryPoints: ["browser/background.js"],
  outfile: "dist/browser/background.js",
  bundle: true,
  format: "esm",
});
await copyFile("browser/manifest.source.json", "dist/browser/manifest.json");
await cp("browser/icons", "dist/browser/icons", { recursive: true });
await copyFile("LICENSE", "dist/browser/LICENSE");
console.log("Browser extension built in dist/browser");
