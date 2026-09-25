# Supported Sites

---

The following sites have been checked and confirmed working. Other sites may work, but no promises.

| Site     | URL                   | NSFW?           | Confirmed Working |
|:-------- |:--------------------- |:---------------:|:-----------------:|
| MangaDex | https://mangadex.org/ | Only if enabled | 2026.08.15        |

## Known issues

These load and resample, but something else on the page misbehaves. Listed so you know
what you are looking at rather than assuming the script is broken.

| Site        | URL                              | NSFW? | Works | Issue                                                                                      |
|:----------- |:-------------------------------- |:-----:|:-----:| :----------------------------------------------------------------------------------------- |
| MangaPlus   | https://mangaplus.shueisha.co.jp/ | No    | **Fixed in 3.15** | The site releases each page's image data once it has loaded, so switching quality (`Alt+Q`) or mode (`Alt+M`) used to fail. Since 3.15 the script keeps its own copy and every switch works |
| E-Hentai    | https://e-hentai.org/             | Yes   | Sizing only | Sizing is correct as of 3.18, including inside the multi-page viewer and with the thumbnail pane open. But **Lanczos3 cannot run here**: pages are served from a separate host that does not permit scripts to read them, so the browser will not let any userscript resample them. `nearest` still works |
| ExHentai    | https://exhentai.org/             | Yes   | Sizing only | Identical to E-Hentai — same site software                                                 |

## Doesn't work on

Some sites are out of reach by design rather than by oversight. Listed so you can stop
looking for a setting that will fix it.

| Site    | URL                         | NSFW? | Why not                                                                                 |
|:------- |:--------------------------- |:-----:| :--------------------------------------------------------------------------------------- |
| K MANGA | https://kmanga.kodansha.com/ | No    | K MANGA paints its pages onto a `<canvas>` instead of using ordinary images, and this script only works on images. The only real images in its viewer are the adverts — so if it ever looked like it was doing something there, that is what it was doing. The viewer also blanks its pages the moment the window loses focus. Nothing here is a fault you can configure around |

## Notes

**Lanczos3 does not work on E-Hentai or ExHentai.** Their pages are served from a separate
image host that does not give scripts permission to read them, and the browser enforces
that — so the script can size the image and apply `nearest`, but it cannot resample. This
is a limit set by the site, not a bug, and the overlay says so rather than reporting an
error. See the note on cross-origin images in the README.

The container problem was one bug, not three: these sites write a fixed pixel size onto
the element wrapping the image, calculated from the image's original size. The script
resizes the image itself and deliberately touches nothing else on the page, so that number
went stale — too small and the image was clipped, too large and the difference was left as
dead space.

**Seeing this on a site that isn't listed?** The script only relaxes wrappers on sites it
knows about, because doing it everywhere breaks readers that use those same sizes to
manage their own scrolling. You can try a fix yourself from the browser console:

```js
__crispImages.containers = ['.the-wrapper-around-the-image']
```

If the page behaves, tell us which selector worked and it can be added to the list.
