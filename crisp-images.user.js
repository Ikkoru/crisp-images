// ==UserScript==
// @name         Crisp Images - fix blurry images on HiDPI / 4K screens
// @name:ja           Crisp Images - 高DPI/4Kディスプレイで画像がぼやける問題を修正
// @name:zh-CN        Crisp Images - 修复高DPI/4K屏幕上模糊的图片
// @name:ru           Crisp Images - исправляет размытые изображения на HiDPI / 4K экранах
// @name:es           Crisp Images - corrige imágenes borrosas en pantallas HiDPI / 4K
// @name:pt-BR        Crisp Images - corrige imagens borradas em telas HiDPI / 4K
// @namespace    https://github.com/Ikkoru/crisp-images
// @version      3.14
// @description  Images look blurry on a 4K/HiDPI screen over 100% display scaling, or on Retina? The browser upscales them with a cheap bilinear filter. This resamples them with a real Lanczos3 filter on the GPU instead. No third-party requests; nothing leaves your browser. Built for manga, comics, and webtoons, works anywhere.
// @description:ja    4KやHiDPIディスプレイで、表示スケールが100%を超えるときやRetina環境で、画像がぼやけて見えませんか？ブラウザは安価なバイリニア補間で拡大しています。このスクリプトはGPU上で本物のLanczos3フィルターを使って再サンプリングし、くっきり表示します。第三者への通信は一切なし。漫画・コミック向けですが、どんな画像にも使えます。
// @description:zh-CN 在4K或高DPI屏幕上、缩放高于100%时，或在Retina屏上，图片看起来模糊？浏览器用廉价的双线性插值放大它们。本脚本改用GPU上真正的Lanczos3滤镜重新采样。无第三方请求，数据不会离开浏览器。为漫画阅读而生，适用于任何图片。
// @description:ru    Изображения выглядят размытыми на 4K или HiDPI-экране при масштабе больше 100%, или на Retina? Браузер увеличивает их дешёвым билинейным фильтром. Скрипт пересэмплирует их настоящим фильтром Lanczos3 на GPU. Никаких сторонних запросов, ничего не покидает браузер. Сделан для чтения манги, комиксов и вебтунов, работает с любыми изображениями.
// @description:es    ¿Las imágenes se ven borrosas en tu pantalla 4K o HiDPI con escala superior al 100%, o en Retina? El navegador las amplía con un filtro bilineal barato. Este script las reescala con un filtro Lanczos3 real en la GPU. Sin peticiones a terceros; nada sale de tu navegador. Pensado para leer manga y cómics, funciona con cualquier imagen.
// @description:pt-BR As imagens ficam borradas na sua tela 4K ou HiDPI com escala acima de 100%, ou no Retina? O navegador as amplia com um filtro bilinear barato. Este script as reamostra com um filtro Lanczos3 de verdade na GPU. Sem requisições a terceiros; nada sai do seu navegador. Feito para ler mangá e quadrinhos, funciona com qualquer imagem.
// @author       Igkor Bevzenidis
// @license      MIT
// @homepageURL  https://github.com/Ikkoru/crisp-images
// @supportURL   https://github.com/Ikkoru/crisp-images/issues
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxNiAxNic+PHJlY3Qgd2lkdGg9JzE2JyBoZWlnaHQ9JzE2JyBmaWxsPScjMTUxNTE1Jy8+PHJlY3QgeD0nMicgeT0nMicgd2lkdGg9JzUnIGhlaWdodD0nMTInIGZpbGw9JyM4MDgwODAnLz48ZyBmaWxsPScjZmZmZmZmJz48cmVjdCB4PSc5JyB5PScyJyB3aWR0aD0nMScgaGVpZ2h0PScxMicvPjxyZWN0IHg9JzExJyB5PScyJyB3aWR0aD0nMScgaGVpZ2h0PScxMicvPjxyZWN0IHg9JzEzJyB5PScyJyB3aWR0aD0nMScgaGVpZ2h0PScxMicvPjwvZz48L3N2Zz4=
// @match        *://*/*
// @match        file:///*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

// Local files need chrome://extensions -> Tampermonkey -> Details -> "Allow access
// to file URLs"; without it Chrome runs no userscript on file:// at all.
//
// That permission is necessary but not sufficient. Chrome also treats every
// file:// resource as an opaque origin, so the GPU cannot read an image loaded
// from disk: sizing, native 1:1 and 'nearest' still work there, but 'lanczos3'
// falls back to the browser's own scaling. Images embedded as data: URLs are
// exempt and get the full treatment. For full quality on a folder of local
// images, serve it over http://localhost instead.

(function () {
  'use strict';

  const CFG = {

  /* ================================================================== *
   * Config START.
   * ================================================================== */

    // Whether the script is active on all websites by default.
    // Alt+P activates/deactivates it. Its on or off state is remembered per site
    // and overrides this setting, so switching it on somewhere keeps it on there.
    // Switching it off will keep it off as well.
    // false: the script starts out inactive on all sites.
    // true:  the script starts out active on all sites. Not recommended.
    enabledOnStart: false,

    // Whether the overlay starts visible. Alt+H toggles it, and that choice is
    // remembered per site and overrides this.
    hudOnStart: true,

    // Whether the overlay's diagnostic rows start visible. Alt+G toggles them.
    // Unlike Alt+P and Alt+H this is NOT remembered per site: it is one preference
    // for every site, so this line is where you set it. Alt+G lasts until reload.
    detailsOnStart: false,

    // An image is only touched if it is at least this wide AND at least this
    // tall. Falling short on either one leaves it alone, which is what keeps
    // avatars, icons, and banners out.
    minNaturalWidth: 800,
    minNaturalHeight: 1066,

    // How big to draw an image:
    //   'fit-width' - as wide as the window
    //   'integer'   - biggest whole-number zoom that still fits the width (2x, 3x...)
    //   'native'    - one image pixel per screen pixel
    // A single image can be overridden by clicking it, without changing this:
    //   Alt + left click  - 'native' for that one image
    //   Alt + right click - twice that image's own resolution
    // Click again to put it back.
    mode: 'fit-width',

    // Which resampler to use by default:
    //   'lanczos3' - best quality of these three. Not for pixel art
    //   'nearest'  - hard pixel edges. Use for pixel art. Warning:
    //                Only exact at whole-number zooms: use integer mode
    //   'browser'  - leave it to Chrome; blurry, but fast
    quality: 'lanczos3',

    // Applies to 'fit-width' and 'integer'.
    // false: fit the width only, so a tall page runs off the bottom and you scroll.
    // true:  fit the height as well, so the whole image is on screen at once.
    fitHeightToo: false,

    // Upper limit on the resampled image, in pixels (64 megapixels). Anything
    // larger is handed back to the browser rather than eating memory.
    maxOutputPixels: 64e6,

    // How much memory to spend keeping resampled images around, in bytes
    // (64 MB). Keeping them makes switching filters or scrolling back instant;
    // past this the oldest are dropped and redone if you return to them. Images
    // on screen are never dropped, so this is a target rather than a hard
    // ceiling. All of it is freed when you leave the page.
    blobBudget: 64e6,

    // How far beyond the window to prepare images so they are ready before you
	// scroll to them. Measured in screenfuls above/below/left/right.
    lazyMargin: 1.5,

  /* ================================================================== *
   * Config END.
   * ================================================================== */

  };

  const HOST_KEY = (k) => `crispImages.${k}.${location.host}`;
  const readFlag = (k, d) => {
    try { const v = localStorage.getItem(HOST_KEY(k)); return v === null ? d : v === '1'; }
    catch { return d; }
  };
  const writeFlag = (k, v) => {
    try { localStorage.setItem(HOST_KEY(k), v ? '1' : '0'); } catch { /* private mode */ }
  };

  let enabled = readFlag('enabled', CFG.enabledOnStart);
  let hudVisible = readFlag('hud', CFG.hudOnStart);
  // Not a per-site flag, unlike the two above: localStorage is scoped to the origin,
  // so it cannot express "remember this everywhere". Sharing a value across sites
  // needs GM_setValue, which costs `@grant none` and moves the script into
  // Tampermonkey's sandbox, where window.__crispImages stops being reachable from the
  // page console. Config constant plus a key that lasts the page, as with mode.
  let detailsVisible = CFG.detailsOnStart;
  let mode = CFG.mode;
  let quality = CFG.quality;

  const dpr = () => window.devicePixelRatio || 1;

  // Chrome shows a bare image URL (or a dragged-in file) as an "image document",
  // which brings its own shrink-to-fit and click-to-zoom. Those resize the image
  // without going through this script, so both are suppressed below.
  const IMAGE_DOC = (document.contentType || '').startsWith('image/');

  /* ================================================================== *
   * GPU resampler: separable Lanczos3, two passes.
   * ================================================================== */

  const GL = (() => {
    let cv = null, gl = null, prog = null, loc = null, vao = null;
    let fboTex = null, fbo = null, broken = false, why = '', halfFloat = false;

    const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

    const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2  u_srcSize;
uniform vec2  u_dstSize;
uniform vec2  u_dir;
uniform float u_scale;
uniform int   u_kernel;   // 0 = lanczos3, 1 = nearest
in  vec2 v_uv;
out vec4 outColor;

const float PI = 3.141592653589793;

float sinc(float x) {
  if (abs(x) < 1e-6) return 1.0;
  float p = PI * x;
  return sin(p) / p;
}

float lanczos3(float x) {
  x = abs(x);
  if (x >= 3.0) return 0.0;
  return sinc(x) * sinc(x / 3.0);
}

void main() {
  vec2 dstPx = v_uv * u_dstSize;
  float along = dot(dstPx, u_dir);
  vec2  perp  = dstPx - along * u_dir;

  float srcPos = along / u_scale;

  // Nearest goes through the same pipeline rather than through CSS
  // image-rendering, so that switching filters always produces a new image
  // resource. Chrome will otherwise keep painting a cached raster.
  if (u_kernel == 1) {
    vec2 srcPx = perp + (floor(srcPos) + 0.5) * u_dir;
    outColor = texture(u_tex, srcPx / u_srcSize);
    return;
  }

  float filterScale = max(1.0, 1.0 / u_scale);
  float support = 3.0 * filterScale;

  int jStart = int(floor(srcPos - support - 0.5));
  int jEnd   = int(ceil (srcPos + support - 0.5));

  vec4  acc  = vec4(0.0);
  float wsum = 0.0;
  for (int j = jStart; j <= jEnd; ++j) {
    float w = lanczos3((srcPos - (float(j) + 0.5)) / filterScale);
    if (w == 0.0) continue;
    vec2 srcPx = perp + (float(j) + 0.5) * u_dir;
    acc  += w * texture(u_tex, srcPx / u_srcSize);
    wsum += w;
  }
  outColor = wsum > 0.0 ? acc / wsum : vec4(0.0);
}`;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s));
      }
      return s;
    }

    function init() {
      if (gl) return true;
      if (broken) return false;
      try {
        cv = document.createElement('canvas');
        // Without preserveDrawingBuffer the buffer may be cleared before
        // toBlob() ever sees it.
        gl = cv.getContext('webgl2', {
          premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true,
        });
        if (!gl) throw new Error('WebGL2 unavailable');

        // Lanczos overshoots past black and white on hard edges. An 8-bit
        // intermediate texture clamps that overshoot away between the two passes;
        // a half-float one keeps it, worth roughly 25 levels of accuracy on
        // high-contrast line art. testkit/shader-selftest.html measures it.
        halfFloat = !!(gl.getExtension('EXT_color_buffer_half_float') ||
                       gl.getExtension('EXT_color_buffer_float'));

        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.bindAttribLocation(prog, 0, 'a_pos');
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(prog));
        }
        loc = {
          tex: gl.getUniformLocation(prog, 'u_tex'),
          srcSize: gl.getUniformLocation(prog, 'u_srcSize'),
          dstSize: gl.getUniformLocation(prog, 'u_dstSize'),
          dir: gl.getUniformLocation(prog, 'u_dir'),
          scale: gl.getUniformLocation(prog, 'u_scale'),
          kernel: gl.getUniformLocation(prog, 'u_kernel'),
        };

        vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        fboTex = gl.createTexture();
        fbo = gl.createFramebuffer();
        return true;
      } catch (e) {
        broken = true;
        why = e.message;
        return false;
      }
    }

    function clampTex() {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // We do our own filtering; hardware filtering here would double-blur.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }

    function pass(srcTex, srcW, srcH, dstW, dstH, dirX, dirY, target, kernel) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.viewport(0, 0, dstW, dstH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(loc.tex, 0);
      gl.uniform2f(loc.srcSize, srcW, srcH);
      gl.uniform2f(loc.dstSize, dstW, dstH);
      gl.uniform2f(loc.dir, dirX, dirY);
      gl.uniform1f(loc.scale, dirX ? dstW / srcW : dstH / srcH);
      gl.uniform1i(loc.kernel, kernel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function resample(source, srcW, srcH, dstW, dstH, kernelName) {
      const kernel = kernelName === 'nearest' ? 1 : 0;
      if (!init()) throw new Error('GPU: ' + why);

      cv.width = dstW;
      cv.height = dstH;

      const srcTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      clampTex();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

      gl.bindTexture(gl.TEXTURE_2D, fboTex);
      clampTex();
      if (halfFloat) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, dstW, srcH, 0, gl.RGBA, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, dstW, srcH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);

      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      pass(srcTex, srcW, srcH, dstW, srcH, 1, 0, fbo, kernel);
      pass(fboTex, dstW, srcH, dstW, dstH, 0, 1, null, kernel);
      gl.deleteTexture(srcTex);
      gl.flush();

      const err = gl.getError();
      if (err !== gl.NO_ERROR) throw new Error('GL error ' + err);
      return cv;
    }

    return { resample, ok: () => init(), why: () => why, precision: () => (halfFloat ? '16f' : '8bit') };
  })();

  /* ================================================================== *
   * Geometry
   *
   * Size comes from `mode` alone, plus any per-image override. It must never
   * depend on `quality`: holding the size fixed while the filter changes is what
   * makes Alt+Q a like-for-like comparison. Tie the two together and the filters
   * become impossible to judge against each other.
   * ================================================================== */

  function viewportDevice() {
    const r = dpr();
    const w = window.visualViewport?.width ?? window.innerWidth;
    const h = window.visualViewport?.height ?? window.innerHeight;
    return { w: Math.floor(w * r), h: Math.floor(h * r), r };
  }

  function targetSize(nw, nh, forcedMode) {
    const vp = viewportDevice();
    const m = forcedMode || mode;

    if (m === 'native') return { w: nw, h: nh, factor: 1 };
    // 2x the image's own pixels, regardless of viewport - a detail-inspection view.
    if (m === 'double') return { w: nw * 2, h: nh * 2, factor: 2 };

    if (m === 'integer') {
      let k = Math.floor(vp.w / nw);
      if (CFG.fitHeightToo) k = Math.min(k, Math.floor(vp.h / nh));
      k = Math.max(1, Math.min(k, 8));
      return { w: nw * k, h: nh * k, factor: k };
    }

    let f = vp.w / nw;
    if (CFG.fitHeightToo) f = Math.min(f, vp.h / nh);
    return { w: Math.round(nw * f), h: Math.round(nh * f), factor: f };
  }

  /* ================================================================== *
   * Per-image state
   * ================================================================== */

  let idCounter = 0;
  const state = new WeakMap();

  function record(img) {
    let s = state.get(img);
    const cur = img.currentSrc || img.src;

    if (!s) {
      s = {
        id: ++idCounter, origUrl: cur, el: new WeakRef(img),
        nw: img.naturalWidth, nh: img.naturalHeight,
        blobUrl: null, key: null, forcedMode: null, busy: false, rerun: false,
        retryable: false,
        status: 'pending', report: null, anchor: null, baseRect: null,
        // key -> blob URL, so flipping between filters you have already seen is
        // instant instead of a fresh resample plus PNG encode each time.
        cache: new Map(),
      };
      state.set(img, s);
      return s;
    }

    // Ignore src changes while a swap of ours is in flight: the value passing
    // through is our own resampled blob. Treating it as a new source would
    // overwrite origUrl and the recorded natural size with the resampled size,
    // and the image would then fail the eligibility check and be skipped for good.
    if (s.busy) return s;

    // An image can be recorded before it has decoded - IntersectionObserver fires for
    // elements that are in view but still loading - and its natural size is 0 then.
    // The src-change branch below is the only other place the size is refreshed, so an
    // image whose URL never changes would keep a size of 0, fail eligible(), and be
    // skipped for as long as the page lived.
    if (!s.nw && img.naturalWidth) {
      s.nw = img.naturalWidth;
      s.nh = img.naturalHeight;
      s.key = null;
    }

    // The site swapped in a different image behind our back.
    const ours = s.blobUrl && cur === s.blobUrl;
    if (!ours && cur !== s.origUrl) {
      dropCache(s);
      s.origUrl = cur;
      s.nw = img.naturalWidth;
      s.nh = img.naturalHeight;
      s.key = null;
      s.status = 'pending';
    }
    return s;
  }

  const CACHE_MAX = 3;   // per image; a 2560-wide PNG blob is a few MB

  // A resampled bitmap is a blob: URL, and a blob stays alive until it is
  // revoked or the document is destroyed. Per-image caches cannot bound that on
  // their own: the caches hang off a WeakMap keyed by the <img>, so if the page
  // removes an element, its state becomes collectable and takes the only
  // reference to those URLs with it - several MB stranded per image, with no way
  // left to free them. This registry is keyed by URL instead of by element, so
  // the total stays bounded no matter what the page does to the DOM.
  const blobs = new Map();   // url -> { s, key, bytes }, in creation order
  let blobBytes = 0;

  function forgetBlob(url) {
    const rec = blobs.get(url);
    if (rec) {
      blobBytes -= rec.bytes;
      blobs.delete(url);
    }
    URL.revokeObjectURL(url);
  }

  // Revoking a blob that is on screen would break the image, so those are kept
  // whatever the budget says. A detached element is displaying nothing, though,
  // and its blob is precisely the kind worth reclaiming - so ask the element,
  // not just the recorded state, which still names its last blob either way.
  function onScreen(rec, url) {
    if (rec.s.blobUrl !== url) return false;
    const img = rec.s.el.deref();
    return !!img && img.isConnected;
  }

  function trackBlob(url, s, key, bytes) {
    blobs.set(url, { s, key, bytes });
    blobBytes += bytes;
    // Oldest first, sparing the one just made and anything still on screen.
    for (const [old, rec] of blobs) {
      if (blobBytes <= CFG.blobBudget) break;
      if (old === url || onScreen(rec, old)) continue;
      rec.s.cache.delete(rec.key);
      if (rec.s.blobUrl === old) rec.s.blobUrl = null;
      forgetBlob(old);
    }
  }

  function dropCache(s) {
    for (const url of s.cache.values()) forgetBlob(url);
    s.cache.clear();
    s.blobUrl = null;
  }

  function trimCache(s) {
    for (const [k, url] of [...s.cache]) {
      if (s.cache.size <= CACHE_MAX) break;
      if (url === s.blobUrl) continue;        // never evict what is on screen
      s.cache.delete(k);
      forgetBlob(url);
    }
  }

  function eligible(s) {
    return s.nw >= CFG.minNaturalWidth && s.nh >= CFG.minNaturalHeight;
  }

  // Chrome gives every file:// resource its own opaque origin, so a local image
  // can never be uploaded to WebGL or read back out of a canvas. Setting
  // crossOrigin on one also stops it loading at all, so CORS must only be asked
  // for where it can help. data: URLs are the one local-ish form that never taints.
  function originKind(url) {
    if (/^data:/i.test(url)) return 'same';
    if (location.protocol === 'file:') return 'file';
    if (/^(blob|filesystem):/i.test(url)) return 'same';
    try {
      const u = new URL(url, location.href);
      if (!/^https?:$/.test(u.protocol)) return 'other';
      return u.origin === location.origin ? 'same' : 'cross';
    } catch { return 'other'; }
  }

  // The encode is the slowest step in the pipeline by a wide margin - far slower than
  // the GPU resample it exists to package - so the container matters. Chrome encodes
  // image/webp at quality 1 losslessly, several times faster than PNG and smaller.
  //
  // That is a Blink implementation detail rather than a guarantee, and a browser that
  // took quality 1 to mean "lossy, maximum" would quietly undo the resampling this
  // script exists to perform. So it is proven once, on random noise, which is the
  // worst case for anything that quantises. Anything unproven falls back to PNG.
  const encoderReady = (async () => {
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      const px = ctx.createImageData(64, 64);
      for (let i = 0; i < px.data.length; i += 4) {
        px.data[i] = (i * 37) & 255;
        px.data[i + 1] = (i * 91) & 255;
        px.data[i + 2] = (i * 173) & 255;
        px.data[i + 3] = 255;
      }
      ctx.putImageData(px, 0, 0);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/webp', 1));
      if (!blob || blob.type !== 'image/webp') return 'image/png';

      const back = document.createElement('canvas');
      back.width = back.height = 64;
      const g = back.getContext('2d', { willReadFrequently: true });
      g.drawImage(await createImageBitmap(blob), 0, 0);
      const a = ctx.getImageData(0, 0, 64, 64).data;
      const b = g.getImageData(0, 0, 64, 64).data;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return 'image/png';
      return 'image/webp';
    } catch {
      return 'image/png';
    }
  })();

  function loadImage(url, kind) {
    return new Promise((res, rej) => {
      const im = new Image();
      // Only ask for CORS where it can actually help. Asking elsewhere breaks
      // loads that would otherwise have worked.
      if (kind === 'cross') im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => rej(new Error(
        kind === 'cross' ? 'blocked: no CORS headers on source' : 'source load failed'));
      im.src = url;
    });
  }

  // Any await inside processImage that can fail to settle would leave s.busy
  // true forever, freezing that image on its last status with no way to recover.
  // Every one of them gets a deadline so a stall surfaces as a visible ERROR.
  function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(label)), ms); }),
    ]).finally(() => clearTimeout(timer));
  }

  function setSrc(img, url) {
    return new Promise((res) => {
      if ((img.currentSrc || img.src) === url && img.complete) return res();
      let settled = false;
      let timer;
      // Must resolve on error and on timeout too: an unresolved promise here
      // would leave s.busy true forever and block that image permanently.
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.removeEventListener('load', finish);
        img.removeEventListener('error', finish);
        res();
      };
      img.addEventListener('load', finish);
      img.addEventListener('error', finish);
      timer = setTimeout(finish, 5000);
      img.src = url;
      // Cached images can complete before the listener attaches.
      if (img.complete) finish();
    });
  }

  function applySize(img, t, s) {
    const d = dpr();
    const cssW = t.w / d, cssH = t.h / d;

    img.style.setProperty('max-width', 'none', 'important');
    img.style.setProperty('max-height', 'none', 'important');
    img.style.setProperty('width', cssW + 'px', 'important');
    img.style.setProperty('height', cssH + 'px', 'important');

    // A per-image override must not disturb the rest of the page. Negative
    // margins keep the element's MARGIN box at the width it would have had
    // without the override, so the container never grows and the images above
    // and below keep their x positions. The border box still paints at full
    // size, overflowing outside the container.
    img.style.removeProperty('margin-left');
    img.style.removeProperty('margin-right');
    s.anchor = null;

    if (s.forcedMode) {
      const baseW = targetSize(s.nw, s.nh, null).w / d;
      const extra = cssW - baseW;
      if (extra > 0.5) {
        const vp = window.visualViewport?.width ?? innerWidth;
        if (cssW <= vp) {
          // Fits on screen: expand symmetrically, stays where it was.
          img.style.setProperty('margin-left', `${-extra / 2}px`, 'important');
          img.style.setProperty('margin-right', `${-extra / 2}px`, 'important');
          s.anchor = 'center';
        } else {
          // Wider than the screen. Overflow to the right only - in a LTR page,
          // left overflow is not scrollable, so a centred image would have its
          // left edge permanently unreachable.
          img.style.setProperty('margin-right', `${-extra}px`, 'important');
          s.anchor = 'left';
        }
      }
    }
  }

  // Two jobs, one transform (transforms never affect layout):
  //  - put an overridden image back where it sat before, whichever way the site
  //    centres things (auto margins and flex both work)
  //  - land on a whole device pixel; a half-pixel offset re-blurs an image that
  //    is otherwise sized correctly
  function snap(img, s) {
    const d = dpr();
    img.style.setProperty('transform', 'none', 'important');
    const r = img.getBoundingClientRect();

    let dx = 0;
    if (s && s.anchor && s.baseRect) {
      const baseLeft = s.baseRect.left - scrollX;
      dx = (s.anchor === 'center'
        ? baseLeft + s.baseRect.width / 2 - r.width / 2
        : baseLeft) - r.left;
    }

    const left = r.left + dx;
    dx += (Math.round(left * d) - left * d) / d;
    const dy = (Math.round(r.top * d) - r.top * d) / d;
    if (dx || dy) {
      img.style.setProperty('transform', `translate(${dx}px, ${dy}px)`, 'important');
    }
  }

  // Per-stage timings. The overlay reports the outcome but not where the time went,
  // and the slow paths here are all awaits on the browser (fetch, encode, load event)
  // rather than on anything this script computes. __crispImages.trace = true.
  //
  // Every line also carries the elapsed time since the last Alt+P, because a stage
  // being quick and the whole thing still feeling slow are different problems and the
  // per-stage figures alone cannot tell them apart.
  let trace = false;
  let traceT0 = 0;

  function traceMark(msg) {
    if (trace) console.log(`[crisp-images] +${Math.round(performance.now() - traceT0)}ms  ${msg}`);
  }

  // Synchronous twin of timed(). Required for anything that must not yield: see the
  // note on the shared canvas in processImage.
  function timeSync(s, label, fn) {
    if (!trace) return fn();
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      traceMark(`#${s.id} ${label} took ${Math.round(performance.now() - t0)}ms`);
    }
  }

  async function timed(s, label, fn) {
    if (!trace) return fn();
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      traceMark(`#${s.id} ${label} took ${Math.round(performance.now() - t0)}ms`);
    }
  }

  async function processImage(img) {
    const s = record(img);
    if (!s.nw || !eligible(s)) return;
    // A resample is async. Dropping a request that arrives mid-flight would lose
    // the most recent intent, so a keypress during processing would appear to do
    // nothing. Queue it and re-run once the current pass finishes.
    if (s.busy) { s.rerun = true; return; }

    const t = targetSize(s.nw, s.nh, s.forcedMode);
    const key = `${s.origUrl}|${t.w}x${t.h}|${quality}`;
    if (s.key === key) return;

    s.busy = true;
    traceMark(`#${s.id} start`);
    try {
      // Size the element up front. The geometry depends on mode alone, so it is fully
      // known here, and the encode below is by far the slowest step - applying the size
      // first means the page reaches its final layout immediately and the sharper
      // bitmap replaces a browser-scaled one, instead of nothing happening until the
      // encode returns. Called again at the end, which is idempotent.
      applySize(img, t, s);

      const kind = originKind(s.origUrl);
      const blocked =
        kind === 'file'
          ? 'file:// is an opaque origin - the GPU path cannot run on local files'
          : kind === 'other' ? 'unsupported URL scheme'
          : null;

      // Both resamplers go through the GPU. That is what makes every quality
      // switch replace the image resource, which is what actually forces Chrome
      // to re-raster - see the note in the shader.
      const useGpu =
        (quality === 'lanczos3' || quality === 'nearest') &&
        t.factor !== 1 &&
        t.w * t.h <= CFG.maxOutputPixels &&
        !blocked &&
        GL.ok();

      if (useGpu) {
        let url = s.cache.get(key);
        const cached = !!url;
        if (!url) {
          // Resolved before the resample, never between it and toBlob - see below.
          const type = await encoderReady;
          // Only reuse the live element when it is definitely untainted.
          const fresh = kind === 'same' && !s.blobUrl && img.complete &&
                        (img.currentSrc || img.src) === s.origUrl;
          const source = fresh ? img
            : await timed(s, 'load source', () =>
                withTimeout(loadImage(s.origUrl, kind), 8000, 'source load timed out'));

          // GL.resample hands back ONE canvas, reused by every image. toBlob snapshots
          // it when called, so the resample and that call must stay in a single
          // synchronous run: yield between them and a concurrently processing image
          // redraws the canvas first, and this image encodes the other one's pixels.
          // Nothing here may await, which is why the timing is timeSync.
          const canvas = timeSync(s, 'gpu resample', () =>
            GL.resample(source, s.nw, s.nh, t.w, t.h, quality));
          const encoding = withTimeout(
            new Promise((r) => canvas.toBlob(r, type, 1)), 8000, 'encode timed out');
          const blob = await timed(s, `${type.slice(6)} encode`, () => encoding);
          if (!blob) throw new Error('encode failed');
          url = URL.createObjectURL(blob);
          s.cache.set(key, url);
          // Claim it before registering: images resample concurrently, and an
          // unclaimed blob is fair game for another image's eviction pass.
          s.blobUrl = url;
          trackBlob(url, s, key, blob.size);
        }

        s.blobUrl = url;
        await timed(s, 'swap src', () => setSrc(img, url));
        trimCache(s);
        img.style.setProperty('image-rendering', 'auto', 'important');
        s.status = quality === 'nearest'
          ? (Number.isInteger(t.factor)
              ? 'nearest (gpu) @ integer — valid'
              : 'nearest (gpu) @ FRACTIONAL — uneven rows expected')
          : `lanczos3 (gpu, ${GL.precision()} intermediate)`;
        if (cached) s.status += ' [cached]';
      } else {
        // Every non-GPU path must show the ORIGINAL bitmap, otherwise it would
        // merely re-size whatever the last resample produced.
        if (s.blobUrl) {
          // Keep s.blobUrl set until the swap has landed, so that anything
          // inspecting state mid-swap still recognises the displayed blob as ours.
          // No revoke here - the blob stays in s.cache for the next switch back.
          await timed(s, 'restore src', () => setSrc(img, s.origUrl));
          s.blobUrl = null;
        }
        if (t.factor === 1) {
          // One image pixel per device pixel: there is nothing to resample, so
          // every quality setting looks the same here. Snapping is what makes
          // that true on screen.
          img.style.setProperty('image-rendering', 'auto', 'important');
          s.status = 'factor 1 - no resampling (all qualities identical here)';
        } else if (quality === 'nearest') {
          // Only reached when the GPU path is unavailable (e.g. file://).
          img.style.setProperty('image-rendering', 'pixelated', 'important');
          s.status = 'nearest (css fallback) — ' + (blocked || 'gpu unavailable');
        } else if (quality === 'browser') {
          img.style.removeProperty('image-rendering');
          s.status = 'chrome bilinear';
        } else {
          img.style.setProperty('image-rendering', 'auto', 'important');
          s.status = blocked ? 'chrome bilinear — ' + blocked
            : t.w * t.h > CFG.maxOutputPixels ? 'over pixel cap - fell back to chrome'
            : 'gpu unavailable: ' + (GL.why() || 'unknown');
        }
      }

      applySize(img, t, s);
      defer(() => snap(img, s));
      s.key = key;
      s.report = { ...t, nw: s.nw, nh: s.nh };
    } catch (e) {
      s.status = 'ERROR: ' + e.message;
      // A missed deadline usually says something about the moment, not the image:
      // a throttled background tab, a busy GPU. Worth one more go later. Anything
      // else - tainted source, unreadable origin - would just fail again.
      s.retryable = /timed out/.test(e.message);
      s.key = key;
      s.report = { ...t, nw: s.nw, nh: s.nh };
      applySize(img, t, s);
      img.style.setProperty('image-rendering', 'auto', 'important');
      console.warn('[crisp-images]', e);
    } finally {
      s.busy = false;
      traceMark(`#${s.id} done - ${s.status}`);
      updateHud();
      if (s.rerun) { s.rerun = false; processImage(img); }
    }
  }

  async function restore(img) {
    const s = state.get(img);
    if (!s || s.busy) return;
    if (s.blobUrl) {
      s.busy = true;                    // same guard as processImage: this is our swap
      await setSrc(img, s.origUrl);
      s.busy = false;
    }
    dropCache(s);
    for (const p of ['width', 'height', 'max-width', 'max-height', 'image-rendering',
                     'transform', 'margin-left', 'margin-right']) {
      img.style.removeProperty(p);
    }
    s.key = null;
    s.status = 'off';
  }

  /* ================================================================== *
   * Scheduling
   * ================================================================== */

  const visible = new Set();

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      // Queued rather than started directly, so a scroll cannot put more work in flight
      // than the cap allows - and pump() re-sorts, so a newly scrolled-to image goes to
      // the front rather than behind whatever was queued earlier.
      if (e.isIntersecting) { visible.add(e.target); if (enabled) { enqueue(e.target); pump(); } }
      else visible.delete(e.target);
    }
    updateHud();
  }, { rootMargin: `${CFG.lazyMargin * 100}%` });

  const watched = new WeakSet();

  // Geometry check, deliberately independent of IntersectionObserver. IO is only
  // a trigger for scroll-driven work; correctness must not depend on it having
  // delivered for a given image yet.
  function nearViewport(img) {
    const r = img.getBoundingClientRect();
    const mx = innerWidth * CFG.lazyMargin, my = innerHeight * CFG.lazyMargin;
    return r.bottom > -my && r.top < innerHeight + my &&
           r.right > -mx && r.left < innerWidth + mx;
  }

  // Reconcile against the current settings. processImage is a no-op when nothing
  // changed, so this is cheap to call often.
  //
  // Deliberately not gated on img.complete: straight after a switch we have just
  // replaced src, so complete is often false. What the pipeline needs is the
  // recorded natural size, and that survives the swap.
  // Distance in pixels from the real viewport - 0 for anything on screen. Ordering by
  // this is what puts the image you are looking at at the front of the queue.
  function viewportDistance(img) {
    const r = img.getBoundingClientRect();
    const dy = r.top > innerHeight ? r.top - innerHeight : (r.bottom < 0 ? -r.bottom : 0);
    const dx = r.left > innerWidth ? r.left - innerWidth : (r.right < 0 ? -r.right : 0);
    return Math.hypot(dx, dy);
  }

  // Encoding is the expensive stage and it contends: five images at once measured
  // 1.2-1.7 s each where one alone took 0.45 s, so everything landed at the speed of
  // the slowest. Running a couple at a time costs nothing in total - the work is the
  // same - but the images actually on screen finish first instead of queueing behind
  // whatever happened to come earlier in the document.
  const MAX_CONCURRENT = 2;
  let running = 0;
  const queue = [];

  function pump() {
    // Re-ordered on every pass rather than at insertion: the queue may have been built
    // before a scroll, and what matters is where things are now.
    if (queue.length > 1) {
      const d = new Map(queue.map((img) => [img, viewportDistance(img)]));
      queue.sort((a, b) => d.get(a) - d.get(b));
    }
    while (running < MAX_CONCURRENT && queue.length) {
      const img = queue.shift();
      if (!img.isConnected) continue;          // removed from the page while queued
      running++;
      Promise.resolve(processImage(img))
        .catch(() => {})
        .then(() => { running--; pump(); });
    }
  }

  function enqueue(img) {
    if (!queue.includes(img)) queue.push(img);
  }

  function processVisible() {
    for (const img of document.images) {
      const s = state.get(img);
      if (!s || !s.nw || !eligible(s)) continue;
      if (visible.has(img) || nearViewport(img)) enqueue(img);
    }
    pump();
  }

  function sweep() {
    detach();
    try {
      // IntersectionObserver stops reporting an element once the page removes it, so
      // it would sit in `visible` for the life of the tab - a plain Set holding a
      // strong reference to a detached <img> and its decoded bitmap. A reader that
      // swaps pages would accumulate them indefinitely, and the count in the overlay
      // would drift further from reality with every page turn.
      for (const img of visible) if (!img.isConnected) visible.delete(img);

      for (const img of document.images) {
        if (!enabled) { restore(img); continue; }
        if (img.complete && img.naturalWidth) record(img);
        if (!watched.has(img)) {
          watched.add(img);
          if (!img.complete) img.addEventListener('load', () => schedule(), { once: true });
          io.observe(img);
        }
      }
      if (enabled) processVisible();
    } finally {
      updateHud();
      attach();
    }
  }

  function invalidateAll() {
    for (const img of document.images) {
      const s = state.get(img);
      if (s) s.key = null;
    }
    if (!enabled) for (const img of document.images) restore(img);
    // sweep(), not processVisible(). While the script is off, sweep records nothing
    // and observes nothing, so `state` and `visible` are both empty - and
    // processVisible() skips any image it has no state for. Switching on has to
    // rebuild that state before there is anything to process.
    else sweep();
    updateHud();
  }

  const observer = new MutationObserver(() => schedule());
  const OPTS = { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] };
  let attached = false;
  const attach = () => { if (!attached) { observer.observe(document.documentElement, OPTS); attached = true; } };
  const detach = () => { if (attached) { observer.disconnect(); attached = false; } };

  // Runs fn after layout has settled, without making that depend on the page being
  // painted.
  //
  // rAF alone is not enough. It fires only when the browser produces a frame, and a
  // visible tab with nothing to repaint may not produce one for a long time - so work
  // queued here would sit until something unrelated caused a repaint, such as the
  // pointer moving. It never fires at all in a hidden tab. Either way the timer is the
  // floor and rAF is the optimisation, so nothing here can stall waiting for a frame.
  function defer(fn) {
    let ran = false;
    const once = () => { if (ran) return; ran = true; fn(); };
    requestAnimationFrame(once);
    setTimeout(once, 32);
  }

  // Coalesces bursts of mutations into one sweep. Safe to latch only because defer's
  // timer always fires: a latch released solely by rAF would stick shut for good in a
  // tab that stopped painting, silently disabling every later sweep.
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    defer(() => { pending = false; sweep(); });
  }

  /* ================================================================== *
   * Interaction
   * ================================================================== */

  // The image the overlay reports on: whichever one the pointer is over.
  let focus = null;

  // Toggle a per-image override. Records where the image sits first, so the
  // enlarged version can be put back on the same spot.
  function toggleOverride(img, wanted) {
    const s = state.get(img);
    if (!s || !eligible(s)) return;
    if (s.forcedMode === wanted) {
      s.forcedMode = null;
      s.baseRect = null;
    } else {
      const r = img.getBoundingClientRect();
      s.baseRect = { left: r.left + scrollX, width: r.width };
      s.forcedMode = wanted;
    }
    s.key = null;
    focus = img;
    processImage(img);
  }

  // Alt + left click toggles one image between the current mode and native 1:1.
  addEventListener('click', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;

    if (e.altKey && enabled) {
      toggleOverride(img, 'native');
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Chrome's image document toggles its own zoom on a plain click, which
    // resizes the image without telling us. Block it.
    if (IMAGE_DOC && enabled) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Alt + right click shows one image at 2x its own pixel resolution, using the
  // current filter. Again to revert. The context menu is suppressed only when
  // Alt is held on an eligible image, so normal right-click still works.
  addEventListener('contextmenu', (e) => {
    if (!enabled || !e.altKey) return;
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const s = state.get(img);
    if (!s || !eligible(s)) return;
    toggleOverride(img, 'double');
    e.preventDefault();
    e.stopPropagation();
  }, true);

  let hoverPending = false;
  addEventListener('mousemove', (e) => {
    if (hoverPending) return;
    hoverPending = true;
    requestAnimationFrame(() => {
      hoverPending = false;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el instanceof HTMLImageElement && state.has(el)) { focus = el; updateHud(); }
    });
  }, { passive: true });

  const MODES = ['fit-width', 'integer', 'native'];
  const QUALITIES = ['lanczos3', 'nearest', 'browser'];

  addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p') {
      enabled = !enabled;
      // Only switching ON starts a new measurement. Resetting on OFF too would
      // re-base work still in flight from the previous ON, so a stage that took a
      // second would report a two-digit elapsed time.
      if (enabled) traceT0 = performance.now();
      traceMark(`Alt+P -> ${enabled ? 'on' : 'off'}`);
      writeFlag('enabled', enabled);
      invalidateAll();
    }
    else if (k === 'h') { hudVisible = !hudVisible; writeFlag('hud', hudVisible); updateHud(); }
    else if (k === 'g') { detailsVisible = !detailsVisible; updateHud(); }
    else if (k === 'm') { mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; invalidateAll(); }
    else if (k === 'q') { quality = QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length]; invalidateAll(); }
    else return;
    e.preventDefault();
  });

  /* ================================================================== *
   * HUD - reports one specific image: the hovered one, else the largest visible
   * ================================================================== */

  function hudTarget() {
    if (focus && state.has(focus) && focus.isConnected) return focus;
    let best = null, bestArea = 0;
    for (const img of visible) {
      const s = state.get(img);
      if (!s || !eligible(s)) continue;
      const a = s.nw * s.nh;
      if (a > bestArea) { bestArea = a; best = img; }
    }
    return best;
  }

  let hud;
  function updateHud() {
    if (!hudVisible) { if (hud) hud.style.display = 'none'; return; }
    if (!hud) {
      hud = document.createElement('div');
      hud.style.cssText = [
        'position:fixed', 'z-index:2147483647', 'right:8px', 'bottom:8px',
        'background:rgba(0,0,0,.85)', 'color:#0f0', 'font:12px/1.45 Consolas,monospace',
        'padding:8px 10px', 'border-radius:6px', 'pointer-events:none',
        'white-space:pre', 'text-align:left', 'max-width:60vw',
      ].join(';');
      (document.body || document.documentElement).appendChild(hud);
    }
    hud.style.display = 'block';

    const vp = viewportDevice();

    // Always shown: what the script is doing, and how to drive it.
    const L = [
      `crisp-images ${enabled ? 'ON' : 'OFF'}   mode=${mode}  quality=${quality}`,
      // Label names what the key will do, not what it is called.
      `Alt+P ${enabled ? 'off' : 'on'}  Alt+M mode  Alt+Q quality  Alt+H hud  Alt+G details`,
      'Alt+LeftClick = 1:1   Alt+RightClick = 2x native',
    ];

    // Diagnostics, hidden until Alt+G: this image's outcome first, then the context.
    if (detailsVisible) {
      const img = hudTarget();
      const s = img && state.get(img);
      if (s) {
        L.push(`status  ${s.status}`);
        L.push(`source  ${s.nw}x${s.nh}`);
        if (s.report) {
          L.push(`output  ${s.report.w}x${s.report.h} device px (${Math.round((s.report.w / vp.w) * 100)}% width)`);
          L.push(`factor  ${s.report.factor.toFixed(4)}` +
                 (s.forcedMode ? `  [${s.forcedMode}${s.anchor ? ', ' + s.anchor + '-anchored' : ''}]` : ''));
        }
      } else {
        L.push('no eligible image in view');
      }
      // "in range", not "visible": this counts what the IntersectionObserver reports,
      // and its root is the viewport grown by lazyMargin on every side - at 1.5 that is
      // a box four viewports tall and four wide, so the figure is normally well above
      // the number of images actually on screen. Most of the excess on a real page is
      // furniture - avatars, icons, banners - so the second figure is how many of them
      // clear minNaturalWidth/Height and are therefore candidates for work.
      let passing = 0;
      for (const el of visible) {
        const st = state.get(el);
        if (st && st.nw && eligible(st)) passing++;
      }
      L.push(`in range ${visible.size} (${passing} pass filter)   ` +
             `cache ${(blobBytes / 1e6).toFixed(1)} MB   cached images ${blobs.size}`);
      // Which image the rows above describe.
      if (s) L.push(`image #${s.id}${focus === img ? ' (hovered)' : ' (largest visible)'}`);
      L.push(`devicePixelRatio ${vp.r}   viewport ${vp.w}x${vp.h} device px` +
             (IMAGE_DOC ? '   [chrome image doc]' : ''));
    }

    hud.textContent = L.join('\n');
  }

  /* ================================================================== */

  if (IMAGE_DOC) {
    const st = document.createElement('style');
    st.textContent =
      'html,body{margin:0;background:#1a1a1a}' +
      'img{cursor:default!important;max-width:none!important;max-height:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  // Debug handle, for when something looks wrong and the overlay is not enough.
  // In DevTools:
  //   __crispImages.report()                 - every tracked image and its status
  //   __crispImages.memory()                 - what the resample cache is holding
  //   __crispImages.process(document.images[0])
  //   __crispImages.quality = 'nearest'
  //   __crispImages.trace = true            - per-stage timings, for "why is it slow"
  window.__crispImages = {
    sweep, invalidateAll,
    process: (img) => processImage(img || document.images[0]),
    memory: () => ({ blobs: blobs.size, mb: +(blobBytes / 1e6).toFixed(2),
                     budgetMb: CFG.blobBudget / 1e6 }),
    state: (img) => state.get(img || document.images[0]),
    report: () => [...document.images].map((img) => {
      const s = state.get(img);
      return s ? {
        id: s.id, src: s.origUrl.slice(0, 60), natural: `${s.nw}x${s.nh}`,
        origin: originKind(s.origUrl),
        output: s.report ? `${s.report.w}x${s.report.h} @${s.report.factor.toFixed(3)}` : '-',
        status: s.status,
      } : { src: (img.currentSrc || img.src).slice(0, 60), status: 'not tracked' };
    }),
    get mode() { return mode; },
    set mode(v) { mode = v; invalidateAll(); },
    get quality() { return quality; },
    set quality(v) { quality = v; invalidateAll(); },
    get trace() { return trace; },
    set trace(v) { trace = !!v; },
  };

  // Nothing is worth keeping once the document is on its way out - unless it is
  // only going into the back/forward cache, in which case it can be restored
  // intact and the per-image caches would be left pointing at revoked URLs.
  addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    for (const url of blobs.keys()) URL.revokeObjectURL(url);
    blobs.clear();
    blobBytes = 0;
  });

  addEventListener('resize', invalidateAll);
  window.visualViewport?.addEventListener('resize', invalidateAll);
  addEventListener('load', schedule);
  document.addEventListener('visibilitychange', () => {
    // Coming back to a tab is the moment a timed-out image is most likely to
    // succeed, and it takes a deliberate action to get here, so this cannot spin.
    if (document.visibilityState === 'visible') {
      for (const img of document.images) {
        const st = state.get(img);
        if (st && st.retryable) { st.retryable = false; st.key = null; }
      }
    }
    schedule();
  });
  schedule();
})();
