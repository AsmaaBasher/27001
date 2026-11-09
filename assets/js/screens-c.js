/* =====================================================================
   Screens 10–12: ISO 27001 mapping, Risk Assessment, Roadmap
   ===================================================================== */
(function () {
  'use strict';
  const MW = window.MW, ui = MW.ui, { ic, L, isoList } = ui;
  const STATUSES = ['Proposed', 'Simulated', 'Requires Implementation', 'Requires Verification'];
  const STATUS_AR = {
    'Proposed': 'مقترح في التصميم ولم يُنفّذ بعد',
    'Simulated': 'تم توضيحه في المعمل (محاكاة فقط)',
    'Requires Implementation': 'يتطلب تنفيذاً فعلياً خارج المعمل',
    'Requires Verification': 'يتطلب تحققاً ميدانياً من الوضع القائم'
  };

  /* ================================================================
     Screen 11 — Risk Assessment
     ================================================================ */
  const LV = s => s <= 4 ? 'Low' : s <= 9 ? 'Medium' : s <= 16 ? 'High' : 'Critical';
  const LV_AR = { Low: 'منخفض', Medium: 'متوسط', High: 'عالي', Critical: 'حرج' };
  const rk = { residual: false, sel: 'R01' };
  let rEl;
  function drawHeat() {
    const pos = r => rk.residual ? [r.rL, r.rI] : [r.L, r.I];
    let cells = '';
    for (let l = 5; l >= 1; l--) {
      cells += `<div class="ax">${l}</div>`;
      for (let i = 1; i <= 5; i++) {
        const here = MW.risks.filter(r => { const p = pos(r); return p[0] === l && p[1] === i; });
        cells += `<div class="cell lv-${LV(l * i)}"><span class="sc">${l * i}</span>${here.map(r => `<span class="rk ${rk.sel === r.id ? 'on' : ''}" data-r="${r.id}" title="${ui.esc(r.risk)}">${r.id}</span>`).join('')}</div>`;
      }
    }
    cells += `<div></div>${[1, 2, 3, 4, 5].map(i => `<div class="ax">${i}</div>`).join('')}`;
    rEl.querySelector('#heat').innerHTML = cells;
    rEl.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', (b.dataset.mode === 'res') === rk.residual));
  }
  function drawRiskTable() {
    rEl.querySelector('#riskBody').innerHTML = MW.risks.map(r => {
      const s = r.L * r.I, rs = r.rL * r.rI;
      return `<tr class="click ${rk.sel === r.id ? 'sel' : ''}" data-r="${r.id}"><td>${L(r.id)}</td><td><b>${r.risk}</b><div class="dim" style="font-size:.78rem">${L(r.asset)}</div></td>
        <td class="c">${L(r.L)}</td><td class="c">${L(r.I)}</td><td class="c"><span class="lvl ${LV(s)}">${L(s)} ${LV_AR[LV(s)]}</span></td>
        <td>${isoList(r.ctrls)}</td><td class="c"><span class="lvl ${LV(rs)}">${L(rs)} ${LV_AR[LV(rs)]}</span></td></tr>`;
    }).join('');
  }
  function drawRiskDetail() {
    const r = MW.risks.find(x => x.id === rk.sel), s = r.L * r.I, rs = r.rL * r.rI;
    rEl.querySelector('#riskDetail').innerHTML = `
      <h3>${ic('alert')}${r.id} — ${r.risk}</h3>
      <dl class="kv"><dt>الأصل</dt><dd>${L(r.asset)}</dd><dt>التهديد</dt><dd>${r.threat}</dd><dt>الثغرة</dt><dd>${r.vuln}</dd>
        <dt>الخطر الأصلي</dt><dd>${L('L' + r.L + ' × I' + r.I + ' = ' + s)} <span class="lvl ${LV(s)}">${LV_AR[LV(s)]}</span></dd>
        <dt>المعالجة</dt><dd>${L(r.treat)}</dd><dt>الضوابط</dt><dd>${isoList(r.ctrls)}</dd>
        <dt>المستهدف بعد المعالجة</dt><dd>${L('L' + r.rL + ' × I' + r.rI + ' = ' + rs)} <span class="lvl ${LV(rs)}">${LV_AR[LV(rs)]}</span></dd></dl>`;
  }
  function drawRisk() { drawHeat(); drawRiskTable(); drawRiskDetail(); }
  MW.register('risk', {
    render(el) {
      rEl = el;
      el.innerHTML = `
      <div class="grid split" style="grid-template-columns: 1fr 1.65fr; align-items:start">
        <div style="display:grid;gap:1rem;min-width:0">
          <div class="card"><div class="head-row"><h3>${ic('target')}مصفوفة المخاطر <span class="en">Heat map</span></h3>
            <div class="seg-toggle"><button data-mode="inh" class="on">الخطر الأصلي</button><button data-mode="res">بعد المعالجة</button></div></div>
            <div class="row" style="gap:.4rem;flex-wrap:nowrap;align-items:stretch">
              <div style="writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;color:var(--muted);font-size:.8rem" class="en">Likelihood →</div>
              <div style="flex:1"><div class="heat" id="heat" dir="ltr"></div><div class="en" style="text-align:center;color:var(--muted);font-size:.8rem;margin-top:.2rem">Impact →</div></div>
            </div></div>
          <div class="card" id="riskDetail"></div>
        </div>
        <div style="display:grid;gap:1rem;min-width:0">
          <div class="card"><div class="head-row"><h3>${ic('alert')}سجل المخاطر <span class="en">Risk Register (illustrative)</span></h3></div>
            <div class="tbl-wrap"><table class="t"><thead><tr><th>ID</th><th>الخطر</th><th class="c">L</th><th class="c">I</th><th class="c">الأصلي</th><th>الضوابط</th><th class="c">المستهدف</th></tr></thead><tbody id="riskBody"></tbody></table></div></div>
          <div class="grid g2">
            <div class="card tight"><h3>${ic('help')}المنهجية</h3>
              <div style="font-size:.9rem">درجة الخطر = الاحتمالية (${L('1–5')}) × الأثر (${L('1–5')})</div>
              <div class="row" style="margin-top:.5rem"><span class="lvl Low">${L('1–4')} منخفض</span><span class="lvl Medium">${L('5–9')} متوسط</span><span class="lvl High">${L('10–16')} عالي</span><span class="lvl Critical">${L('20–25')} حرج</span></div></div>
            <div class="note">${ic('alert')}<span>القيم <b>توضيحية لأغراض العرض</b> وتعكس سيناريوهات نموذجية لبيئات ERP. يتم اعتماد القيم الفعلية ومالكي المخاطر في ورشة تقييم المخاطر مع العميل (Clause 6.1.2).</span></div>
          </div>
        </div>
      </div>`;
      el.addEventListener('click', e => {
        const m = e.target.closest('[data-mode]'); if (m) { rk.residual = m.dataset.mode === 'res'; drawHeat(); return; }
        const r = e.target.closest('[data-r]'); if (r) { rk.sel = r.dataset.r; drawRisk(); }
      });
      drawRisk();
    }
  });

})();
