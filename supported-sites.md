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
| E-Hentai    | https://e-hentai.org/             | Yes   | Sizing only | **Lanczos3 cannot run here**: pages come from a separate host that does not let scripts read them, so the browser blocks any userscript from resampling them. `nearest` still works. Since 3.19 the image fills the whole width, without the thin gaps at its sides. In the multi-page viewer it fills the site's image pane, which leaves 2-3 px at the edges |
| ExHentai    | https://exhentai.org/             | Yes   | Sizing only | Same as E-Hentai: same site software |
| Tapas       | https://tapas.io/                 | No    | Sizing | Since 3.19 the page fills the width instead of sitting in a narrow column with empty bars at both sides, and stays clear of the side panel when it is open. Tested on a saved copy of the page, not yet on the live site |
| WEBTOON     | https://www.webtoons.com/         | No    | Off by default | Its page strips are 700 px wide, under the default size filter (`minNaturalWidth: 800`), so they are left alone. The overlay says so. Set `minNaturalWidth: 690` to include them |

## Doesn't work on

Some sites are out of reach by design rather than by oversight. Listed so you can stop looking for a setting that will fix it.

| Site    | URL                          | NSFW? | Why not |
|:------- |:---------------------------- |:-----:|:------- |
| K MANGA | https://kmanga.kodansha.com/ | No    | K MANGA paints its pages onto a `<canvas>` instead of using ordinary images, and this script only works on images. The only real images in its viewer are the adverts, so if it ever looked like it was doing something there, that is what it was doing. The viewer also blanks its pages the moment the window loses focus. Nothing here is a fault you can configure around |

## Notes

**Lanczos3 does not work on E-Hentai or ExHentai.** Their pages are served from a separate image host that does not give scripts permission to read them, and the browser enforces that. So the script can size the image and apply `nearest`, but it cannot resample. This is a limit set by the site, not a bug, and the overlay says so rather than reporting an error. See the note on cross-origin images in the README.

**Sites that size the box around the image.** Some sites write a fixed pixel size onto the element wrapping the image, worked out from the image's original size. When the script resizes the image, that number goes stale: too small and the image is clipped, too large and there is dead space. The script fixes this for the sites it knows about.

**Seeing this on a site that isn't listed?** The script only loosens wrappers on sites it knows, because doing it everywhere breaks readers that use those same sizes to manage their own scrolling. You can try a fix yourself from the browser console:

```js
__crispImages.containers = ['.the-wrapper-around-the-image']
```

If the page behaves, tell us which selector worked and it can be added to the list.
