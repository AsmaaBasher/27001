/* =====================================================================
   Mindware Lab — Simulated Policy Engine, Log Store & SIEM correlation
   Pure in-browser logic. Sends NO packets and touches NO real device.
   ===================================================================== */
(function () {
  'use strict';
  var MW = window.MW;

  /* ---------- IP helpers ---------- */
  function ipToInt(ip) {
    var p = ip.split('.');
    return (((+p[0]) << 24) >>> 0) + ((+p[1]) << 16) + ((+p[2]) << 8) + (+p[3]);
  }
  function inCidr(ip, cidr) {
    var parts = cidr.split('/'), bits = +parts[1];
    if (bits === 0) return true;
    var mask = (0xFFFFFFFF << (32 - bits)) >>> 0;
    return ((ipToInt(ip) & mask) >>> 0) === ((ipToInt(parts[0]) & mask) >>> 0);
  }
  function matchAddr(objName, ip) {
    var list = MW.addrObjects[objName] || [];
    for (var i = 0; i < list.length; i++) if (inCidr(ip, list[i])) return true;
    return false;
  }
  function zoneOf(ip) {
    for (var i = 0; i < MW.zones.length; i++) if (inCidr(ip, MW.zones[i].cidr)) return MW.zones[i];
    return null;
  }
  MW.host = function (id) { for (var i = 0; i < MW.hosts.length; i++) if (MW.hosts[i].id === id) return MW.hosts[i]; return null; };
  MW.service = function (id) { for (var i = 0; i < MW.services.length; i++) if (MW.services[i].id === id) return MW.services[i]; return null; };
  MW.policy = function (id) { for (var i = 0; i < MW.policies.length; i++) if (MW.policies[i].id === id) return MW.policies[i]; return null; };
  MW.zone = function (id) { for (var i = 0; i < MW.zones.length; i++) if (MW.zones[i].id === id) return MW.zones[i]; return null; };
  MW.control = function (id) { for (var i = 0; i < MW.isoControls.length; i++) if (MW.isoControls[i].id === id) return MW.isoControls[i]; return null; };
  MW.zoneOf = zoneOf;
  MW.inCidr = inCidr;

  /* ---------- Policy evaluation (first match wins) ----------
     returns { action:'ALLOW'|'DENY', stage:'NGFW'|'IPS'|'WAF'|'L2', policy, reason } */
  MW.evaluate = function (srcIp, dstIp, svcId, payload) {
    var sz = zoneOf(srcIp), dz = zoneOf(dstIp);
    if (sz && dz && sz.id === dz.id) {
      return { action: 'ALLOW', stage: 'L2', policy: null, intra: true,
        reason: 'نفس المنطقة (' + sz.name + ') — الاتصال لا يعبر الـ NGFW. يُوصى بـ Host firewall أو Micro-segmentation داخل المنطقة.' };
    }
    for (var i = 0; i < MW.policies.length; i++) {
      var p = MW.policies[i];
      if (p.id === 0) continue;
      if (!matchAddr(p.src, srcIp) || !matchAddr(p.dst, dstIp)) continue;
      if (p.svc[0] !== 'ALL' && p.svc.indexOf(svcId) === -1) continue;
      if (p.action === 'DENY') {
        return { action: 'DENY', stage: 'NGFW', policy: p, reason: 'مطابقة سياسة منع صريحة #' + p.id + ' (' + p.name + ')' };
      }
      // ACCEPT at L3/L4 — now UTM inspection on policy 1
      if (payload && p.id === 1) {
        if (payload === 'EXPLOIT') return { action: 'DENY', stage: 'IPS', policy: p, reason: 'السياسة #1 سمحت بالاتصال، لكن الـ IPS اكتشف توقيع استغلال ومنع الجلسة.' };
        if (payload === 'SQLI') return { action: 'DENY', stage: 'WAF', policy: p, reason: 'السياسة #1 سمحت بالاتصال، لكن الـ WAF اكتشف نمط SQL Injection ومنع الطلب.' };
        if (payload === 'BRUTE') return { action: 'DENY', stage: 'WAF', policy: p, reason: 'الـ WAF طبّق Rate limiting بعد تجاوز حد محاولات الدخول الفاشلة.' };
      }
      return { action: 'ALLOW', stage: 'NGFW', policy: p, reason: 'مطابقة سياسة سماح #' + p.id + ' (' + p.name + ')' };
    }
    return { action: 'DENY', stage: 'NGFW', policy: MW.policy(0), reason: 'لا توجد سياسة سماح مطابقة — تم تطبيق Implicit Deny (#0).' };
  };

  /* ---------- Log store ---------- */
  var listeners = [];
  MW.store = { fw: [], alerts: [], seq: 0 };
  MW.onStore = function (fn) { listeners.push(fn); };
  function emit() { for (var i = 0; i < listeners.length; i++) try { listeners[i](); } catch (e) { console.error(e); } }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(offsetMs) {
    var d = new Date(Date.now() + (offsetMs || 0));
    return { date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) };
  }
  MW.stamp = stamp;

  MW.logTraffic = function (srcIp, dstIp, svcId, res, note, silent) {
    var s = MW.service(svcId) || { proto: 'TCP', port: 0, label: svcId };
    var t = stamp();
    var entry = {
      seq: ++MW.store.seq, date: t.date, time: t.time,
      srcip: srcIp, dstip: dstIp, proto: s.proto, dstport: s.port, service: s.id,
      srcport: 40000 + Math.floor(Math.random() * 20000),
      action: res.stage === 'L2' ? 'intra-zone' : (res.action === 'ALLOW' ? 'accept' : 'deny'),
      policyid: res.policy ? res.policy.id : '-', policyname: res.policy ? res.policy.name : '-',
      stage: res.stage, subtype: res.stage === 'IPS' ? 'ips' : (res.stage === 'WAF' ? 'waf' : 'forward'),
      note: note || ''
    };
    if (res.stage === 'IPS' || res.stage === 'WAF') entry.action = 'blocked';
    MW.store.fw.unshift(entry);
    if (MW.store.fw.length > 400) MW.store.fw.pop();
    if (!silent) emit();
    return entry;
  };

  MW.raiseAlert = function (a, srcIp, dstIp, scenarioId, silent) {
    var t = stamp();
    var entry = { seq: ++MW.store.seq, date: t.date, time: t.time, sev: a.sev, rule: a.rule, mitre: a.mitre, ar: a.ar, src: srcIp, dst: dstIp, scen: scenarioId || '-' };
    MW.store.alerts.unshift(entry);
    if (MW.store.alerts.length > 200) MW.store.alerts.pop();
    if (!silent) emit();
    return entry;
  };

  MW.clearLogs = function () { MW.store.fw = []; MW.store.alerts = []; emit(); };
  MW.emit = emit;

  /* FortiOS-like raw log line (simulated) */
  MW.rawLog = function (e) {
    return 'date=' + e.date + ' time=' + e.time + ' devname="MW-FGT-01" type="' + (e.subtype === 'forward' ? 'traffic' : 'utm') +
      '" subtype="' + e.subtype + '" srcip=' + e.srcip + ' srcport=' + e.srcport + ' dstip=' + e.dstip + ' dstport=' + e.dstport +
      ' proto="' + e.proto + '" service="' + e.service + '" policyid=' + e.policyid + ' policyname="' + e.policyname + '" action="' + e.action + '" [SIMULATED]';
  };

  /* ---------- Scenario runner ----------
     returns { scenario, result, outcome, pass, steps:[...] } */
  MW.runScenario = function (sc, silent) {
    var src = MW.host(sc.src), dst = MW.host(sc.dst), steps = [], outcome, res;
    if (sc.svc === 'SCAN') {
      var open = [], closed = [];
      sc.ports.forEach(function (sid) {
        var r = MW.evaluate(src.ip, dst.ip, sid, null);
        MW.logTraffic(src.ip, dst.ip, sid, r, 'scan', true);
        (r.action === 'ALLOW' ? open : closed).push(MW.service(sid).port);
        steps.push({ svc: sid, res: r });
      });
      outcome = (open.length === 1 && open[0] === 443) ? 'PARTIAL' : 'UNEXPECTED';
      res = { action: 'PARTIAL', stage: 'NGFW', policy: null, reason: 'مفتوح: ' + open.join(', ') + ' — مرفوض: ' + closed.join(', ') };
    } else {
      res = MW.evaluate(src.ip, dst.ip, sc.svc, sc.payload);
      MW.logTraffic(src.ip, dst.ip, sc.svc, res, sc.payload || '', true);
      steps.push({ svc: sc.svc, res: res });
      if (res.action === 'ALLOW' && sc.chain) {
        sc.chain.forEach(function (c) {
          var a = MW.host(c[0]), b = MW.host(c[1]);
          var r2 = MW.evaluate(a.ip, b.ip, c[2], null);
          MW.logTraffic(a.ip, b.ip, c[2], r2, 'chain', true);
          steps.push({ svc: c[2], res: r2, from: c[0], to: c[1] });
        });
      }
      if (res.action === 'ALLOW') {
        var chainOk = steps.every(function (s) { return s.res.action === 'ALLOW'; });
        outcome = chainOk ? 'ALLOW' : 'CHAIN_FAIL';
      } else outcome = res.stage === 'IPS' ? 'BLOCK_IPS' : (res.stage === 'WAF' ? 'BLOCK_WAF' : 'DENY');
    }
    if (sc.alert) MW.raiseAlert(sc.alert, src.ip, dst.ip, sc.id, true);
    if (!silent) emit();
    return { scenario: sc, result: res, outcome: outcome, pass: outcome === sc.expected, steps: steps };
  };

  /* ---------- Segmentation reachability matrix ---------- */
  MW.reachMatrix = function (flat) {
    // union over every simulated host pair between the two zones (no payload)
    var svcs = MW.services.map(function (s) { return s.id; });
    var m = {};
    MW.zones.forEach(function (a) {
      m[a.id] = {};
      MW.zones.forEach(function (b) {
        if (a.id === b.id) { m[a.id][b.id] = { self: true, allowed: [] }; return; }
        if (flat) { m[a.id][b.id] = { allowed: svcs.slice() }; return; }
        var srcs = MW.hosts.filter(function (h) { return h.zone === a.id; });
        var dsts = MW.hosts.filter(function (h) { return h.zone === b.id; });
        var allowed = svcs.filter(function (sid) {
          return srcs.some(function (s) { return dsts.some(function (d) { return MW.evaluate(s.ip, d.ip, sid).action === 'ALLOW'; }); });
        });
        m[a.id][b.id] = { allowed: allowed };
      });
    });
    return m;
  };
})();
