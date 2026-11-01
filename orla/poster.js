/* ORLA — visual exhibition. Original artworks, native folds, same-origin galleries. */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const category=c=>c==='event'?'活动美术':'展台设计';
  const featuredIds=['michelin-2024','merck','kraussmaffei','corning'];
  const themes=['stage','depth','form','light'], words=['STAGE','DEPTH','FORM','LIGHT'];
  let projects=[],currentFilter='all',toastTimer,lightbox;
  const dialog=$('#share-dialog');
  const imageData=(v,caption='')=>({...v,src:v.src||v.file,thumb:v.thumb||v.src||v.file,caption:v.caption||caption});

  function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
  function showDialog(title,message,value='',label='作品集链接'){
    $('#dialog-title').textContent=title;$('#dialog-message').textContent=message;
    $('#dialog-copy-input').value=value;$('#dialog-copy-input').hidden=!value;
    $('#dialog-input-label').textContent=label;$('#dialog-input-label').hidden=!value;
    if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
    if(value){$('#dialog-copy-input').focus();$('#dialog-copy-input').select();$('#dialog-copy-input').setSelectionRange(0,value.length);}else $('#dialog-confirm').focus();
  }
  function closeDialog(){if(dialog.close)dialog.close();else dialog.removeAttribute('open');}
  async function copy(value,label='内容'){
    let ok=false;
    try{if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(value);ok=true;}}catch{}
    if(!ok){const input=document.createElement('textarea');input.value=value;input.readOnly=true;input.style.cssText='position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';document.body.append(input);input.select();input.setSelectionRange(0,value.length);try{ok=document.execCommand('copy');}catch{}input.remove();}
    if(ok)toast(label+'已复制');else showDialog('手动复制'+label,'当前浏览器未允许自动复制，请长按下方已选中的内容进行复制。',value,label);
  }
  function imageLink(v,{deferred=false,caption=true,eager=false,art=false}={}){
    const i=imageData(v);const src=deferred?'data-src':'src';
    return `<figure class="${art?'art-frame':'work-image'}" style="--image-ratio:${i.width}/${i.height}"><a class="image-link" href="${esc(i.src)}" data-pswp-width="${i.width}" data-pswp-height="${i.height}" data-caption="${esc(i.caption)}" aria-label="放大查看：${esc(i.caption||'作品图片')}"><img ${src}="${esc(i.thumb)}" width="${i.width}" height="${i.height}" alt="${esc(i.caption)}" ${eager?'fetchpriority="high" loading="eager"':'loading="lazy"'} decoding="async"></a>${caption&&i.caption?`<figcaption>${esc(i.caption)}</figcaption>`:''}</figure>`;
  }
  function hydrate(root){if(!root)return;$$('img[data-src]',root).forEach(i=>{i.src=i.dataset.src;i.removeAttribute('data-src');});}
  function thumbnail(v,caption,cls=''){const i=imageData(v);return `<img class="${cls}" src="${esc(i.thumb)}" alt="${esc(caption)}" width="${i.width}" height="${i.height}" loading="lazy" decoding="async">`;}
  function openLabel(){return '<span class="open-label"><span class="when-closed">展开项目</span><span class="when-open">收起详情</span><i aria-hidden="true">＋</i></span>';}
  function projectBody(p){return `<div class="project-body"><p class="project-description">${esc(p.description)} · ${p.images.length} 幅画面</p>${p.note?`<p class="project-note">${esc(p.note)}</p>`:''}<div class="project-gallery gallery">${p.images.map((v,n)=>imageLink({...v,caption:`${p.title} · 画面 ${n+1}${p.pages.length>1?` / 原稿第 ${v.page} 页`:''}`},{deferred:true})).join('')}</div><details class="project-original"><summary>查看原稿整页 <span>第 ${p.pages.join('、')} 页 ＋</span></summary><div class="gallery">${p.originalPages.map(v=>imageLink(v,{deferred:true})).join('')}</div></details><div class="project-links"><button type="button" data-copy-project="${esc(p.id)}">复制本项目链接 ↗</button><a href="#project-${esc(p.id)}" data-collapse-project="${esc(p.id)}">收起项目 ↑</a></div></div>`;}
  function featureMarkup(p,index){
    const primary=p.id==='michelin-2024'?p.images[2]:p.id==='merck'?p.images[2]:p.images[0];
    const secondary=p.id==='kraussmaffei'?p.images[3]:p.id==='michelin-2024'?p.images[0]:p.images[1];
    const secondaryCaption=p.id==='kraussmaffei'?'原稿第18页的另一套方案':`${p.title} · 另一画面`;
    return `<details id="project-${esc(p.id)}" class="project poster-feature feature-${themes[index]}" data-id="${esc(p.id)}" data-category="${p.category}"><summary><div class="feature-head"><span>0${index+1} / ${category(p.category)}</span><span>ORLA · SELECTED WORKS</span></div><div class="feature-word" aria-hidden="true">${words[index]}</div><div class="feature-composition"><figure class="feature-primary">${thumbnail(primary,p.title)}${p.id==='kraussmaffei'?'<figcaption class="scheme-caption">方案一 / 原稿 P17</figcaption>':''}</figure><figure class="feature-secondary">${thumbnail(secondary,secondaryCaption)}${p.id==='kraussmaffei'?'<figcaption class="scheme-caption">方案二 / 原稿 P18</figcaption>':''}</figure></div><div class="feature-foot"><div><p class="project-subline">${p.industry?esc(p.industry)+' / ':''}${p.images.length} 幅画面${p.pages.length>1?' / 两套方案':''}</p><h3>${esc(p.title)}</h3></div>${openLabel()}</div></summary>${projectBody(p)}</details>`;
  }
  function archiveMarkup(p,index){return `<details id="project-${esc(p.id)}" class="project archive-project" data-id="${esc(p.id)}" data-category="${p.category}"><summary>${thumbnail(p.cover,p.title+'封面','archive-cover')}<div><h3>${esc(p.title)}</h3><p class="project-subline">${String(index+1).padStart(2,'0')} / ${category(p.category)} / ${p.images.length} 幅</p></div>${openLabel()}</summary>${projectBody(p)}</details>`;}
  function tags(items){return `<ul class="tag-list">${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;}
  function timeline(items){return items.map(i=>`<div class="timeline-item"><p class="timeline-period">${esc(i.period)}</p><h4>${esc(i.title)}</h4><p>${esc(i.detail)}</p></div>`).join('');}
  function resumeFold(title,sub,body,open=true){return `<details class="resume-fold"${open?' open':''}><summary><div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div><span class="fold-plus" aria-hidden="true">＋</span></summary><div class="resume-body">${body}</div></details>`;}
  function renderProfile(p,assets){
    $('#person-name').textContent=p.name;$('#person-role').textContent=p.role;
    $('#about-bio').innerHTML=p.bio.map(s=>`<p>${esc(s)}</p>`).join('');
    if(assets.portrait){const i=imageData(assets.portrait);$('#portrait-slot').innerHTML=thumbnail(i,p.name+'的个人照片');}
    $('#resume-sections').innerHTML=resumeFold('任职经历','三维设计 / 美术指导',timeline(p.experience))+resumeFold('教育经历','学校 / 专业',timeline(p.education))+resumeFold('设计工具与证书','名称与缩写沿用原稿',tags(p.software)+`<p class="resume-subheading">证书</p>`+tags(p.certifications))+resumeFold('兴趣与个人特质','',tags(p.traits)+`<p class="resume-subheading">兴趣</p>`+tags(p.interests),false);
    const contacts=[];
    if(p.phone)contacts.push(`<div class="contact-item"><span class="contact-label">电话</span><a class="contact-value" href="tel:${esc(p.phone)}">${esc(p.phone)}</a><a class="contact-action" href="tel:${esc(p.phone)}">拨打 ↗</a></div>`);
    if(p.wechat)contacts.push(`<div class="contact-item"><span class="contact-label">微信</span><span class="contact-value">${esc(p.wechat)}</span><button type="button" class="contact-action" data-copy-value="${esc(p.wechat)}" data-copy-label="微信号">复制 ↗</button></div>`);
    if(p.email)contacts.push(`<div class="contact-item"><span class="contact-label">邮箱</span><a class="contact-value" href="mailto:${esc(p.email)}">${esc(p.email)}</a><a class="contact-action" href="mailto:${esc(p.email)}">邮件 ↗</a></div>`);
    if(p.qq)contacts.push(`<div class="contact-item"><span class="contact-label">QQ</span><span class="contact-value">${esc(p.qq)}</span><button type="button" class="contact-action" data-copy-value="${esc(p.qq)}" data-copy-label="QQ号">复制 ↗</button></div>`);
    $('#contact-methods').innerHTML=contacts.join('');
  }
  function applyFilter(reveal=true){
    const query=$('#project-search').value.trim().toLocaleLowerCase();let total=0,remaining=0;
    for(const p of projects){const match=(currentFilter==='all'||p.category===currentFilter)&&`${p.title} ${p.description} ${p.industry||''} ${p.note||''}`.toLocaleLowerCase().includes(query);const element=$('#project-'+p.id);element.hidden=!match;if(match){total++;if(!featuredIds.includes(p.id))remaining++;}}
    $('#result-count').textContent=query?`找到 ${total} 个项目`:`${total} 个项目 / ${currentFilter==='all'?'活动美术与展台设计':category(currentFilter)}`;
    $('#archive-count').textContent=remaining;$('#archive-fold').hidden=remaining===0;
    if(reveal&&remaining)$('#archive-fold').open=true;
    $('#empty-state').hidden=total!==0;
    $$('.filter-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===currentFilter)));
  }
  function setupGallery(){
    if(!window.PhotoSwipeLightbox||!window.PhotoSwipe)return;
    lightbox=new PhotoSwipeLightbox({gallery:'.gallery',children:'a[data-pswp-width]',pswpModule:PhotoSwipe,bgOpacity:.97,showHideAnimationType:matchMedia('(prefers-reduced-motion: reduce)').matches?'none':'fade',closeTitle:'关闭',zoomTitle:'放大或缩小',arrowPrevTitle:'上一张',arrowNextTitle:'下一张',indexIndicatorSep:' / ',errorMsg:'图片暂未加载，请关闭后重试。'});
    lightbox.on('uiRegister',()=>lightbox.pswp.ui.registerElement({name:'custom-caption',order:9,isButton:false,appendTo:'root',onInit:(e,pswp)=>pswp.on('change',()=>{e.textContent=pswp.currSlide.data.element?.dataset.caption||'';})}));lightbox.init();
  }
  function setupInteractions(){
    $$('.filter-tabs button').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;applyFilter();}));
    $('#project-search').addEventListener('input',()=>applyFilter());
    $('#clear-search').addEventListener('click',()=>{currentFilter='all';$('#project-search').value='';$('#archive-fold').open=false;applyFilter(false);$('#project-search').focus();});
    $('#expand-all').addEventListener('click',()=>{$('#archive-fold').open=true;$$('.project:not([hidden])').forEach(d=>{d.open=true;hydrate($('.project-gallery',d));});});
    $('#collapse-all').addEventListener('click',()=>{$$('.project').forEach(d=>d.open=false);$('#archive-fold').open=false;});
    $$('.project').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)hydrate($('.project-gallery',d));}));
    $$('.project-original').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)hydrate(d);}));
    $('#source-pages').addEventListener('toggle',e=>{if(e.currentTarget.open)hydrate($('#original-pages'));});
    document.addEventListener('click',e=>{
      const value=e.target.closest('[data-copy-value]');if(value)copy(value.dataset.copyValue,value.dataset.copyLabel);
      const project=e.target.closest('[data-copy-project]');if(project)copy(location.href.split('#')[0]+'#project-'+project.dataset.copyProject,'项目链接');
      const collapse=e.target.closest('[data-collapse-project]');if(collapse){e.preventDefault();const d=$('#project-'+collapse.dataset.collapseProject);d.open=false;$('summary',d).focus({preventScroll:true});d.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
      const retry=e.target.closest('[data-retry-image]');if(retry){const img=retry.parentElement.querySelector('img');if(img){delete img.dataset.failed;img.src=img.dataset.originalSrc;retry.parentElement.classList.remove('image-unavailable');retry.remove();}}
    });
    $('#copy-link').addEventListener('click',()=>{if(location.protocol==='file:')showDialog('分享已发布的链接','本地预览文件请通过已发布的网页链接分享。');else copy(location.href.split('#')[0],'作品集链接');});
    $('#wechat-share').addEventListener('click',()=>showDialog('在微信里分享','在微信内打开后，点击右上角“…”转发给朋友，或复制此链接粘贴到聊天中发送。',location.protocol==='file:'?'':location.href.split('#')[0]));
    $('#dialog-close').addEventListener('click',closeDialog);$('#dialog-confirm').addEventListener('click',closeDialog);
    dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeDialog();}});
    function followHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(!id.startsWith('project-'))return;const d=document.getElementById(id);if(!d)return;currentFilter='all';$('#project-search').value='';applyFilter(false);if(d.closest('#archive-fold'))$('#archive-fold').open=true;d.open=true;hydrate($('.project-gallery',d));requestAnimationFrame(()=>d.scrollIntoView({block:'start'}));}
    window.addEventListener('hashchange',followHash);followHash();
    let pending=false;const update=()=>{pending=false;$('#back-to-top').hidden=scrollY<700;};window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(update);}},{passive:true});update();
  }
  document.addEventListener('error',e=>{const img=e.target;if(img.tagName!=='IMG'||img.dataset.failed)return;const holder=img.closest('.art-frame,.work-image,.feature-primary,.feature-secondary');if(!holder)return;img.dataset.failed='true';img.dataset.originalSrc=img.currentSrc||img.src;holder.classList.add('image-unavailable');const button=document.createElement('button');button.type='button';button.className='image-retry';button.dataset.retryImage='true';button.textContent='图片暂未加载 · 点此重试';holder.append(button);},true);
  async function init(){
    try{
      const [data,assets]=await Promise.all([window.ORLA_DATA||fetch('data.json').then(r=>{if(!r.ok)throw Error('data');return r.json();}),window.ORLA_ASSETS||fetch('assets/manifest.json').then(r=>{if(!r.ok)throw Error('assets');return r.json();})]);
      const originals=assets.pages.map(p=>imageData(p,`原稿第 ${p.page} 页`));
      projects=data.projects.map(p=>{const groups=assets.works.filter(w=>p.pages.includes(w.page));return {...p,cover:imageData(groups[0].cover),images:groups.flatMap(g=>g.images.map(i=>imageData({...i,page:g.page}))),originalPages:originals.filter(i=>p.pages.includes(i.page))};});
      $('#selected-projects').innerHTML=featuredIds.map((id,i)=>featureMarkup(projects.find(p=>p.id===id),i)).join('');
      $('#project-list').innerHTML=projects.filter(p=>!featuredIds.includes(p.id)).map(archiveMarkup).join('');
      const coverMain=assets.works.find(w=>w.page===7).images[0],coverDetail=assets.works.find(w=>w.page===25).images[0];
      $('#cover-main').innerHTML=imageLink({...coverMain,caption:'施华蔻 · 空间视觉画面'},{caption:false,eager:true,art:true});
      $('#cover-detail').innerHTML=imageLink({...coverDetail,caption:'康宁 · 展台设计画面'},{caption:false,art:true});
      renderProfile(data.profile,assets);
      $('#count-all').textContent=projects.length;$('#count-event').textContent=projects.filter(p=>p.category==='event').length;$('#count-booth').textContent=projects.filter(p=>p.category==='booth').length;
      $('#original-count').textContent=originals.length+' 页';$('#original-pages').innerHTML=originals.map(i=>imageLink(i,{deferred:true})).join('');
      $('#changes-list').innerHTML=data.changes.map(c=>`<article class="change-item"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('');
      $('#load-state').hidden=true;$('#portfolio').hidden=false;applyFilter(false);setupGallery();setupInteractions();document.documentElement.dataset.ready='true';
    }catch(error){$('#load-state').innerHTML='作品集暂时未能载入，请刷新重试。<br><a href="assets/ORLA-portfolio-web.pdf">直接打开完整 PDF ↗</a>';console.error('Portfolio could not load',error);}
  }
  init();
})();
