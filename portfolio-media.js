/* Progressive enhancement: without dialog support, original media links still work. */
(() => {
  'use strict';
  if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal || document.getElementById('portfolio-media-viewer')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'portfolio-media-viewer';
  dialog.className = 'portfolio-media-viewer';
  dialog.setAttribute('aria-labelledby', 'portfolio-media-title');
  dialog.innerHTML = `
    <div class="portfolio-media-header">
      <h2 id="portfolio-media-title"></h2>
      <button type="button" class="portfolio-media-close" aria-label="关闭作品预览" autofocus>关闭 <span aria-hidden="true">×</span></button>
    </div>
    <div class="portfolio-media-stage" tabindex="0" role="region" aria-label="作品预览"></div>
    <div class="portfolio-media-footer">
      <p class="portfolio-media-status" role="status" aria-live="polite"></p>
      <div class="portfolio-gallery-controls" hidden aria-label="图集翻页">
        <button type="button" class="portfolio-gallery-prev" aria-label="上一张图片">←</button>
        <span class="portfolio-gallery-count" aria-live="polite"></span>
        <button type="button" class="portfolio-gallery-next" aria-label="下一张图片">→</button>
      </div>
      <div class="portfolio-media-actions">
        <button type="button" class="portfolio-media-zoom" aria-pressed="false">查看原尺寸</button>
        <a class="portfolio-media-original" target="_blank" rel="noopener">打开原文件 ↗</a>
      </div>
    </div>`;
  document.body.append(dialog);

  const title = dialog.querySelector('h2');
  const closeButton = dialog.querySelector('.portfolio-media-close');
  const stage = dialog.querySelector('.portfolio-media-stage');
  const status = dialog.querySelector('.portfolio-media-status');
  const zoomButton = dialog.querySelector('.portfolio-media-zoom');
  const original = dialog.querySelector('.portfolio-media-original');
  const galleryControls = dialog.querySelector('.portfolio-gallery-controls');
  const galleryPrevious = dialog.querySelector('.portfolio-gallery-prev');
  const galleryNext = dialog.querySelector('.portfolio-gallery-next');
  const galleryCount = dialog.querySelector('.portfolio-gallery-count');
  const lockedProperties = ['position', 'top', 'left', 'right', 'width', 'overflow'];
  let trigger = null;
  let media = null;
  let scrollState = null;
  let activeSession = 0;
  let backdropPressed = false;
  let gallery = [];
  let galleryIndex = 0;
  let swipeStart = null;

  function lockPage() {
    scrollState = {
      x: window.scrollX,
      y: window.scrollY,
      styles: lockedProperties.map(name => [name, document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name)])
    };
    Object.assign(document.body.style, { position: 'fixed', top: `-${scrollState.y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
  }

  function releasePage() {
    if (!scrollState) return;
    const saved = scrollState;
    scrollState = null;
    saved.styles.forEach(([name, value, priority]) => value ? document.body.style.setProperty(name, value, priority) : document.body.style.removeProperty(name));
    const rootStyle = document.documentElement.style;
    const behavior = rootStyle.getPropertyValue('scroll-behavior');
    const priority = rootStyle.getPropertyPriority('scroll-behavior');
    rootStyle.setProperty('scroll-behavior', 'auto', 'important');
    window.scrollTo(saved.x, saved.y);
    if (behavior) rootStyle.setProperty('scroll-behavior', behavior, priority);
    else rootStyle.removeProperty('scroll-behavior');
  }

  function cleanup() {
    activeSession += 1;
    if (media instanceof HTMLVideoElement) {
      media.pause();
      media.removeAttribute('src');
      media.load();
    } else if (media) media.removeAttribute('src');
    media = null;
    stage.replaceChildren();
    stage.classList.remove('is-zoomed');
    stage.removeAttribute('aria-busy');
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.textContent = '查看原尺寸';
    original.removeAttribute('href');
    gallery = [];
    galleryControls.hidden = true;
    releasePage();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
    cleanup();
  }

  function open(triggerElement, source, switchingImage = false) {
    const session = ++activeSession;
    const isVideo = triggerElement.dataset.mediaKind === 'video';
    const isInteractive = triggerElement.dataset.mediaKind === 'interactive';
    if (!switchingImage) {
      trigger = triggerElement;
      const album = !isVideo && !isInteractive && triggerElement.closest('.image-collection');
      gallery = album ? [...album.querySelectorAll('a[data-media-kind="image"]')] : [];
      galleryIndex = Math.max(0, gallery.indexOf(triggerElement));
    }
    galleryControls.hidden = gallery.length < 2;
    galleryCount.textContent = `${galleryIndex + 1} / ${gallery.length}`;
    galleryPrevious.disabled = galleryIndex === 0;
    galleryNext.disabled = galleryIndex >= gallery.length - 1;
    stage.classList.remove('is-zoomed');
    stage.classList.toggle('is-interactive', isInteractive);
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.textContent = '查看原尺寸';
    title.textContent = triggerElement.dataset.mediaTitle || (isVideo ? '视频作品' : '图片作品');
    original.href = source;
    zoomButton.hidden = isVideo || isInteractive;
    zoomButton.disabled = true;
    status.textContent = isInteractive ? '正在加载互动作品…' : isVideo ? '正在加载视频…' : '正在加载图片…';
    stage.setAttribute('aria-busy', 'true');
    stage.scrollTo(0, 0);
    media = document.createElement(isInteractive ? 'iframe' : isVideo ? 'video' : 'img');
    const currentMedia = media;
    if (isInteractive) {
      currentMedia.title = title.textContent;
      currentMedia.allowFullscreen = true;
      currentMedia.addEventListener('load', () => {
        if (session !== activeSession) return;
        stage.removeAttribute('aria-busy');
        status.textContent = '可直接操作作品；也可在独立页面中打开。';
      });
    } else if (isVideo) {
      currentMedia.controls = true;
      currentMedia.playsInline = true;
      currentMedia.preload = 'metadata';
      currentMedia.setAttribute('aria-label', title.textContent);
      if (triggerElement.dataset.mediaPoster) currentMedia.poster = triggerElement.dataset.mediaPoster;
      currentMedia.addEventListener('loadeddata', () => {
        if (session !== activeSession) return;
        stage.removeAttribute('aria-busy');
        status.textContent = currentMedia.paused ? '点击视频播放键开始观看。' : '可使用播放器控制音量、进度与全屏。';
      });
      currentMedia.addEventListener('playing', () => {
        if (session === activeSession) status.textContent = '可使用播放器控制音量、进度与全屏。';
      });
    } else {
      currentMedia.alt = title.textContent;
      currentMedia.addEventListener('load', () => {
        if (session !== activeSession) return;
        stage.removeAttribute('aria-busy');
        zoomButton.disabled = false;
        status.textContent = gallery.length > 1 ? '左右切换或滑动，查看整套图片。' : '完整图片 · 可切换原尺寸查看细节。';
      });
    }
    currentMedia.addEventListener('error', () => {
      if (session !== activeSession) return;
      stage.removeAttribute('aria-busy');
      status.textContent = '暂时无法加载，可点击“打开原文件”重试。';
    });
    currentMedia.src = source;
    stage.replaceChildren(currentMedia);
    if (switchingImage) return true;
    lockPage();
    try {
      dialog.showModal();
      closeButton.focus({ preventScroll: true });
    } catch (error) {
      cleanup();
      return false;
    }
    if (isVideo) {
      const playback = currentMedia.play();
      if (playback) playback.catch(() => {
        if (session === activeSession && dialog.open && !currentMedia.error) status.textContent = '浏览器未自动播放，请点击视频播放键。';
      });
    }
    return true;
  }

  function changeImage(direction) {
    const nextIndex = galleryIndex + direction;
    if (nextIndex < 0 || nextIndex >= gallery.length) return;
    const item = gallery[nextIndex];
    let source;
    try {
      source = new URL(item.dataset.mediaSrc, document.baseURI);
      if (!['http:', 'https:', 'file:', 'blob:'].includes(source.protocol)) return;
    } catch (error) { return; }
    galleryIndex = nextIndex;
    open(item, source.href, true);
    stage.focus({ preventScroll: true });
  }
  galleryPrevious.addEventListener('click', () => changeImage(-1));
  galleryNext.addEventListener('click', () => changeImage(1));
  dialog.addEventListener('keydown', event => {
    if (gallery.length < 2 || stage.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      changeImage(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  stage.addEventListener('pointerdown', event => {
    swipeStart = event.pointerType === 'touch' && gallery.length > 1 && !stage.classList.contains('is-zoomed') ? { x: event.clientX, y: event.clientY } : null;
  });
  stage.addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 48 && Math.abs(dy) < Math.abs(dx) * .6) changeImage(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { swipeStart = null; });

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a[data-media-kind], button[data-media-kind]') : null;
    if (!target || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!['image', 'video', 'interactive'].includes(target.dataset.mediaKind) || !target.dataset.mediaSrc) return;
    let source;
    try {
      source = new URL(target.dataset.mediaSrc, document.baseURI);
      if (!['http:', 'https:', 'file:', 'blob:'].includes(source.protocol)) return;
    } catch (error) { return; }
    if (open(target, source.href)) event.preventDefault();
  });
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => {
    if (!dialog.open && (media || scrollState)) cleanup();
  });
  const outside = event => {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdropPressed = event.target === dialog && outside(event); });
  dialog.addEventListener('click', event => {
    if (backdropPressed && event.target === dialog && outside(event)) close();
    backdropPressed = false;
  });
  zoomButton.addEventListener('click', () => {
    if (!(media instanceof HTMLImageElement)) return;
    const zoomed = stage.classList.toggle('is-zoomed');
    media.style.width = zoomed ? `${media.naturalWidth}px` : '';
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? '适应屏幕' : '查看原尺寸';
    status.textContent = zoomed ? '原尺寸 · 可滚动或滑动查看图片细节。' : '完整图片 · 可切换原尺寸查看细节。';
    stage.scrollTo(0, 0);
  });
  document.querySelectorAll('.image-collection').forEach(album => {
    if (!album.dataset.galleryId) album.dataset.galleryId = album.querySelector('h4')?.textContent.trim() || 'images';
    const items = album.querySelectorAll('.image-card');
    const cover = items[0]?.querySelector('.card-cover');
    if (!cover) return;
    const badge = document.createElement('span');
    badge.className = 'album-count';
    badge.textContent = `图集 · ${items.length}张`;
    cover.append(badge);
    const name = album.querySelector('h4')?.textContent || '图片作品';
    items[0].setAttribute('aria-label', `打开图集：${name}，共${items.length}张`);
  });
  document.body.classList.add('portfolio-gallery-ready');
  const requestedAlbum = new URL(window.location.href).searchParams.get('album');
  if (requestedAlbum) {
    const album = [...document.querySelectorAll('.image-collection')].find(item => item.dataset.galleryId === requestedAlbum);
    const first = album?.querySelector('a[data-media-kind="image"]');
    if (first) open(first, new URL(first.dataset.mediaSrc, document.baseURI).href);
  }
})();
