# Supported Sites

---

These sites have been checked and confirmed working. Other sites may work, but no promises.

| Site     | URL                   | NSFW?           | Confirmed Working |
|:-------- |:--------------------- |:---------------:|:-----------------:|
| MangaDex | https://mangadex.org/ | Only if enabled | 2026.08.15        |

## Known issues

These load and resize, but something about the site limits what the script can do. Listed so you know what you are looking at, rather than assuming the script is broken.

| Site        | URL                               | NSFW? | Works | Issue |
|:----------- |:--------------------------------- |:-----:|:-----:|:----- |
| MangaPlus   | https://mangaplus.shueisha.co.jp/ | No    | **Fixed in 3.15** | The site takes back each page's image data once it has loaded, so switching filter (`Alt+Q`) or size (`Alt+M`) used to fail. Since 3.15 the script keeps its own copy and every switch works |
| E-Hentai    | https://e-hentai.org/             | Yes   | Sizing only | **Lanczos3 cannot run here**: pages come from a separate host that does not let scripts read them, so the browser blocks any userscript from resampling them. `nearest` still works. Since 4.0 the image fills the whole width, without the thin gaps at its sides. Since 4.2 the multi-page viewer does too, with the thumbnail pane open or closed: the image runs from the thumbnails (or the window's edge) to the window's other edge |
| ExHentai    | https://exhentai.org/             | Yes   | Sizing only | Same as E-Hentai: same site software |
| Tapas       | https://tapas.io/                 | No    | Yes | Since 4.0 the page fills the width instead of sitting in a narrow column with empty bars at both sides, and stays clear of the side panel when it is open. Lanczos3 works: Tapas's image host allows it |
| K MANGA     | https://kmanga.kodansha.com/      | No    | Sizing only, since 4.2 | K MANGA draws its pages onto a `<canvas>` instead of using ordinary images. Since 4.2 the script sizes those pages like images (`fit-width`, `integer`, `native`, the click shortcuts) and `nearest` works, but **Lanczos3 cannot run here**: that would mean reading back pixels the site drew itself, which the script does not do. `integer` with `nearest` shows its 960-pixel pages at an exact 2x. The viewer box is made 95% of the window's height (`viewerHeight`), so a page fitted to the width shows more of itself at once, with no gaps between pages; the site's own Full screen and Zoom views keep their own sizing. Only in the scrolling view: the paged view is left to the site. The viewer also blanks its pages when the window loses focus; that is the site, not the script |
| WEBTOON     | https://www.webtoons.com/         | No    | Since 4.1 | Its 700 px strips pass the size filter since 4.1 (it was 800), and fill the whole width: the site's column clipped them 67-100 px short of each edge. Since 4.2 the page no longer scrolls sideways: the site makes it 1400 px wide at least, which the script lifts while it is on. Also fixed: a strip could stay "skipped - 1x1" (the site's placeholder) until you scrolled or pressed a key. Since 4.2, `native` mode is no longer squashed: the site's minimum width for strips used to override the script's |

## Doesn't work on

Nothing listed at the moment. K MANGA used to be here; since 4.2 it is under Known issues.

## Notes

**Lanczos3 does not work on E-Hentai or ExHentai.** Their pages are served from a separate image host that does not give scripts permission to read them, and the browser enforces that. So the script can size the image and apply `nearest`, but it cannot resample. This is a limit set by the site, not a bug, and the overlay says so rather than reporting an error. See the note on cross-origin images in the README.

**Sites that size the box around the image.** Some sites write a fixed pixel size onto the element wrapping the image, worked out from the image's original size. When the script resizes the image, that number goes stale: too small and the image is clipped, too large and there is dead space. The script fixes this for the sites it knows about.

**Seeing this on a site that isn't listed?** The script only loosens wrappers on sites it knows, because doing it everywhere breaks readers that use those same sizes to manage their own scrolling. You can try a fix yourself from the browser console:

```js
__crispImages.containers = ['.the-wrapper-around-the-image']
```

If the page behaves, tell us which selector worked and it can be added to the list.
