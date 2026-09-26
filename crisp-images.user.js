// ==UserScript==
// @name         Crisp Images - fix blurry images on HiDPI / 4K screens
// @name:ja           Crisp Images - 高DPI/4Kディスプレイで画像がぼやける問題を修正
// @name:zh-CN        Crisp Images - 修复高DPI/4K屏幕上模糊的图片
// @name:ru           Crisp Images - исправляет размытые изображения на HiDPI / 4K экранах
// @name:es           Crisp Images - corrige imágenes borrosas en pantallas HiDPI / 4K
// @name:pt-BR        Crisp Images - corrige imagens borradas em telas HiDPI / 4K
// @namespace    https://github.com/Ikkoru/crisp-images
// @version      4.2
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

// Local files: Chrome runs no userscript on file:// until you allow it
// (chrome://extensions -> Tampermonkey -> Details -> "Allow access to file URLs").
// Even then the GPU cannot read an image from disk, because Chrome treats every file
// as its own origin. So there 'lanczos3' falls back to the browser's scaling; sizing,
// 1:1 and 'nearest' still work, and data: URLs get the full treatment. For full
// quality on a folder of images, serve it over http://localhost.

(function () {
  'use strict';

  const CFG = {

  /* ================================================================== *
   * Config START.
   * ================================================================== */

    // Start switched on for every site?
    // false: off everywhere until you switch it on for a site (Alt+P).
    // true:  on everywhere. Not recommended.
    // Switching a site on or off is remembered and wins over this (see rememberPerSite).
    enabledOnStart: false,

    // Show the overlay when a page opens? Alt+H toggles it (see rememberPerSite).
    hudOnStart: true,

    // Show the overlay's diagnostic rows when a page opens? Alt+G toggles them until
    // the page reloads. Not remembered per site, so set it here.
    detailsOnStart: false,

    // Remember, per site, what the keys switch.
    // true:  each site keeps your last choice.
    // false: every page starts from the settings here; the key's change lasts until the
    //        page is left or reloaded.
    rememberPerSite: {
      enabled: true,   // on or off (Alt+P)
      hud: true,       // the overlay shown or hidden (Alt+H)
      bars: true,      // the side bars' width (Alt+[ / Alt+])
    },

    // Leave an image alone unless it is at least this wide AND this tall, in image
    // pixels. Keeps avatars, icons and banners out. 700 lets in Webtoons' 700px strips.
    minNaturalWidth: 700,
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

    // Black bars at the left and right of each image, as a percentage of the window's
    // width on each side. The image shrinks to make room, so nothing else on the page
    // moves. In 'fit-width' and 'integer'. The bar keys below change it 0.5 a step, and
    // what you set is remembered per site. 0: no bars.
    sideBars: 0,

    // For readers whose pages sit in a fixed-height viewer box (K MANGA). Changes that
    // box's height, as a share of the window's height. 0.95 leaves 5% of the window for
    // the rest of the page; everything below the viewer moves down. 0 turns this off.
    viewerHeight: 0.95,

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
    keyBarsLess: 'Alt+[',           // narrower side bars (see sideBars)
    keyBarsMore: 'Alt+]',           // wider side bars
    clickNative: 'Alt+LeftClick',   // this image at one image pixel per screen pixel
    clickDouble: 'Alt+RightClick',  // this image at twice its own resolution

  /* ================================================================== *
   * Config END.
   * ================================================================== */

  };

  const HOST_KEY = (k) => `crispImages.${k}.${location.host}`;
  // What rememberPerSite leaves off is neither read nor written: the config decides
  // every time. (A plain true or false there counts for all three.)
  const remembers = (k) => {
    const r = CFG.rememberPerSite;
    return typeof r === 'object' && r !== null ? r[k] !== false : r !== false;
  };
  const stored = (k) => {
    if (!remembers(k)) return null;
    try { return localStorage.getItem(HOST_KEY(k)); } catch { return null; }
  };
  const store = (k, v) => {
    if (!remembers(k)) return;
    try { localStorage.setItem(HOST_KEY(k), v); } catch { /* private mode */ }
  };
  const readFlag = (k, d) => { const v = stored(k); return v === null ? d : v === '1'; };
  const writeFlag = (k, v) => store(k, v ? '1' : '0');
  const readNumber = (k, d) => { const v = parseFloat(stored(k)); return Number.isFinite(v) ? v : d; };
  const writeNumber = (k, v) => store(k, String(v));

  let enabled = readFlag('enabled', CFG.enabledOnStart);
  let bars = readNumber('bars', CFG.sideBars);   // percent of the window's width, each side
  let hudVisible = readFlag('hud', CFG.hudOnStart);
  // Not per site: localStorage belongs to one origin, so it cannot hold a choice for
  // every site. That would need GM_setValue, and granting anything moves the script into
  // Tampermonkey's sandbox, where the page console loses window.__crispImages.
  let detailsVisible = CFG.detailsOnStart;
  let mode = CFG.mode;
  let quality = CFG.quality;

  // Shown on the overlay's last diagnostic row, so a bug report names its build and you
  // can see whether Tampermonkey runs the copy you just edited.
  // KEEP IN STEP WITH @version ABOVE. Under `@grant none` a script cannot read its own
  // header (GM_info needs a grant), so this is kept by hand.
  const VERSION = '4.2';

  const dpr = () => window.devicePixelRatio || 1;

  // Chrome shows a bare image URL (or a dragged-in file) as an "image document" with its
  // own shrink-to-fit and click-to-zoom. Both resize the image behind the script's back,
  // so both are blocked below.
  const IMAGE_DOC = (document.contentType || '').startsWith('image/');

  /* ================================================================== *
   * GPU resampler: separable Lanczos3, two passes.
   * ================================================================== */

  const GL = (() => {
    let cv = null, gl = null, prog = null, loc = null, vao = null;
    let fboTex = null, fbo = null, broken = false, why = '', halfFloat = false, hfFailed = false;
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
// Ints default to mediump in fragment shaders, and float(j) + 0.5 below inherits it.
// Some mobile GPUs work mediump out in 16-bit floats, which cannot hold x.5 past 1024:
// every tap position and weight went half a pixel off from there on (GitHub issue #1,
// found by its reporter). Desktop GPUs ignore these precisions.
precision highp int;
precision highp sampler2D;
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
        // Without preserveDrawingBuffer the buffer may be cleared before toBlob reads it.
        gl = cv.getContext('webgl2', {
          premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true,
        });
        if (!gl) throw new Error('WebGL2 unavailable');

        // Lanczos overshoots past black and white at hard edges. An 8-bit texture between
        // the two passes clips that overshoot; a half-float one keeps it, worth about 25
        // levels on line art. testkit/shader-selftest.html measures it.
        halfFloat = !!(gl.getExtension('EXT_color_buffer_half_float') ||
                       gl.getExtension('EXT_color_buffer_float'));

        // The largest side this GPU can draw or sample. Asked for more, WebGL does not
        // fail: it hands back a smaller buffer and squashes the image into it (measured:
        // 2560x9600 came back as 2560x8192, then the browser stretched it back).
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
        if (halfFloat && !pathWorks(true)) { halfFloat = false; hfFailed = true; }
        if (!halfFloat && !pathWorks(false)) {
          throw new Error('failed its self-test: a resample did not match the reference');
        }
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
      // We filter ourselves; hardware filtering on top would blur twice.
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

    // Before the GPU path is trusted, it resamples two test strips and the result must
    // match the same filter worked out here in 64-bit floats. The strips are 2200px long,
    // wide and tall, because GPUs have failed only past a size: on a Pixel 10 Pro Fold and
    // a Galaxy Tab S9 Ultra every tap drifted half a pixel beyond 1024px (GitHub issue #1,
    // now fixed by highp int above); a 12px pattern passed there. If the 16-bit
    // intermediate fails, the 8-bit one is tried; if that fails too, the GPU is not used.
    function pathWorks(half) {
      const patterns = [[2200, 6, 2420, 7], [6, 2200, 7, 2420]];
      for (const [sw, sh, dw, dh] of patterns) {
        const src = new Uint8Array(sw * sh * 4), n = Math.max(sw, sh);
        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            const i = (y * sw + x) * 4, t = sw > sh ? x : y;
            src[i] = (x + y) % 2 ? 255 : 0;                // 1px checkerboard: hard edges
            src[i + 1] = t % 3 ? 255 : 0;                  // 1px lines
            src[i + 2] = Math.round(255 * t / (n - 1));    // a ramp along the strip
            src[i + 3] = 255;
          }
        }
        if (!stripMatches(src, sw, sh, dw, dh, half)) return false;
      }
      return true;
    }

    function stripMatches(src, sw, sh, dw, dh, half) {
      let tex = null;
      try {
        cv.width = dw;
        cv.height = dh;
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        clampTex();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.bindTexture(gl.TEXTURE_2D, fboTex);
        clampTex();
        if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, dw, sh, 0, gl.RGBA, gl.HALF_FLOAT, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, dw, sh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return false;
        gl.useProgram(prog);
        gl.bindVertexArray(vao);
        pass(tex, sw, sh, dw, sh, 1, 0, fbo, 0);
        pass(fboTex, dw, sh, dw, dh, 0, 1, null, 0);
        // Unflipped upload and bottom-up readPixels cancel out: row r here is output row r.
        const got = new Uint8Array(dw * dh * 4);
        gl.readPixels(0, 0, dw, dh, gl.RGBA, gl.UNSIGNED_BYTE, got);
        if (gl.getError() !== gl.NO_ERROR) return false;
        const want = lanczosCPU(src, sw, sh, dw, dh, !half);
        // A correct GPU is within 1-2 levels (shader-selftest.html); a drifting one is not.
        for (let i = 0; i < got.length; i++) if (Math.abs(got[i] - want[i]) > 3) return false;
        return true;
      } catch {
        return false;
      } finally {
        if (tex) gl.deleteTexture(tex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    }

    // The shader's filter, on the CPU: horizontal pass, then vertical, rounded to 8 bits
    // at the end as the canvas does. eightBit: the in-between result is clamped and
    // rounded to 8 bits too, as the 8-bit intermediate stores it.
    function lanczosCPU(src, sw, sh, dw, dh, eightBit) {
      const kernel = (x) => {
        x = Math.abs(x);
        if (x >= 3) return 0;
        if (x < 1e-6) return 1;
        const p = Math.PI * x, q = p / 3;
        return (Math.sin(p) / p) * (Math.sin(q) / q);
      };
      // For each output index: [source index, weight] pairs, weights summing to 1.
      const taps = (n, m) => {
        const scale = m / n, fs = Math.max(1, 1 / scale), support = 3 * fs, all = [];
        for (let o = 0; o < m; o++) {
          const c = (o + 0.5) / scale, t = [];
          let sum = 0;
          for (let j = Math.floor(c - support - 0.5); j <= Math.ceil(c + support - 0.5); j++) {
            const w = kernel((c - (j + 0.5)) / fs);
            if (w === 0) continue;
            t.push([Math.min(n - 1, Math.max(0, j)), w]);
            sum += w;
          }
          all.push(t.map(([j, w]) => [j, w / sum]));
        }
        return all;
      };
      const hx = taps(sw, dw), vy = taps(sh, dh);
      const mid = new Float64Array(dw * sh * 4);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < dw; x++) {
          for (let c = 0; c < 4; c++) {
            let v = 0;
            for (const [j, w] of hx[x]) v += w * src[(y * sw + j) * 4 + c];
            mid[(y * dw + x) * 4 + c] = eightBit ? Math.max(0, Math.min(255, Math.round(v))) : v;
          }
        }
      }
      const out = new Uint8Array(dw * dh * 4);
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          for (let c = 0; c < 4; c++) {
            let v = 0;
            for (const [j, w] of vy[y]) v += w * mid[(j * dw + x) * 4 + c];
            out[(y * dw + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
          }
        }
      }
      return out;
    }

    function resample(source, srcW, srcH, dstW, dstH, kernelName) {
      const kernel = kernelName === 'nearest' ? 1 : 0;
      if (!init()) throw new Error('GPU: ' + why);

      cv.width = dstW;
      cv.height = dstH;
      // The GPU can still give less than it advertises (low memory, for one). Check what
      // we got, not what we asked for.
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
      resample, ok: () => init(), why: () => why,
      precision: () => (halfFloat ? '16f intermediate'
        : hfFailed ? '8bit intermediate: 16f failed its self-test' : '8bit intermediate'),
      maxDim: () => (init() ? maxDim : 0),
    };
  })();

  // A limit of the GPU or the format, not a fault: the image is left to the browser's own
  // scaling, with a status that says why - handled like a host that refuses CORS.
  function tooLarge(msg) {
    const e = new Error(msg);
    e.tooLarge = true;
    return e;
  }

  /* ================================================================== *
   * Geometry
   *
   * Size depends on the mode (and any per-image override), never on the filter.
   * Keeping the size fixed while the filter changes is what makes switching filters
   * a fair side-by-side comparison.
   * ================================================================== */

  // The window's usable width in css px. Once the scrollbar's space is reserved (see
  // guardScrollbar), the page lays out without it whether or not a scrollbar shows - but
  // clientWidth and visualViewport still report the full width for a moment while the
  // scrollbar goes away, and taking them at their word restarted the flipping.
  function viewportWidth() {
    const cw = document.documentElement.clientWidth;
    return gutterSize ? Math.min(cw, innerWidth - gutterSize) : cw;
  }

  function viewportDevice() {
    const r = dpr();
    const w = Math.min(window.visualViewport?.width ?? window.innerWidth, viewportWidth());
    const h = window.visualViewport?.height ?? window.innerHeight;
    return { w: Math.floor(w * r), h: Math.floor(h * r), r };
  }

  // The block the image is laid out in: the nearest ancestor that is not inline.
  function containingBlock(img) {
    let el = img.parentElement;
    while (el) {
      const d = getComputedStyle(el).display;
      if (d !== 'inline' && d !== 'contents') return el;
      el = el.parentElement;
    }
    return null;
  }

  // A block-level box with an auto width takes its width from its PARENT, so it cannot
  // depend on the image inside it. That is what makes it safe to measure after we have
  // resized the image.
  const BLOCK_LEVEL = new Set(['block', 'flow-root', 'list-item', 'flex', 'grid']);

  // Everything else shrinks to fit its contents, so measuring it would hand back the
  // width we just set, and the image could only ever shrink, never grow back.
  function widthComesFromParent(el, cs) {
    if (cs.float !== 'none') return false;
    if (cs.position === 'absolute' || cs.position === 'fixed') return false;
    if (!BLOCK_LEVEL.has(cs.display)) return false;          // inline-block, table, ...
    if (/(min|max|fit)-content/.test(cs.width)) return false;
    const p = el.parentElement;
    if (p && /flex|grid/.test(getComputedStyle(p).display)) return false;  // it is an item
    return true;
  }

  // Does this box cut off whatever sticks out of its sides? (The body's overflow moves to
  // the viewport unless <html> sets its own, and then the body itself clips nothing.)
  function clips(el, cs) {
    if (cs.overflowX === 'visible' && !/paint|strict|content/.test(cs.contain)) return false;
    if (el === document.body &&
        getComputedStyle(document.documentElement).overflowX === 'visible') return false;
    return true;
  }

  // The column an image sits in, and everything that could stand beside it. Measured once
  // per containing block (see layoutOf), since every image in it shares the answer.
  //
  // `boxes` are the other children of each ancestor on the way up - the only things that
  // can sit beside the column. Anything crossing the column's centre line is above, below
  // or on top of the image, so it never limits the width and is skipped. The climb stops
  // at the first ancestor that clips: nothing past its edges would be seen anyway.
  function measureColumn(cb) {
    const cs = getComputedStyle(cb);
    if (!widthComesFromParent(cb, cs)) return null;
    const r = cb.getBoundingClientRect();
    const left = r.left + cb.clientLeft;
    const cbL = left + (parseFloat(cs.paddingLeft) || 0);
    const cbR = left + cb.clientWidth - (parseFloat(cs.paddingRight) || 0);
    if (!(cbR - cbL > 0)) return null;

    const c = (cbL + cbR) / 2;
    const vpW = viewportWidth();
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
      // Floating buttons and badges sit over the page, not beside the column.
      if ((pos === 'fixed' || pos === 'absolute') && b.height < innerHeight / 3) return;
      // Fixed and sticky boxes follow the scroll, so they are beside the image whenever
      // it is on screen - unless they are parked off the top or bottom.
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

  // Kept for 50 ms: long enough to serve every image of one sweep, short enough that a
  // changed layout is measured again.
  const columns = new Map();
  let columnsAt = 0;

  // Where the image may sit across the page, in css px from the window's left edge:
  // {cbL, cbR} is its column's content box, {L, R} the band it may fill. null means "use
  // the window" (see CFG.fitWidth).
  //
  // Nothing here measures the image or anything sized by it, so resizing the image cannot
  // change the answer - otherwise it could creep narrower with every pass.
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

    // The rows the image could cover at most (its height at the window's full width), so
    // growing it cannot bring something new alongside.
    const top = img.getBoundingClientRect().top;
    const bottom = top + m.vpW * nh / nw;
    let L = m.clipL, R = m.clipR;
    for (const b of m.boxes) {
      if (b.el.contains(img)) continue;
      if (!b.pinnedToScreen && (b.bottom <= top || b.top >= bottom)) continue;
      if (b.side < 0) L = Math.max(L, b.right);
      else R = Math.min(R, b.left);
    }
    // A band under half the column means something was misread; the column is always safe.
    if (R - L < (m.cbR - m.cbL) / 2) { L = m.cbL; R = m.cbR; }
    return { cbL: m.cbL, cbR: m.cbR, L, R };
  }

  // The content width of the nearest ancestor that clips or scrolls, in css px, or null
  // for none (the page itself scrolls). The window fallback must not be wider: K MANGA's
  // viewer is its own 1250px scroller, and a 1265px page gave it a sideways scrollbar.
  function scrollerWidth(img) {
    if (CFG.fitWidth === 'window') return null;
    for (let el = img.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (clips(el, cs)) {
        return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      }
    }
    return null;
  }

  function targetSize(img, nw, nh, forcedMode) {
    const vp = viewportDevice();
    const m = forcedMode || mode;

    // Sizes the user asked for outright: they ignore the available width, and may overflow.
    if (m === 'native') return { w: nw, h: nh, factor: 1 };
    // Twice the image's own pixels, whatever the window - for inspecting detail.
    if (m === 'double') return { w: nw * 2, h: nh * 2, factor: 2 };

    // Width to fit, in device px. Never wider than the window: a wider band is a
    // horizontal scroller or a misreading.
    // No column that is safe to measure (a box sized by its contents) means the window -
    // but never wider than a scroller the image sits in.
    const lay = layoutOf(img, nw, nh);
    const room = lay ? lay.R - lay.L : scrollerWidth(img);
    // Side bars come out of that width, in whole device px so the image stays on the grid.
    const bar = Math.round(bars / 100 * innerWidth * vp.r);
    const avail = Math.max(1, (room ? Math.min(vp.w, Math.floor(room * vp.r)) : vp.w) - 2 * bar);

    if (m === 'integer') {
      let k = Math.floor(avail / nw);
      if (CFG.fitHeightToo) k = Math.min(k, Math.floor(vp.h / nh));
      k = Math.max(1, Math.min(k, 8));
      return { w: nw * k, h: nh * k, factor: k, lay, bar };
    }

    let f = avail / nw;
    if (CFG.fitHeightToo) f = Math.min(f, vp.h / nh);
    return { w: Math.round(nw * f), h: Math.round(nh * f), factor: f, lay, bar };
  }

  /* ================================================================== *
   * Per-image state
   * ================================================================== */

  let idCounter = 0;
  const state = new WeakMap();

  // The <source> siblings of an <img> in a <picture>. The browser picks from these before
  // it looks at the img's own src or srcset.
  function sourcesOf(img) {
    const pic = img.parentElement;
    if (!pic || pic.tagName !== 'PICTURE') return [];
    return [...pic.children].filter((el) => el.tagName === 'SOURCE');
  }

  // What the PAGE has asked this element to show: its attributes, not what is on screen.
  //
  // The two disagree after every change. Measured: right after `img.src = next`,
  // currentSrc and naturalWidth still describe the old image; while the new one loads,
  // currentSrc is '' and the size 0x0; only after it loads do they describe it. The
  // attributes change the moment the page acts, so they are the reliable way to tell
  // "the page moved on" from "our own swap is showing" - even in the middle of a resample.
  function pageKey(img) {
    let k = img.getAttribute('src') || '';
    const set = img.getAttribute('srcset');
    if (set !== null) k += '\n' + set;
    for (const so of sourcesOf(img)) k += '\n' + (so.getAttribute('srcset') || '');
    return k;
  }

  // The page's attributes, verbatim, so switching off puts back exactly what was there -
  // not the absolute URL a relative one resolved to.
  function captureRaw(img) {
    return {
      src: img.getAttribute('src'),
      srcset: img.getAttribute('srcset'),
      sources: sourcesOf(img).map((so) => [so, so.getAttribute('srcset')]),
    };
  }

  // srcset or <picture>: the browser chooses the file itself and ignores src.
  const responsive = (raw) => raw.srcset !== null || raw.sources.length > 0;

  function newState(img) {
    return {
        id: ++idCounter, el: new WeakRef(img),
        // What the page asked for (see pageKey), what the element looks like while one
        // of our bitmaps is showing, and the page's own attributes for putting back.
        siteKey: null, ourKey: null, raw: null,
        // The file actually loaded, and its size in image pixels - empty and 0 until it
        // has loaded. `gen` counts sources, so cache keys stay short even when the
        // source is a multi-megabyte data: URL.
        origUrl: '', nw: 0, nh: 0, gen: 0, pixelsKnown: false,
        // safeUrl: our own copy of the original, for sources a site can take away again.
        // See sourceUrl() below.
        blobUrl: null, safeUrl: null, key: null,
        forcedMode: null, busy: false, rerun: false,
        retryable: false, reverts: 0, limit: null, waiting: false,
        status: 'pending', report: null, anchor: null, baseRect: null,
        // key -> blob URL, so going back to a filter you have already seen is instant.
        cache: new Map(),
        // The <img>'s own inline styles: the page's values from before ours, and what we
        // last wrote. See setOwn().
        saved: null, wrote: null,
    };
  }

  function record(img) {
    if (isCanvas(img)) return recordCanvas(img);
    let s = state.get(img);

    if (!s) {
      s = newState(img);
      state.set(img, s);
      adopt(img, s, pageKey(img));
      return s;
    }

    // Mid-swap, the attribute values passing through are our own. Taking them for a new
    // source would record our resample as the original.
    if (s.busy) return s;

    const k = pageKey(img);
    if (k !== s.siteKey && k !== s.ourKey) {
      // The page pointed this element at something new.
      dropCache(s);
      adopt(img, s, k);
    } else if (k === s.siteKey && s.blobUrl) {
      // The page put its own file back over ours - usually a lazy-loader re-setting src.
      // Swap ours back in, but only a few times: after that the page is fighting us, and
      // the browser's own scaling beats a flickering image.
      s.blobUrl = null;
      s.key = null;
      if (++s.reverts > 3) {
        s.limit = { key: '*', why: 'the page keeps putting its own image back' };
      }
    }
    if (!s.origUrl) settle(img, s);
    return s;
  }

  // A canvas page has no file to track: its size is its bitmap's, and a new size means a
  // new page (or the same one redrawn) to lay out again. Never read, so never a source.
  function recordCanvas(c) {
    let s = state.get(c);
    if (!s) {
      s = newState(c);
      Object.assign(s, { canvas: true, origUrl: 'canvas', pixelsKnown: true, gif: false });
      state.set(c, s);
    }
    if (c.width !== s.nw || c.height !== s.nh) {
      s.nw = c.width;
      s.nh = c.height;
      s.gen++;
      s.key = null;
      s.status = 'pending';
    }
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
    s.gif = undefined;
    s.key = null;
    s.reverts = 0;
    s.limit = null;
    s.status = 'pending';
    settle(img, s);
  }

  // Take what the element shows as the source - but only once it has finished loading
  // what the page asked for. Until then its size is 0, or the previous image's.
  //
  // Nothing else notices that moment. A reader that turns pages by changing one <img>'s
  // src makes a DOM change when it sets the attribute but none when the file arrives, so
  // without this listener the new page stayed 'pending' until something unrelated ran.
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

  const CACHE_MAX = 3;   // per image; a 2560-wide bitmap is a few MB

  // Every resample is a blob: URL, which lives until revoked or the page closes. The
  // per-image caches cannot bound that alone: they hang off a WeakMap keyed by the <img>,
  // so when the page removes an element its URLs would be stranded, several MB each. This
  // registry is keyed by URL instead, so the total stays bounded whatever the page does.
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

  // A blob on screen is kept whatever the budget says: revoking it would break the image.
  // A removed element shows nothing, so its blob is fair game - hence asking the element,
  // not the recorded state, which names its last blob either way.
  // Snapshots are kept on the same terms: while their image is on the page they are the
  // only copy of its original left.
  function pinned(rec, url) {
    const img = rec.s.el.deref();
    if (!img || !img.isConnected) return false;
    return rec.s.blobUrl === url || rec.s.safeUrl === url;
  }

  function trackBlob(url, s, key, bytes) {
    blobs.set(url, { s, key, bytes });
    blobBytes += bytes;
    // Oldest first, sparing the new one and anything on screen.
    for (const [old, rec] of blobs) {
      if (blobBytes <= CFG.blobBudget) break;
      if (old === url || pinned(rec, old)) continue;
      rec.s.cache.delete(rec.key);       // a no-op for a snapshot, which is not cached
      if (rec.s.blobUrl === old) rec.s.blobUrl = null;
      if (rec.s.safeUrl === old) rec.s.safeUrl = null;
      forgetBlob(old);
    }
  }

  // keepSnapshot is only for switching off (see restore). Everywhere else the snapshot
  // goes with the cache: dropCache runs when the page puts a DIFFERENT image in the
  // element, and a snapshot of the old page would then be resampled in place of the new.
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

  // Where an image comes from decides whether its pixels can be read. Chrome gives every
  // file:// resource its own origin, so a local image can never be read, and asking for
  // CORS on one stops it loading at all - so CORS is only asked for where it can help.
  // data: URLs never taint.
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

  // Encoding is by far the slowest step - much slower than the resample itself - so the
  // format matters. Chrome encodes image/webp at quality 1 losslessly, several times
  // faster than PNG and smaller.
  //
  // That is a Chrome detail, not a promise: a browser that read quality 1 as "lossy,
  // best" would quietly undo the resample. So it is proven once on random noise (the
  // worst case for anything lossy), with PNG as the fallback. Proven on first use, not
  // at startup: the script loads on every page and is off on most. It has a deadline
  // like every other wait, so a page whose canvas never answers cannot stall everything.
  let encoderProbe = null;
  const encoder = () => (encoderProbe ||=
    withTimeout(probeEncoder(), 3000, 'encoder probe timed out').catch(() => 'image/png'));

  // Largest side the encoder can write. WebP stops at 16383, and past that Chrome does not
  // fail but crops (measured: 2560x17000 came back as 2560x16383, only the top).
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

  // Where to load this image's original from - not always the page's URL.
  const sourceUrl = (s) => s.safeUrl || s.origUrl;

  // Sources a site can take away again.
  //
  // A reader that decrypts pages into blob: URLs may revoke each one as soon as its <img>
  // has loaded (MangaPlus does; MangaDex does not). A revoked blob is gone: a new Image()
  // and fetch() both fail, so the bytes cannot be read again.
  // testkit/revoked-blob-selftest.html proves it.
  //
  // https: sources stay in the HTTP cache and data: URLs carry their bytes, so both reload
  // fine and are not worth an extra encode. A site with short-lived signed https URLs
  // would need this widened; the symptom would be 'source load failed' on the second
  // filter switch.
  const volatileSource = (url) => /^blob:/i.test(url);

  // Image hosts that turned out to send no Access-Control-Allow-Origin.
  //
  // Whether a host allows a CORS read cannot be known in advance, so the first image has
  // to try and fail. Remembering the answer spares every later image on that host (and
  // the console) a refused request.
  //
  // Such pixels cannot be read at all: the page's <img> shows fine, but a canvas that
  // draws it is tainted. That is the host's rule, not a fault, so it is reported as a
  // limitation rather than an error.
  const noCors = new Set();
  const hostOf = (url) => { try { return new URL(url, location.href).origin; } catch { return ''; } };

  // Copy the original out of the live element while it is still there.
  //
  // The decoded bitmap survives inside the <img> after its blob: URL is revoked (tested,
  // with a control, in the selftest above), and reading it needs the same untainted image
  // the GPU path needs anyway. No network request is made.
  async function snapshot(img, s, type) {
    const cv = document.createElement('canvas');
    cv.width = s.nw;
    cv.height = s.nh;
    // Drawn before the first await, so the pixels are caught even if the page swaps src
    // during the encode. At an explicit size: plain drawImage(img, 0, 0) uses the natural
    // size, which for a srcset `2x` file is half its real width.
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
      // CORS only where it can help; asking elsewhere breaks loads that would work.
      if (kind === 'cross') im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => rej(new Error(
        kind === 'cross' ? 'blocked: no CORS headers on source' : 'source load failed'));
      im.src = url;
    });
  }

  // Every wait in processImage has a deadline. One that never settles would leave the
  // image busy forever, frozen on its last status; a deadline turns that into an ERROR.
  function withTimeout(promise, ms, label) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(label)), ms); }),
    ]).finally(() => clearTimeout(timer));
  }

  // TRUE once the element has loaded what its attributes now name (and, given a URL, is
  // showing it); FALSE on error or timeout. Never rejects, and never hangs: the caller
  // needs the answer, and an unsettled promise would leave the image busy forever.
  //
  // Called in the same task that wrote the attributes. load and error always fire later,
  // so no event can be missed, and an image the browser already has is complete at once.
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

  // Show one of our bitmaps. On a responsive image that means srcset and every <picture>
  // source too, since the browser ignores src there: a src-only swap leaves the page's
  // file on screen. A bare URL in srcset is one candidate at 1x, so `sizes` no longer
  // matters and the natural size is the bitmap's own.
  function showOurs(img, s, url) {
    if (img.getAttribute('src') !== url || (responsive(s.raw) && img.getAttribute('srcset') !== url)) {
      if (responsive(s.raw)) {
        for (const [so] of s.raw.sources) so.setAttribute('srcset', url);
        img.setAttribute('srcset', url);
      }
      img.setAttribute('src', url);
    }
    // What the element looks like while it shows ours. Taken now: after the await, a
    // change by the page could be mistaken for ours.
    s.ourKey = pageKey(img);
    return waitShown(img, url);
  }

  // Put back the page's attributes exactly, and wait for whatever the browser then loads.
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
  // Some readers set a pixel size on the element around the image, worked out from the
  // image's ORIGINAL size. Resize the image and that number goes stale: too small, and an
  // overflow:hidden wrapper clips the image; too big, and it leaves dead space. Measured:
  //
  //   kmanga        div.c-viewer__page   height:800px; width:561.8px; overflow:hidden
  //   e-hentai MPV  div#image_N.mimg     height:1424px; max-width:994px
  //   e-hentai /s/  div#i1.sni           width:994px
  //   Webtoons      div.viewer_lst       overflow:hidden, a 1200px column in a 1400px
  //                                      page, so the image stopped 67-100px short of
  //                                      each window edge
  //
  // A list per site, not a general rule: a general rule would have to guess which
  // wrappers are safe to touch, and on these same sites a wrong guess breaks more than
  // the clipping (kmanga's .c-viewer__pages heights ARE its scroll math). Selectors are
  // matched upward from the image, so nothing outside it is ever touched.
  const CONTAINER_RULES = [
    { host: /(^|\.)kmanga\.kodansha\.com$/,       selectors: ['.c-viewer__page'] },
    { host: /(^|\.)(e-hentai|exhentai)\.org$/,    selectors: ['.mimg', '#i1'] },
    { host: /(^|\.)webtoons\.com$/,               selectors: ['.viewer_lst'] },
  ];
  // Readers that draw each page onto a <canvas> (K MANGA: 960x1367 bitmaps, shown at a
  // size the site sets). Their pages are sized like images, and 'nearest' works through
  // CSS, but they are never resampled: that would mean reading the canvas back, which the
  // browser forbids for images drawn without CORS, and which would also get round the
  // site's own copy protection. Per site, because resizing just any canvas (a game, a
  // map, a chart) would break its page.
  // K MANGA: only its scrolling view. Its paged view fits pages to the viewer itself.
  const CANVAS_RULES = [
    { host: /(^|\.)kmanga\.kodansha\.com$/, selector: '.c-viewer.is-vertical .c-viewer__comic canvas' },
  ];
  const CANVAS_SEL =
    (CANVAS_RULES.find((r) => r.host.test(location.hostname)) || {}).selector || null;
  const isCanvas = (el) => el instanceof HTMLCanvasElement;
  const canvasesTracked = new Set();
  // Everything the script works on: the images, plus a canvas reader's pages.
  const targets = () =>
    (CANVAS_SEL ? [...document.images, ...document.querySelectorAll(CANVAS_SEL)] : document.images);

  // Settable from the console via __crispImages.containers, to find a working selector
  // for an unlisted site without editing the script.
  let CONTAINERS =
    (CONTAINER_RULES.find((r) => r.host.test(location.hostname)) || {}).selectors || null;

  // 'auto'/'none'/'visible', not the image's new size: the wrapper then follows the image
  // whatever happens next, and none of our numbers can go stale in turn.
  const RELAX = { width: 'auto', height: 'auto', 'max-width': 'none', 'max-height': 'none',
                  overflow: 'visible' };
  const RELAX_PROPS = Object.keys(RELAX);
  const relaxedEls = new WeakMap();   // element -> its inline values before we touched it

  // e-hentai's multi-page viewer: its image pane (#pane_images) clips, and the site
  // leaves small gaps around it - 2px at the left (the body's padding) and 3px at the
  // right with the thumbnail pane closed; 5px after the thumbnails and 3px at the right
  // with it open. The pane is stretched from the thumbnails' right edge (or the window's
  // left) to the window's right. Switched off, the site's values go back, unless the
  // site has written newer ones, which stay.
  const MPV = /(^|\.)(e-hentai|exhentai)\.org$/.test(location.hostname) &&
              /^\/mpv\//.test(location.pathname);

  function mpvPane(img, on) {
    const pane = MPV && img.closest('#pane_images');
    if (!pane) return;
    if (!on) { override(pane, null); return; }
    const thumbs = document.getElementById('pane_thumbs');
    const open = thumbs && getComputedStyle(thumbs).display !== 'none';
    const from = open ? thumbs.getBoundingClientRect().right : 0;
    const origin = (pane.offsetParent || document.documentElement).getBoundingClientRect().left;
    override(pane, [['left', `${from - origin}px`],
                    ['width', `${viewportWidth() - from}px`]]);
  }

  // Page-wide fixes, while the script is on for the site. Webtoons gives its page a
  // min-width of 1400px, wider than most windows: the page then scrolls sideways, and
  // the strips, filled to the window, jumped back into place after every sideways
  // scroll. Without it the site's 1200px column centres in the window.
  const PAGE_RULES = [
    { host: /(^|\.)webtoons\.com$/, selector: '#wrap', props: [['min-width', '0px']] },
  ];
  const PAGE_RULE = PAGE_RULES.find((r) => r.host.test(location.hostname)) || null;

  function pageRule(on) {
    const el = PAGE_RULE && document.querySelector(PAGE_RULE.selector);
    if (el) override(el, on ? PAGE_RULE.props : null);
  }

  // K MANGA shows its pages in a viewer box whose height it sets to fit one page, and
  // gives each page a slot with that height as its min-height. The box becomes
  // viewerHeight of the window, pushing the rest of the page down, and the slots lose
  // their min-height, which otherwise left a gap under every page shorter than the box.
  // Only in the scrolling view; and the box is left alone in the site's own full-window
  // views (Full screen, Zoom), where it sizes the box itself.
  const VIEWER_RULES = [{
    host: /(^|\.)kmanga\.kodansha\.com$/,
    box: '.c-viewer__content', item: '.c-viewer__pages-item',
    when: '.c-viewer.is-vertical', unless: '.is-fullscreen, .is-expand',
  }];
  const VIEWER = VIEWER_RULES.find((r) => r.host.test(location.hostname)) || null;

  function viewerBox(img, on) {
    const box = VIEWER && img.closest(VIEWER.box);
    if (!box) return;
    watchViewer(box);
    const scrolling = on && !!box.closest(VIEWER.when);
    const full = !!box.closest(VIEWER.unless) || !!document.fullscreenElement;
    const h = Math.round(CFG.viewerHeight * innerHeight);
    // Its stylesheet also caps the box (max-height: 800px).
    override(box, scrolling && !full && h > 0 ? [['height', h + 'px'], ['max-height', 'none']] : null);
    const item = img.closest(VIEWER.item);
    if (item) override(item, scrolling ? [['min-height', '0px']] : null);
  }

  // The site switches views by changing classes above the box. No image changes, so
  // nothing else would notice; only a change in the classes that matter counts.
  const viewersWatched = new WeakSet();
  function watchViewer(box) {
    if (viewersWatched.has(box)) return;
    viewersWatched.add(box);
    const view = () => `${!!box.closest(VIEWER.when)}|${!!box.closest(VIEWER.unless)}`;
    let last = view();
    const mo = new MutationObserver(() => {
      const now = view();
      if (now === last) return;
      last = now;
      if (enabled) invalidateAll();
    });
    for (let el = box; el; el = el.parentElement) {
      mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // Inline styles set on an element of the page's (not the image), remembering the
  // page's own values. Given back with null - unless the page has written newer ones
  // since, which stay.
  //
  // While set, they are pinned: a page that writes its own value back (K MANGA resets
  // every page slot's min-height when its viewer resizes) gets ours again at once, before
  // anything is drawn. A page that keeps fighting back (over 20 writes a second) is left
  // to it until the next pass, rather than fought forever.
  const overrides = new WeakMap();   // element -> { prop: [page value, priority, ours] }
  const pins = new WeakMap();        // element -> its MutationObserver

  function override(el, props) {
    let saved = overrides.get(el);
    if (props) {
      if (!saved) { saved = {}; overrides.set(el, saved); }
      for (const [p, v] of props) {
        const cur = el.style.getPropertyValue(p);
        if (!saved[p] || cur !== saved[p][2]) saved[p] = [cur, el.style.getPropertyPriority(p)];
        el.style.setProperty(p, v, 'important');
        const ours = el.style.getPropertyValue(p);
        if (ours !== saved[p][2]) { saved[p][2] = ours; columnsAt = 0; }
      }
      pin(el);
    } else if (saved) {
      pins.get(el)?.disconnect();
      pins.delete(el);
      for (const p in saved) {
        const [v, pri, ours] = saved[p];
        if (el.style.getPropertyValue(p) !== ours) continue;
        el.style.removeProperty(p);
        if (v) el.style.setProperty(p, v, pri);
      }
      overrides.delete(el);
      columnsAt = 0;
    }
  }

  function pin(el) {
    if (pins.has(el)) return;
    let writes = 0, since = performance.now();
    const mo = new MutationObserver(() => {
      const saved = overrides.get(el);
      if (!saved) return;
      const now = performance.now();
      if (now - since > 1000) { since = now; writes = 0; }
      for (const p in saved) {
        const cur = el.style.getPropertyValue(p), ours = saved[p][2];
        if (cur === ours || ++writes > 20) continue;
        saved[p][0] = cur;
        saved[p][1] = el.style.getPropertyPriority(p);
        el.style.setProperty(p, ours, 'important');
      }
    });
    mo.observe(el, { attributes: true, attributeFilter: ['style'] });
    pins.set(el, mo);
  }

  function relaxContainers(img) {
    mpvPane(img, true);
    viewerBox(img, true);
    if (!CONTAINERS) return;
    for (const sel of CONTAINERS) {
      const el = img.closest(sel);
      if (!el) continue;
      // Saved once, re-applied every time: these viewers rewrite their inline sizes on
      // resize and page turns, and !important does not protect an inline value from the
      // next inline write.
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
    mpvPane(img, false);
    viewerBox(img, false);
    if (!CONTAINERS) return;
    for (const sel of CONTAINERS) {
      const el = img.closest(sel);
      const was = el && relaxedEls.get(el);
      if (!was) continue;
      for (const p of RELAX_PROPS) {
        el.style.removeProperty(p);
        // Only what the site set inline goes back; what it left to its stylesheet stays
        // absent.
        if (was[p][0]) el.style.setProperty(p, was[p][0], was[p][1]);
      }
      relaxedEls.delete(el);
    }
  }

  /* ------------------------------------------------------------------ *
   * The <img>'s own inline styles
   * ------------------------------------------------------------------ */
  //
  // Every style the script sets on an image goes through setOwn, which remembers the
  // page's value first so switching off puts back exactly that. Readers set these
  // themselves: e-hentai writes width and height inline, pan-and-zoom viewers drive
  // transform. Anything that is not what we last wrote belongs to the page - even if it
  // arrived later - and is what gets put back.
  const OWN_PROPS = ['width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
                     'margin-left', 'margin-right', 'image-rendering', 'transform',
                     'vertical-align', 'box-sizing', 'padding-left', 'padding-right',
                     'background-color'];

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

  // Hand one property back: the page's value returns, unless the page has written a newer
  // one since, which then stays.
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

  // Has the page rewritten the size we set? Then our bitmap is being scaled again by the
  // browser, and needs our size back.
  function sizeIntact(img, s) {
    return !!s.wrote && img.style.getPropertyValue('width') === s.wrote.width &&
           img.style.getPropertyValue('height') === s.wrote.height;
  }

  function applySize(img, t, s) {
    const d = dpr();
    const cssW = t.w / d, cssH = t.h / d;

    relaxContainers(img);

    // The page's limits go both ways: Webtoons sets min-width 600px on its strips, which
    // squashed a 350px-wide native one to 600x640.
    setOwn(img, s, 'max-width', 'none');
    setOwn(img, s, 'max-height', 'none');
    setOwn(img, s, 'min-width', '0px');
    setOwn(img, s, 'min-height', '0px');
    setOwn(img, s, 'width', cssW + 'px');
    setOwn(img, s, 'height', cssH + 'px');

    // Side bars: black padding on the element itself, so to the page they are part of the
    // image. content-box, or a site's border-box rule would take them out of the image.
    const bar = (t.bar || 0) / d;
    const outW = cssW + 2 * bar;
    if (bar > 0) {
      setOwn(img, s, 'box-sizing', 'content-box');
      setOwn(img, s, 'padding-left', bar + 'px');
      setOwn(img, s, 'padding-right', bar + 'px');
      setOwn(img, s, 'background-color', '#000');
    } else {
      for (const p of ['box-sizing', 'padding-left', 'padding-right', 'background-color']) dropOwn(img, s, p);
    }

    // An image wider than its column must not move anything else. Negative margins keep
    // its MARGIN box at the width the layout gave it, so the column never grows and
    // everything else keeps its x position; the image itself paints past the column.
    let ml = null, mr = null;
    s.anchor = null;

    if (s.forcedMode) {
      // A per-image override keeps the slot the image had before: the whole column if
      // fit-width had spread past it, else the image's own width.
      const base = targetSize(img, s.nw, s.nh, null);
      const baseW = (base.w + 2 * (base.bar || 0)) / d;
      const colW = base.lay ? base.lay.cbR - base.lay.cbL : Infinity;
      const extra = cssW - Math.min(baseW, colW);
      if (extra > 0.5) {
        const vp = window.visualViewport?.width ?? innerWidth;
        if (cssW <= vp) {
          // Fits on screen: grows equally both ways, centred where it was.
          ml = mr = `${-extra / 2}px`;
          s.anchor = 'center';
        } else {
          // Wider than the screen: grows to the right only. You cannot scroll left past
          // the page's edge, so a centred image would lose its left side.
          mr = `${-extra}px`;
          s.anchor = 'left';
        }
      }
    } else if (t.lay) {
      const { L, R, cbL, cbR } = t.lay;
      const colW = cbR - cbL;
      // Placed by us - centred in the free band, which fit-width fills exactly - whenever
      // the page's alignment would get it wrong: the image is wider than its column, or
      // part of the column is off limits (Webtoons' column runs past the window's edge).
      if (outW > colW + 0.5 || L > cbL + 0.5 || R < cbR - 0.5) {
        const l = L + (R - L - outW) / 2 - cbL;
        ml = `${l}px`;
        mr = `${colW - outW - l}px`;
      }
    }
    if (ml !== null) setOwn(img, s, 'margin-left', ml); else dropOwn(img, s, 'margin-left');
    if (mr !== null) setOwn(img, s, 'margin-right', mr); else dropOwn(img, s, 'margin-right');

    // An inline image sits on the text baseline, leaving a strip of background below it
    // for letters' descenders. Top-aligned, the line is exactly as tall as the image.
    if (getComputedStyle(img).display === 'inline') setOwn(img, s, 'vertical-align', 'top');
  }

  // One transform (which never affects layout), two jobs:
  //  - put an overridden image back where it sat, however the site centres things
  //  - land on a whole device pixel: half a pixel off blurs an otherwise exact image
  function snap(img, s) {
    // Switched off, or the page moved on, while this waited.
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

  // Per-stage timings, for "why is it slow": __crispImages.trace = true. The slow parts
  // are all waits on the browser (loading, encoding), not our own code. Each line also
  // gives the time since the script was last switched on, since quick stages can still
  // add up to a slow whole.
  let trace = false;
  let traceT0 = 0;

  function traceMark(msg) {
    if (trace) console.log(`[crisp-images] +${Math.round(performance.now() - traceT0)}ms  ${msg}`);
  }

  // timed() for code that must not yield - see the shared canvas in processImage.
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

  // Thrown in processImage when its work stopped applying while it waited: the script was
  // switched off, or the page pointed the element at something else. Without it, a page
  // turned during an encode got the old page swapped back in, and a resample finished
  // after switching off stayed on screen.
  const STALE = new Error('stale');

  // Where the band sits, to 1/8 px. If only this changes, new margins do; no new bitmap.
  const placeOf = (t) => (t.lay ? [t.lay.L, t.lay.R, t.lay.cbL, t.lay.cbR]
    .map((v) => Math.round(v * 8)).join(':') : '');

  // Longer for big outputs: encoding time grows with the pixel count.
  const encodeDeadline = (t) => Math.max(8000, t.w * t.h / 2500);

  async function processImage(img) {
    if (!enabled) return;
    // A canvas that no longer matches its rule (K MANGA's paged view) is handed back, and
    // must not be picked up again from an old IntersectionObserver entry.
    if (isCanvas(img) && !(CANVAS_SEL && img.matches(CANVAS_SEL))) return;
    const s = record(img);
    if (!s.origUrl || !s.nw || !eligible(s)) return;
    // Busy: note the request and run again when this pass finishes. Dropping it would make
    // a key pressed mid-resample seem to do nothing.
    if (s.busy) { s.rerun = true; return; }
    observeBox(img);

    // A responsive image reports a density-corrected size (a 2250-wide `2x` file says
    // 1125), but the GPU is handed the whole file. Learn the file's real size first.
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

    // A resample is a single still frame, so an animated image would freeze (measured: a
    // looping GIF stopped moving). GIF is the common case and cheap to spot: by the URL,
    // or for a blob: URL by the type the page gave the blob, read from memory.
    if (s.gif === undefined) {
      s.gif = /^data:image\/gif/i.test(s.origUrl) || /\.gif(?:[?#]|$)/i.test(s.origUrl);
      if (!s.gif && /^blob:/i.test(s.origUrl)) {
        s.busy = true;
        try {
          const b = await withTimeout(fetch(s.origUrl).then((r) => r.blob()), 3000, 'type check timed out');
          s.gif = b.type === 'image/gif';
        } catch { s.gif = false; }
        s.busy = false;
        s.rerun = false;
        return processImage(img);
      }
    }

    // Relax the site's wrappers BEFORE measuring: relaxing changes the very column the
    // image is measured against. The other way round, e-hentai's MPV placed its first
    // page 100px off-centre until a later pass happened to fix it.
    relaxContainers(img);
    const t = targetSize(img, s.nw, s.nh, s.forcedMode);
    // The source generation, not its URL: a data: URL can be megabytes long.
    const key = `${s.gen}|${t.w}x${t.h}|${quality}`;
    const place = placeOf(t);
    if (s.key === key) {
      // Same bitmap. Only the layout may need redoing: the band moved, or the page
      // rewrote our size.
      if (s.place !== place || !sizeIntact(img, s)) {
        applySize(img, t, s);
        s.place = place;
        defer(() => snap(img, s));
      }
      return;
    }

    s.busy = true;
    // What the element's attributes should say from here on. Our own swaps change it;
    // any other change means the page moved on.
    let expect = pageKey(img);
    const check = () => { if (!enabled || pageKey(img) !== expect) throw STALE; };
    const swapped = () => { expect = s.ourKey !== null ? s.ourKey : s.siteKey; };
    traceMark(`#${s.id} start`);
    try {
      // Size the element now, not after the slow encode: the page reaches its final
      // layout at once, and the sharp bitmap later replaces a browser-scaled one of the
      // same size. Done again at the end, harmlessly.
      applySize(img, t, s);

      const kind = originKind(s.origUrl);
      const limited = s.limit && (s.limit.key === '*' || s.limit.key === key) ? s.limit.why : null;
      const blocked =
        s.canvas ? 'the site draws this page on a canvas, which the script sizes but never reads'
          : kind === 'file'
          ? 'file:// is an opaque origin - the GPU path cannot run on local files'
          : kind === 'other' ? 'unsupported URL scheme'
          : kind === 'cross' && noCors.has(hostOf(s.origUrl))
            ? 'cross-origin, and the image host sends no CORS headers'
          : s.gif ? 'a GIF, left to the browser so an animation keeps moving'
          : limited;

      // Both filters go through the GPU, so every filter switch makes a new image, which
      // forces Chrome to repaint (see the note in the shader).
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
          // Awaited before the resample, never between it and toBlob - see below.
          const type = await encoder();
          check();
          const most = Math.min(GL.maxDim(), encoderMax(type));
          if (Math.max(t.w, t.h, s.nw, s.nh) > most) {
            throw tooLarge(`too large to resample in one piece: ${t.w}x${t.h}, and this ` +
                           `GPU and encoder stop at ${most} px a side`);
          }
          // Read straight from the element only when it is untainted and showing the
          // page's own image.
          const fresh = kind === 'same' && pageKey(img) === s.siteKey && img.complete &&
                        img.currentSrc === s.origUrl;

          // Last chance to copy the original: the swap below replaces it, and on a site
          // that revokes its blob: pages the URL may already be dead.
          if (fresh && !s.safeUrl && volatileSource(s.origUrl)) {
            await timed(s, 'snapshot source', () => snapshot(img, s, type));
            check();
          }

          const source = fresh ? img
            : await timed(s, 'load source', () =>
                withTimeout(loadImage(sourceUrl(s), originKind(sourceUrl(s))),
                            8000, 'source load timed out'));
          check();

          // GL.resample returns ONE canvas shared by every image, and toBlob reads it when
          // called. So no await between the two: another image would redraw the canvas
          // in between and this one would encode its pixels. Hence timeSync.
          const canvas = timeSync(s, 'gpu resample', () =>
            GL.resample(source, s.nw, s.nh, t.w, t.h, quality));
          const encoding = withTimeout(
            new Promise((r) => canvas.toBlob(r, type, 1)), encodeDeadline(t), 'encode timed out');
          const blob = await timed(s, `${type.slice(6)} encode`, () => encoding);
          if (!blob) throw new Error('encode failed');
          url = URL.createObjectURL(blob);
          s.cache.set(key, url);
          // Claimed before registering, or another image's eviction pass could take it.
          s.blobUrl = url;
          trackBlob(url, s, key, blob.size);
          // Checked after caching: even if it is too late to show, it is still good.
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
          : `lanczos3 (gpu, ${GL.precision()})`;
        if (cached) s.status += ' [cached]';
        // The site released its own image data; every later switch runs off our copy.
        if (s.safeUrl) s.status += ' [snapshot]';
      } else {
        // Without the GPU, show the ORIGINAL, or this would just rescale the last resample.
        if (s.blobUrl) {
          // s.blobUrl stays set until the swap lands, so it is still known as ours; the
          // blob stays cached for switching back. Where there is a snapshot it is shown,
          // since the site's own URL may be dead.
          const ok = await timed(s, 'restore src', () =>
            (s.safeUrl ? showOurs(img, s, s.safeUrl) : showSite(img, s)));
          swapped();
          check();
          s.blobUrl = null;
          if (!ok) throw new Error('original no longer loadable - the site released it');
        }
        if (t.factor === 1) {
          // One image pixel per screen pixel: nothing to resample, so every filter looks
          // the same (as long as snap() lands it on whole pixels).
          setOwn(img, s, 'image-rendering', 'auto');
          s.status = 'factor 1 - no resampling (all qualities identical here)';
        } else if (quality === 'nearest') {
          // Only when the GPU cannot be used (e.g. file://).
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
      // Not an error: the next pass starts over from what is true now.
      if (e === STALE) {
        s.key = null;
        s.rerun = true;
        return;
      }
      // A refused CORS read is the host's rule, not an error. Remember the host, then run
      // again: this time `blocked` is set, so the image is sized with the browser's own
      // scaling and a status that says why. (s.key = null lets the re-run go ahead.)
      if (/no CORS headers/.test(e.message)) {
        noCors.add(hostOf(s.origUrl));
        s.key = null;
        s.rerun = true;
        return;
      }
      // Too big for this GPU or format: also a limit, handled the same way.
      if (e.tooLarge) {
        s.limit = { key, why: e.message };
        s.key = null;
        s.rerun = true;
        return;
      }
      s.status = 'ERROR: ' + e.message;
      // A missed deadline is usually about the moment (a background tab, a busy GPU), so
      // it gets one more try later. Anything else would just fail again.
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
      // Switched off while this ran: switching off skipped this busy image, so hand it
      // back now.
      if (!enabled) restore(img);
      else if (s.rerun) { s.rerun = false; processImage(img); }
      updateHud();
    }
  }

  async function restore(img) {
    const s = state.get(img);
    // Busy: processImage calls this again when it finishes (see its finally).
    if (!s || s.busy) return;
    if (s.ourKey !== null && pageKey(img) === s.ourKey) {
      s.busy = true;                    // our own swap, guarded like processImage's
      // The site's own image back - or, where its URL is dead, our snapshot of it: the
      // same bitmap, and better than a broken image.
      try {
        if (!await showSite(img, s) && s.safeUrl) await showOurs(img, s, s.safeUrl);
      } finally {
        s.busy = false;
      }
      // Switched back on meanwhile: the next sweep takes it from here.
      if (enabled) { s.key = null; schedule(); return; }
    }
    // Keep the snapshot only if the element ended up showing it.
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
      // Queued, not started, so a scroll cannot start more than the cap allows; pump()
      // re-sorts, so an image just scrolled to goes to the front.
      if (e.isIntersecting) { visible.add(e.target); if (enabled) { enqueue(e.target); pump(); } }
      else visible.delete(e.target);
    }
    updateHud();
  }, { rootMargin: `${CFG.lazyMargin * 100}%` });

  let watched = new WeakSet();

  // Watches the boxes around each image - its column and the ancestors above it, up to
  // the first that clips - for layout changes that fire no window resize: a thumbnail
  // pane opening, a sidebar closing. The ancestors matter: on Tapas, closing the side
  // panel widens the column's parent and moves the column, but the column itself stays
  // 940px, so only the parent notices.
  //
  // Width only. Resizing an image changes the height of everything around it, so
  // reacting to heights would loop on our own work.
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
      // Seeded, so the first report (just the current size) is not taken as a change.
      containerWidth.set(el, Math.round(el.getBoundingClientRect().width));
      boxRO.observe(el);
      if (el !== cb && clips(el, getComputedStyle(el))) break;
    }
  }

  // ResizeObserver holds its targets, so boxes the page removed must be let go, or a
  // reader that rebuilds its DOM would pile them up.
  function pruneBoxes() {
    if (!boxRO) return;
    for (const el of observedBoxes) {
      if (!el.isConnected) { boxRO.unobserve(el); observedBoxes.delete(el); }
    }
  }

  // Is the image within the prepare-ahead range? Worked out directly, so correctness does
  // not depend on IntersectionObserver having reported yet; IO is only a trigger.
  function nearViewport(img) {
    const r = img.getBoundingClientRect();
    const mx = innerWidth * CFG.lazyMargin, my = innerHeight * CFG.lazyMargin;
    return r.bottom > -my && r.top < innerHeight + my &&
           r.right > -mx && r.left < innerWidth + mx;
  }

  // Distance in pixels from the window - 0 for anything on screen. Sorting by it puts the
  // image you are looking at first.
  function viewportDistance(img) {
    const r = img.getBoundingClientRect();
    const dy = r.top > innerHeight ? r.top - innerHeight : (r.bottom < 0 ? -r.bottom : 0);
    const dx = r.left > innerWidth ? r.left - innerWidth : (r.right < 0 ? -r.right : 0);
    return Math.hypot(dx, dy);
  }

  // Two at a time. Encodes compete: five at once took 1.2-1.7 s each against 0.45 s for
  // one alone, so all finished as late as the slowest. The total work is the same either
  // way, but this way the images on screen finish first.
  const MAX_CONCURRENT = 2;
  let running = 0;
  const queue = [];

  function pump() {
    // Sorted now, not when queued: what matters is where things are after any scrolling.
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

  // Bring every image in range up to date. processImage does nothing when nothing
  // changed, so this is cheap. Not gated on img.complete: right after a swap it is often
  // false, and the recorded size is what counts.
  function processVisible() {
    for (const img of targets()) {
      const s = state.get(img);
      if (!s || !s.nw || !eligible(s)) continue;
      if (visible.has(img) || nearViewport(img)) enqueue(img);
    }
    pump();
  }

  // Sweep again once a loading image arrives. Needed every time an image is caught
  // loading, not just the first: a lazy loader (Webtoons) swaps a 1x1 placeholder for the
  // page, the sweep that change triggers finds it still loading, and the file's arrival
  // makes no DOM change. Listening only once left such pages 'skipped - 1x1' until a
  // scroll or a key press.
  const loadWait = new WeakSet();
  function whenLoaded(img) {
    if (loadWait.has(img)) return;
    loadWait.add(img);
    const done = () => {
      loadWait.delete(img);
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      if (enabled) schedule();
    };
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  }

  function sweep() {
    // Off means off: nothing is watched or recorded. Everything was handed back when the
    // script was switched off (see setEnabled).
    if (!enabled) { updateHud(); return; }
    detach();
    try {
      // IntersectionObserver says nothing once the page removes an element, so drop
      // removed images here - or a reader that swaps pages would pile them up, bitmaps
      // and all.
      for (const img of visible) if (!img.isConnected) visible.delete(img);
      pruneBoxes();
      columnsAt = 0;
      pageRule(true);
      guardScrollbar();

      for (const img of document.images) {
        if (img.complete && img.naturalWidth) record(img);
        else if (!img.complete) whenLoaded(img);
        if (!watched.has(img)) {
          watched.add(img);
          io.observe(img);
        }
      }
      if (CANVAS_SEL) {
        // A canvas that stops matching (K MANGA switched to its paged view) is handed back.
        for (const c of canvasesTracked) {
          if (!c.isConnected) canvasesTracked.delete(c);
          else if (!c.matches(CANVAS_SEL)) {
            canvasesTracked.delete(c);
            io.unobserve(c);
            watched.delete(c);
            visible.delete(c);
            restore(c);
          }
        }
        for (const c of document.querySelectorAll(CANVAS_SEL)) {
          record(c);
          canvasesTracked.add(c);
          if (!watched.has(c)) { watched.add(c); io.observe(c); }
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
    for (const img of targets()) {
      const s = state.get(img);
      if (s) s.key = null;
    }
    // sweep(), not processVisible(): after switching on nothing is recorded yet, and
    // processVisible() skips anything unrecorded.
    sweep();
  }

  // The side bars change a step at a time, and a held key repeats. Each step resizes the
  // images in view at once (the browser scales the bitmap already there for a moment);
  // the resample waits until the steps stop, or a held key would start one per repeat.
  let barsTimer = 0;
  function barsChanged() {
    for (const img of targets()) {
      const s = state.get(img);
      if (!s || s.busy || !s.report || !eligible(s) || !visible.has(img)) continue;
      applySize(img, targetSize(img, s.nw, s.nh, s.forcedMode), s);
    }
    clearTimeout(barsTimer);
    barsTimer = setTimeout(invalidateAll, 300);
  }

  // A page whose height sits right at the window's can flip its scrollbar forever: the
  // scrollbar goes, the image widens into its 15px, the page overflows, the scrollbar
  // comes back, the image narrows, the page fits, and so on. That shows as the page's
  // width flipping between two values a scrollbar apart. The cure is to keep the
  // scrollbar's space reserved (scrollbar-gutter: stable), so the width no longer
  // depends on it. Given back when switched off.
  let widthsSeen = [];   // [time, width] at each change
  let gutterSize = 0;    // the scrollbar's width, once its space is reserved
  function guardScrollbar() {
    if (gutterSize) return;
    const w = document.documentElement.clientWidth, now = performance.now();
    const last = widthsSeen[widthsSeen.length - 1];
    if (last && last[1] === w) return;
    widthsSeen = [...widthsSeen.filter(([t]) => now - t < 3000), [now, w]];
    const ws = [...new Set(widthsSeen.map(([, x]) => x))];
    const size = Math.abs(ws[0] - ws[1]);
    if (widthsSeen.length >= 4 && ws.length === 2 && size > 0 && size <= 25) {
      override(document.documentElement, [['scrollbar-gutter', 'stable']]);
      gutterSize = size;
      columnsAt = 0;
      traceMark(`scrollbar flipping: ${size}px reserved`);
    }
  }

  // The on/off switch. Off hands every image back (a busy one when it finishes) and stops
  // watching the page entirely, so an off script costs nothing. (Watching while off costs
  // about 35 sweeps a second on a page that changes every frame.)
  function setEnabled(on) {
    enabled = on;
    writeFlag('enabled', on);
    if (on) {
      for (const img of targets()) {
        const s = state.get(img);
        if (s && s.status === 'off') s.status = 'pending';
      }
      invalidateAll();
    } else {
      detach();
      if (gutterSize) { override(document.documentElement, null); gutterSize = 0; }
      pageRule(false);
      widthsSeen = [];
      io.disconnect();
      boxRO?.disconnect();
      observedBoxes.clear();
      visible.clear();
      watched = new WeakSet();
      queue.length = 0;
      columns.clear();
      for (const img of targets()) restore(img);
      for (const c of canvasesTracked) restore(c);
      canvasesTracked.clear();
    }
    updateHud();
  }

  // Only DOM changes that touch an image need a sweep: src or srcset changing, or an <img>
  // (or a <source> for one) arriving or leaving. A clock ticking or our own overlay
  // updating does not; before this filter, a busy page meant a sweep every frame. Layout
  // changes without an image change are the ResizeObserver's job.
  const hasImage = (n) => n.nodeType === 1 &&
    (n.tagName === 'IMG' || n.tagName === 'SOURCE' || n.getElementsByTagName('img').length > 0 ||
     (!!CANVAS_SEL && (n.tagName === 'CANVAS' || n.getElementsByTagName('canvas').length > 0)));

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (hud && hud.contains(r.target)) continue;
      if (r.type === 'attributes') { schedule(); return; }
      for (const n of r.addedNodes) if (hasImage(n)) { schedule(); return; }
      for (const n of r.removedNodes) if (hasImage(n)) { schedule(); return; }
    }
  });
  // A canvas reader redraws a page by resizing its bitmap, which sets width and height.
  const OPTS = { childList: true, subtree: true, attributes: true,
                 attributeFilter: CANVAS_SEL ? ['src', 'srcset', 'width', 'height'] : ['src', 'srcset'] };
  let attached = false;
  const attach = () => { if (!attached) { observer.observe(document.documentElement, OPTS); attached = true; } };
  const detach = () => { if (attached) { observer.disconnect(); attached = false; } };

  // Runs fn after layout settles - on the next frame, or after 32 ms, whichever is first.
  // A frame alone is not enough: a tab with nothing to repaint may not draw one for a
  // long time (until the mouse moves), and a hidden tab never does. The timer makes sure
  // nothing waits on a frame.
  function defer(fn) {
    let ran = false;
    const once = () => { if (ran) return; ran = true; fn(); };
    requestAnimationFrame(once);
    setTimeout(once, 32);
  }

  // Turns a burst of changes into one sweep. The latch is safe only because defer's timer
  // always fires; released by a frame alone, it could stay shut for good.
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

  // Switch one image to or from an override size, remembering where it sat so the new
  // size can stay in the same spot.
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

  // The image under the pointer, looking through anything stacked on top of it. Readers
  // put click-to-turn overlays over their pages, so the topmost element is often not the
  // image, and a click shortcut would reach only the overlay.
  function imageAt(e, eligibleOnly) {
    const ok = (el) => (el instanceof HTMLImageElement || isCanvas(el)) && state.has(el) &&
                       (!eligibleOnly || eligible(state.get(el)));
    if (ok(e.target)) return e.target;
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find(ok);
    if (hit || !CANVAS_SEL) return hit || null;
    // K MANGA's canvases take no pointer events, so hit testing never returns them.
    for (const c of document.querySelectorAll(CANVAS_SEL)) {
      const r = c.getBoundingClientRect();
      if (ok(c) && e.clientX >= r.left && e.clientX < r.right &&
          e.clientY >= r.top && e.clientY < r.bottom) return c;
    }
    return null;
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
    barsLess: parseShortcut(CFG.keyBarsLess), barsMore: parseShortcut(CFG.keyBarsMore),
  };
  const BUTTONS = { leftclick: 0, middleclick: 1, rightclick: 2 };
  const CLICKS = [['native', parseShortcut(CFG.clickNative)], ['double', parseShortcut(CFG.clickDouble)]]
    .filter(([, b]) => b && b.key in BUTTONS);

  const sameModifiers = (b, e) =>
    e.altKey === b.alt && e.ctrlKey === b.ctrl && e.shiftKey === b.shift && e.metaKey === b.meta;

  // The key pressed, as a shortcut names it. e.key is the character typed, which is not a
  // Latin letter with Option on a Mac ('π' for P) or on a Russian layout ('з'), so letters
  // and digits fall back to the key's position. A Latin letter in e.key still wins, so on
  // AZERTY or Dvorak you press the key marked with the letter.
  // Punctuation keys by position, for layouts where they type something else (the '['
  // key types 'х' on a Russian layout, 'ü' on a German one).
  const CODE_KEYS = { BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=',
                      Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
                      Backslash: '\\', Backquote: '`' };

  function keyName(e) {
    const k = (e.key || '').toLowerCase();
    if (/^[a-z0-9]$/.test(k)) return k;
    const m = /^(?:Key|Digit)([A-Z0-9])$/.exec(e.code || '');
    if (m) return m[1].toLowerCase();
    if (e.code in CODE_KEYS && !/^[\x21-\x7e]$/.test(k)) return CODE_KEYS[e.code];
    return k;
  }

  const pressed = (b, e) => !!b && sameModifiers(b, e) && keyName(e) === b.key;

  // Which click shortcut, if any, this click is. button: 0 left, 1 middle, 2 right.
  function clickAction(e, button) {
    if (!enabled) return null;
    const hit = CLICKS.find(([, b]) => BUTTONS[b.key] === button && sameModifiers(b, e));
    return hit ? hit[0] : null;
  }

  // A click shortcut acts on the image under the pointer; any other click is left alone.
  // (Chrome uses Alt+click to download a link - thumbnails included.)
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

  // Only the diagnostic rows name the hovered image, so the pointer is only tracked while
  // they are showing - not on every mouse move of every page.
  let hoverPending = false;
  addEventListener('mousemove', (e) => {
    if (hoverPending || !enabled || !hudVisible || !detailsVisible) return;
    hoverPending = true;
    requestAnimationFrame(() => {
      hoverPending = false;
      const hit = imageAt(e, false);
      // Cleared as well as set, or the overlay would stick to the last image hit.
      if (hit !== focus) { focus = hit; updateHud(); }
    });
  }, { passive: true });

  // Leaving the window sends no mousemove, so clear the hovered image here.
  document.addEventListener('mouseleave', () => {
    if (focus) { focus = null; updateHud(); }
  });

  const MODES = ['fit-width', 'integer', 'native'];
  const QUALITIES = ['lanczos3', 'nearest', 'browser'];

  // A key going into a text field is typing, not a shortcut (on a Mac, Option+letter
  // types a character). composedPath sees into shadow DOM, where e.target is only the host.
  function typing(e) {
    const el = e.composedPath ? e.composedPath()[0] : e.target;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''));
  }

  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    // Held keys repeat only for the side bars; a repeating toggle would flicker.
    const barKey = pressed(KEYS.barsLess, e) || pressed(KEYS.barsMore, e);
    if (e.repeat && !barKey) return;
    if (pressed(KEYS.toggle, e)) {
      // Only switching ON restarts the trace clock; on OFF, work still finishing would
      // report nonsense times.
      if (!enabled) traceT0 = performance.now();
      traceMark(`${KEYS.toggle.text} -> ${enabled ? 'off' : 'on'}`);
      setEnabled(!enabled);
    }
    else if (pressed(KEYS.overlay, e)) { hudVisible = !hudVisible; writeFlag('hud', hudVisible); updateHud(); }
    else if (pressed(KEYS.details, e)) { detailsVisible = !detailsVisible; focus = null; updateHud(); }
    else if (pressed(KEYS.mode, e)) { mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; invalidateAll(); updateHud(); }
    else if (pressed(KEYS.quality, e)) { quality = QUALITIES[(QUALITIES.indexOf(quality) + 1) % QUALITIES.length]; invalidateAll(); updateHud(); }
    else if (barKey) {
      if (enabled) {
        const step = pressed(KEYS.barsMore, e) ? 0.5 : -0.5;
        bars = Math.max(0, Math.min(25, Math.round((bars + step) * 2) / 2));
        writeNumber('bars', bars);
        barsChanged();
        updateHud();
      }
    }
    else return;
    e.preventDefault();
  });

  /* ================================================================== *
   * Overlay - reports one image: the hovered one, else the largest in range
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

  // An image's status for the overlay and report(), or why it has none. (Without the
  // reason, a skipped image reads 'pending' forever - on Webtoons, whose pages are 700px
  // wide, that looks like a stuck queue.)
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
        'position:fixed', 'z-index:2147483647', 'right:0', 'bottom:0',
        'background:rgba(0,0,0,.85)', 'color:#0f0', 'font:12px/1.45 Consolas,monospace',
        'padding:8px 10px 4px', 'border-radius:6px 0 0 0', 'pointer-events:none',
        'white-space:pre', 'text-align:left', 'max-width:60vw',
      ].join(';');
    }
    // Pages that rebuild their body take the overlay with them.
    if (!hud.isConnected) (document.body || document.documentElement).appendChild(hud);
    hud.style.display = 'block';

    const vp = viewportDevice();

    // Always shown: what the script is doing, and the shortcuts as configured, each named
    // by what it will do.
    const keyHelp = [[KEYS.toggle, enabled ? 'off' : 'on'], [KEYS.mode, 'mode'],
      [KEYS.quality, 'quality'], [KEYS.overlay, 'hud'],
      [KEYS.barsLess, 'bars-'], [KEYS.barsMore, 'bars+']]
      .filter(([b]) => b).map(([b, what]) => `${b.text} ${what}`).join('  ');
    const clickHelp = [...CLICKS.map(([what, b]) => `${b.text} = ${what === 'native' ? '1:1' : '2x native'}`),
      ...(KEYS.details ? [`${KEYS.details.text} details`] : [])].join('   ');
    const L = [`crisp-images ${enabled ? 'ON' : 'OFF'}   mode=${mode === 'fit-width' ? `fit-width ${CFG.fitWidth}` : mode}  quality=${quality}` +
               (bars > 0 ? `  bars=${bars}%` : '')];
    if (keyHelp) L.push(keyHelp);
    if (clickHelp) L.push(clickHelp);

    // Diagnostics, shown with the details key: this image first, then the context.
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
      // "in range", not "visible": the prepare-ahead area is the window grown by
      // lazyMargin on every side (four windows each way at 1.5), so this is well above
      // what is on screen. Most of it is icons and avatars; the second number is how
      // many pass the size filter.
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

    // Written only when it changes: every write costs a layout and a paint.
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

  // Debug handle, for when the overlay is not enough. In DevTools:
  //   __crispImages.report()          - every tracked image and its status
  //   __crispImages.memory()          - what the resample cache holds
  //   __crispImages.layout(img)       - the band fit-width fills for an image
  //   __crispImages.process(document.images[0])
  //   __crispImages.quality = 'nearest'     (also .mode, .fitWidth)
  //   __crispImages.trace = true      - per-stage timings, for "why is it slow"
  window.__crispImages = {
    sweep, invalidateAll,
    process: (img) => processImage(img || document.images[0]),
    memory: () => ({ blobs: blobs.size, mb: +(blobBytes / 1e6).toFixed(2),
                     budgetMb: CFG.blobBudget / 1e6 }),
    state: (img) => state.get(img || document.images[0]),
    // In css px from the window's left edge: cbL..cbR is the image's column, L..R the band
    // it fills. null means the window.
    layout: (img) => {
      const s = state.get(img || document.images[0]);
      columnsAt = 0;
      return s ? layoutOf(img || document.images[0], s.nw, s.nh) : null;
    },
    report: () => [...targets()].map((img) => {
      const s = state.get(img);
      return s ? {
        id: s.id, src: (s.origUrl || img.src).slice(0, 60), natural: `${s.nw}x${s.nh}`,
        origin: originKind(s.origUrl || img.src),
        output: s.report ? `${s.report.w}x${s.report.h} @${s.report.factor.toFixed(3)}` : '-',
        status: statusOf(s),
      } : { src: (img.currentSrc || img.src || '').slice(0, 60), status: 'not tracked' };
    }),
    get mode() { return mode; },
    set mode(v) { mode = v; invalidateAll(); },
    get quality() { return quality; },
    set quality(v) { quality = v; invalidateAll(); },
    // Side bars, in % of the window's width on each side (as Alt+[ / Alt+] set them).
    get bars() { return bars; },
    set bars(v) { bars = Math.max(0, Math.min(25, +v || 0)); writeNumber('bars', bars); invalidateAll(); updateHud(); },
    get fitWidth() { return CFG.fitWidth; },
    set fitWidth(v) { CFG.fitWidth = v; columnsAt = 0; invalidateAll(); },
    get trace() { return trace; },
    set trace(v) { trace = !!v; },
    // Selectors for wrappers the site sized to the old image. On a site that clips or
    // leaves gaps, try candidates until the page behaves, then report the one that
    // worked. Switching off undoes only the selectors set at the time, so switch off
    // BEFORE changing them if you want the page fully back.
    get containers() { return CONTAINERS; },
    set containers(v) { CONTAINERS = (v && v.length) ? v : null; invalidateAll(); },
  };

  // Free everything when the page goes away - unless it is only going into the
  // back/forward cache, where it may come back and would find its URLs dead.
  addEventListener('pagehide', (e) => {
    if (e.persisted) return;
    for (const url of blobs.keys()) URL.revokeObjectURL(url);
    blobs.clear();
    blobBytes = 0;
  });

  // You resizing the window is not a scrollbar flipping.
  addEventListener('resize', () => { widthsSeen = []; invalidateAll(); });
  // Full screen through the page (K MANGA's button) changes how its viewer is sized.
  document.addEventListener('fullscreenchange', () => { if (enabled) invalidateAll(); });
  // A page wider than the window (Webtoons is 1400px) can be scrolled, or scrolled by
  // its own script, sideways. The free band is measured against the window, so a
  // sideways scroll moves it; vertical scrolling does not, and is left to the observers.
  let lastScrollX = scrollX;
  addEventListener('scroll', () => {
    if (scrollX === lastScrollX) return;
    lastScrollX = scrollX;
    if (enabled) { columnsAt = 0; schedule(); }
  }, { passive: true });
  window.visualViewport?.addEventListener('resize', invalidateAll);
  addEventListener('load', schedule);
  document.addEventListener('visibilitychange', () => {
    // Coming back to a tab is when a timed-out image is most likely to succeed. It
    // takes the user to get here, so this cannot loop.
    if (document.visibilityState === 'visible') {
      for (const img of targets()) {
        const st = state.get(img);
        if (st && st.retryable) { st.retryable = false; st.key = null; }
      }
    }
    schedule();
  });
  schedule();
})();
