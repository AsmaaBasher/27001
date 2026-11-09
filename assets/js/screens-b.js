/* =====================================================================
   Screens 6–9: Traffic Simulation, Virtual Lab, Firewall Policies,
   Security Test Scenarios (+ SIEM alerts)
   All decisions come from MW.evaluate() — no hard-coded outcomes.
   ===================================================================== */
(function () {
  'use strict';
  const MW = window.MW, ui = MW.ui, { ic, L, isoList } = ui;
  const H = id => MW.host(id);

  /* ================================================================
     Screen 6 — Interactive Traffic Simulation
     ================================================================ */
  const NODES = [
    { k: 'client', t: 'External', t2: 'ERP Client', icon: 'laptop' },
    { k: 'inet', t: 'Internet', t2: '', icon: 'cloud' },
    { k: 'ngfw', t: 'NGFW', t2: 'FortiGate', icon: 'firewall' },
    { k: 'ips', t: 'IPS / IDS', t2: 'Inline', icon: 'ips' },
    { k: 'waf', t: 'WAF', t2: 'FortiWeb', icon: 'waf' },
    { k: 'dmz', t: 'DMZ', t2: 'Reverse Proxy', icon: 'proxy' },
    { k: 'app', t: 'ERP App', t2: 'Server', icon: 'server' },
    { k: 'db', t: 'ERP', t2: 'Database', icon: 'db' }
  ];
  const NX = i => 75 + i * 150, NY = 175, NW = 118, NH = 112;

  const SIMS = [
    { key: 'auth', label: 'وصول مصرح به', dot: 'g', src: 'ext-client', dst: 'dmz-rp', svc: 'HTTPS', payload: null, scen: 'T01' },
    { key: 'db', label: 'وصول مباشر لقاعدة البيانات', dot: 'r', src: 'ext-attacker', dst: 'db-01', svc: 'PGSQL', payload: null, scen: 'T02' },
    { key: 'sqli', label: 'SQL Injection', dot: 'a', src: 'ext-attacker', dst: 'dmz-rp', svc: 'HTTPS', payload: 'SQLI', scen: 'T04' },
    { key: 'exploit', label: 'استغلال ثغرة (IPS)', dot: 'a', src: 'ext-attacker', dst: 'dmz-rp', svc: 'HTTPS', payload: 'EXPLOIT', scen: 'T05' },
    { key: 'lateral', label: 'حركة جانبية DMZ → DB', dot: 'r', src: 'dmz-rp', dst: 'db-01', svc: 'PGSQL', payload: null, scen: 'T03' }
  ];

  function tech(srcIp, dstIp, svc, res) {
    return { src: srcIp, dst: dstIp, svc: svc, res: res };
  }

  /* Build the step list for a scenario using the policy engine */
  function buildSteps(def) {
    const s = H(def.src), d = H(def.dst), steps = [];
    const full = MW.evaluate(s.ip, d.ip, def.svc, def.payload);
    const l4 = MW.evaluate(s.ip, d.ip, def.svc, null);
    const svcL = MW.service(def.svc).label;
    const scen = MW.scenarios.find(x => x.id === def.scen);

    if (def.key === 'lateral') {
      steps.push({ node: 5, status: 'info', title: 'جهاز في الـ DMZ تم اختراقه (محاكاة)', text: `المهاجم سيطر على الـ Reverse Proxy ${L(s.ip)} ويحاول الوصول مباشرة لقاعدة البيانات ${L(d.ip)} على ${L(svcL)} متخطياً خادم التطبيق.`, t: tech(s.ip, d.ip, def.svc, null) });
      steps.push({ move: [5, 2, 'down'], node: 2, status: full.action === 'ALLOW' ? 'pass' : 'block', log: [s.ip, d.ip, def.svc, full], alert: full.action !== 'ALLOW' ? scen : null,
        title: 'الـ NGFW يقيّم الاتصال بين المناطق', text: `أي اتصال بين DMZ ومنطقة قاعدة البيانات يمر إجبارياً على الـ NGFW. ${full.reason}`, t: tech(s.ip, d.ip, def.svc, full) });
      if (full.action !== 'ALLOW') steps.push({ node: 7, status: 'safe', title: 'قاعدة البيانات لم تستقبل أي حزمة', text: 'الفصل بين المناطق (Network Segregation) منع الحركة الجانبية، وتم إرسال تنبيه حرج للـ SIEM للتحقيق في جهاز الـ DMZ.', t: tech(s.ip, d.ip, def.svc, full), final: 'bad' });
      return steps;
    }

    steps.push({ node: 0, status: 'info', title: def.key === 'auth' ? 'المستخدم الخارجي (External ERP Client)' : 'جهاز خارجي غير موثوق (محاكاة)',
      text: def.key === 'auth' ? `يبدأ مستخدم خارجي بالوصول إلى بوابة ERP عبر ${L('HTTPS (443)')} من العنوان ${L(s.ip)}.` : `جهاز خارجي ${L(s.ip)} يرسل طلباً إلى ${L(d.ip)} على ${L(svcL)}${def.payload ? ' يحتوي على محتوى هجومي (' + L(def.payload) + ')' : ''}.`,
      t: tech(s.ip, d.ip, def.svc, null) });
    steps.push({ move: [0, 1], node: 1, status: 'info', title: 'العبور عبر الإنترنت', text: 'الطلب يعبر شبكة غير موثوقة حتى يصل إلى الواجهة الخارجية للـ NGFW (port1).', t: tech(s.ip, d.ip, def.svc, null) });

    const ngBlock = l4.action !== 'ALLOW';
    steps.push({ move: [1, 2], node: 2, status: ngBlock ? 'block' : 'pass', log: [s.ip, d.ip, def.svc, ngBlock ? l4 : l4], alert: ngBlock ? scen : null,
      title: 'الجدار الناري (NGFW) يطابق السياسات', text: l4.reason + (ngBlock ? ' — تم رفض الاتصال وتسجيله.' : ''), t: tech(s.ip, d.ip, def.svc, l4), final: ngBlock ? 'bad' : null });
    if (ngBlock) return steps;

    const ipsBlock = full.stage === 'IPS';
    steps.push({ move: [2, 3], node: 3, status: ipsBlock ? 'block' : 'pass', log: ipsBlock ? [s.ip, d.ip, def.svc, full] : null, alert: ipsBlock ? scen : null,
      title: 'فحص IPS / IDS', text: ipsBlock ? full.reason : 'لم يتم رصد أي توقيع هجومي معروف في الجلسة.', t: tech(s.ip, d.ip, def.svc, ipsBlock ? full : l4), final: ipsBlock ? 'bad' : null });
    if (ipsBlock) return steps;

    const wafBlock = full.stage === 'WAF';
    steps.push({ move: [3, 4], node: 4, status: wafBlock ? 'block' : 'pass', log: wafBlock ? [s.ip, d.ip, def.svc, full] : null, alert: wafBlock ? scen : null,
      title: 'فحص جدار حماية تطبيقات الويب (WAF)', text: wafBlock ? full.reason : 'الطلب سليم ومطابق لسياسات التطبيق (لا SQLi / XSS).', t: tech(s.ip, d.ip, def.svc, wafBlock ? full : l4), final: wafBlock ? 'bad' : null });
    if (wafBlock) return steps;

    steps.push({ move: [4, 5], node: 5, status: 'pass', title: 'الوصول لبوابة ERP (Reverse Proxy)', text: `الـ Reverse Proxy ${L('10.10.10.10')} ينهي جلسة TLS ويعيد توجيه الطلب للداخل دون كشف عناوين الخوادم.`, t: tech(s.ip, d.ip, def.svc, full) });
    const a = H('app-01'), db = H('db-01');
    const r2 = MW.evaluate(d.ip, a.ip, 'ERP_APP');
    steps.push({ move: [5, 6], node: 6, status: r2.action === 'ALLOW' ? 'pass' : 'block', log: [d.ip, a.ip, 'ERP_APP', r2], title: 'تمرير الطلب لخادم التطبيق', text: r2.reason, t: tech(d.ip, a.ip, 'ERP_APP', r2) });
    const r3 = MW.evaluate(a.ip, db.ip, 'PGSQL');
    steps.push({ move: [6, 7], node: 7, status: r3.action === 'ALLOW' ? 'pass' : 'block', log: [a.ip, db.ip, 'PGSQL', r3], title: 'الاستعلام من قاعدة البيانات', text: r3.reason, t: tech(a.ip, db.ip, 'PGSQL', r3) });
    steps.push({ move: [7, 0, 'up'], node: 0, status: 'pass', title: 'الاستجابة تعود للمستخدم', text: 'تم السماح بالاتصال بنجاح وفق السياسات الأمنية، وكل خطوة مسجلة في سجلات الـ Firewall.', t: tech(s.ip, d.ip, def.svc, full), final: 'ok' });
    return steps;
  }

  function simSvg() {
    const links = NODES.slice(0, -1).map((n, i) => `<line x1="${NX(i) + NW / 2}" y1="${NY}" x2="${NX(i + 1) - NW / 2 - 4}" y2="${NY}" stroke="#3a5c99" stroke-width="3" marker-end="url(#sarr)"/>`).join('');
    const nodes = NODES.map((n, i) => `
      <g class="node" data-i="${i}" transform="translate(${NX(i)},${NY})">
        <rect class="nb" x="${-NW / 2}" y="${-NH / 2}" width="${NW}" height="${NH}" rx="14"/>
        <use href="#i-${n.icon}" x="-21" y="-46" width="42" height="42" stroke="#7dd3fc" fill="none" stroke-width="1.6"/>
        <text y="18" text-anchor="middle" font-size="15" font-weight="700">${n.t}</text>
        <text y="37" text-anchor="middle" font-size="12" fill="#9fb3d9">${n.t2}</text>
        <g class="st-ok"><circle cx="${NW / 2 - 6}" cy="${-NH / 2 + 6}" r="13" fill="#22c55e"/><path d="M${NW / 2 - 12} ${-NH / 2 + 6}l4 4 8-9" stroke="#fff" stroke-width="2.6" fill="none"/></g>
        <g class="st-x"><circle cx="${NW / 2 - 6}" cy="${-NH / 2 + 6}" r="13" fill="#ef4444"/><path d="M${NW / 2 - 11} ${-NH / 2 + 1}l10 10M${NW / 2 - 1} ${-NH / 2 + 1}l-10 10" stroke="#fff" stroke-width="2.6"/></g>
      </g>`).join('');
    return `<svg class="net" id="simSvg" viewBox="0 0 1200 340" role="img" aria-label="ERP traffic simulation (simulated)">
      <defs><marker id="sarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5b7fc4"/></marker></defs>
      <path id="arcUp" d="M${NX(7)} ${NY - NH / 2} Q 600 -20 ${NX(0)} ${NY - NH / 2}" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-dasharray="9 7" opacity=".25"/>
      <rect x="455" y="30" width="290" height="30" rx="15" fill="#0b2a1a" stroke="#22c55e" opacity=".9"/>
      <text x="600" y="50" text-anchor="middle" font-size="14" fill="#bbf7d0">Allowed Traffic (Authorized Access)</text>
      <text id="arcDownLbl" x="${(NX(5) + NX(2)) / 2}" y="322" text-anchor="middle" font-size="13" fill="#fecaca" opacity="0">Blocked Traffic (Unauthorized Access)</text>
      <path id="arcDown" d="M${NX(5)} ${NY + NH / 2} Q ${(NX(5) + NX(2)) / 2} 330 ${NX(2)} ${NY + NH / 2}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="7 7" opacity=".0"/>
      ${links}${nodes}
      <path id="simPath" d="" fill="none" stroke="none"/>
      <circle id="pkt" class="pkt hidden" r="10" fill="#22d3ee" style="color:#22d3ee"/>
      <text x="8" y="334" font-size="11" fill="#6f86b3">SIMULATION — animated visualization only, no packets are generated</text>
    </svg>`;
  }

  const sim = { def: SIMS[0], steps: [], idx: -1, playing: false, anim: false, timer: null, speed: 1 };
  MW.sim = sim;
  let simEl;

  function pathFor(a, b, curve) {
    if (curve === 'up') return document.getElementById('arcUp').getAttribute('d');
    if (curve === 'down') return document.getElementById('arcDown').getAttribute('d');
    return `M${NX(a) + NW / 2} ${NY} L${NX(b) - NW / 2} ${NY}`;
  }
  function animate(step, done) {
    const p = simEl.querySelector('#simPath'), pkt = simEl.querySelector('#pkt');
    const [a, b, curve] = step.move;
    p.setAttribute('d', pathFor(a, b, curve));
    const len = p.getTotalLength(), dur = (curve ? 1500 : 800) / sim.speed;
    const col = step.status === 'block' ? '#ef4444' : (curve === 'up' ? '#22c55e' : '#22d3ee');
    pkt.setAttribute('fill', col); pkt.style.color = col; pkt.classList.remove('hidden');
    if (curve === 'down') { simEl.querySelector('#arcDown').setAttribute('opacity', '.9'); simEl.querySelector('#arcDownLbl').setAttribute('opacity', '1'); }
    if (curve === 'up') simEl.querySelector('#arcUp').setAttribute('opacity', '.95');
    const t0 = performance.now(); sim.anim = true;
    (function frame(now) {
      const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const pt = p.getPointAtLength(len * e);
      pkt.setAttribute('cx', pt.x); pkt.setAttribute('cy', pt.y);
      if (k < 1) requestAnimationFrame(frame); else { sim.anim = false; done(); }
    })(t0);
  }
  function arrive(step) {
    const nodes = simEl.querySelectorAll('.node');
    nodes.forEach(n => n.classList.remove('active'));
    const n = nodes[step.node];
    if (step.status === 'pass') n.classList.add('pass');
    if (step.status === 'block') { n.classList.add('block'); simEl.querySelector('#pkt').classList.add('hidden'); }
    n.classList.add('active');
    if (step.log) MW.logTraffic(step.log[0], step.log[1], step.log[2], step.log[3], 'sim:' + sim.def.key);
    if (step.alert && step.alert.alert) MW.raiseAlert(step.alert.alert, step.t.src, step.t.dst, step.alert.id);
    if (step.final === 'ok') simEl.querySelector('#pkt').classList.add('hidden');
    drawPanel();
  }
  sim.step = function () {
    if (sim.anim) return;
    if (sim.idx >= sim.steps.length - 1) { sim.playing = false; drawButtons(); return; }
    sim.idx++;
    const st = sim.steps[sim.idx];
    const after = () => {
      arrive(st);
      if (sim.idx >= sim.steps.length - 1) { sim.playing = false; drawButtons(); return; }
      if (sim.playing) sim.timer = setTimeout(sim.step, 1100 / sim.speed);
    };
    if (st.move) animate(st, after); else after();
    drawButtons();
  };
  sim.play = function () {
    if (sim.idx >= sim.steps.length - 1) sim.reset();
    sim.playing = true; drawButtons(); clearTimeout(sim.timer);
    if (!sim.anim) sim.step();
  };
  sim.pause = function () { sim.playing = false; clearTimeout(sim.timer); drawButtons(); };
  sim.toggle = function () { sim.playing ? sim.pause() : sim.play(); };
  sim.reset = function () {
    sim.playing = false; clearTimeout(sim.timer); sim.idx = -1;
    sim.steps = buildSteps(sim.def);
    if (!simEl) return;
    simEl.querySelectorAll('.node').forEach(n => n.classList.remove('active', 'pass', 'block'));
    simEl.querySelector('#pkt').classList.add('hidden');
    simEl.querySelector('#arcDown').setAttribute('opacity', '0'); simEl.querySelector('#arcDownLbl').setAttribute('opacity', '0');
    simEl.querySelector('#arcUp').setAttribute('opacity', '.25');
    drawPanel(); drawButtons();
  };
  sim.select = function (key) {
    sim.def = SIMS.find(s => s.key === key) || SIMS[0];
    simEl.querySelectorAll('[data-sim]').forEach(b => b.classList.toggle('on', b.dataset.sim === sim.def.key));
    sim.reset();
  };
  function drawButtons() {
    const done = sim.idx >= sim.steps.length - 1;
    simEl.querySelector('#simPlay').disabled = sim.playing;
    simEl.querySelector('#simPause').disabled = !sim.playing;
    simEl.querySelector('#simStep').disabled = done || sim.playing;
    simEl.querySelector('#simPlay').innerHTML = `${ic('play')} ${done && sim.idx >= 0 ? 'إعادة التشغيل' : 'بدء المحاكاة'}`;
  }
  function drawPanel() {
    const box = simEl.querySelector('#simStepBox'), res = simEl.querySelector('#simResult');
    if (sim.idx < 0) {
      box.innerHTML = `<div class="step-box"><div class="step-num">0</div><div><h3 style="margin:0 0 .3rem">السيناريو: ${sim.def.label}</h3>
        <p style="margin:0" class="muted">اضغط <b>بدء المحاكاة</b> للتشغيل التلقائي أو <b>الخطوة التالية</b> للشرح خطوة بخطوة. عدد الخطوات: ${L(sim.steps.length)}</p></div></div>`;
      res.className = 'result-banner neutral'; res.innerHTML = `${ic('help')}<span>في انتظار التشغيل…</span>`;
      return;
    }
    const st = sim.steps[sim.idx], t = st.t;
    box.innerHTML = `<div class="step-box"><div class="step-num">${sim.idx + 1}</div><div>
      <h3 style="margin:0 0 .3rem">${st.title} <span class="dim" style="font-size:.8rem">(${L((sim.idx + 1) + '/' + sim.steps.length)})</span></h3>
      <p style="margin:0 0 .6rem">${st.text}</p>
      <dl class="kv"><dt>Source</dt><dd>${L(t.src)}</dd><dt>Destination</dt><dd>${L(t.dst)}</dd><dt>Service</dt><dd>${ui.svcLabel(t.svc)}</dd>
      ${t.res ? `<dt>Policy</dt><dd>${t.res.policy ? L('#' + t.res.policy.id + ' ' + t.res.policy.name) : '—'}</dd><dt>Decision</dt><dd>${ui.resBadge(t.res)}</dd>` : ''}</dl></div></div>`;
    const last = sim.idx === sim.steps.length - 1;
    if (last && st.final === 'ok') { res.className = 'result-banner ok'; res.innerHTML = `${ic('check')}<span>تم السماح بالاتصال — الترافيك مرّ بنجاح وفق السياسات الأمنية.</span>`; }
    else if (st.status === 'block' || st.final === 'bad') { res.className = 'result-banner bad'; res.innerHTML = `${ic('x')}<span>تم منع الاتصال عند ${L(NODES[sim.steps.find(s => s.status === 'block').node].t)} — وتم تسجيل الحدث${sim.def.scen && MW.scenarios.find(x => x.id === sim.def.scen).alert ? ' وإرسال تنبيه للـ SIEM' : ''}.</span>`; }
    else { res.className = 'result-banner neutral'; res.innerHTML = `${ic('flow')}<span>جارٍ تتبع الترافيك…</span>`; }
  }
  function drawMiniLog() {
    if (!simEl) return;
    const box = simEl.querySelector('#simLog');
    const rows = MW.store.fw.slice(0, 9);
    box.innerHTML = rows.length ? rows.map(e => `<div class="${e.action === 'accept' ? 'a' : e.action === 'deny' ? 'd' : e.action === 'blocked' ? 'b' : 'n'}">${e.time}  ${e.srcip.padEnd(15)} → ${(e.dstip + ':' + e.dstport).padEnd(19)} policy=${String(e.policyid).padEnd(2)} ${e.action.toUpperCase()}</div>`).join('')
      : '<div class="n">— no simulated log entries yet —</div>';
  }

  MW.register('sim', {
    render(el) {
      simEl = el;
      el.innerHTML = `
      <div class="card">
        <div class="head-row">
          <div class="scen-pills">${SIMS.map(s => `<button data-sim="${s.key}" class="${s.key === 'auth' ? 'on' : ''}"><span class="dot ${s.dot}"></span>${s.label}</button>`).join('')}</div>
          <div class="row">
            <label class="speed">السرعة <select class="inp" id="simSpeed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
            <button class="btn" id="simReset">${ic('reset')} إعادة الضبط</button>
            <button class="btn" id="simPause">${ic('pause')} إيقاف مؤقت</button>
            <button class="btn success" id="simPlay">${ic('play')} بدء المحاكاة</button>
            <button class="btn primary" id="simStep">${ic('next')} الخطوة التالية</button>
          </div>
        </div>
        ${simSvg()}
      </div>
      <div class="grid split" style="grid-template-columns: 1.3fr 1fr 1fr; margin-top:1rem; align-items:start">
        <div class="card"><div id="simStepBox"></div><div id="simResult" class="result-banner neutral" style="margin-top:.8rem"></div></div>
        <div class="card"><div class="head-row"><h3>${ic('flow')}المخطط المرجعي <span class="en">ERP Traffic Flow</span></h3>
            <button class="btn sm" data-lb="${MW.IMG.flow}" data-lbt="ERP Traffic Flow — Secure Path">${ic('expand')} تكبير</button></div>
          ${ui.diagram(MW.IMG.flow, 'ERP Traffic Flow — Secure Path', 'المخطط الأصلي كما تم تسليمه (بدون تعديل على المحتوى).')}</div>
        <div class="card"><div class="head-row"><h3>${ic('firewall')}سجل الترافيك <span class="en">Firewall log (simulated)</span></h3></div>
          <div class="mini-log" id="simLog"></div></div>
      </div>`;
      el.querySelector('.scen-pills').addEventListener('click', e => { const b = e.target.closest('[data-sim]'); if (b) sim.select(b.dataset.sim); });
      el.querySelector('#simPlay').onclick = sim.play;
      el.querySelector('#simPause').onclick = sim.pause;
      el.querySelector('#simStep').onclick = () => { sim.pause(); sim.step(); };
      el.querySelector('#simReset').onclick = sim.reset;
      el.querySelector('#simSpeed').onchange = e => { sim.speed = +e.target.value; };
      sim.reset(); drawMiniLog();
      MW.onStore(drawMiniLog);
    },
    hide() { sim.pause(); }
  });

})();
