/* ORLA portfolio. No framework, no analytics, all visual assets served locally. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categoryName = category => category === 'event' ? '活动视觉' : '展台设计';
  let toastTimer, currentFilter = 'all', projects = [], lightbox;
  const dialog = $('#share-dialog');

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2900);
  }

  function showDialog({title, message, value, label = '作品集链接'}) {
    $('#dialog-title').textContent = title;
    $('#dialog-message').textContent = message;
    $('#dialog-copy-input').value = value || '';
    $('#dialog-copy-input').hidden = !value;
    $('#dialog-input-label').hidden = !value;
    $('#dialog-input-label').textContent = label;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (value) {
      $('#dialog-copy-input').focus();
      $('#dialog-copy-input').select();
      $('#dialog-copy-input').setSelectionRange(0, value.length);
    } else $('#dialog-confirm').focus();
  }

  function closeDialog() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  async function copy(value, label = '内容') {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (_) { /* WeChat may deny Clipboard API; try the browser fallback below. */ }
    if (!copied) {
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;width:1px;height:1px;';
      document.body.append(input);
      input.focus(); input.select(); input.setSelectionRange(0, value.length);
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      input.remove();
    }
    if (copied) toast(label + '已复制');
    else showDialog({title:'手动复制' + label, message:'当前浏览器未允许自动复制。下方内容已选中，请长按或使用复制命令。', value, label});
    return copied;
  }

  function normalizeImage(image, fallbackCaption = '') {
    if (!image) return null;
    if (typeof image === 'string') return {src:image, thumb:image, width:1600, height:1000, caption:fallbackCaption};
    return { ...image, src:image.src || image.file, thumb:image.thumb || image.src || image.file, width:Number(image.width) || 1600, height:Number(image.height) || 1000, caption:image.caption || fallbackCaption};
  }

  function imageLink(image, {lazy = true, deferred = false, caption = true, classes = ''} = {}) {
    const i = normalizeImage(image);
    if (!i?.src) return '';
    const sourceAttribute = deferred ? 'data-src' : 'src';
    return `<figure class="work-image ${esc(classes)}" style="--image-ratio:${i.width}/${i.height}"><a class="image-link" href="${esc(i.src)}" data-pswp-width="${i.width}" data-pswp-height="${i.height}" data-caption="${esc(i.caption)}" aria-label="放大查看：${esc(i.caption || '作品图片')}"><img ${sourceAttribute}="${esc(i.thumb)}" alt="${esc(i.caption)}" width="${i.width}" height="${i.height}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"></a>${caption && i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}</figure>`;
  }

  function hydrate(container) {
    $$('img[data-src]', container).forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
  }

  function projectMarkup(project, index) {
    const cover = normalizeImage(project.cover);
    const count = project.images.length;
    return `<details class="project" id="project-${esc(project.id)}" data-id="${esc(project.id)}" data-category="${esc(project.category)}"><summary class="project-summary">${cover ? `<img class="project-cover" src="${esc(cover.thumb)}" alt="${esc(project.title)}项目封面" width="${cover.width}" height="${cover.height}" loading="lazy" decoding="async">` : '<div class="project-cover"></div>'}<div class="project-title"><p class="project-number"><span>${String(index + 1).padStart(2, '0')}</span><span class="project-type">${categoryName(project.category)}</span></p><h3>${esc(project.title)}</h3><p class="project-meta">${esc(project.industry || (project.pages.length > 1 ? '两套方案' : ''))}${project.industry ? ' · ' : ''}${count} 幅作品</p></div><span class="project-toggle"><i aria-hidden="true">＋</i><span class="when-closed">展开</span><span class="when-open">收起</span></span></summary><div class="project-body"><p class="project-description">${esc(project.description)}</p>${project.note ? `<p class="project-note">${esc(project.note)}</p>` : ''}<div class="project-gallery gallery">${project.images.map((img, n) => imageLink({...img, caption:img.caption || `${project.title} · 画面 ${n + 1}${project.pages.length > 1 ? ` / 原稿第 ${img.page} 页` : ''}`}, {deferred:true})).join('')}</div><details class="project-original"><summary>查看原稿整页 <span>第 ${project.pages.join('、')} 页</span></summary><div class="gallery">${project.originalPages.map(img => imageLink(img, {deferred:true})).join('')}</div></details><div class="project-links"><button type="button" data-copy-project="${esc(project.id)}">复制本项目链接 ↗</button><a href="#works" data-collapse-project="${esc(project.id)}">收起并返回项目列表 ↑</a></div></div></details>`;
  }

  function applyFilter() {
    const query = $('#project-search').value.trim().toLocaleLowerCase();
    let visible = 0;
    projects.forEach(project => {
      const match = (currentFilter === 'all' || project.category === currentFilter) && `${project.title} ${project.description} ${project.industry || ''} ${project.note || ''}`.toLocaleLowerCase().includes(query);
      const element = document.getElementById('project-' + project.id);
      element.hidden = !match;
      if (match) visible++;
    });
    $('#result-count').textContent = query ? `找到 ${visible} 个项目 / 共 ${projects.length} 个` : `当前显示 ${visible} 个项目 · 点击封面或标题展开`;
    $('#empty-state').hidden = visible !== 0;
    $$('.filter-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === currentFilter)));
  }

  function tags(items) {
    return `<ul class="tag-list">${items.map(item => `<li>${esc(typeof item === 'object' ? item.title || item.name : item)}</li>`).join('')}</ul>`;
  }

  function timeline(items) {
    return items.map(item => `<div class="timeline-item"><div class="timeline-period">${esc(item.period)}</div><div><h4>${esc(item.title)}</h4>${item.detail ? `<p>${esc(item.detail)}</p>` : ''}</div></div>`).join('');
  }

  function resumeFold(title, subtitle, body, open = false) {
    return `<details class="resume-fold"${open ? ' open' : ''}><summary class="resume-summary"><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><span class="fold-plus" aria-hidden="true">＋</span></summary><div class="resume-body">${body}</div></details>`;
  }

  function renderProfile(profile, assets) {
    $('#person-name').textContent = profile.name;
    $('#person-role').textContent = profile.role;
    $('#hero-education').textContent = profile.education?.[0]?.title || '';
    const conciseBio = profile.bio?.length > 1 ? profile.bio.slice(1) : profile.bio || [];
    $('#hero-bio').innerHTML = conciseBio.map(p => `<p>${esc(p)}</p>`).join('');
    $('#about-intro-text').textContent = (profile.traits || []).join(' / ') || profile.role;
    $('#hero-direct-contact').innerHTML = [
      profile.phone ? `<a href="tel:${esc(profile.phone)}"><span class="contact-mini-label">电话</span>${esc(profile.phone)} <span aria-hidden="true">↗</span></a>` : '',
      profile.wechat ? `<button type="button" data-copy-value="${esc(profile.wechat)}" data-copy-label="微信号"><span class="contact-mini-label">微信</span>${esc(profile.wechat)} <span aria-hidden="true">⧉</span></button>` : ''
    ].join('');
    const smart = (profile.experience || []).find(item => item.title === 'SMART');
    const highlights = [];
    if (smart) {
      highlights.push(`<div class="profile-highlight"><span>经历摘要</span><strong class="highlight-accent">${esc(smart.title)}${smart.detail?.includes('美术指导') ? ' · 美术指导' : ''}</strong></div>`);
      highlights.push(`<div class="profile-highlight"><span>SMART · 原稿记载的任职时长</span><strong>${esc((smart.period || '').replace('原稿记载 ', ''))}</strong></div>`);
    }
    if (profile.education?.[0]) highlights.push(`<div class="profile-highlight"><span>教育背景</span><strong>${esc(profile.education[0].title)}</strong></div>`);
    $('#profile-highlights').innerHTML = highlights.join('');
    if (assets.portrait) {
      const portrait = normalizeImage(assets.portrait);
      $('#portrait-slot').innerHTML = `<img src="${esc(portrait.src)}" alt="${esc(profile.name)}的个人照片" width="${portrait.width}" height="${portrait.height}" loading="lazy" decoding="async">`;
    }
    const eventCount = projects.filter(p => p.category === 'event').length;
    const boothCount = projects.filter(p => p.category === 'booth').length;
    $('#hero-stats').innerHTML = `<div class="hero-stat"><strong>${projects.length}</strong><span>项目<br>PROJECTS</span></div><div class="hero-stat"><strong>${eventCount}</strong><span>活动视觉<br>EVENTS</span></div><div class="hero-stat"><strong>${boothCount}</strong><span>展台设计<br>BOOTHS</span></div>`;
    $('#count-all').textContent = projects.length;
    $('#count-event').textContent = eventCount;
    $('#count-booth').textContent = boothCount;
    const featured = projects.find(p => p.images.length) || projects[0];
    if (featured?.images[0]) {
      const cover = normalizeImage(featured.cover || featured.images[0], featured.title);
      $('#hero-gallery').innerHTML = imageLink({...cover, thumb:cover.src, caption:featured.title}, {lazy:false, caption:false});
      $('#hero-caption').textContent = `精选 / ${featured.title}`;
      const heroImage = $('#hero-gallery img');
      if (heroImage) heroImage.loading = 'eager';
    }
    const secondaryProjects = [projects.find(p => p.id === 'schwarzkopf'), projects.find(p => p.id === 'elkem-ciie')].filter(Boolean);
    $('#hero-secondary').innerHTML = secondaryProjects.map(project => imageLink({...project.cover, caption:project.title}, {caption:false})).join('');
    let resume = '';
    if (profile.experience?.length) resume += resumeFold('任职经历', '三维设计与美术指导', timeline(profile.experience), true);
    if (profile.education?.length) resume += resumeFold('教育经历', '学校、专业与奖学金', timeline(profile.education), true);
    if (profile.software?.length || profile.certifications?.length) resume += resumeFold('设计工具与证书', '软件名称与缩写沿用原稿', `${profile.software?.length ? tags(profile.software) : ''}${profile.certifications?.length ? `<p class="resume-subheading">证书</p>${tags(profile.certifications)}` : ''}`, true);
    if (profile.interests?.length || profile.traits?.length) resume += resumeFold('兴趣与个人特质', (profile.interests || []).join(' / '), `${profile.traits?.length ? `<p class="resume-subheading">个人特质</p>${tags(profile.traits)}` : ''}${profile.interests?.length ? `<p class="resume-subheading">兴趣</p>${tags(profile.interests)}` : ''}`);
    $('#resume-sections').innerHTML = resume;
    const items = [];
    if (profile.phone) items.push(`<div class="contact-item"><span class="contact-label">电话</span><a class="contact-value" href="tel:${esc(profile.phone)}">${esc(profile.phone)}</a><a class="contact-action" href="tel:${esc(profile.phone)}">拨打 ↗</a></div>`);
    if (profile.wechat) items.push(`<div class="contact-item"><span class="contact-label">微信</span><span class="contact-value">${esc(profile.wechat)}</span><button type="button" class="contact-action" data-copy-value="${esc(profile.wechat)}" data-copy-label="微信号">复制 ↗</button></div>`);
    if (profile.email) items.push(`<div class="contact-item"><span class="contact-label">邮箱</span><a class="contact-value" href="mailto:${esc(profile.email)}">${esc(profile.email)}</a><a class="contact-action" href="mailto:${esc(profile.email)}">发邮件 ↗</a></div>`);
    if (profile.qq) items.push(`<div class="contact-item"><span class="contact-label">QQ</span><span class="contact-value">${esc(profile.qq)}</span><button type="button" class="contact-action" data-copy-value="${esc(profile.qq)}" data-copy-label="QQ 号">复制 ↗</button></div>`);
    $('#contact-methods').innerHTML = items.join('');
  }

  function setupGallery() {
    if (!window.PhotoSwipeLightbox || !window.PhotoSwipe) return;
    lightbox = new window.PhotoSwipeLightbox({
      gallery:'.gallery', children:'a[data-pswp-width]', pswpModule:window.PhotoSwipe,
      bgOpacity:0.96, showHideAnimationType:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'fade',
      closeTitle:'关闭', zoomTitle:'放大或缩小', arrowPrevTitle:'上一张', arrowNextTitle:'下一张', errorMsg:'图片暂时未加载，请关闭后重试。', indexIndicatorSep:' / '
    });
    lightbox.on('uiRegister', () => {
      lightbox.pswp.ui.registerElement({
        name:'custom-caption', order:9, isButton:false, appendTo:'root',
        onInit:(element, pswp) => {
          pswp.on('change', () => { element.textContent = pswp.currSlide.data.element?.dataset.caption || ''; });
        }
      });
    });
    lightbox.init();
  }

  function setupInteractions() {
    $$('.filter-tabs button').forEach(button => button.addEventListener('click', () => { currentFilter = button.dataset.filter; applyFilter(); }));
    $('#project-search').addEventListener('input', applyFilter);
    $('#clear-search').addEventListener('click', () => { currentFilter = 'all'; $('#project-search').value = ''; applyFilter(); $('#project-search').focus(); });
    $('#expand-all').addEventListener('click', () => { $$('.project:not([hidden])').forEach(details => { details.open = true; hydrate($('.project-gallery', details)); }); });
    $('#collapse-all').addEventListener('click', () => { $$('.project').forEach(details => { details.open = false; }); });
    $$('.project').forEach(details => details.addEventListener('toggle', () => { if (details.open) hydrate($('.project-gallery', details)); }));
    $$('.project-original').forEach(details => details.addEventListener('toggle', () => { if (details.open) hydrate(details); }));
    $('#source-pages').addEventListener('toggle', event => { if (event.currentTarget.open) hydrate($('#original-pages')); });
    document.addEventListener('click', event => {
      const copyButton = event.target.closest('[data-copy-value]');
      if (copyButton) copy(copyButton.dataset.copyValue, copyButton.dataset.copyLabel);
      const projectButton = event.target.closest('[data-copy-project]');
      if (projectButton) copy(location.href.split('#')[0] + '#project-' + projectButton.dataset.copyProject, '项目链接');
      const collapseButton = event.target.closest('[data-collapse-project]');
      if (collapseButton) {
        event.preventDefault();
        const project = document.getElementById('project-' + collapseButton.dataset.collapseProject);
        project.open = false;
        $('summary', project).focus({preventScroll:true});
        project.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
      }
    });
    $('#copy-link').addEventListener('click', () => {
      if (location.protocol === 'file:') showDialog({title:'分享已发布的链接', message:'当前为本地文件预览。请使用已发布的网页链接在微信分享。'});
      else copy(location.href.split('#')[0], '作品集链接');
    });
    $('#wechat-share').addEventListener('click', () => showDialog({title:'在微信里分享', message:'在微信内打开此页后，点右上角“…”可转发给朋友；也可以复制作品集链接，粘贴到聊天中发送。', value:location.protocol === 'file:' ? '' : location.href.split('#')[0]}));
    $('#dialog-close').addEventListener('click', closeDialog);
    $('#dialog-confirm').addEventListener('click', closeDialog);
    dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(); } });
    function followHash() {
      let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
      if (!id.startsWith('project-')) return;
      const details = document.getElementById(id);
      if (!details) return;
      currentFilter = 'all'; $('#project-search').value = ''; applyFilter();
      details.open = true; hydrate($('.project-gallery', details));
      requestAnimationFrame(() => details.scrollIntoView({block:'start'}));
    }
    window.addEventListener('hashchange', followHash);
    followHash();
    let pending = false;
    const updateProgress = () => {
      pending = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      $('#reading-progress').style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
      $('#back-to-top').hidden = window.scrollY < 700;
    };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateProgress); } }, {passive:true});
    window.addEventListener('resize', updateProgress, {passive:true});
    updateProgress();
  }

  async function init() {
    try {
      const [data, assets] = await Promise.all([
        window.ORLA_DATA ? Promise.resolve(window.ORLA_DATA) : fetch('data.json').then(response => { if (!response.ok) throw new Error('data'); return response.json(); }),
        window.ORLA_ASSETS ? Promise.resolve(window.ORLA_ASSETS) : fetch('assets/manifest.json').then(response => { if (!response.ok) throw new Error('assets'); return response.json(); })
      ]);
      const originals = (assets.pages || data.originalPages || []).map(page => normalizeImage(page, `原稿第 ${page.page} 页`));
      projects = data.projects.map(project => {
        const groups = (assets.works || []).filter(work => project.pages.includes(work.page));
        const images = (project.images || groups.flatMap(group => group.images.map(image => ({...image,page:group.page})))).map(image => normalizeImage(image));
        return {...project, images, cover:normalizeImage(project.cover || groups[0]?.cover || images[0]), originalPages:project.originalPages || originals.filter(page => project.pages.includes(page.page))};
      });
      $('#project-list').innerHTML = projects.map(projectMarkup).join('');
      renderProfile(data.profile, assets);
      $('#original-count').textContent = originals.length + ' 页';
      $('#original-pages').innerHTML = originals.map(page => imageLink(page, {deferred:true})).join('');
      $('#changes-list').innerHTML = (data.changes || []).map(change => `<article class="change-item"><h3>${esc(change.title)}</h3><p>${esc(change.text)}</p></article>`).join('');
      $$('.download-link').forEach(link => { link.innerHTML = '<span>下载轻量 PDF<small>27 页 · 约 15 MB</small></span><span aria-hidden="true">↓</span>'; });
      $$('#source-pages a[download]').forEach(link => { link.textContent = '下载轻量 PDF · 27 页 · 约 15 MB ↓'; });
      $('#load-state').hidden = true;
      $('#portfolio').hidden = false;
      applyFilter(); setupGallery(); setupInteractions();
      document.documentElement.dataset.ready = 'true';
    } catch (error) {
      $('#load-state').innerHTML = '作品集暂时未能载入，请刷新重试。<br><a href="assets/ORLA-portfolio-web.pdf">也可以直接打开 PDF 作品集 ↗</a>';
      console.error('Portfolio could not load:', error);
    }
  }
  init();
})();
