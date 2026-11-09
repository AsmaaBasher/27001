/* =====================================================================
   Screens 1–5: Overview, Business, Topology, Components, Traffic Flow
   + shared network SVG builder (used by Topology & Virtual Lab)
   ===================================================================== */
(function () {
  'use strict';
  const MW = window.MW, ui = MW.ui, { ic, L, iso, isoList } = ui;

  const IMG_TOPO = 'assets/diagrams/network-topology-original.png';
  const IMG_FLOW = 'assets/diagrams/erp-traffic-flow-original.png';
  MW.IMG = { topo: IMG_TOPO, flow: IMG_FLOW };

  /* ------------------------------------------------------------------
     Shared SVG: proposed segmented architecture
     mode 'topo' → zones clickable;  mode 'lab' → hosts clickable
     ------------------------------------------------------------------ */
  const SHORT = { 'ext-client': 'ERP Client', 'ext-attacker': 'Untrusted Host', 'dmz-rp': 'Reverse Proxy', 'app-01': 'ERP-APP-01', 'app-02': 'ERP-APP-02',
    'db-01': 'ERP-DB-01', 'db-02': 'ERP-DB-02 (Rep.)', 'mgmt-jump': 'Jump Host', 'mgmt-siem': 'SIEM', 'mgmt-backup': 'Backup' };
  MW.SHORT = SHORT;
  const ZL = { DMZ: { y: 52, t: 'DMZ — Public Services' }, APP: { y: 167, t: 'Application Zone' }, DB: { y: 282, t: 'Database Zone' }, MGMT: { y: 397, t: 'Management Zone' } };

  MW.netSvg = function (p, mode) {
    const z = id => MW.zone(id);
    const hostBox = (h, x, y, w) => {
      const cls = mode === 'lab' ? 'host' : 'hostv';
      return `<g class="${cls}" data-host="${h.id}" ${mode === 'lab' ? 'tabindex="0" role="button"' : ''}>
        <rect x="${x}" y="${y}" width="${w}" height="44" rx="8" ${mode === 'lab' ? '' : 'fill="#0b1a38" stroke="#36558f" stroke-width="1.2"'}/>
        <text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-size="12" font-weight="600">${SHORT[h.id]}</text>
        <text x="${x + w / 2}" y="${y + 35}" text-anchor="middle" font-size="12" font-family="Consolas, DejaVu Sans Mono, monospace" fill="#a5f3fc">${h.ip}</text>
      </g>`;
    };
    const zoneG = (id) => {
      const Z = z(id), cfg = ZL[id], x = 545, w = 390, y = cfg.y, h = 100;
      const hosts = MW.hosts.filter(hh => hh.zone === id);
      const hw = hosts.length === 3 ? 120 : 140;
      return `<g class="${mode === 'topo' ? 'zone' : 'zbox'}" data-zone="${id}" ${mode === 'topo' ? 'tabindex="0" role="button"' : ''}>
        <rect class="zb" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${Z.color}22" stroke="${Z.color}" stroke-width="2"/>
        <text x="${x + 14}" y="${y + 26}" font-size="15" font-weight="700">${cfg.t}</text>
        <text x="${x + w - 14}" y="${y + 26}" font-size="13" text-anchor="end" font-family="Consolas, DejaVu Sans Mono, monospace" fill="${Z.color}">${Z.cidr}</text>
        ${hosts.map((hh, i) => hostBox(hh, x + 10 + i * (hw + 9), y + 44, hw)).join('')}
      </g>`;
    };
    const ext = z('EXT');
    const links = ['DMZ', 'APP', 'DB', 'MGMT'].map((id, i) => {
      const zc = ZL[id].y + 50, sy = 232 + i * 32;
      return `<path class="link" data-link="${id}" d="M480 ${sy} C 512 ${sy}, 512 ${zc}, 545 ${zc}" marker-end="url(#${p}-arr)"/>
              <text x="520" y="${zc - 8}" font-size="11" fill="#9fb3d9" font-family="Consolas, DejaVu Sans Mono, monospace">${z(id).intf}</text>`;
    }).join('');
    return `<svg class="net" viewBox="0 0 960 525" role="img" aria-label="Proposed segmented ERP network (simulated)">
      <defs><marker id="${p}-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5b7fc4"/></marker></defs>
      <rect x="520" y="10" width="430" height="505" rx="18" fill="rgba(47,123,255,.04)" stroke="#2a4c8a" stroke-dasharray="8 6"/>
      <text x="735" y="36" text-anchor="middle" font-size="14" fill="#9fb3d9" font-weight="600">Data Center — On-Premises</text>

      <g class="${mode === 'topo' ? 'zone' : 'zbox'}" data-zone="EXT" ${mode === 'topo' ? 'tabindex="0" role="button"' : ''}>
        <rect class="zb" x="15" y="150" width="190" height="260" rx="14" fill="${ext.color}22" stroke="${ext.color}" stroke-width="2"/>
        <text x="110" y="178" text-anchor="middle" font-size="15" font-weight="700">External</text>
        <text x="110" y="198" text-anchor="middle" font-size="13" font-family="Consolas, DejaVu Sans Mono, monospace" fill="#cbd5e1">${ext.cidr}</text>
        <use href="#i-user" x="90" y="208" width="40" height="40" stroke="#cbd5e1" fill="none" stroke-width="1.6"/>
        ${hostBox(MW.host('ext-client'), 30, 262, 160)}
        ${hostBox(MW.host('ext-attacker'), 30, 320, 160)}
      </g>
      <path class="link" data-link="EXT" d="M205 280 L 232 280"/>
      <use href="#i-cloud" x="232" y="245" width="66" height="66" stroke="#7dd3fc" fill="none" stroke-width="1.5"/>
      <text x="265" y="330" text-anchor="middle" font-size="13" fill="#9fb3d9">Internet</text>
      <path class="link" data-link="EXT" d="M298 280 L 320 280" marker-end="url(#${p}-arr)"/>

      <g class="${mode === 'topo' ? 'zone' : 'zbox'}" data-zone="CORE" ${mode === 'topo' ? 'tabindex="0" role="button"' : ''}>
        <rect class="zb" x="320" y="200" width="160" height="160" rx="14" fill="#3a0f1a" stroke="#ef4444" stroke-width="2.5"/>
        <use href="#i-firewall" x="378" y="210" width="44" height="44" stroke="#fca5a5" fill="none" stroke-width="1.6"/>
        <text x="400" y="274" text-anchor="middle" font-size="15" font-weight="700">NGFW</text>
        <text x="400" y="293" text-anchor="middle" font-size="12" fill="#fecaca">FortiGate (HA)</text>
        <rect x="333" y="304" width="62" height="22" rx="6" fill="#1e293b" stroke="#f59e0b"/><text x="364" y="320" text-anchor="middle" font-size="11" fill="#fde68a">IPS/IDS</text>
        <rect x="405" y="304" width="62" height="22" rx="6" fill="#1e293b" stroke="#22d3ee"/><text x="436" y="320" text-anchor="middle" font-size="11" fill="#a5f3fc">WAF</text>
        <text x="400" y="348" text-anchor="middle" font-size="11" fill="#9fb3d9" font-family="Consolas, DejaVu Sans Mono, monospace">port1 – port5</text>
      </g>
      <g id="${p}-fwX" class="hidden"><circle cx="400" cy="196" r="16" fill="#ef4444"/><path d="M393 189l14 14M407 189l-14 14" stroke="#fff" stroke-width="3"/></g>
      <g id="${p}-fwOK" class="hidden"><circle cx="400" cy="196" r="16" fill="#22c55e"/><path d="M392 196l6 6 10-12" stroke="#fff" stroke-width="3" fill="none"/></g>
      ${links}
      ${zoneG('DMZ')}${zoneG('APP')}${zoneG('DB')}${zoneG('MGMT')}
      <text x="15" y="505" font-size="11" fill="#6f86b3">SIMULATED LAB TOPOLOGY — not connected to any real device</text>
    </svg>`;
  };

  /* ================================================================
     Screen 1 — Executive Overview
     ================================================================ */
  MW.register('overview', {
    render(el) {
            el.innerHTML = `
      <div class="hero">
        <div class="card hero-main">
          <div class="tag">Mindware | IT &amp; Information Security Consulting</div>
          <h2>Secure ERP <span>Infrastructure Lab</span></h2>
          <p>POC (Proof of Concept) لتصميم شبكة آمنة لأنظمة ERP داخل مركز البيانات الخاص بالعميل، مع شرح مكونات التصميم ومحاكاة مسار الترافيك، وتقييم المخاطر المرتبطة بها مع الإشارة لضوابط ${L('ISO/IEC 27001:2022 ')}.</p>
          <div class="row" style="margin-top:1.2rem">
            <button class="btn primary" id="ovStart">${ic('play')} ابدأ العرض</button>
            <button class="btn" data-go="5">${ic('flow')} محاكاة الترافيك</button>
            <button class="btn" data-go="6">${ic('alert')} تقييم المخاطر</button>
          </div>
          <div style="margin-top:1.2rem">
          </div>
        </div>
        <div class="card hero-art">${heroArt()}</div>
      </div>

      <div class="grid g4" style="margin-top:1rem">
        ${kpi('topo', MW.zones.length, 'مناطق شبكية منفصلة')}
        ${kpi('cpu', MW.components.length, 'مكوّن في التصميم')}
        ${kpi('play', 5, 'سيناريوهات محاكاة للترافيك')}
        ${kpi('alert', MW.risks.length, 'مخاطر في السجل التوضيحي')}
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="head-row"><h3>${ic('clock')}أجندة العرض <span class="en"></span></h3>
          <span class="dim" style="font-size:.85rem">اضغط على أي بند للانتقال إليه</span></div>
        <div class="agenda">${MW.screens.map(s => `<button data-go="${s.n}"><span class="n">${String(s.n).padStart(2, '0')} · ${s.min} min</span><b>${s.ar}</b><small>${s.en}</small></button>`).join('')}</div>
      </div>`;
      el.querySelector('#ovStart').onclick = () => { MW.timerToggle(true); MW.go(2); ui.toast('بدأ مؤقت العرض (15 دقيقة)'); };
    }
  });
  function kpi(icn, val, lbl) { return `<div class="card tight kpi"><div class="ic">${ic(icn)}</div><div><b>${val}</b><span>${lbl}</span></div></div>`; }
  function heroArt() {
    return `<svg viewBox="0 0 400 300" aria-hidden="true">
      <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7bff"/><stop offset="1" stop-color="#0b2a6b"/></linearGradient>
        <radialGradient id="hglow"><stop offset="0" stop-color="#22d3ee" stop-opacity=".45"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient></defs>
      <circle cx="200" cy="140" r="130" fill="url(#hglow)"/>
      <g stroke="#2a4c8a" stroke-width="1.5" fill="none">
        <path d="M40 250 L120 200 M360 250 L280 200 M200 40 L200 70 M60 90 L140 120 M340 90 L260 120"/>
      </g>
      <g fill="#0e1f40" stroke="#22d3ee" stroke-width="1.5">
        <rect x="18" y="238" width="44" height="28" rx="5"/><rect x="338" y="238" width="44" height="28" rx="5"/>
        <rect x="36" y="76" width="44" height="28" rx="5"/><rect x="320" y="76" width="44" height="28" rx="5"/><circle cx="200" cy="30" r="14"/>
      </g>
      <path d="M200 62 L282 92 V150 C282 205 246 236 200 252 C154 236 118 205 118 150 V92 Z" fill="url(#hg)" stroke="#7dd3fc" stroke-width="3"/>
      <path d="M200 80 L266 104 V150 C266 194 238 220 200 234 C162 220 134 194 134 150 V104 Z" fill="none" stroke="#22d3ee" stroke-opacity=".5" stroke-width="1.5"/>
      <text x="200" y="168" text-anchor="middle" font-size="40" font-weight="800" fill="#fff" font-family="Segoe UI, Arial">ERP</text>
      <text x="200" y="196" text-anchor="middle" font-size="12" fill="#a5f3fc" font-family="Segoe UI, Arial" letter-spacing="2">SECURED</text>
    </svg>`;
  }

  /* ================================================================
     Screen 2 — Business Environment & Objectives
     ================================================================ */
  MW.register('business', {
    render(el) {
      el.innerHTML = `
      <p class="lead">العميل شركة برمجيات تعمل في تطوير وتشغيل أنظمة ERP وتستضيفها داخل مركز بيانات خاص بها (On-Premises Data Center)، وتخدم مستخدمين وفروع من خارج الشبكة.</p>
      <div class="grid g3">
        <div class="card"><h3>${ic('brief')}بيئة العمل <span class="en">Business Environment</span></h3>
          <ul class="ticks">
            <li>تطوير وتشغيل أنظمة ERP للعملاء (مالية، مخزون، موارد بشرية).</li>
            <li>استضافة الأنظمة داخل ${L('Data Center')} خاص بالشركة.</li>
            <li>وصول مستخدمين خارجيين وفروع عبر الإنترنت إلى بوابة ERP.</li>
            <li>بيانات حساسة للعملاء تتطلب سرية وسلامة وإتاحة عالية.</li>
            <li>فريق IT داخلي مسؤول عن الشبكة والخوادم.</li>
          </ul></div>
        <div class="card"><h3>${ic('alert')}التحديات الشائعة <span class="en">Typical Challenges</span></h3>
          <ul class="ticks red">
            <li>شبكة غير مقسمة (Flat network) تسمح بالحركة الجانبية.</li>
            <li>كشف منافذ خدمات داخلية أو قواعد بيانات للخارج.</li>
            <li>إدارة الأجهزة من أي مكان بدون MFA أو تسجيل جلسات.</li>
            <li>سجلات موزعة وغياب مراقبة مركزية (SIEM).</li>
            <li>عدم وجود أدلة موثقة تدعم متطلبات ${L('ISO 27001')}.</li>
          </ul>
          <div class="caption">تحديات نموذجية لبيئات مشابهة — يتم تأكيدها في مرحلة تقييم الفجوات.</div></div>
        <div class="card"><h3>${ic('target')}أهداف المشروع <span class="en">Project Objectives</span></h3>
          <ul class="ticks green">
            <li>تصميم بنية شبكة مقسمة إلى خمس مناطق أمنية.</li>
            <li>حماية بوابة ERP بطبقات NGFW و IPS و WAF.</li>
            <li>تطبيق مبدأ أقل صلاحية (Least privilege) و Default deny.</li>
            <li>مركزية السجلات والمراقبة وتوليد التنبيهات.</li>
            <li>ربط الضوابط التقنية بضوابط </li>
          </ul></div>
      </div>
      <div class="grid g2" style="margin-top:1rem">
        <div class="card"><h3>${ic('lab')}النطاق  <span class="en"> Scope</span></h3>
          <div class="grid g2">
            <div><b style="color:#86efac">داخل النطاق (محاكاة)</b>
              <ul class="ticks green" style="margin-top:.4rem"><li>تصميم المناطق وعناوين IP</li><li>شرح مكونات التصميم</li><li>محاكاة مسار الترافيك (سماح ومنع)</li><li>سجلات توضيحية للترافيك</li><li>تقييم المخاطر التوضيحي</li></ul></div>
            <div><b style="color:#fca5a5">خارج النطاق</b>
              <ul class="ticks red" style="margin-top:.4rem"><li>أي تغيير على أجهزة حقيقية</li><li>فحص أو اختبار اختراق فعلي</li><li>توليد حزم شبكة حقيقية</li><li>تقييم مطابقة أو منح شهادة</li><li>بنود نظام الإدارة (4–10) بالتفصيل</li></ul></div>
          </div></div>
        <div class="card"><h3>${ic('check')}معايير نجاح العرض <span class="en">PoC Success Criteria</span></h3>
          <ul class="ticks">
            <li>وضوح مسار الترافيك من المستخدم حتى قاعدة البيانات.</li>
            <li>كل الاتصالات غير المصرح بها تُرفض وفق السياسات المعرّفة.</li>
            <li>نتائج سيناريوهات المحاكاة تطابق قرارات التصميم المتوقعة.</li>
            <li>كل مكوّن مرتبط بضوابط ISO وأدلة مراجعة متوقعة.</li>
            <li>سجل مخاطر واضح يوضح أثر الضوابط المقترحة.</li>
          </ul>
          <div class="row" style="margin-top:.9rem">
            ${['External ' + L('192.168.100.0/24'), 'DMZ ' + L('10.10.10.0/24'), 'App ' + L('10.10.20.0/24'), 'DB ' + L('10.10.30.0/24'), 'Mgmt ' + L('10.10.40.0/24')].map(x => `<span class="chip">${x}</span>`).join('')}
          </div></div>
      </div>`;
    }
  });

  /* ================================================================
     Screen 3 — Network Topology
     ================================================================ */
  MW.register('topology', {
    render(el) {
      el.innerHTML = `
      <div class="grid split" style="grid-template-columns: .95fr 1.35fr; align-items:start">
        <div class="card">
          <div class="head-row"><h3>${ic('topo')}المخطط الأصلي للمشروع <span class="en">Original Network Topology</span></h3>
            <button class="btn sm" data-lb="${IMG_TOPO}" data-lbt="Original Network Topology">${ic('expand')} تكبير</button></div>
          ${ui.diagram(IMG_TOPO, 'Original Network Topology', 'المخطط الأصلي كما تم تسليمه (معروض بدون تعديل على المحتوى؛ تمت إزالة الحواف السوداء لصورة الشاشة فقط).')}
          <div class="note info" style="margin-top:.8rem">${ic('help')}<span>المخطط الأصلي يوضح بنية متعددة الطبقات: <b>DMZ</b> بـ Load Balancers، و<b>Internet Zone</b> بخوادم الويب والتطبيقات، و<b>Intranet Zone</b> لقواعد البيانات الداخلية، مع ثلاث طبقات Firewall. التصميم المقترح يطوّر هذا المفهوم إلى خمس مناطق محكومة مركزياً بالـ NGFW.</span></div>
        </div>
        <div class="card">
          <div class="head-row"><h3>${ic('shield')}التصميم المقترح (تفاعلي) <span class="en">Proposed Segmented Architecture</span></h3>
            <span class="dim" style="font-size:.85rem">اضغط على أي منطقة لعرض تفاصيلها</span></div>
          <div id="topoSvg">${MW.netSvg('tp', 'topo')}</div>
          <div id="zoneInfo" style="margin-top:.8rem"></div>
        </div>
      </div>`;
      const svg = el.querySelector('#topoSvg svg');
      const pick = id => { svg.querySelectorAll('.zone').forEach(g => g.classList.toggle('sel', g.dataset.zone === id)); el.querySelector('#zoneInfo').innerHTML = zoneInfo(id); };
      svg.addEventListener('click', e => { const g = e.target.closest('.zone'); if (g) pick(g.dataset.zone); });
      svg.addEventListener('keydown', e => { const g = e.target.closest('.zone'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); pick(g.dataset.zone); } });
      pick('CORE');
    }
  });
  const ZCTRL = { EXT: ['A.8.20', 'A.8.21'], DMZ: ['A.8.20', 'A.8.22', 'A.8.24'], APP: ['A.8.22', 'A.8.9', 'A.8.14'], DB: ['A.8.3', 'A.8.22', 'A.8.13', 'A.8.24'], MGMT: ['A.8.2', 'A.8.5', 'A.8.15', 'A.8.16'], CORE: ['A.8.20', 'A.8.21', 'A.8.22', 'A.8.32'] };
  const ZDESC = {
    EXT: 'شبكة غير موثوقة تمثل الإنترنت والمستخدمين الخارجيين. لا يُسمح منها إلا بـ HTTPS إلى بوابة ERP في الـ DMZ.',
    DMZ: 'المنطقة الوحيدة المنشورة للخارج. تحتوي على الـ Reverse Proxy الذي يمرر الطلبات لخوادم التطبيق فقط.',
    APP: 'خوادم منطق الأعمال لنظام ERP. تستقبل من الـ DMZ على 8080 وتتصل بقاعدة البيانات على 5432 فقط.',
    DB: 'أعلى منطقة حساسية. لا تقبل اتصالات إلا من منطقة التطبيقات على منفذ PostgreSQL، والإدارة من الـ Jump Host.',
    MGMT: 'منطقة الإدارة والمراقبة: Jump Host و SIEM و Backup. غير مكشوفة للخارج وتُدار بصلاحيات مميزة مقيدة.',
    CORE: 'الـ NGFW هو نقطة العبور الوحيدة بين كل المناطق. كل اتصال بين منطقتين يمر عليه ويُقيّم وفق السياسات ويتم تسجيله.'
  };
  function zoneInfo(id) {
    if (id === 'CORE') {
      return `<div class="card tight" style="background:#0a1834"><h3>${ic('firewall')}NGFW — FortiGate <span class="en">Core enforcement point</span></h3>
        <p style="margin:.2rem 0 .6rem">${ZDESC.CORE}</p>
        <div class="tbl-wrap"><table class="t"><thead><tr><th>Interface</th><th>Zone</th><th>Subnet</th><th>Gateway</th></tr></thead><tbody>
        ${MW.zones.map(z => `<tr><td>${L(z.intf)}</td><td>${z.name}</td><td>${L(z.cidr)}</td><td>${L(z.gw)}</td></tr>`).join('')}</tbody></table></div>
        <div class="row" style="margin-top:.6rem">${isoList(ZCTRL.CORE)}</div></div>`;
    }
    const Z = MW.zone(id), m = MW.reachMatrix(false);
    const inb = MW.zones.filter(o => o.id !== id && m[o.id][id].allowed.length).map(o => `${o.name}: ${m[o.id][id].allowed.map(s => L(MW.service(s).label)).join('، ')}`);
    const out = MW.zones.filter(o => o.id !== id && m[id][o.id].allowed.length).map(o => `${o.name}: ${m[id][o.id].allowed.map(s => L(MW.service(s).label)).join('، ')}`);
    const hosts = MW.hosts.filter(h => h.zone === id);
    return `<div class="card tight" style="background:#0a1834;border-color:${Z.color}">
      <h3><span class="dot" style="background:${Z.color}"></span>${Z.ar} <span class="en">${Z.name} · ${Z.cidr} · ${Z.intf}</span></h3>
      <p style="margin:.2rem 0 .6rem">${ZDESC[id]}</p>
      <div class="grid g3" style="gap:.8rem">
        <div><b class="muted">الأجهزة (محاكاة)</b><ul class="ticks" style="margin-top:.3rem">${hosts.map(h => `<li>${h.name} ${L(h.ip)}</li>`).join('')}</ul></div>
        <div><b class="muted">اتصالات واردة مسموحة</b><ul class="ticks green" style="margin-top:.3rem">${inb.length ? inb.map(x => `<li>${x}</li>`).join('') : '<li>لا يوجد — كل الوارد مرفوض</li>'}</ul></div>
        <div><b class="muted">اتصالات صادرة مسموحة</b><ul class="ticks green" style="margin-top:.3rem">${out.length ? out.map(x => `<li>${x}</li>`).join('') : '<li>لا يوجد اتصال مبادر مسموح</li>'}</ul></div>
      </div>
      <div class="row" style="margin-top:.6rem"><span class="muted" style="font-size:.85rem">ضوابط ISO ذات صلة:</span>${isoList(ZCTRL[id])}</div>
    </div>`;
  }

  /* ================================================================
     Screen 4 — Network Components Explanation
     ================================================================ */
  MW.register('components', {
    render(el) {
      el.innerHTML = `
      <div class="grid split" style="grid-template-columns: 19rem 1fr; align-items:start">
        <div class="card tight"><h3>${ic('cpu')}مكونات التصميم</h3><div class="comp-list" id="compList">
          ${MW.components.map(c => `<button data-comp="${c.id}">${ic(c.icon)}<span><b>${c.ar}</b><small>${c.name}</small></span></button>`).join('')}
        </div></div>
        <div id="compDetail"></div>
      </div>`;
      const show = id => {
        el.querySelectorAll('[data-comp]').forEach(b => b.classList.toggle('on', b.dataset.comp === id));
        const c = MW.components.find(x => x.id === id);
        el.querySelector('#compDetail').innerHTML = `
          <div class="card">
            <div class="row" style="gap:1rem;align-items:center;margin-bottom:.8rem">
              <div class="big-ic">${ic(c.icon)}</div>
              <div><h2 style="margin:0;font-size:1.6rem">${c.ar}</h2><div class="en" style="color:var(--cyan);text-align:right">${c.name}</div></div>
            </div>
            <dl class="kv" style="margin:0 0 1rem"><dt>المنطقة</dt><dd>${L(c.zone)}</dd><dt>العنوان</dt><dd>${L(c.ip)}</dd><dt>الدور</dt><dd>${c.role}</dd></dl>
            <div class="grid g2">
              <div class="card tight" style="background:#0a1834"><h3>${ic('bolt')}الوظائف الأمنية</h3><ul class="ticks">${c.funcs.map(f => `<li>${f}</li>`).join('')}</ul></div>
              <div class="card tight" style="background:#0a1834"><h3>${ic('iso')}ضوابط ${L('ISO 27001:2022')}</h3>
                <div style="display:grid;gap:.35rem">${c.ctrls.map(id2 => { const k = MW.control(id2); return `<div class="row" style="gap:.5rem;flex-wrap:nowrap">${iso(id2)}<span class="en" style="font-size:.85rem;text-align:right">${k ? k.name : ''}</span></div>`; }).join('')}</div>
                <div style="margin-top:.7rem"><b class="muted" style="font-size:.85rem">أدلة المراجعة المتوقعة:</b><div>${c.evidence}</div></div>
              </div>
            </div>
          </div>`;
      };
      el.querySelector('#compList').addEventListener('click', e => { const b = e.target.closest('[data-comp]'); if (b) show(b.dataset.comp); });
      show('ngfw');
    }
  });

})();
