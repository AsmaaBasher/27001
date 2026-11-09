/* =====================================================================
   Mindware Lab — Core UI: navigation, keyboard, full-screen, timer,
   presenter notes, lightbox, shared helpers.
   ===================================================================== */
(function () {
  'use strict';
  const MW = window.MW;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------- Shared helpers ---------------- */
  const ui = MW.ui = {};
  ui.$ = $; ui.$$ = $$;
  ui.ic = (n, cls) => `<svg class="i ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  ui.L = (t) => `<span class="ltr" dir="ltr">${t}</span>`;
  ui.esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  ui.iso = (id) => { const c = MW.control(id); return `<span class="chip iso" title="${c ? ui.esc(c.name) : ''}">${id}</span>`; };
  ui.isoList = (ids) => ids.map(ui.iso).join(' ');
  ui.status = (s) => `<span class="st st-${s.replace(/ /g, '-')}">${s}</span>`;
  ui.actBadge = (a) => {
    const m = { ALLOW: ['b-allow', 'ALLOW'], ACCEPT: ['b-allow', 'ALLOW'], accept: ['b-allow', 'ACCEPT'], DENY: ['b-deny', 'DENY'], deny: ['b-deny', 'DENY'],
      blocked: ['b-block', 'BLOCKED'], BLOCK_WAF: ['b-block', 'BLOCKED · WAF'], BLOCK_IPS: ['b-block', 'BLOCKED · IPS'], PARTIAL: ['b-info', '443 ONLY'],
      'intra-zone': ['b-intra', 'INTRA-ZONE'], INFO: ['b-info', 'INFO'] };
    const v = m[a] || ['b-info', a];
    return `<span class="badge ${v[0]}">${v[1]}</span>`;
  };
  ui.resBadge = (res) => {
    if (res.stage === 'L2') return ui.actBadge('intra-zone');
    if (res.action === 'DENY' && (res.stage === 'IPS' || res.stage === 'WAF')) return `<span class="badge b-block">BLOCKED · ${res.stage}</span>`;
    return ui.actBadge(res.action);
  };
  ui.arrow = (a, b) => `<span class="ltr" dir="ltr">${a} → ${b}</span>`;
  ui.hostLabel = (h) => `<span class="ltr plain" dir="ltr">${h.name} — <span style="font-family:var(--mono)">${h.ip}</span></span>`;
  ui.svcLabel = (id) => { const s = MW.service(id); return s ? ui.L(s.label) : id; };

  let toastT;
  ui.toast = (msg) => {
    const t = $('#toast'); t.innerHTML = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  };

  ui.diagram = (src, title, caption) => `
    <figure style="margin:0">
      <div class="diagram" data-lb="${src}" data-lbt="${ui.esc(title)}" tabindex="0" role="button" aria-label="تكبير: ${ui.esc(title)}">
        <img src="${src}" alt="${ui.esc(title)}" loading="eager" draggable="false">
        <span class="zoom-hint">${ui.ic('expand')} عرض بحجم أكبر</span>
      </div>
      ${caption ? `<figcaption class="caption">${caption}</figcaption>` : ''}
    </figure>`;

  ui.download = (name, text, mime) => {
    const blob = new Blob(['﻿' + text], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* Screen registry: screen files call MW.register(key, {render, show, hide}) */
  const regByKey = {};
  MW.register = (key, obj) => { regByKey[key] = obj; };
  const reg = new Proxy({}, { get: (t, n) => { const s = MW.screens[+n - 1]; return s ? regByKey[s.key] : undefined; } });

  /* ---------------- Navigation ---------------- */
  const icons = { overview: 'home', business: 'brief', topology: 'topo', components: 'cpu', sim: 'play', risk: 'alert' };
  let cur = 0;
  const TOTAL = MW.screens.length;

  function buildNav() {
    $('#nav').innerHTML = MW.screens.map(s => `
      <li><button data-go="${s.n}" title="${s.ar} — ${s.en}">
        <span class="num">${s.n}</span>${ui.ic(icons[s.key])}
        <span class="lbl"><b>${s.ar}</b><small>${s.en}</small></span>
      </button></li>`).join('');
  }

  MW.go = function (n, opts) {
    n = Math.max(1, Math.min(TOTAL, +n || 1));
    if (n === cur && !(opts && opts.force)) return;
    const prev = cur; cur = n;
    $$('.screen').forEach(s => s.classList.toggle('active', +s.dataset.n === n));
    $$('#nav button').forEach(b => {
      const on = +b.dataset.go === n; b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const s = MW.screens[n - 1];
    $('#scrTitle').textContent = s.ar;
    $('#scrSub').textContent = `${String(n).padStart(2, '0')} · ${s.en}`;
    $('#pageNo').textContent = `${n} / ${TOTAL}`;
    $('#progBar').style.width = (n / TOTAL * 100) + '%';
    $('#btnPrev').disabled = n === 1; $('#btnNext').disabled = n === TOTAL;
    if (location.hash !== '#/' + n) history.replaceState(null, '', '#/' + n);
    document.title = `${s.en} | Mindware Secure ERP Lab`;
    renderNotes();
    if (reg[prev] && reg[prev].hide) reg[prev].hide();
    if (reg[n] && reg[n].show) reg[n].show();
    const el = $('#s' + n); if (el) el.scrollTop = 0;
  };
  MW.current = () => cur;

  /* ---------------- Full-screen / presentation ---------------- */
  function toggleFs() {
    const d = document;
    if (!d.fullscreenElement) {
      const el = d.documentElement;
      (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => ui.toast('المتصفح رفض وضع الشاشة الكاملة — استخدم F11'));
    } else d.exitFullscreen();
  }
  let wasCollapsed = false;
  document.addEventListener('fullscreenchange', () => {
    const fs = !!document.fullscreenElement;
    document.body.classList.toggle('present', fs);
    if (fs) { wasCollapsed = document.body.classList.contains('collapsed'); document.body.classList.add('collapsed'); }
    else if (!wasCollapsed) document.body.classList.remove('collapsed');
    $('#btnFs span').textContent = fs ? 'خروج من العرض' : 'عرض كامل';
  });
  const toggleSidebar = () => document.body.classList.toggle('collapsed');

  /* ---------------- Presentation timer (15 min) ---------------- */
  const TIMER_TOTAL = 15 * 60;
  let tLeft = TIMER_TOTAL, tRun = false, tInt = null;
  function tDraw() {
    const neg = tLeft < 0, a = Math.abs(tLeft);
    $('#timerTxt').textContent = (neg ? '+' : '') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
    const t = $('#timer'); t.classList.toggle('run', tRun); t.classList.toggle('over', neg);
  }
  MW.timerToggle = function (forceOn) {
    tRun = forceOn === true ? true : !tRun;
    clearInterval(tInt);
    if (tRun) tInt = setInterval(() => { tLeft--; tDraw(); }, 1000);
    tDraw();
  };
  function tReset() { tRun = false; clearInterval(tInt); tLeft = TIMER_TOTAL; tDraw(); ui.toast('تمت إعادة ضبط المؤقت إلى 15:00'); }

  /* ---------------- Presenter notes ---------------- */
  function renderNotes() {
    const s = MW.screens[cur - 1]; if (!s) return;
    let before = 0; for (let i = 0; i < cur - 1; i++) before += MW.screens[i].min;
    const fmt = m => { const sec = Math.round(m * 60); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
    $('#notesBody').innerHTML = `
      <div class="row" style="margin-bottom:.5rem">
        <span class="chip">الوقت المقترح: ${ui.L(fmt(s.min))}</span>
        <span class="chip">البداية المقترحة: ${ui.L(fmt(before))}</span>
      </div>
      <ul class="ticks">${s.notes.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }

  /* ---------------- Lightbox ---------------- */
  const lb = { scale: 1, x: 0, y: 0, drag: null };
  function lbApply() {
    $('#lbImg').style.transform = `translate(${lb.x}px,${lb.y}px) scale(${lb.scale})`;
    $('#lbZoom').textContent = Math.round(lb.scale * 100) + '%';
  }
  function lbFit() {
    const st = $('#lbStage').getBoundingClientRect(), img = $('#lbImg');
    const w = img.naturalWidth || 1000, h = img.naturalHeight || 700;
    lb.scale = Math.min(st.width / w, st.height / h) * 0.96;
    lb.x = (st.width - w * lb.scale) / 2; lb.y = (st.height - h * lb.scale) / 2; lbApply();
  }
  function lbZoom(f, cx, cy) {
    const st = $('#lbStage').getBoundingClientRect();
    if (cx === undefined) { cx = st.width / 2; cy = st.height / 2; }
    const ns = Math.max(0.1, Math.min(8, lb.scale * f));
    lb.x = cx - (cx - lb.x) * (ns / lb.scale); lb.y = cy - (cy - lb.y) * (ns / lb.scale); lb.scale = ns; lbApply();
  }
  ui.openImage = function (src, title) {
    const img = $('#lbImg');
    $('#lbTitle').textContent = title || '';
    $('#lightbox').classList.add('open');
    img.onload = lbFit; img.src = src; img.alt = title || '';
    if (img.complete && img.naturalWidth) lbFit();
  };
  const lbClose = () => $('#lightbox').classList.remove('open');
  function lbInit() {
    const stage = $('#lbStage');
    stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); lbZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    stage.addEventListener('pointerdown', e => { lb.drag = { x: e.clientX - lb.x, y: e.clientY - lb.y }; stage.classList.add('drag'); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => { if (!lb.drag) return; lb.x = e.clientX - lb.drag.x; lb.y = e.clientY - lb.drag.y; lbApply(); });
    const end = () => { lb.drag = null; stage.classList.remove('drag'); };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('dblclick', e => { const r = stage.getBoundingClientRect(); lbZoom(2, e.clientX - r.left, e.clientY - r.top); });
    $('#lbIn').onclick = () => lbZoom(1.25); $('#lbOut').onclick = () => lbZoom(0.8);
    $('#lbFit').onclick = lbFit;
    $('#lbOne').onclick = () => { const st = stage.getBoundingClientRect(), img = $('#lbImg'); lb.scale = 1; lb.x = (st.width - img.naturalWidth) / 2; lb.y = 10; lbApply(); };
    $('#lbClose').onclick = lbClose;
    window.addEventListener('resize', () => { if ($('#lightbox').classList.contains('open')) lbFit(); });
  }

  /* ---------------- Keyboard ---------------- */
  function onKey(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'select' || tag === 'textarea';
    const lbOpen = $('#lightbox').classList.contains('open');
    const helpOpen = $('#help').classList.contains('open');
    if (e.key === 'Escape') { lbClose(); $('#help').classList.remove('open'); $('#notes').classList.remove('open'); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (lbOpen) {
      if (e.key === '+' || e.key === '=') lbZoom(1.25);
      else if (e.key === '-') lbZoom(0.8);
      else if (e.key === '0') lbFit();
      else if (e.key === '1') $('#lbOne').click();
      e.preventDefault(); return;
    }
    if (helpOpen && e.key !== '?') return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === 'ArrowLeft') { e.preventDefault(); MW.go(cur + 1); }
    else if (k === 'ArrowUp' || k === 'PageUp' || k === 'ArrowRight') { e.preventDefault(); MW.go(cur - 1); }
    else if (k === 'Home') { e.preventDefault(); MW.go(1); }
    else if (k === 'End') { e.preventDefault(); MW.go(TOTAL); }
    else if (/^[1-9]$/.test(k) && +k <= TOTAL) MW.go(+k);
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'p' || k === 'P') toggleSidebar();
    else if (k === 'n' || k === 'N') $('#notes').classList.toggle('open');
    else if (k === 't' || k === 'T') MW.timerToggle();
    else if (k === '?') $('#help').classList.toggle('open');
    else if (MW.screens[cur - 1] && MW.screens[cur - 1].key === 'sim' && MW.sim) {
      if (k === ' ' && tag !== 'button') { e.preventDefault(); MW.sim.toggle(); }
      else if (k === 's' || k === 'S') MW.sim.step();
      else if (k === 'r' || k === 'R') MW.sim.reset();
    }
  }

  /* ---------------- Init ---------------- */
  function init() {
    buildNav();
    for (let n = 1; n <= TOTAL; n++) {
      try { if (reg[n] && reg[n].render) reg[n].render($('#s' + n)); }
      catch (err) { console.error('Screen ' + n + ' render failed', err); $('#s' + n).innerHTML = '<div class="card">Render error: ' + ui.esc(err.message) + '</div>'; }
    }
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-go]'); if (g) { MW.go(+g.dataset.go); return; }
      const l = e.target.closest('[data-lb]'); if (l) { ui.openImage(l.dataset.lb, l.dataset.lbt); return; }
      const c = e.target.closest('[data-close]'); if (c) $('#' + c.dataset.close).classList.remove('open');
      if (e.target.id === 'help') $('#help').classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-lb]')) { e.preventDefault(); ui.openImage(e.target.dataset.lb, e.target.dataset.lbt); }
    });
    document.addEventListener('keydown', onKey);
    $('#btnPrev').onclick = () => MW.go(cur - 1);
    $('#btnNext').onclick = () => MW.go(cur + 1);
    $('#btnFs').onclick = toggleFs;
    $('#btnCollapse').onclick = toggleSidebar;
    $('#btnHelp').onclick = () => $('#help').classList.add('open');
    $('#btnNotes').onclick = () => $('#notes').classList.toggle('open');
    $('#notesClose').onclick = () => $('#notes').classList.remove('open');
    let clickT = null;
    $('#timer').addEventListener('click', () => { clearTimeout(clickT); clickT = setTimeout(() => MW.timerToggle(), 220); });
    $('#timer').addEventListener('dblclick', () => { clearTimeout(clickT); tReset(); });
    lbInit(); tDraw();
    const h = /^#\/(\d+)/.exec(location.hash);
    MW.go(h ? +h[1] : 1, { force: true });
    window.addEventListener('hashchange', () => { const m = /^#\/(\d+)/.exec(location.hash); if (m) MW.go(+m[1]); });
    MW.ready = true;
  }
  document.addEventListener('DOMContentLoaded', init);
})();
