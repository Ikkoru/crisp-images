// ==UserScript==
// @name         Crisp Images - fix blurry images on HiDPI / 4K screens
// @name:ja           Crisp Images - 高DPI/4Kディスプレイで画像がぼやける問題を修正
// @name:zh-CN        Crisp Images - 修复高DPI/4K屏幕上模糊的图片
// @name:ru           Crisp Images - исправляет размытые изображения на HiDPI / 4K экранах
// @name:es           Crisp Images - corrige imágenes borrosas en pantallas HiDPI / 4K
// @name:pt-BR        Crisp Images - corrige imagens borradas em telas HiDPI / 4K
// @namespace    https://github.com/Ikkoru/crisp-images
// @version      3.19
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

    // Start switched on for every site?
    // false: off everywhere until you switch it on for a site (Alt+P).
    // true:  on everywhere. Not recommended.
    // Either way, switching a site on or off is remembered and wins over this.
    enabledOnStart: false,

    // Show the overlay when a page opens? Alt+H toggles it, remembered per site.
    hudOnStart: true,

    // Show the overlay's diagnostic rows when a page opens? Alt+G toggles them until
    // the page reloads. Not remembered per site, so set it here.
    detailsOnStart: false,

    // Leave an image alone unless it is at least this wide AND this tall, in image
    // pixels. Keeps avatars, icons and banners out.
    minNaturalWidth: 800,
    minNaturalHeight: 1066,

    // How big to draw images:
    //   'fit-width' - fill the width (fitWidth below says which width)
    //   'integer'   - the biggest whole-number zoom (2x, 3x...) that fits that width
    //   'native'    - one image pixel per screen pixel
    // Single images can be switched with a click; see the shortcuts at the bottom.
    mode: 'fit-width',

    // Which filter to resample with:
    //   'lanczos3' - sharpest and cleanest. Not for pixel art.
    //   'nearest'  - hard pixel edges, for pixel art. Only even at whole-number zooms,
    //                so pair it with 'integer'.
    //   'browser'  - the browser's own scaling: soft, but costs nothing.
    quality: 'lanczos3',

    // What "fit width" fills. 'integer' mode fits into the same width.
    //   'space'     - all the free width beside the image, up to the window's edges.
    //                 Never covers a sidebar, a panel or text next to the image, and
    //                 never goes past an edge that would cut it off. Nothing on the page
    //                 moves sideways; what is below moves down as the image grows.
    //   'container' - only the box the page gives the image. Keeps the page's margins,
    //                 so a narrow centred column leaves empty bars at both sides.
    //   'window'    - the window's width, wherever the image sits. Can run off the
    //                 right edge. How it worked before v3.18.
    // Where the image's box sizes itself to fit its contents, all three use the window.
    fitWidth: 'space',

    // false: fit the width only; tall pages run off the bottom and you scroll.
    // true:  fit the height too, so the whole image is on screen at once.
    fitHeightToo: false,

    // Largest image to resample, in pixels (64 megapixels). Bigger ones are left to
    // the browser.
    maxOutputPixels: 64e6,

    // Memory for keeping resampled images, in bytes (64 MB), so switching filters or
    // scrolling back is instant. Past it the oldest go, and are redone if you come back.
    // Images on screen are never dropped, so it can go a little over. Everything is
    // freed when you leave the page. This also holds the copies kept on sites that take
    // their image data back after loading (MangaPlus); those stay while their image does.
    blobBudget: 64e6,

    // How far outside the window to get images ready, in screenfuls in every direction,
    // so they are done before you scroll to them.
    lazyMargin: 1.5,

    // Shortcuts. The overlay shows whatever you set here. '' switches one off.
    //   Keys:   modifiers, then a key, joined by '+':  'Alt+P', 'Ctrl+Shift+K', 'F2'.
    //           Modifiers are Alt (Option on a Mac), Ctrl, Shift and Meta (Cmd on a Mac).
    //           Letters and digits also work on non-Latin keyboard layouts.
    //   Clicks: modifiers, then LeftClick, RightClick or MiddleClick: 'Alt+LeftClick'.
    //           They act on the image under the pointer, even through a page's click
    //           overlay. Click the same way again to undo.
    // Keys do nothing while you are typing in a text field.
    keyToggle:   'Alt+P',           // switch the script on or off for this site
    keyMode:     'Alt+M',           // next mode: fit-width, integer, native
    keyQuality:  'Alt+Q',           // next filter: lanczos3, nearest, browser
    keyOverlay:  'Alt+H',           // show or hide the overlay
    keyDetails:  'Alt+G',           // show or hide the overlay's diagnostic rows
    clickNative: 'Alt+LeftClick',   // this image at one image pixel per screen pixel
    clickDouble: 'Alt+RightClick',  // this image at twice its own resolution

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

  // Shown on the overlay's last diagnostic row, so a bug report says which build it came
  // from - and so you can tell at a glance whether the copy Tampermonkey is running is
  // the one you just edited, which is the single easiest mistake to make here.
  //
  // KEEP IN STEP WITH @version IN THE HEADER ABOVE. A userscript cannot read its own
  // metadata under `@grant none`: GM_info only exists once something is granted, and
  // granting anything moves the script into the sandbox and costs the page-reachable
  // window.__crispImages handle. A hand-kept constant is the cheaper trade.
  const VERSION = '3.19';

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
    let maxDim = 0;

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

        // The largest side this GPU will draw or sample, whichever limit bites first. Ask
        // for a bigger canvas and WebGL does not refuse - it quietly hands back a smaller
        // drawing buffer, and the whole image is then squashed into it. Measured: a
        // 2560x9600 output came back as 2560x8192 with every row there, just compressed,
        // then stretched back out by the browser. Twice resampled and labelled Lanczos3.
        const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        maxDim = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),
                          gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), vp[0], vp[1]);

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
      // The limits above are what the GPU advertises; memory pressure can still make the
      // browser allocate less. Either way the result would be squashed, so check what we
      // actually got rather than trusting what we asked for.
      if (gl.drawingBufferWidth !== dstW || gl.drawingBufferHeight !== dstH) {
        throw tooLarge(`the GPU gave a ${gl.drawingBufferWidth}x${gl.drawingBufferHeight} ` +
                       `buffer for a ${dstW}x${dstH} image`);
      }

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

    return {
      resample, ok: () => init(), why: () => why, precision: () => (halfFloat ? '16f' : '8bit'),
      maxDim: () => (init() ? maxDim : 0),
    };
  })();

  // A limit of the machine or the format, not a failure: the image is left to the browser's
  // own scaling, with a status that says why, exactly as for a host that refuses CORS.
  function tooLarge(msg) {
    const e = new Error(msg);
    e.tooLarge = true;
    return e;
  }

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

  // The block box the image is laid out in. An <img> is inline-level, so its containing
  // block is the nearest ancestor that is not itself inline.
  function containingBlock(img) {
    let el = img.parentElement;
    while (el) {
      const d = getComputedStyle(el).display;
      if (d !== 'inline' && d !== 'contents') return el;
      el = el.parentElement;
    }
    return null;
  }

  // Block-level outer displays. A box with one of these and a width of auto takes its
  // width from its PARENT, which is the whole point: its width cannot depend on the
  // image inside it, so measuring it after we have resized that image is safe.
  const BLOCK_LEVEL = new Set(['block', 'flow-root', 'list-item', 'flex', 'grid']);

  // Everything below shrinks to fit its contents, so measuring it would hand back the
  // width we ourselves just set. Left unguarded, an image could then only ever keep or
  // lose width - it would ratchet down and never recover.
  function widthComesFromParent(el, cs) {
    if (cs.float !== 'none') return false;
    if (cs.position === 'absolute' || cs.position === 'fixed') return false;
    if (!BLOCK_LEVEL.has(cs.display)) return false;          // inline-block, table, ...
    if (/(min|max|fit)-content/.test(cs.width)) return false;
    const p = el.parentElement;
    if (p && /flex|grid/.test(getComputedStyle(p).display)) return false;  // it is an item
    return true;
  }

  // Does this box cut off whatever sticks out of its sides? The body's overflow is handed
  // to the viewport unless the root sets its own, and the body itself then clips nothing.
  function clips(el, cs) {
    if (cs.overflowX === 'visible' && !/paint|strict|content/.test(cs.contain)) return false;
    if (el === document.body &&
        getComputedStyle(document.documentElement).overflowX === 'visible') return false;
    return true;
  }

  // The column an image sits in, and everything that could stand beside it. Shared by
  // every image in the same containing block, so it is measured once per burst of work
  // rather than once per image: see layoutOf.
  //
  // `boxes` are the other children of every ancestor on the way up - the only things that
  // can sit beside the column - that do not straddle its centre line: whatever spans the
  // centre is above, below or on top of the image, and never limits how wide it can be.
  // The climb stops at the first ancestor that clips, since nothing past its edges would
  // be seen anyway.
  function measureColumn(cb) {
    const cs = getComputedStyle(cb);
    if (!widthComesFromParent(cb, cs)) return null;
    const r = cb.getBoundingClientRect();
    const left = r.left + cb.clientLeft;
    const cbL = left + (parseFloat(cs.paddingLeft) || 0);
    const cbR = left + cb.clientWidth - (parseFloat(cs.paddingRight) || 0);
    if (!(cbR - cbL > 0)) return null;

    const c = (cbL + cbR) / 2;
    const vpW = document.documentElement.clientWidth;
    let clipL = 0, clipR = vpW;
    const boxes = [];
    const consider = (k) => {
      const b = k.getBoundingClientRect();
      if (!b.width || !b.height) {
        // A display:contents wrapper has no box of its own, but its children do.
        if (getComputedStyle(k).display === 'contents') for (const g of k.children) consider(g);
        return;
      }
      if (b.left < c && b.right > c) return;
      const kcs = getComputedStyle(k);
      if (kcs.visibility !== 'visible') return;
      const pos = kcs.position;
      // Floating buttons and badges sit on top of the page, not beside the column.
      if ((pos === 'fixed' || pos === 'absolute') && b.height < innerHeight / 3) return;
      // Fixed and sticky boxes follow the scroll, so they will be beside the image
      // whenever it is on screen - unless they are parked off the top or bottom.
      const pinnedToScreen = pos === 'fixed' || pos === 'sticky';
      if (pinnedToScreen && (b.bottom <= 0 || b.top >= innerHeight)) return;
      boxes.push({ el: k, side: b.right <= c ? -1 : 1, left: b.left, right: b.right,
                   top: b.top, bottom: b.bottom, pinnedToScreen });
    };

    let child = null;
    for (let el = cb; el; child = el, el = el.parentElement) {
      for (const k of el.children) if (k !== child) consider(k);
      if (el === document.documentElement) break;
      if (clips(el, el === cb ? cs : getComputedStyle(el))) {
        const er = el.getBoundingClientRect();
        clipL = Math.max(clipL, er.left + el.clientLeft);
        clipR = Math.min(clipR, er.left + el.clientLeft + el.clientWidth);
        break;
      }
    }
    return { cb, cbL, cbR, clipL, clipR, vpW, boxes };
  }

  // Short-lived: a sweep asks for the same column once per image in it, and the layout
  // cannot change within one burst of work. Anything older is measured again.
  const columns = new Map();
  let columnsAt = 0;

  // Where the image may sit across the page, in client css px: {cbL, cbR} is the content
  // box of the block it is laid out in, {L, R} the band it may fill. null where the window
  // is the only honest answer - see CFG.fitWidth.
  //
  // None of this measures the image, or anything whose width depends on it: resizing the
  // image cannot feed back into the answer, which is what would otherwise let it creep
  // narrower with every pass.
  function layoutOf(img, nw, nh) {
    if (CFG.fitWidth === 'window' || !img || !nw) return null;
    const cb = containingBlock(img);
    if (!cb) return null;
    const now = performance.now();
    if (now - columnsAt > 50) { columns.clear(); columnsAt = now; }
    let m = columns.get(cb);
    if (m === undefined) { m = measureColumn(cb); columns.set(cb, m); }
    if (!m) return null;

    if (CFG.fitWidth === 'container') {
      return { cbL: m.cbL, cbR: m.cbR, L: m.cbL, R: m.cbL + Math.min(m.cbR - m.cbL, m.vpW) };
    }

    // The rows the image will cover at most - as tall as it would be at the window's full
    // width - so that growing it cannot bring something new alongside.
    const top = img.getBoundingClientRect().top;
    const bottom = top + m.vpW * nh / nw;
    let L = m.clipL, R = m.clipR;
    for (const b of m.boxes) {
      if (b.el.contains(img)) continue;
      if (!b.pinnedToScreen && (b.bottom <= top || b.top >= bottom)) continue;
      if (b.side < 0) L = Math.max(L, b.right);
      else R = Math.min(R, b.left);
    }
    // A band under half the column means something beside it was misread. The column
    // itself is always a safe answer.
    if (R - L < (m.cbR - m.cbL) / 2) { L = m.cbL; R = m.cbR; }
    return { cbL: m.cbL, cbR: m.cbR, L, R };
  }

  function targetSize(img, nw, nh, forcedMode) {
    const vp = viewportDevice();
    const m = forcedMode || mode;

    // Both of these are explicit sizes asked for by the user, so they ignore the
    // available width on purpose and are allowed to overflow.
    if (m === 'native') return { w: nw, h: nh, factor: 1 };
    // 2x the image's own pixels, regardless of viewport - a detail-inspection view.
    if (m === 'double') return { w: nw * 2, h: nh * 2, factor: 2 };

    // Width to fit into, in device px. Never wider than the window - a band reported as
    // wider is a horizontal scroller or something misread, and the window is the honest
    // ceiling.
    const lay = layoutOf(img, nw, nh);
    const avail = lay ? Math.max(1, Math.min(vp.w, Math.floor((lay.R - lay.L) * vp.r))) : vp.w;

    if (m === 'integer') {
      let k = Math.floor(avail / nw);
      if (CFG.fitHeightToo) k = Math.min(k, Math.floor(vp.h / nh));
      k = Math.max(1, Math.min(k, 8));
      return { w: nw * k, h: nh * k, factor: k, lay };
    }

    let f = avail / nw;
    if (CFG.fitHeightToo) f = Math.min(f, vp.h / nh);
    return { w: Math.round(nw * f), h: Math.round(nh * f), factor: f, lay };
  }

  /* ================================================================== *
   * Per-image state
   * ================================================================== */

  let idCounter = 0;
  const state = new WeakMap();

  // The <source> siblings of an <img> inside <picture>. The browser picks from these
  // before it ever looks at the img's own src or srcset.
  function sourcesOf(img) {
    const pic = img.parentElement;
    if (!pic || pic.tagName !== 'PICTURE') return [];
    return [...pic.children].filter((el) => el.tagName === 'SOURCE');
  }

  // What the PAGE has asked this element to show: its attributes, not what is on screen.
  //
  // The two disagree for a while after every change. Measured: synchronously after
  // `img.src = next`, currentSrc and naturalWidth still describe the previous image;
  // while the next one loads, currentSrc is '' and the size is 0x0; only after the load
  // do they describe the new image. The attributes change at the instant the page acts,
  // which makes them the one reliable way to tell "the page has moved on" apart from
  // "our own swap is showing" - and to notice it DURING a resample, not only afterwards.
  function pageKey(img) {
    let k = img.getAttribute('src') || '';
    const set = img.getAttribute('srcset');
    if (set !== null) k += '\n' + set;
    for (const so of sourcesOf(img)) k += '\n' + (so.getAttribute('srcset') || '');
    return k;
  }

  // The page's own attributes, verbatim, so that letting go of the element can put back
  // exactly what was there - not the absolute URL a relative one resolved to.
  function captureRaw(img) {
    return {
      src: img.getAttribute('src'),
      srcset: img.getAttribute('srcset'),
      sources: sourcesOf(img).map((so) => [so, so.getAttribute('srcset')]),
    };
  }

  // srcset or <picture>: the browser chooses the file, and ignores src while it does.
  const responsive = (raw) => raw.srcset !== null || raw.sources.length > 0;

  function record(img) {
    let s = state.get(img);

    if (!s) {
      s = {
        id: ++idCounter, el: new WeakRef(img),
        // What the page asked for (see pageKey), what it looks like while one of our
        // bitmaps is showing instead, and the page's own attributes for putting back.
        siteKey: null, ourKey: null, raw: null,
        // The file actually loaded for it, and that file's size in image pixels. Empty
        // and 0 until it has finished loading. `gen` counts sources, so cache keys stay
        // short even when the source is a multi-megabyte data: URL.
        origUrl: '', nw: 0, nh: 0, gen: 0, pixelsKnown: false,
        // safeUrl is our own copy of the ORIGINAL bitmap, taken when the source is
        // the kind a site can take away again. See sourceUrl() below.
        blobUrl: null, safeUrl: null, key: null,
        forcedMode: null, busy: false, rerun: false,
        retryable: false, reverts: 0, limit: null, waiting: false,
        status: 'pending', report: null, anchor: null, baseRect: null,
        // key -> blob URL, so flipping between filters you have already seen is
        // instant instead of a fresh resample plus PNG encode each time.
        cache: new Map(),
        // Inline styles of the <img> itself: the page's values from before we wrote
        // ours, and what we last wrote. See setOwn().
        saved: null, wrote: null,
      };
      state.set(img, s);
      adopt(img, s, pageKey(img));
      return s;
    }

    // Ignore attribute changes while a swap of ours is in flight: the values passing
    // through are our own. Treating them as a new source would record our resampled
    // bitmap as the original, and its size as the natural size.
    if (s.busy) return s;

    const k = pageKey(img);
    if (k !== s.siteKey && k !== s.ourKey) {
      // The page pointed this element at something new.
      dropCache(s);
      adopt(img, s, k);
    } else if (k === s.siteKey && s.blobUrl) {
      // The page put its own file back over our bitmap - usually a lazy-loader that
      // re-asserts src. Swap ours back in, but only a few times: past that the page is
      // fighting us, and the browser's own scaling beats an image that flickers.
      s.blobUrl = null;
      s.key = null;
      if (++s.reverts > 3) {
        s.limit = { key: '*', why: 'the page keeps putting its own image back' };
      }
    }
    if (!s.origUrl) settle(img, s);
    return s;
  }

  function adopt(img, s, k) {
    s.siteKey = k;
    s.ourKey = null;
    s.raw = captureRaw(img);
    s.origUrl = '';
    s.nw = s.nh = 0;
    s.gen++;
    s.pixelsKnown = !responsive(s.raw);
    s.key = null;
    s.reverts = 0;
    s.limit = null;
    s.status = 'pending';
    settle(img, s);
  }

  // Take what the element shows as the source - once it has finished loading what the
  // page asked for, and not before: until then its size is either 0 or the previous
  // image's.
  //
  // Nothing else would notice that moment. A reader that turns pages by changing the src
  // of one <img> causes a mutation when it sets the attribute, but none when the file
  // arrives, so without this listener the new page sat at 0x0 - 'pending', and scaled by
  // the browser - until something unrelated happened to run a sweep.
  function settle(img, s) {
    if (img.complete && img.naturalWidth && img.currentSrc) {
      s.origUrl = img.currentSrc;
      s.nw = img.naturalWidth;
      s.nh = img.naturalHeight;
      s.key = null;
    } else if (!s.waiting) {
      s.waiting = true;
      const done = () => {
        s.waiting = false;
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        if (enabled) schedule();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    }
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
  //
  // A snapshot is pinned on the same terms. While its element is on the page it is the
  // only surviving copy of that image's original, so reclaiming it would put the image
  // straight back into the failure it exists to prevent.
  function pinned(rec, url) {
    const img = rec.s.el.deref();
    if (!img || !img.isConnected) return false;
    return rec.s.blobUrl === url || rec.s.safeUrl === url;
  }

  function trackBlob(url, s, key, bytes) {
    blobs.set(url, { s, key, bytes });
    blobBytes += bytes;
    // Oldest first, sparing the one just made and anything still on screen.
    for (const [old, rec] of blobs) {
      if (blobBytes <= CFG.blobBudget) break;
      if (old === url || pinned(rec, old)) continue;
      rec.s.cache.delete(rec.key);       // a no-op for a snapshot, which is not cached
      if (rec.s.blobUrl === old) rec.s.blobUrl = null;
      if (rec.s.safeUrl === old) rec.s.safeUrl = null;
      forgetBlob(old);
    }
  }

  // keepSnapshot is for switching the script off: see restore(). Everywhere else the
  // snapshot must go with the cache, because dropCache is what runs when the site puts a
  // DIFFERENT image in this element - and a snapshot of the previous page would then be
  // silently resampled in place of the new one.
  function dropCache(s, keepSnapshot) {
    for (const url of s.cache.values()) forgetBlob(url);
    s.cache.clear();
    s.blobUrl = null;
    if (s.safeUrl && !keepSnapshot) {
      forgetBlob(s.safeUrl);
      s.safeUrl = null;
    }
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
  //
  // Proven on first use rather than at startup: the script loads on every page of every
  // site and is off on nearly all of them, where an encode and a decode per page load is
  // pure waste. It has a deadline like every other await in the pipeline - without one, a
  // page whose canvas never called back would hold every resample behind it forever.
  let encoderProbe = null;
  const encoder = () => (encoderProbe ||=
    withTimeout(probeEncoder(), 3000, 'encoder probe timed out').catch(() => 'image/png'));

  // Largest side the encoder can write. WebP's format stops at 16383; past that Chrome's
  // encoder does not refuse but silently crops - measured, a 2560x17000 canvas came back
  // as a 2560x16383 WebP holding only the top of the picture.
  const encoderMax = (type) => (type === 'image/webp' ? 16383 : Infinity);

  async function probeEncoder() {
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
  }

  // Where to load this image's ORIGINAL bitmap from - not always the URL the page used.
  const sourceUrl = (s) => s.safeUrl || s.origUrl;

  // Which sources can be taken away again.
  //
  // A reader that decrypts pages into blob: URLs may revoke each one the moment its
  // <img> has loaded. A revoked blob is gone for good: a second Image() gets
  // net::ERR_FILE_NOT_FOUND and fetch() throws outright, so there is no way back to the
  // bytes. Measured on MangaPlus; reproduced with a control in
  // testkit/revoked-blob-selftest.html. MangaDex serves blob: pages too and does NOT
  // revoke them, which is the only reason re-reading a source ever appeared to work.
  //
  // https: sources stay in the HTTP cache and data: URLs carry their own bytes, so both
  // re-load reliably and neither is worth an extra encode. A site handing out
  // short-lived signed https URLs would need this widened; the symptom would be the
  // same 'source load failed' on the second quality switch.
  const volatileSource = (url) => /^blob:/i.test(url);

  // Image hosts that turned out to send no Access-Control-Allow-Origin.
  //
  // Whether a cross-origin server allows a CORS read cannot be known in advance, so the
  // first image from a host has to try and fail. Remembering the answer keeps every
  // later image on that host off a request that is going to be refused - which also
  // stops the console filling with one CORS complaint per page.
  //
  // These pixels genuinely cannot be read: the page's own <img> displays fine, but a
  // canvas that has drawn it is tainted, so there is no resample and no snapshot to be
  // had. That is a fact about the host, not a fault, and it is reported as a limitation
  // rather than an error.
  const noCors = new Set();
  const hostOf = (url) => { try { return new URL(url, location.href).origin; } catch { return ''; } };

  // Copy the original out of the live element while it is still there.
  //
  // The decoded bitmap survives revocation inside the <img> - that is what makes any of
  // this possible, and it is verified rather than assumed (see the selftest above,
  // where a control proves the URL really is dead first). Reading pixels back needs an
  // untainted element, which is the same condition the GPU path already requires, so
  // wherever resampling can run at all this can too.
  //
  // No network request: the script still only ever re-reads an image the page already
  // loaded, and now it does not even do that.
  async function snapshot(img, s, type) {
    const cv = document.createElement('canvas');
    cv.width = s.nw;
    cv.height = s.nh;
    // Synchronous, and before the first await - so the pixels are captured even if the
    // site swaps this element's src while the encode below is still running.
    //
    // Drawn at an explicit size. drawImage(img, 0, 0) draws at the element's natural size,
    // and for a srcset candidate that is the density-corrected size - a 2250-wide file
    // offered as `2x` has a naturalWidth of 1125 - so the copy would silently be half
    // resolution. s.nw is the file's own pixel width.
    cv.getContext('2d').drawImage(img, 0, 0, s.nw, s.nh);
    const blob = await withTimeout(new Promise((r) => cv.toBlob(r, type, 1)),
                                   8000, 'snapshot encode timed out');
    if (!blob) throw new Error('snapshot encode failed');
    const url = URL.createObjectURL(blob);
    s.safeUrl = url;
    trackBlob(url, s, null, blob.size);
    return url;
  }

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

  // Resolves TRUE once the element has finished loading what its attributes now name
  // (and, given a URL, is showing that URL), FALSE if it failed or timed out. It must
  // never reject - an unresolved promise here would leave s.busy true forever and block
  // that image permanently - but the caller does need the answer. Swallowing it outright
  // is what let a dead source show as a broken-image icon with nothing in the overlay to
  // explain it.
  //
  // Called straight after the attributes are written, in the same task: load and error
  // are always dispatched later, so the listeners cannot miss them, and an image the
  // browser already holds reports complete synchronously.
  function waitShown(img, url) {
    const showing = () => img.complete && img.naturalWidth > 0 && (!url || img.currentSrc === url);
    return new Promise((res) => {
      if (showing()) return res(true);
      let settled = false;
      let timer;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        res(ok);
      };
      const onLoad = () => finish(showing());
      const onError = () => finish(false);
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      timer = setTimeout(() => finish(showing()), 5000);
    });
  }

  const setAttr = (el, name, v) => (v === null ? el.removeAttribute(name) : el.setAttribute(name, v));

  // Show one of our own bitmaps. On a responsive image that means srcset and every
  // <picture> source too: the browser picks from those and ignores src altogether, which
  // is why a plain src swap used to leave such an image showing the page's own file
  // while the overlay reported a resample. A bare URL in srcset is a single candidate at
  // 1x, so `sizes` stops mattering and the natural size is the bitmap's own.
  function showOurs(img, s, url) {
    if (img.getAttribute('src') !== url || (responsive(s.raw) && img.getAttribute('srcset') !== url)) {
      if (responsive(s.raw)) {
        for (const [so] of s.raw.sources) so.setAttribute('srcset', url);
        img.setAttribute('srcset', url);
      }
      img.setAttribute('src', url);
    }
    // What the element looks like while it shows ours. Taken now, synchronously: after
    // the await, a change of the page's own would otherwise be mistaken for ours.
    s.ourKey = pageKey(img);
    return waitShown(img, url);
  }

  // Put back exactly what the page had - its attributes verbatim - and wait for whatever
  // the browser then chooses to load.
  function showSite(img, s) {
    const r = s.raw;
    if (pageKey(img) !== s.siteKey) {
      for (const [so, v] of r.sources) setAttr(so, 'srcset', v);
      setAttr(img, 'srcset', r.srcset);
      setAttr(img, 'src', r.src);
    }
    s.ourKey = null;
    return waitShown(img, null);
  }

  /* ------------------------------------------------------------------ *
   * Containers the site sized itself
   * ------------------------------------------------------------------ */
  //
  // Some readers write an explicit pixel size onto the element wrapping the image,
  // worked out from that image's ORIGINAL box. Resize the image and the number goes
  // stale: too small and an overflow:hidden wrapper clips it, too large and the
  // difference is left as dead space. Measured wrappers, with what each carries:
  //
  //   kmanga        div.c-viewer__page   height:800px; width:561.8px; overflow:hidden
  //   e-hentai MPV  div#image_N.mimg     height:1424px; max-width:994px
  //   e-hentai /s/  div#i1.sni           width:994px
  //
  // An explicit list, not a general rule. A general rule has to guess which ancestors
  // are safe to touch, and on these same sites a wrong guess breaks the page worse than
  // the clipping does: .c-viewer__pages-wrap is the scroll container, and
  // .c-viewer__pages is tens of thousands of pixels of stacked pages whose heights ARE
  // the viewer's scroll math. Selectors are matched UPWARD from the image, so nothing
  // that does not actually contain it is ever touched. See tasks.md for the opt-in
  // general version.
  const CONTAINER_RULES = [
    { host: /(^|\.)kmanga\.kodansha\.com$/,       selectors: ['.c-viewer__page'] },
    { host: /(^|\.)(e-hentai|exhentai)\.org$/,    selectors: ['.mimg', '#i1'] },
  ];
  // Settable at runtime via __crispImages.containers, which is how to find a working
  // selector on a site that is not listed yet without editing the script.
  let CONTAINERS =
    (CONTAINER_RULES.find((r) => r.host.test(location.hostname)) || {}).selectors || null;

  // 'auto'/'none'/'visible' rather than the image's new size: the wrapper then follows
  // the image whatever it is set to next, and no number of ours can go stale in turn.
  const RELAX = { width: 'auto', height: 'auto', 'max-width': 'none', 'max-height': 'none',
                  overflow: 'visible' };
  const RELAX_PROPS = Object.keys(RELAX);
  const relaxedEls = new WeakMap();   // element -> its inline values before we touched it

  function relaxContainers(img) {
    if (!CONTAINERS) return;
    for (const sel of CONTAINERS) {
      const el = img.closest(sel);
      if (!el) continue;
      // Save once. Re-assert every time: these viewers recalculate their own inline
      // sizes on resize and on page turns, and writing the same property again replaces
      // ours outright - !important does not protect an inline value from the next
      // inline value.
      if (!relaxedEls.has(el)) {
        const was = {};
        for (const p of RELAX_PROPS) {
          was[p] = [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)];
        }
        relaxedEls.set(el, was);
      }
      for (const p of RELAX_PROPS) el.style.setProperty(p, RELAX[p], 'important');
    }
  }

  function unrelaxContainers(img) {
    if (!CONTAINERS) return;
    for (const sel of CONTAINERS) {
      const el = img.closest(sel);
      const was = el && relaxedEls.get(el);
      if (!was) continue;
      for (const p of RELAX_PROPS) {
        el.style.removeProperty(p);
        // Put back only what the site had actually set inline; anything it left to a
        // stylesheet must go back to being absent, not to a computed value we invented.
        if (was[p][0]) el.style.setProperty(p, was[p][0], was[p][1]);
      }
      relaxedEls.delete(el);
    }
  }

  /* ------------------------------------------------------------------ *
   * The <img>'s own inline styles
   * ------------------------------------------------------------------ */
  //
  // Every property the script writes on an image goes through setOwn, which remembers
  // what the page had there first, so that letting go puts back exactly that. Many
  // readers set these themselves - e-hentai writes width and height inline, pan-and-zoom
  // viewers drive transform - and simply deleting ours used to take theirs with it, and
  // went on deleting them at every sweep for as long as the script stayed off.
  //
  // Anything present that is not what we last wrote belongs to the page, even if it
  // arrived after we started: that newer value is the one to put back.
  const OWN_PROPS = ['width', 'height', 'max-width', 'max-height', 'margin-left', 'margin-right',
                     'image-rendering', 'transform', 'vertical-align'];

  function setOwn(img, s, prop, value) {
    const st = img.style;
    if (!s.saved) { s.saved = {}; s.wrote = {}; }
    const cur = st.getPropertyValue(prop);
    if (!(prop in s.wrote) || cur !== s.wrote[prop]) {
      s.saved[prop] = [cur, st.getPropertyPriority(prop)];
    }
    if (value === null) st.removeProperty(prop);
    else st.setProperty(prop, value, 'important');
    s.wrote[prop] = st.getPropertyValue(prop);   // as the browser serialises it
  }

  // Hand one property back: the page's value returns, unless the page has written its
  // own since we last did, in which case that one stays.
  function dropOwn(img, s, prop) {
    if (!s.wrote || !(prop in s.wrote)) return;
    if (img.style.getPropertyValue(prop) === s.wrote[prop]) {
      const [v, pri] = s.saved[prop];
      img.style.removeProperty(prop);
      if (v) img.style.setProperty(prop, v, pri);
    }
    delete s.wrote[prop];
    delete s.saved[prop];
  }

  function releaseOwn(img, s) {
    if (!s.saved) return;
    for (const prop of OWN_PROPS) dropOwn(img, s, prop);
    s.saved = s.wrote = null;
  }

  // Has the page rewritten the size we set? Some viewers recompute their images' inline
  // size on their own schedule, and a bitmap drawn for our size then gets scaled by the
  // browser to theirs - twice resampled, still labelled Lanczos3.
  function sizeIntact(img, s) {
    return !!s.wrote && img.style.getPropertyValue('width') === s.wrote.width &&
           img.style.getPropertyValue('height') === s.wrote.height;
  }

  function applySize(img, t, s) {
    const d = dpr();
    const cssW = t.w / d, cssH = t.h / d;

    relaxContainers(img);

    setOwn(img, s, 'max-width', 'none');
    setOwn(img, s, 'max-height', 'none');
    setOwn(img, s, 'width', cssW + 'px');
    setOwn(img, s, 'height', cssH + 'px');

    // An image drawn wider than its column must not disturb the rest of the page.
    // Negative margins keep the element's MARGIN box at the width the layout already
    // gave it, so the column never grows and everything beside, above and below keeps
    // its x position. The border box still paints at full size, past the column's edges.
    let ml = null, mr = null;
    s.anchor = null;

    if (s.forcedMode) {
      // A per-image override keeps the slot the image had without it: the whole column
      // where fit-width had already spread past it, the image's own width otherwise.
      const base = targetSize(img, s.nw, s.nh, null);
      const baseW = base.w / d;
      const colW = base.lay ? base.lay.cbR - base.lay.cbL : Infinity;
      const extra = cssW - Math.min(baseW, colW);
      if (extra > 0.5) {
        const vp = window.visualViewport?.width ?? innerWidth;
        if (cssW <= vp) {
          // Fits on screen: expand symmetrically, stays where it was.
          ml = mr = `${-extra / 2}px`;
          s.anchor = 'center';
        } else {
          // Wider than the screen. Overflow to the right only - in a LTR page,
          // left overflow is not scrollable, so a centred image would have its
          // left edge permanently unreachable.
          mr = `${-extra}px`;
          s.anchor = 'left';
        }
      }
    } else if (t.lay) {
      const { L, R, cbL, cbR } = t.lay;
      const colW = cbR - cbL;
      // Placed explicitly - centred in the free band, which for fit-width means filling
      // it exactly - whenever the page's own alignment would get it wrong: the image is
      // wider than its column, or part of the column is out of bounds. Webtoons is the
      // second case: its column runs past the window's right edge, so an image centred
      // in the column hangs off the screen.
      if (cssW > colW + 0.5 || L > cbL + 0.5 || R < cbR - 0.5) {
        const l = L + (R - L - cssW) / 2 - cbL;
        ml = `${l}px`;
        mr = `${colW - cssW - l}px`;
      }
    }
    if (ml !== null) setOwn(img, s, 'margin-left', ml); else dropOwn(img, s, 'margin-left');
    if (mr !== null) setOwn(img, s, 'margin-right', mr); else dropOwn(img, s, 'margin-right');

    // An inline image sits on the text baseline, which leaves the font's descender space
    // as a strip of background under it. Top-aligned, the line is exactly as tall as the
    // image.
    if (getComputedStyle(img).display === 'inline') setOwn(img, s, 'vertical-align', 'top');
  }

  // Two jobs, one transform (transforms never affect layout):
  //  - put an overridden image back where it sat before, whichever way the site
  //    centres things (auto margins and flex both work)
  //  - land on a whole device pixel; a half-pixel offset re-blurs an image that
  //    is otherwise sized correctly
  function snap(img, s) {
    // Switched off, or the page moved on, while this waited for its frame.
    if (!enabled || s.key === null || !img.isConnected) return;
    const d = dpr();
    setOwn(img, s, 'transform', 'none');
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
    if (dx || dy) setOwn(img, s, 'transform', `translate(${dx}px, ${dy}px)`);
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

  // Thrown inside processImage when the work in hand stopped applying while it waited:
  // the script was switched off, or the page pointed the element at something else.
  // Measured before this existed: a reader that turned the page during an encode had
  // its new page replaced by a resample of the old one, and the script switched off
  // mid-resample swapped the resample in anyway and left it there.
  const STALE = new Error('stale');

  // Where the band sits, to the eighth of a pixel. A change here needs new margins but not
  // a new bitmap.
  const placeOf = (t) => (t.lay ? [t.lay.L, t.lay.R, t.lay.cbL, t.lay.cbR]
    .map((v) => Math.round(v * 8)).join(':') : '');

  // Generous for big outputs: the encode is CPU work that grows with the pixel count.
  const encodeDeadline = (t) => Math.max(8000, t.w * t.h / 2500);

  async function processImage(img) {
    if (!enabled) return;
    const s = record(img);
    if (!s.origUrl || !s.nw || !eligible(s)) return;
    // A resample is async. Dropping a request that arrives mid-flight would lose
    // the most recent intent, so a keypress during processing would appear to do
    // nothing. Queue it and re-run once the current pass finishes.
    if (s.busy) { s.rerun = true; return; }
    observeBox(img);

    // On a responsive image the natural size is density-corrected - a 2250-wide file
    // offered as `2x` reports 1125 - while the GPU is handed the whole file. Learn the
    // file's own size once per source, before any geometry is worked out from it.
    if (!s.pixelsKnown) {
      s.busy = true;
      s.pixelsKnown = true;
      try {
        const bm = await withTimeout(createImageBitmap(img), 5000, 'measure timed out');
        if (bm.width && bm.height) { s.nw = bm.width; s.nh = bm.height; }
        bm.close();
      } catch { /* the natural size is a lower bound, and still works */ }
      s.busy = false;
      s.rerun = false;
      return processImage(img);
    }

    // Before anything is measured: relaxing a site's wrapper changes the very column the
    // image is measured against. Measured the other way round, e-hentai's MPV placed its
    // first page for the 994px wrapper it was about to lose - 100px off-centre until a
    // later pass happened to put it right.
    relaxContainers(img);
    const t = targetSize(img, s.nw, s.nh, s.forcedMode);
    // The source generation, not its URL: a data: URL can be megabytes long.
    const key = `${s.gen}|${t.w}x${t.h}|${quality}`;
    const place = placeOf(t);
    if (s.key === key) {
      // Same bitmap. Only the layout may need touching - the band moved, or the page
      // rewrote the size we set.
      if (s.place !== place || !sizeIntact(img, s)) {
        applySize(img, t, s);
        s.place = place;
        defer(() => snap(img, s));
      }
      return;
    }

    s.busy = true;
    // What the element's attributes should say at each point below. Our own swaps change
    // it; anything else changing it means the page moved on.
    let expect = pageKey(img);
    const check = () => { if (!enabled || pageKey(img) !== expect) throw STALE; };
    const swapped = () => { expect = s.ourKey !== null ? s.ourKey : s.siteKey; };
    traceMark(`#${s.id} start`);
    try {
      // Size the element up front. The geometry depends on mode alone, so it is fully
      // known here, and the encode below is by far the slowest step - applying the size
      // first means the page reaches its final layout immediately and the sharper
      // bitmap replaces a browser-scaled one, instead of nothing happening until the
      // encode returns. Called again at the end, which is idempotent.
      applySize(img, t, s);

      const kind = originKind(s.origUrl);
      const limited = s.limit && (s.limit.key === '*' || s.limit.key === key) ? s.limit.why : null;
      const blocked =
        kind === 'file'
          ? 'file:// is an opaque origin - the GPU path cannot run on local files'
          : kind === 'other' ? 'unsupported URL scheme'
          : kind === 'cross' && noCors.has(hostOf(s.origUrl))
            ? 'cross-origin, and the image host sends no CORS headers'
          : limited;

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
          const type = await encoder();
          check();
          const most = Math.min(GL.maxDim(), encoderMax(type));
          if (Math.max(t.w, t.h, s.nw, s.nh) > most) {
            throw tooLarge(`too large to resample in one piece: ${t.w}x${t.h}, and this ` +
                           `GPU and encoder stop at ${most} px a side`);
          }
          // Only reuse the live element when it is definitely untainted and is showing
          // the page's own image.
          const fresh = kind === 'same' && pageKey(img) === s.siteKey && img.complete &&
                        img.currentSrc === s.origUrl;

          // This is the last moment the original exists anywhere but in this element:
          // the swap further down replaces it, and on a site that revokes its blob:
          // pages the URL it came from may already be dead. Take a copy now or never.
          if (fresh && !s.safeUrl && volatileSource(s.origUrl)) {
            await timed(s, 'snapshot source', () => snapshot(img, s, type));
            check();
          }

          const source = fresh ? img
            : await timed(s, 'load source', () =>
                withTimeout(loadImage(sourceUrl(s), originKind(sourceUrl(s))),
                            8000, 'source load timed out'));
          check();

          // GL.resample hands back ONE canvas, reused by every image. toBlob snapshots
          // it when called, so the resample and that call must stay in a single
          // synchronous run: yield between them and a concurrently processing image
          // redraws the canvas first, and this image encodes the other one's pixels.
          // Nothing here may await, which is why the timing is timeSync.
          const canvas = timeSync(s, 'gpu resample', () =>
            GL.resample(source, s.nw, s.nh, t.w, t.h, quality));
          const encoding = withTimeout(
            new Promise((r) => canvas.toBlob(r, type, 1)), encodeDeadline(t), 'encode timed out');
          const blob = await timed(s, `${type.slice(6)} encode`, () => encoding);
          if (!blob) throw new Error('encode failed');
          url = URL.createObjectURL(blob);
          s.cache.set(key, url);
          // Claim it before registering: images resample concurrently, and an
          // unclaimed blob is fair game for another image's eviction pass.
          s.blobUrl = url;
          trackBlob(url, s, key, blob.size);
          // Still a good bitmap for this source even if it is too late to show now,
          // which is why the check comes after the cache has it.
          check();
        }

        s.blobUrl = url;
        const shown = await timed(s, 'swap src', () => showOurs(img, s, url));
        swapped();
        check();
        if (!shown) throw new Error('resampled image failed to load');
        trimCache(s);
        setOwn(img, s, 'image-rendering', 'auto');
        s.status = quality === 'nearest'
          ? (Number.isInteger(t.factor)
              ? 'nearest (gpu) @ integer — valid'
              : 'nearest (gpu) @ FRACTIONAL — uneven rows expected')
          : `lanczos3 (gpu, ${GL.precision()} intermediate)`;
        if (cached) s.status += ' [cached]';
        // Worth surfacing: it means this site released its own image data and every
        // later switch is running off our copy.
        if (s.safeUrl) s.status += ' [snapshot]';
      } else {
        // Every non-GPU path must show the ORIGINAL bitmap, otherwise it would
        // merely re-size whatever the last resample produced.
        if (s.blobUrl) {
          // Keep s.blobUrl set until the swap has landed, so that anything
          // inspecting state mid-swap still recognises the displayed blob as ours.
          // No revoke here - the blob stays in s.cache for the next switch back.
          //
          // The snapshot where there is one: where the site has released its own URL,
          // ours is the only copy left, and putting the dead one back is precisely what
          // showed a broken image with no error attached.
          const ok = await timed(s, 'restore src', () =>
            (s.safeUrl ? showOurs(img, s, s.safeUrl) : showSite(img, s)));
          swapped();
          check();
          s.blobUrl = null;
          if (!ok) throw new Error('original no longer loadable - the site released it');
        }
        if (t.factor === 1) {
          // One image pixel per device pixel: there is nothing to resample, so
          // every quality setting looks the same here. Snapping is what makes
          // that true on screen.
          setOwn(img, s, 'image-rendering', 'auto');
          s.status = 'factor 1 - no resampling (all qualities identical here)';
        } else if (quality === 'nearest') {
          // Only reached when the GPU path is unavailable (e.g. file://).
          setOwn(img, s, 'image-rendering', 'pixelated');
          s.status = 'nearest (css fallback) — ' + (blocked || 'gpu unavailable');
        } else if (quality === 'browser') {
          dropOwn(img, s, 'image-rendering');
          s.status = 'chrome bilinear';
        } else {
          setOwn(img, s, 'image-rendering', 'auto');
          s.status = blocked ? 'chrome bilinear — ' + blocked
            : t.w * t.h > CFG.maxOutputPixels ? 'over pixel cap - fell back to chrome'
            : 'gpu unavailable: ' + (GL.why() || 'unknown');
        }
      }

      applySize(img, t, s);
      defer(() => snap(img, s));
      s.key = key;
      s.place = place;
      s.report = { ...t, nw: s.nw, nh: s.nh };
    } catch (e) {
      // Nothing to report: the next pass starts again from whatever is true now.
      if (e === STALE) {
        s.key = null;
        s.rerun = true;
        return;
      }
      // A refused CORS read is the host's answer, not a failure worth reporting as one.
      // Record the host so no other image on it repeats the attempt, then run this image
      // again: `blocked` is set the second time round, so it takes the non-GPU path and
      // ends up correctly sized with the browser's own scaling and a status that says
      // why. Clearing s.key is what stops the re-run returning early as a no-op.
      if (/no CORS headers/.test(e.message)) {
        noCors.add(hostOf(s.origUrl));
        s.key = null;
        s.rerun = true;
        return;
      }
      // Too big for this GPU or format: a limit, handled the same way.
      if (e.tooLarge) {
        s.limit = { key, why: e.message };
        s.key = null;
        s.rerun = true;
        return;
      }
      s.status = 'ERROR: ' + e.message;
      // A missed deadline usually says something about the moment, not the image:
      // a throttled background tab, a busy GPU. Worth one more go later. Anything
      // else - tainted source, unreadable origin - would just fail again.
      s.retryable = /timed out/.test(e.message);
      s.key = key;
      s.place = place;
      s.report = { ...t, nw: s.nw, nh: s.nh };
      applySize(img, t, s);
      setOwn(img, s, 'image-rendering', 'auto');
      console.warn('[crisp-images]', e);
    } finally {
      s.busy = false;
      traceMark(`#${s.id} done - ${s.status}`);
      // Switched off while this ran: the off switch skipped this image because it was
      // busy, so hand it back now.
      if (!enabled) restore(img);
      else if (s.rerun) { s.rerun = false; processImage(img); }
      updateHud();
    }
  }

  async function restore(img) {
    const s = state.get(img);
    // Mid-swap: processImage calls this again the moment it finishes (see its finally).
    if (!s || s.busy) return;
    if (s.ourKey !== null && pageKey(img) === s.ourKey) {
      s.busy = true;                    // same guard as processImage: this is our swap
      // Prefer the site's own image, so switching off really does hand the page back.
      // Where its URL is dead, fall back to our snapshot rather than to a broken
      // image: it is the same bitmap, and turning the script off should never leave
      // the page worse than it found it.
      try {
        if (!await showSite(img, s) && s.safeUrl) await showOurs(img, s, s.safeUrl);
      } finally {
        s.busy = false;
      }
      // Switched back on while that loaded: let the next sweep take it from here.
      if (enabled) { s.key = null; schedule(); return; }
    }
    // Keep the snapshot only if it is what the element ended up displaying - revoking
    // it then would break the very image this just repaired.
    dropCache(s, !!s.safeUrl && img.currentSrc === s.safeUrl);
    releaseOwn(img, s);
    unrelaxContainers(img);
    s.key = null;
    s.place = null;
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

  let watched = new WeakSet();

  // Watches the boxes the page gives each image: its column and the ancestors above it,
  // up to the first that clips.
  //
  // The only other triggers are window and visualViewport `resize`, and neither fires
  // when a site rearranges itself internally - opening a thumbnail pane, collapsing a
  // sidebar. Without this the image keeps the width it was given for the old layout and
  // simply overflows, which on a container with overflow:hidden puts part of it out of
  // reach for good. The ancestors matter as much as the column: on Tapas, closing the
  // side panel widens the column's parent from 980 to 1265 px and moves the column, but
  // leaves the column itself at 940 - so only the parent reports it.
  //
  // Only WIDTH changes count. Resizing an image changes the height of everything above
  // it, so acting on height would be a feedback loop with our own work; and the width of
  // a box we are willing to measure cannot depend on the image anyway - see
  // widthComesFromParent.
  const containerWidth = new WeakMap();   // element -> the width we last acted on
  const observedBoxes = new Set();
  const boxRO = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => {
    let changed = false;
    for (const e of entries) {
      const w = Math.round(e.contentRect.width);
      if (containerWidth.get(e.target) === w) continue;
      containerWidth.set(e.target, w);
      changed = true;
    }
    if (changed && enabled) { columnsAt = 0; schedule(); }
  }) : null;

  function observeBox(img) {
    if (!boxRO || CFG.fitWidth === 'window') return;
    const cb = containingBlock(img);
    for (let el = cb; el && el !== document.documentElement; el = el.parentElement) {
      if (observedBoxes.has(el)) break;       // and so is everything above it
      observedBoxes.add(el);
      // Seed the width so the first delivery, which merely reports the current size,
      // does not read as a change and schedule a pointless sweep.
      containerWidth.set(el, Math.round(el.getBoundingClientRect().width));
      boxRO.observe(el);
      if (el !== cb && clips(el, getComputedStyle(el))) break;
    }
  }

  // ResizeObserver holds its targets strongly, so a reader that rebuilds its DOM would
  // otherwise strand every container it ever had. Same reasoning as the `visible` set.
  function pruneBoxes() {
    if (!boxRO) return;
    for (const el of observedBoxes) {
      if (!el.isConnected) { boxRO.unobserve(el); observedBoxes.delete(el); }
    }
  }

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
    // Off means off: nothing is observed, nothing is recorded, and no work is done on
    // the page at all. Everything the script changed was handed back when it was
    // switched off - see setEnabled.
    if (!enabled) { updateHud(); return; }
    detach();
    try {
      // IntersectionObserver stops reporting an element once the page removes it, so
      // it would sit in `visible` for the life of the tab - a plain Set holding a
      // strong reference to a detached <img> and its decoded bitmap. A reader that
      // swaps pages would accumulate them indefinitely, and the count in the overlay
      // would drift further from reality with every page turn.
      for (const img of visible) if (!img.isConnected) visible.delete(img);
      pruneBoxes();
      columnsAt = 0;

      for (const img of document.images) {
        if (img.complete && img.naturalWidth) record(img);
        if (!watched.has(img)) {
          watched.add(img);
          if (!img.complete) img.addEventListener('load', () => schedule(), { once: true });
          io.observe(img);
        }
      }
      processVisible();
    } finally {
      updateHud();
      attach();
    }
  }

  function invalidateAll() {
    if (!enabled) return;
    for (const img of document.images) {
      const s = state.get(img);
      if (s) s.key = null;
    }
    // sweep(), not processVisible(). While the script is off, sweep records nothing
    // and observes nothing, so `state` and `visible` are both empty - and
    // processVisible() skips any image it has no state for. Switching on has to
    // rebuild that state before there is anything to process.
    sweep();
  }

  // Everything below the switch. Switching off hands back every image straight away -
  // one busy mid-resample is handed back by processImage the moment it finishes - and
  // then stops watching the page altogether. Measured on a page that changes its DOM
  // every frame: while "off", the script used to run a full sweep of every image about
  // 35 times a second, forever, on any site it had ever been switched on and off again.
  function setEnabled(on) {
    enabled = on;
    writeFlag('enabled', on);
    if (on) {
      for (const img of document.images) {
        const s = state.get(img);
        if (s && s.status === 'off') s.status = 'pending';
      }
      invalidateAll();
    } else {
      detach();
      io.disconnect();
      boxRO?.disconnect();
      observedBoxes.clear();
      visible.clear();
      watched = new WeakSet();
      queue.length = 0;
      columns.clear();
      for (const img of document.images) restore(img);
    }
    updateHud();
  }

  // Does this mutation touch an image? Only those need a sweep: a src or srcset changing,
  // or an <img> (or a <source> choosing for one) arriving or leaving. Everything else a
  // page does to its DOM - a clock ticking, a counter updating, our own overlay's text -
  // used to trigger a full sweep too, which on a busy page meant one every frame.
  // Layout changes that matter without an image changing are the ResizeObserver's job.
  const hasImage = (n) => n.nodeType === 1 &&
    (n.tagName === 'IMG' || n.tagName === 'SOURCE' || n.getElementsByTagName('img').length > 0);

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (hud && hud.contains(r.target)) continue;
      if (r.type === 'attributes') { schedule(); return; }
      for (const n of r.addedNodes) if (hasImage(n)) { schedule(); return; }
      for (const n of r.removedNodes) if (hasImage(n)) { schedule(); return; }
    }
  });
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

  // The image under the pointer, looking through whatever is stacked on top of it.
  // Readers put click-to-turn overlays and gradients above the page, so the topmost
  // element is very often not the image - measured: an Alt+click on an image under a
  // transparent overlay reached the overlay and did nothing at all.
  function imageAt(e, eligibleOnly) {
    const ok = (el) => el instanceof HTMLImageElement && state.has(el) &&
                       (!eligibleOnly || eligible(state.get(el)));
    if (ok(e.target)) return e.target;
    return document.elementsFromPoint(e.clientX, e.clientY).find(ok) || null;
  }

  /* ------------------------------------------------------------------ *
   * Shortcuts, as set at the bottom of the config
   * ------------------------------------------------------------------ */

  // 'Ctrl+Shift+K' -> { ctrl, shift, alt, meta, key: 'k', text }. null for '' or junk.
  function parseShortcut(spec) {
    const b = { alt: false, ctrl: false, shift: false, meta: false, key: '', text: String(spec || '') };
    for (const part of b.text.split('+')) {
      const p = part.trim().toLowerCase();
      if (!p) continue;
      if (p === 'alt' || p === 'option') b.alt = true;
      else if (p === 'ctrl' || p === 'control') b.ctrl = true;
      else if (p === 'shift') b.shift = true;
      else if (p === 'meta' || p === 'cmd' || p === 'command' || p === 'win') b.meta = true;
      else b.key = p;
    }
    return b.key ? b : null;
  }

  const KEYS = {
    toggle: parseShortcut(CFG.keyToggle), mode: parseShortcut(CFG.keyMode),
    quality: parseShortcut(CFG.keyQuality), overlay: parseShortcut(CFG.keyOverlay),
    details: parseShortcut(CFG.keyDetails),
  };
  const BUTTONS = { leftclick: 0, middleclick: 1, rightclick: 2 };
  const CLICKS = [['native', parseShortcut(CFG.clickNative)], ['double', parseShortcut(CFG.clickDouble)]]
    .filter(([, b]) => b && b.key in BUTTONS);

  const sameModifiers = (b, e) =>
    e.altKey === b.alt && e.ctrlKey === b.ctrl && e.shiftKey === b.shift && e.metaKey === b.meta;

  // The key pressed, as a shortcut names it. e.key is the character the layout typed,
  // which for a letter is not a letter at all on a Mac with Option ('π' for P) or on a
  // Russian layout ('з'), so the shortcuts used to do nothing there. Letters and digits
  // fall back to the key's position. A Latin letter in e.key still wins, so on AZERTY or
  // Dvorak you press the key marked with the letter.
  function keyName(e) {
    const k = (e.key || '').toLowerCase();
    if (/^[a-z0-9]$/.test(k)) return k;
    const m = /^(?:Key|Digit)([A-Z0-9])$/.exec(e.code || '');
    return m ? m[1].toLowerCase() : k;
  }

  const pressed = (b, e) => !!b && sameModifiers(b, e) && keyName(e) === b.key;

  // Which click shortcut, if any, this click is. button: 0 left, 1 middle, 2 right.
  function clickAction(e, button) {
    if (!enabled) return null;
    const hit = CLICKS.find(([, b]) => BUTTONS[b.key] === button && sameModifiers(b, e));
    return hit ? hit[0] : null;
  }

  // A click shortcut acts on the image under the pointer. Anything else is left alone -
  // Chrome uses Alt+click on a link to download it, and swallowing every Alt+click on
  // every image used to take that away from thumbnails.
  function onClick(e, button) {
    const action = clickAction(e, button);
    const img = action && imageAt(e, true);
    if (img) {
      toggleOverride(img, action);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Chrome's image document toggles its own zoom on a plain click, which resizes the
    // image without telling us. Block it.
    if (button === 0 && IMAGE_DOC && enabled && e.target instanceof HTMLImageElement) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  addEventListener('click', (e) => onClick(e, 0), true);
  // Right click: the context menu is only suppressed when the shortcut matched an image.
  addEventListener('contextmenu', (e) => onClick(e, 2), true);
  addEventListener('auxclick', (e) => { if (e.button === 1) onClick(e, 1); }, true);
  // A middle-click shortcut must not also start the browser's autoscroll.
  addEventListener('mousedown', (e) => {
    if (e.button === 1 && clickAction(e, 1) && imageAt(e, true)) e.preventDefault();
  }, true);

  // Only the diagnostic rows ever name the hovered image, so the hit-test runs only while
  // they are showing - not on every mouse move of every page the script is loaded on.
  let hoverPending = false;
  addEventListener('mousemove', (e) => {
    if (hoverPending || !enabled || !hudVisible || !detailsVisible) return;
    hoverPending = true;
    requestAnimationFrame(() => {
      hoverPending = false;
      const hit = imageAt(e, false);
      // Clearing matters as much as setting. This was write-only, so on a page whose
      // images sit under an overlay the overlay latched onto the first image it ever
      // managed to hit and reported that one for the rest of the session - including
      // while the pointer was over a different image, or off the page altogether.
      if (hit !== focus) { focus = hit; updateHud(); }
    });
  }, { passive: true });

  // The pointer leaving the window sends no mousemove, so without this the overlay goes
  // on claiming to report a hovered image after the pointer is somewhere else entirely.
  document.addEventListener('mouseleave', () => {
    if (focus) { focus = null; updateHud(); }
  });

  const MODES = ['fit-width', 'integer', 'native'];
  const QUALITIES = ['lanczos3', 'nearest', 'browser'];

  // Is the key going into a text field? Then it is typing, not a shortcut: on a Mac,
  // Option+letter types a character. composedPath sees into shadow DOM, where e.target
  // would only be the host.
  function typing(e) {
    const el = e.composedPath ? e.composedPath()[0] : e.target;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''));
  }

  addEventListener('keydown', (e) => {
    if (e.repeat || typing(e)) return;
    if (pressed(KEYS.toggle, e)) {
      // Only switching ON starts a new measurement. Resetting on OFF too would
      // re-base work still in flight from the previous ON, so a stage that took a
      // second would report a two-digit elapsed time.
      if (!enabled) traceT0 = performance.now();
      traceMark(`${KEYS.toggle.text} -> ${enabled ? 'off' : 'on'}`);
      setEnabled(!enabled);
    }
    else if (pressed(KEYS.overlay, e)) { hudVisible = !hudVisible; writeFlag('hud', hudVisible); updateHud(); }
    else if (pressed(KEYS.details, e)) { detailsVisible = !detailsVisible; focus = null; updateHud(); }
    else if (pressed(KEYS.mode, e)) { mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; invalidateAll(); updateHud(); }
    else if (pressed(KEYS.quality, e)) { quality = QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length]; invalidateAll(); updateHud(); }
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

  // What the overlay and report() say about an image: its own status, or why it has none.
  // A skipped image used to read 'pending' forever - on Webtoons, whose pages are 700 px
  // wide and so below the default size filter, that looked exactly like a stuck queue.
  function statusOf(s) {
    if (!s.origUrl || !s.nw) return 'waiting for the image to finish loading';
    if (!eligible(s)) {
      return `skipped - ${s.nw}x${s.nh} is under the size filter ` +
             `(minNaturalWidth ${CFG.minNaturalWidth}, minNaturalHeight ${CFG.minNaturalHeight})`;
    }
    return s.status;
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
    }
    // Pages that rebuild their body take the overlay with them.
    if (!hud.isConnected) (document.body || document.documentElement).appendChild(hud);
    hud.style.display = 'block';

    const vp = viewportDevice();

    // Always shown: what the script is doing, and how to drive it - with the shortcuts
    // as configured, each labelled with what it will do.
    const keyHelp = [[KEYS.toggle, enabled ? 'off' : 'on'], [KEYS.mode, 'mode'],
      [KEYS.quality, 'quality'], [KEYS.overlay, 'hud'], [KEYS.details, 'details']]
      .filter(([b]) => b).map(([b, what]) => `${b.text} ${what}`).join('  ');
    const clickHelp = CLICKS.map(([what, b]) => `${b.text} = ${what === 'native' ? '1:1' : '2x native'}`)
      .join('   ');
    const L = [`crisp-images ${enabled ? 'ON' : 'OFF'}   mode=${mode}  quality=${quality}`];
    if (keyHelp) L.push(keyHelp);
    if (clickHelp) L.push(clickHelp);

    // Diagnostics, hidden until Alt+G: this image's outcome first, then the context.
    if (detailsVisible) {
      const img = hudTarget();
      const s = img && state.get(img);
      if (s) {
        L.push(`status  ${statusOf(s)}`);
        L.push(`source  ${s.nw}x${s.nh}`);
        if (s.report && eligible(s)) {
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
      L.push(`devicePixelRatio ${vp.r}   viewport ${vp.w}x${vp.h} device px   script v${VERSION}` +
             (IMAGE_DOC ? '   [chrome image doc]' : ''));
    }

    // Rewritten only when it changes: every write is a layout and a paint of its own.
    const text = L.join('\n');
    if (hud.textContent !== text) hud.textContent = text;
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
    // The band fit-width fills for this image, in css px from the window's left edge:
    // cbL..cbR is its column, L..R the free width around it. null = the window.
    layout: (img) => {
      const s = state.get(img || document.images[0]);
      columnsAt = 0;
      return s ? layoutOf(img || document.images[0], s.nw, s.nh) : null;
    },
    report: () => [...document.images].map((img) => {
      const s = state.get(img);
      return s ? {
        id: s.id, src: (s.origUrl || img.src).slice(0, 60), natural: `${s.nw}x${s.nh}`,
        origin: originKind(s.origUrl || img.src),
        output: s.report ? `${s.report.w}x${s.report.h} @${s.report.factor.toFixed(3)}` : '-',
        status: statusOf(s),
      } : { src: (img.currentSrc || img.src).slice(0, 60), status: 'not tracked' };
    }),
    get mode() { return mode; },
    set mode(v) { mode = v; invalidateAll(); },
    get quality() { return quality; },
    set quality(v) { quality = v; invalidateAll(); },
    get fitWidth() { return CFG.fitWidth; },
    set fitWidth(v) { CFG.fitWidth = v; columnsAt = 0; invalidateAll(); },
    get trace() { return trace; },
    set trace(v) { trace = !!v; },
    // Selectors for wrappers the site sized to the old image, matched upward from each
    // image. On a site that clips or leaves gaps, try candidates here until the page
    // behaves, then report the one that worked. Switching the script off with Alt+P
    // undoes only the selectors currently set, so toggle off BEFORE changing them if you
    // want the page fully back.
    get containers() { return CONTAINERS; },
    set containers(v) { CONTAINERS = (v && v.length) ? v : null; invalidateAll(); },
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
