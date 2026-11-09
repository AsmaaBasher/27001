/* =====================================================================
   Mindware | Secure ERP Infrastructure Lab — Data Model
   All data in this file is SIMULATED for demonstration purposes.
   No real device, network, or audit data is used.
   ===================================================================== */
(function () {
  'use strict';
  var MW = (window.MW = window.MW || {});

  /* ---------------- Zones (network segments) ---------------- */
  MW.zones = [
    { id: 'EXT',  name: 'External',    ar: 'الشبكة الخارجية (محاكاة الإنترنت)', cidr: '192.168.100.0/24', gw: '192.168.100.1', intf: 'port1', color: '#64748b' },
    { id: 'DMZ',  name: 'DMZ',         ar: 'المنطقة منزوعة السلاح (DMZ)',        cidr: '10.10.10.0/24',    gw: '10.10.10.1',    intf: 'port2', color: '#a78bfa' },
    { id: 'APP',  name: 'Application', ar: 'منطقة التطبيقات',                    cidr: '10.10.20.0/24',    gw: '10.10.20.1',    intf: 'port3', color: '#34d399' },
    { id: 'DB',   name: 'Database',    ar: 'منطقة قواعد البيانات',                cidr: '10.10.30.0/24',    gw: '10.10.30.1',    intf: 'port4', color: '#38bdf8' },
    { id: 'MGMT', name: 'Management',  ar: 'منطقة الإدارة',                       cidr: '10.10.40.0/24',    gw: '10.10.40.1',    intf: 'port5', color: '#fbbf24' }
  ];

  /* ---------------- Hosts (simulated) ---------------- */
  MW.hosts = [
    { id: 'ext-client',   ip: '192.168.100.10', zone: 'EXT',  name: 'ERP Client',            ar: 'مستخدم ERP مصرح به' },
    { id: 'ext-attacker', ip: '192.168.100.66', zone: 'EXT',  name: 'Untrusted Host',        ar: 'جهاز غير موثوق (مهاجم محاكى)' },
    { id: 'dmz-rp',       ip: '10.10.10.10',    zone: 'DMZ',  name: 'Reverse Proxy / ERP Portal', ar: 'الـ Reverse Proxy وبوابة ERP' },
    { id: 'app-01',       ip: '10.10.20.10',    zone: 'APP',  name: 'ERP App Server 01',     ar: 'خادم تطبيق ERP رقم 1' },
    { id: 'app-02',       ip: '10.10.20.11',    zone: 'APP',  name: 'ERP App Server 02',     ar: 'خادم تطبيق ERP رقم 2' },
    { id: 'db-01',        ip: '10.10.30.10',    zone: 'DB',   name: 'ERP DB Primary',        ar: 'قاعدة بيانات ERP الرئيسية' },
    { id: 'db-02',        ip: '10.10.30.11',    zone: 'DB',   name: 'ERP DB Replica',        ar: 'نسخة قاعدة البيانات المتماثلة' },
    { id: 'mgmt-jump',    ip: '10.10.40.10',    zone: 'MGMT', name: 'Jump Host / PAM',       ar: 'خادم الإدارة الوسيط (Jump Host)' },
    { id: 'mgmt-siem',    ip: '10.10.40.20',    zone: 'MGMT', name: 'SIEM / Log Collector',  ar: 'نظام جمع السجلات والمراقبة' },
    { id: 'mgmt-backup',  ip: '10.10.40.30',    zone: 'MGMT', name: 'Backup Server',         ar: 'خادم النسخ الاحتياطي' }
  ];

  /* ---------------- Services ---------------- */
  MW.services = [
    { id: 'HTTPS',      proto: 'TCP', port: 443,  label: 'HTTPS (443)' },
    { id: 'HTTP',       proto: 'TCP', port: 80,   label: 'HTTP (80)' },
    { id: 'ERP_APP',    proto: 'TCP', port: 8080, label: 'ERP-APP TCP (8080)' },
    { id: 'PGSQL',      proto: 'TCP', port: 5432, label: 'PostgreSQL (5432)' },
    { id: 'SSH',        proto: 'TCP', port: 22,   label: 'SSH (22)' },
    { id: 'RDP',        proto: 'TCP', port: 3389, label: 'RDP (3389)' },
    { id: 'SMB',        proto: 'TCP', port: 445,  label: 'SMB (445)' },
    { id: 'MSSQL',      proto: 'TCP', port: 1433, label: 'MS-SQL (1433)' },
    { id: 'SYSLOG_TLS', proto: 'TCP', port: 6514, label: 'Syslog-TLS (6514)' },
    { id: 'BACKUP',     proto: 'TCP', port: 9102, label: 'Backup-Agent (9102)' },
    { id: 'ICMP',       proto: 'ICMP', port: 0,   label: 'ICMP (ping)' }
  ];

  /* ---------------- Address objects ---------------- */
  MW.addrObjects = {
    EXT_NET:        ['192.168.100.0/24'],
    VIP_ERP_PORTAL: ['10.10.10.10/32'],
    DMZ_NET:        ['10.10.10.0/24'],
    DMZ_RP:         ['10.10.10.10/32'],
    APP_NET:        ['10.10.20.0/24'],
    DB_NET:         ['10.10.30.0/24'],
    MGMT_NET:       ['10.10.40.0/24'],
    JUMP_HOST:      ['10.10.40.10/32'],
    SIEM_SRV:       ['10.10.40.20/32'],
    BACKUP_SRV:     ['10.10.40.30/32'],
    ALL_INTERNAL:   ['10.10.10.0/24', '10.10.20.0/24', '10.10.30.0/24', '10.10.40.0/24'],
    APP_DB_NETS:    ['10.10.20.0/24', '10.10.30.0/24'],
    APP_MGMT_NETS:  ['10.10.20.0/24', '10.10.40.0/24'],
    all:            ['0.0.0.0/0']
  };

  /* ---------------- Firewall policies (FortiGate-style, simulated) ----------------
     Evaluated top-down, first match wins. Policy 0 = implicit deny. */
  MW.policies = [
    { id: 1, name: 'WAN-to-ERP-Portal', srcintf: 'port1', dstintf: 'port2', src: 'EXT_NET', dst: 'VIP_ERP_PORTAL', svc: ['HTTPS'], action: 'ACCEPT',
      utm: ['IPS: default', 'WAF: FortiWeb (inline)', 'SSL: deep-inspection', 'AV: default'],
      ar: 'السماح للمستخدمين الخارجيين بالوصول إلى بوابة ERP عبر HTTPS فقط، مع فحص IPS و WAF.' },
    { id: 2, name: 'DMZ-to-ERP-App', srcintf: 'port2', dstintf: 'port3', src: 'DMZ_RP', dst: 'APP_NET', svc: ['ERP_APP'], action: 'ACCEPT',
      utm: ['IPS: default'], ar: 'السماح للـ Reverse Proxy فقط بتمرير الطلبات إلى خوادم التطبيق على المنفذ 8080.' },
    { id: 3, name: 'App-to-ERP-DB', srcintf: 'port3', dstintf: 'port4', src: 'APP_NET', dst: 'DB_NET', svc: ['PGSQL'], action: 'ACCEPT',
      utm: ['IPS: db-protect'], ar: 'السماح لخوادم التطبيق فقط بالاتصال بقاعدة البيانات على منفذ PostgreSQL (5432).' },
    { id: 4, name: 'Admin-via-JumpHost', srcintf: 'port5', dstintf: 'port2,port3,port4', src: 'JUMP_HOST', dst: 'ALL_INTERNAL', svc: ['SSH', 'HTTPS'], action: 'ACCEPT',
      utm: ['MFA / PAM required (process control)'], ar: 'الإدارة الفنية مسموحة فقط من الـ Jump Host مع MFA وتسجيل الجلسات.' },
    { id: 5, name: 'Logs-to-SIEM', srcintf: 'port2,port3,port4', dstintf: 'port5', src: 'ALL_INTERNAL', dst: 'SIEM_SRV', svc: ['SYSLOG_TLS'], action: 'ACCEPT',
      utm: [], ar: 'إرسال السجلات من كل المناطق إلى الـ SIEM عبر Syslog مشفّر.' },
    { id: 6, name: 'Backup-Jobs', srcintf: 'port3,port4', dstintf: 'port5', src: 'APP_DB_NETS', dst: 'BACKUP_SRV', svc: ['BACKUP'], action: 'ACCEPT',
      utm: [], ar: 'السماح بمهام النسخ الاحتياطي من خوادم التطبيق وقواعد البيانات إلى خادم النسخ الاحتياطي (منفذ مثال).' },
    { id: 7, name: 'Deny-WAN-to-DB', srcintf: 'port1', dstintf: 'port4', src: 'EXT_NET', dst: 'DB_NET', svc: ['ALL'], action: 'DENY',
      utm: [], ar: 'منع أي وصول مباشر من الخارج إلى قاعدة البيانات.' },
    { id: 8, name: 'Deny-WAN-to-Internal', srcintf: 'port1', dstintf: 'port3,port5', src: 'EXT_NET', dst: 'APP_MGMT_NETS', svc: ['ALL'], action: 'DENY',
      utm: [], ar: 'منع الوصول من الخارج إلى منطقة التطبيقات ومنطقة الإدارة.' },
    { id: 9, name: 'Deny-DMZ-to-DB', srcintf: 'port2', dstintf: 'port4', src: 'DMZ_NET', dst: 'DB_NET', svc: ['ALL'], action: 'DENY',
      utm: [], ar: 'منع الـ DMZ من الوصول المباشر إلى قاعدة البيانات (منع الحركة الجانبية).' },
    { id: 10, name: 'Deny-DMZ-to-MGMT', srcintf: 'port2', dstintf: 'port5', src: 'DMZ_NET', dst: 'MGMT_NET', svc: ['ALL'], action: 'DENY',
      utm: [], ar: 'منع الـ DMZ من الوصول إلى منطقة الإدارة (باستثناء إرسال السجلات للـ SIEM عبر السياسة #5 الأعلى في الترتيب).' },
    { id: 0, name: 'Implicit-Deny', srcintf: 'any', dstintf: 'any', src: 'all', dst: 'all', svc: ['ALL'], action: 'DENY',
      utm: [], ar: 'أي اتصال لا يطابق سياسة سماح صريحة يتم رفضه تلقائياً (Default Deny).' }
  ];

  /* ---------------- Security test scenarios ----------------
     payload: optional inspection trigger handled by IPS/WAF layer.
     expected: the outcome the design MUST produce (used for validation). */
  MW.scenarios = [
    { id: 'T01', title: 'وصول مصرح به لبوابة ERP', en: 'Authorized ERP Access', src: 'ext-client', dst: 'dmz-rp', svc: 'HTTPS', expected: 'ALLOW', chain: [['dmz-rp', 'app-01', 'ERP_APP'], ['app-01', 'db-01', 'PGSQL']],
      desc: 'مستخدم خارجي يفتح بوابة ERP عبر HTTPS، والطلب يعدّي على NGFW و IPS و WAF ثم الـ Reverse Proxy ثم خادم التطبيق ثم قاعدة البيانات.', iso: ['A.8.20', 'A.5.15', 'A.8.24'] },
    { id: 'T02', title: 'محاولة وصول مباشر لقاعدة البيانات من الخارج', en: 'Direct DB Access from Internet', src: 'ext-attacker', dst: 'db-01', svc: 'PGSQL', expected: 'DENY',
      desc: 'جهاز خارجي يحاول الاتصال مباشرة بقاعدة البيانات على المنفذ 5432.', iso: ['A.8.22', 'A.8.20', 'A.8.3'],
      alert: { sev: 'High', rule: 'Blocked external connection to Database zone', mitre: 'T1190', ar: 'محاولة وصول خارجي مباشر لقاعدة البيانات' } },
    { id: 'T03', title: 'حركة جانبية من DMZ إلى قاعدة البيانات', en: 'Lateral Movement DMZ → DB', src: 'dmz-rp', dst: 'db-01', svc: 'PGSQL', expected: 'DENY',
      desc: 'محاكاة جهاز في الـ DMZ تم اختراقه ويحاول الوصول لقاعدة البيانات مباشرة متخطياً خادم التطبيق.', iso: ['A.8.22', 'A.8.16'],
      alert: { sev: 'Critical', rule: 'DMZ host attempted direct DB connection', mitre: 'T1021', ar: 'مؤشر على اختراق محتمل في الـ DMZ (حركة جانبية)' } },
    { id: 'T04', title: 'هجوم SQL Injection على البوابة', en: 'SQL Injection via HTTPS', src: 'ext-attacker', dst: 'dmz-rp', svc: 'HTTPS', payload: 'SQLI', expected: 'BLOCK_WAF',
      desc: 'الطلب مسموح على مستوى الـ Firewall (HTTPS)، لكن الـ WAF يكتشف نمط SQL Injection في الطلب ويمنعه.', iso: ['A.8.20', 'A.8.16', 'A.8.8'],
      alert: { sev: 'High', rule: 'WAF signature: SQL Injection attempt', mitre: 'T1190', ar: 'محاولة حقن SQL على بوابة ERP' } },
    { id: 'T05', title: 'استغلال ثغرة معروفة (IPS)', en: 'Known Exploit Signature', src: 'ext-attacker', dst: 'dmz-rp', svc: 'HTTPS', payload: 'EXPLOIT', expected: 'BLOCK_IPS',
      desc: 'طلب يحتوي على توقيع استغلال معروف لخادم ويب (توقيع محاكى). الـ IPS يكتشفه ويوقفه قبل الوصول للـ WAF.', iso: ['A.8.7', 'A.8.8', 'A.8.16'],
      alert: { sev: 'High', rule: 'IPS signature: Web server exploit (simulated)', mitre: 'T1190', ar: 'محاولة استغلال ثغرة على خادم الويب' } },
    { id: 'T06', title: 'فحص المنافذ من الخارج', en: 'External Port Scan', src: 'ext-attacker', dst: 'dmz-rp', svc: 'SCAN', ports: ['HTTP', 'SSH', 'RDP', 'SMB', 'MSSQL', 'PGSQL', 'ERP_APP', 'HTTPS'], expected: 'PARTIAL',
      desc: 'جهاز خارجي يفحص عدة منافذ على الـ DMZ. المنفذ 443 فقط مفتوح، وباقي المنافذ مرفوضة بالـ Implicit Deny، والـ IPS يرصد نمط الفحص.', iso: ['A.8.20', 'A.8.16'],
      alert: { sev: 'Medium', rule: 'IPS anomaly: TCP port scan detected', mitre: 'T1046', ar: 'نشاط استطلاع وفحص منافذ' } },
    { id: 'T07', title: 'إدارة عبر الـ Jump Host', en: 'Privileged Access via Jump Host', src: 'mgmt-jump', dst: 'db-01', svc: 'SSH', expected: 'ALLOW',
      desc: 'مسؤول النظام يدخل على خادم قاعدة البيانات عبر الـ Jump Host فقط (بعد MFA)، والجلسة بتتسجل.', iso: ['A.8.2', 'A.8.5', 'A.8.15'],
      alert: { sev: 'Info', rule: 'Privileged session opened via Jump Host', mitre: '—', ar: 'جلسة إدارية مسجلة (حدث معلوماتي)' } },
    { id: 'T08', title: 'محاولة إدارة من خادم التطبيق', en: 'Admin Access Outside Jump Host', src: 'app-01', dst: 'db-01', svc: 'SSH', expected: 'DENY',
      desc: 'محاولة SSH من خادم التطبيق لقاعدة البيانات. ممنوعة لأن الإدارة مسموحة فقط من الـ Jump Host.', iso: ['A.8.2', 'A.8.22'],
      alert: { sev: 'Medium', rule: 'Unauthorized admin protocol between zones', mitre: 'T1021', ar: 'محاولة استخدام بروتوكول إدارة من مصدر غير مصرح' } },
    { id: 'T09', title: 'انتشار شبيه بالـ Ransomware عبر SMB', en: 'Ransomware-like SMB Propagation', src: 'app-01', dst: 'db-01', svc: 'SMB', expected: 'DENY',
      desc: 'محاكاة برنامج خبيث يحاول الانتشار من خادم التطبيق لقاعدة البيانات عبر SMB (445). المسموح بين المنطقتين 5432 فقط.', iso: ['A.8.7', 'A.8.22', 'A.8.13'],
      alert: { sev: 'Critical', rule: 'SMB lateral movement attempt blocked', mitre: 'T1021.002', ar: 'محاولة انتشار جانبي عبر SMB' } },
    { id: 'T10', title: 'محاولات دخول متكررة (Brute Force)', en: 'Login Brute Force on Portal', src: 'ext-attacker', dst: 'dmz-rp', svc: 'HTTPS', payload: 'BRUTE', expected: 'BLOCK_WAF',
      desc: 'محاولات تسجيل دخول فاشلة متكررة على البوابة. الـ WAF يطبق Rate Limiting والـ SIEM يربط الأحداث ويولد تنبيه.', iso: ['A.8.5', 'A.8.16', 'A.8.15'],
      alert: { sev: 'High', rule: 'Correlation: 25 failed logins / 60s from single IP', mitre: 'T1110', ar: 'هجوم تخمين كلمات المرور' } },
    { id: 'T11', title: 'إرسال السجلات إلى الـ SIEM', en: 'Log Forwarding to SIEM', src: 'app-01', dst: 'mgmt-siem', svc: 'SYSLOG_TLS', expected: 'ALLOW',
      desc: 'التحقق من أن خوادم التطبيق ترسل السجلات إلى الـ SIEM عبر Syslog مشفّر (6514).', iso: ['A.8.15', 'A.8.16', 'A.8.17'] },
    { id: 'T12', title: 'وصول خارجي لمنطقة الإدارة عبر RDP', en: 'External RDP to Management', src: 'ext-attacker', dst: 'mgmt-jump', svc: 'RDP', expected: 'DENY',
      desc: 'محاولة RDP من الخارج إلى الـ Jump Host. منطقة الإدارة غير مكشوفة للخارج نهائياً.', iso: ['A.8.20', 'A.8.2', 'A.8.22'],
      alert: { sev: 'High', rule: 'External remote-access attempt to Management zone', mitre: 'T1133', ar: 'محاولة وصول عن بعد لمنطقة الإدارة من الخارج' } }
  ];

  /* ---------------- Network components (Screen 4) ---------------- */
  MW.components = [
    { id: 'client', icon: 'laptop', name: 'External ERP Client', ar: 'المستخدم الخارجي', zone: 'EXT', ip: '192.168.100.10',
      role: 'مستخدم أو فرع أو عميل يستخدم نظام ERP من خارج الشركة.',
      funcs: ['الاتصال بالبوابة عبر HTTPS (443) فقط', 'المصادقة باسم مستخدم وكلمة مرور + MFA (مقترح)', 'لا يرى أي عنوان داخلي غير بوابة الـ DMZ'],
      ctrls: ['A.5.15', 'A.8.5', 'A.8.24'], evidence: 'سياسة الوصول، إعدادات MFA، سجلات الدخول', scenario: 'T01' },
    { id: 'internet', icon: 'cloud', name: 'Internet', ar: 'الإنترنت', zone: 'EXT', ip: '192.168.100.0/24 (simulated)',
      role: 'شبكة غير موثوقة. في المعمل بيتم تمثيلها بالشبكة 192.168.100.0/24.',
      funcs: ['مصدر كل الاتصالات الخارجية', 'يُعامل كمصدر غير موثوق (Untrusted)', 'أي اتصال منه يمر أولاً على الـ NGFW'],
      ctrls: ['A.8.20', 'A.8.21'], evidence: 'مخطط الشبكة، عقد مزود الخدمة (SLA)', scenario: 'T06' },
    { id: 'ngfw', icon: 'firewall', name: 'NGFW (FortiGate)', ar: 'الجدار الناري من الجيل التالي', zone: 'Core', ip: 'port1–port5 / 10.10.40.1 (mgmt)',
      role: 'نقطة التحكم المركزية بين كل المناطق. بيطبق سياسات السماح والمنع وبيسجل كل الاتصالات.',
      funcs: ['Stateful inspection و Policy-based control', 'فصل المناطق: External / DMZ / App / DB / Mgmt', 'Default deny (Implicit Deny)', 'إرسال السجلات للـ SIEM'],
      ctrls: ['A.8.20', 'A.8.21', 'A.8.22', 'A.8.15', 'A.8.9', 'A.8.32'], evidence: 'Firewall policy export، سجلات المراجعة، طلبات التغيير', scenario: 'T02' },
    { id: 'ips', icon: 'ips', name: 'IPS / IDS', ar: 'نظام كشف ومنع التسلل', zone: 'Inline (NGFW)', ip: 'Inline profile',
      role: 'فحص محتوى الاتصالات واكتشاف التوقيعات والأنماط الهجومية ومنعها.',
      funcs: ['Signature-based detection', 'Anomaly detection (port scan)', 'Virtual patching لحين تطبيق التحديثات'],
      ctrls: ['A.8.7', 'A.8.8', 'A.8.16'], evidence: 'IPS sensor configuration، تقارير التوقيعات، سجلات الأحداث', scenario: 'T05' },
    { id: 'waf', icon: 'waf', name: 'WAF (FortiWeb)', ar: 'جدار حماية تطبيقات الويب', zone: 'Inline (DMZ edge)', ip: '10.10.40.2 (mgmt)',
      role: 'حماية بوابة ERP من هجمات طبقة التطبيقات (OWASP Top 10).',
      funcs: ['منع SQL Injection و XSS', 'Rate limiting ضد Brute Force', 'التحقق من صحة الطلبات (Input validation)'],
      ctrls: ['A.8.20', 'A.8.26', 'A.8.16'], evidence: 'WAF policy، تقارير الهجمات المحجوبة', scenario: 'T04' },
    { id: 'dmz', icon: 'proxy', name: 'DMZ Reverse Proxy', ar: 'الـ Reverse Proxy في الـ DMZ', zone: 'DMZ', ip: '10.10.10.10',
      role: 'نقطة الدخول الوحيدة المنشورة للخارج. بيستقبل الطلبات ويمررها لخوادم التطبيق بدون كشف عناوينها.',
      funcs: ['TLS termination بشهادة موثوقة', 'إخفاء البنية الداخلية', 'تمرير الطلبات إلى 10.10.20.0/24 على 8080 فقط'],
      ctrls: ['A.8.20', 'A.8.22', 'A.8.24'], evidence: 'إعدادات الـ Proxy، شهادات TLS، سياسة رقم 2', scenario: 'T03' },
    { id: 'app', icon: 'server', name: 'ERP Application Servers', ar: 'خوادم تطبيق ERP', zone: 'APP', ip: '10.10.20.10 / 10.10.20.11',
      role: 'تشغيل منطق الأعمال لنظام ERP. لا يمكن الوصول إليها من الخارج مباشرة.',
      funcs: ['تستقبل الطلبات من الـ DMZ فقط (8080)', 'تتصل بقاعدة البيانات على 5432 فقط', 'تُدار من الـ Jump Host فقط'],
      ctrls: ['A.8.22', 'A.8.9', 'A.8.8', 'A.8.14'], evidence: 'Hardening baseline، تقارير الثغرات، سجلات التحديث', scenario: 'T08' },
    { id: 'db', icon: 'db', name: 'ERP Database Servers', ar: 'خوادم قواعد البيانات', zone: 'DB', ip: '10.10.30.10 / 10.10.30.11',
      role: 'تخزين بيانات ERP الحساسة (مالية، موارد بشرية، مخزون). أعلى مستوى حماية.',
      funcs: ['تقبل اتصالات PostgreSQL من منطقة التطبيقات فقط', 'تشفير البيانات أثناء التخزين (مقترح)', 'نسخ متماثل (Replica) ونسخ احتياطي'],
      ctrls: ['A.8.3', 'A.8.22', 'A.8.24', 'A.8.13'], evidence: 'إعدادات pg_hba، سياسة التشفير، سجلات النسخ الاحتياطي', scenario: 'T02' },
    { id: 'mgmt', icon: 'admin', name: 'Management Zone / Jump Host', ar: 'منطقة الإدارة', zone: 'MGMT', ip: '10.10.40.10',
      role: 'المنطقة الوحيدة المسموح منها بالإدارة الفنية للأجهزة والخوادم.',
      funcs: ['Jump Host مع MFA وتسجيل الجلسات (PAM)', 'غير مكشوفة للخارج نهائياً', 'فصل حسابات الإدارة عن حسابات الاستخدام اليومي'],
      ctrls: ['A.8.2', 'A.8.5', 'A.8.15', 'A.8.22'], evidence: 'قائمة الحسابات المميزة، سجلات الجلسات، مراجعة الصلاحيات', scenario: 'T07' },
    { id: 'siem', icon: 'siem', name: 'SIEM / SOC', ar: 'المراقبة الأمنية', zone: 'MGMT', ip: '10.10.40.20',
      role: 'جمع وتحليل السجلات من كل الأجهزة وربط الأحداث وتوليد التنبيهات.',
      funcs: ['استقبال Syslog-TLS (6514)', 'قواعد ربط (Correlation rules)', 'تصعيد التنبيهات لفريق الاستجابة'],
      ctrls: ['A.8.15', 'A.8.16', 'A.8.17', 'A.5.25'], evidence: 'Use cases، تقارير التنبيهات، سجل الحوادث', scenario: 'T10' },
    { id: 'backup', icon: 'backup', name: 'Backup & DR', ar: 'النسخ الاحتياطي والتعافي', zone: 'MGMT', ip: '10.10.40.30',
      role: 'نسخ احتياطي دوري لقواعد البيانات والخوادم مع اختبار الاستعادة.',
      funcs: ['قاعدة 3-2-1 (مقترح)', 'نسخة غير قابلة للتعديل (Immutable) ضد الـ Ransomware', 'اختبارات استعادة دورية'],
      ctrls: ['A.8.13', 'A.8.14', 'A.5.30'], evidence: 'جدول النسخ، تقارير اختبار الاستعادة، خطة DR', scenario: 'T09' }
  ];

  /* ---------------- ISO/IEC 27001:2022 Annex A mapping ----------------
     status: Proposed | Simulated | Requires Implementation | Requires Verification */
  MW.isoControls = [
    { id: 'A.5.1',  theme: 'Organizational', name: 'Policies for information security', obj: 'وجود سياسات أمن معلومات معتمدة ومعلنة.', impl: 'سياسة أمن الشبكات وسياسة التحكم في الوصول كجزء من حزمة سياسات ISMS.', scen: '—', evid: 'سياسات معتمدة من الإدارة، سجل التوزيع والمراجعة', status: 'Requires Implementation' },
    { id: 'A.5.9',  theme: 'Organizational', name: 'Inventory of information and other associated assets', obj: 'معرفة كل الأصول ومالكيها.', impl: 'سجل أصول يشمل الأجهزة والخوادم والمناطق وعناوين IP (مثل جدول المعمل).', scen: 'Virtual Lab', evid: 'Asset register محدّث بمالك لكل أصل', status: 'Proposed' },
    { id: 'A.5.15', theme: 'Organizational', name: 'Access control', obj: 'تقييد الوصول حسب متطلبات العمل.', impl: 'Least privilege على مستوى الشبكة (Firewall policies) والتطبيق.', scen: 'T01, T02', evid: 'سياسة التحكم في الوصول، Firewall policy export', status: 'Simulated' },
    { id: 'A.5.25', theme: 'Organizational', name: 'Assessment and decision on information security events', obj: 'تقييم الأحداث وتحديد ما إذا كانت حوادث.', impl: 'تصنيف تنبيهات الـ SIEM حسب الخطورة وإجراءات الفرز (Triage).', scen: 'SIEM Alerts', evid: 'إجراء الفرز، سجل الأحداث والقرارات', status: 'Simulated' },
    { id: 'A.5.30', theme: 'Organizational', name: 'ICT readiness for business continuity', obj: 'جاهزية البنية التقنية لاستمرارية الأعمال.', impl: 'خطة DR لخوادم ERP وقاعدة البيانات مع RTO/RPO معتمدة.', scen: '—', evid: 'خطة DR، نتائج اختبار التعافي', status: 'Requires Implementation' },
    { id: 'A.7.1',  theme: 'Physical', name: 'Physical security perimeters', obj: 'حماية مركز البيانات فيزيائياً.', impl: 'تحديد محيط آمن لغرفة الـ Data Center مع تحكم في الدخول.', scen: '—', evid: 'معاينة الموقع، سجلات الدخول', status: 'Requires Verification' },
    { id: 'A.7.11', theme: 'Physical', name: 'Supporting utilities', obj: 'حماية المرافق الداعمة (الكهرباء والتبريد).', impl: 'UPS ومولد وتبريد احتياطي لغرفة الـ Data Center.', scen: '—', evid: 'سجلات صيانة الـ UPS والتبريد، اختبارات المولد', status: 'Requires Verification' },
    { id: 'A.8.2',  theme: 'Technological', name: 'Privileged access rights', obj: 'تقييد وإدارة الصلاحيات المميزة.', impl: 'الإدارة عبر Jump Host فقط + PAM + MFA.', scen: 'T07, T08, T12', evid: 'قائمة الحسابات المميزة، سجلات الجلسات، مراجعة دورية', status: 'Simulated' },
    { id: 'A.8.3',  theme: 'Technological', name: 'Information access restriction', obj: 'تقييد الوصول للمعلومات حسب السياسة.', impl: 'قاعدة البيانات تقبل الاتصال من منطقة التطبيقات فقط.', scen: 'T02', evid: 'إعدادات قاعدة البيانات (pg_hba)، Firewall policy 3', status: 'Simulated' },
    { id: 'A.8.5',  theme: 'Technological', name: 'Secure authentication', obj: 'مصادقة آمنة للمستخدمين والمسؤولين.', impl: 'MFA للوصول الإداري ولبوابة ERP، وحماية ضد التخمين.', scen: 'T07, T10', evid: 'إعدادات MFA، سياسة كلمات المرور', status: 'Proposed' },
    { id: 'A.8.7',  theme: 'Technological', name: 'Protection against malware', obj: 'الحماية من البرمجيات الخبيثة.', impl: 'AV/IPS على الـ NGFW + EDR على الخوادم (مقترح) + منع SMB بين المناطق.', scen: 'T05, T09', evid: 'إعدادات AV/EDR، تقارير الاكتشاف', status: 'Proposed' },
    { id: 'A.8.8',  theme: 'Technological', name: 'Management of technical vulnerabilities', obj: 'اكتشاف ومعالجة الثغرات في الوقت المناسب.', impl: 'فحص ثغرات دوري + Virtual patching عبر IPS.', scen: 'T05', evid: 'تقارير الفحص، خطة المعالجة', status: 'Requires Implementation' },
    { id: 'A.8.9',  theme: 'Technological', name: 'Configuration management', obj: 'إعدادات آمنة وموثقة للأجهزة.', impl: 'Baseline لإعدادات الـ FortiGate والخوادم مع نسخ احتياطي للإعدادات.', scen: 'Firewall Policies', evid: 'Configuration baselines، مقارنة الإعدادات', status: 'Proposed' },
    { id: 'A.8.13', theme: 'Technological', name: 'Information backup', obj: 'نسخ احتياطية واختبار استعادتها.', impl: 'نسخ يومي لقاعدة البيانات + نسخة Immutable + اختبار استعادة.', scen: 'T09', evid: 'سجلات النسخ، تقارير اختبار الاستعادة', status: 'Requires Implementation' },
    { id: 'A.8.14', theme: 'Technological', name: 'Redundancy of information processing facilities', obj: 'توفر الأنظمة الحرجة.', impl: 'خادما تطبيق + Replica لقاعدة البيانات + FortiGate HA (مقترح).', scen: 'Virtual Lab', evid: 'مخطط HA، نتائج اختبار Failover', status: 'Requires Implementation' },
    { id: 'A.8.15', theme: 'Technological', name: 'Logging', obj: 'تسجيل الأحداث وحماية السجلات.', impl: 'Log all على سياسات الـ Firewall وإرسالها للـ SIEM بشكل مشفّر.', scen: 'T11, Firewall Logs', evid: 'إعدادات Logging، عينات سجلات، سياسة الاحتفاظ', status: 'Simulated' },
    { id: 'A.8.16', theme: 'Technological', name: 'Monitoring activities', obj: 'مراقبة السلوك غير الطبيعي.', impl: 'قواعد ربط في الـ SIEM لتنبيهات الفحص والحركة الجانبية والتخمين.', scen: 'T03, T06, T10', evid: 'Use cases، تقارير التنبيهات', status: 'Simulated' },
    { id: 'A.8.17', theme: 'Technological', name: 'Clock synchronization', obj: 'توحيد الوقت لربط الأحداث.', impl: 'NTP داخلي موحد لكل الأجهزة.', scen: '—', evid: 'إعدادات NTP على الأجهزة', status: 'Requires Implementation' },
    { id: 'A.8.20', theme: 'Technological', name: 'Networks security', obj: 'حماية الشبكات والأجهزة.', impl: 'NGFW + IPS + WAF على المسار الخارجي، وتحكم في كل الاتصالات بين المناطق.', scen: 'T01, T04, T06', evid: 'مخطط الشبكة، Firewall policies', status: 'Simulated' },
    { id: 'A.8.21', theme: 'Technological', name: 'Security of network services', obj: 'تحديد متطلبات أمن خدمات الشبكة.', impl: 'تحديد المنافذ والخدمات المسموحة فقط لكل منطقة + اتفاقيات مزود الخدمة.', scen: 'Firewall Policies', evid: 'قائمة الخدمات المعتمدة، SLA', status: 'Proposed' },
    { id: 'A.8.22', theme: 'Technological', name: 'Segregation of networks', obj: 'فصل مجموعات الخدمات والمستخدمين.', impl: 'خمس مناطق منفصلة: External / DMZ / App / DB / Mgmt.', scen: 'T02, T03, T09, Segmentation', evid: 'مخطط VLANs/Subnets، Firewall zones', status: 'Simulated' },
    { id: 'A.8.24', theme: 'Technological', name: 'Use of cryptography', obj: 'استخدام التشفير بشكل صحيح.', impl: 'TLS 1.2+ للبوابة، Syslog-TLS، تشفير قاعدة البيانات (مقترح).', scen: 'T01, T11', evid: 'سياسة التشفير، إعدادات TLS، إدارة المفاتيح', status: 'Proposed' },
    { id: 'A.8.26', theme: 'Technological', name: 'Application security requirements', obj: 'تحديد متطلبات أمن التطبيقات.', impl: 'متطلبات حماية بوابة ERP (WAF، Input validation، Session management).', scen: 'T04, T10', evid: 'وثيقة المتطلبات الأمنية للتطبيق', status: 'Proposed' },
    { id: 'A.8.32', theme: 'Technological', name: 'Change management', obj: 'التحكم في التغييرات.', impl: 'أي تغيير في سياسات الـ Firewall يمر بطلب تغيير معتمد.', scen: 'Firewall Policies', evid: 'سجل طلبات التغيير، الموافقات', status: 'Requires Implementation' }
  ];

  /* ISO 27001 management-system clauses (not Annex A) */
  MW.isoClauses = [
    { id: '4', name: 'Context of the organization', ar: 'سياق المنظمة', note: 'تحديد نطاق الـ ISMS والأطراف المعنية' },
    { id: '5', name: 'Leadership', ar: 'القيادة', note: 'التزام الإدارة العليا وسياسة أمن المعلومات والأدوار' },
    { id: '6', name: 'Planning', ar: 'التخطيط', note: 'تقييم ومعالجة المخاطر، بيان التطبيق (SoA)، الأهداف' },
    { id: '7', name: 'Support', ar: 'الدعم', note: 'الموارد، الكفاءة، التوعية، التوثيق' },
    { id: '8', name: 'Operation', ar: 'التشغيل', note: 'تنفيذ خطة معالجة المخاطر والتحكم في العمليات' },
    { id: '9', name: 'Performance evaluation', ar: 'تقييم الأداء', note: 'القياس، المراجعة الداخلية، مراجعة الإدارة' },
    { id: '10', name: 'Improvement', ar: 'التحسين', note: 'عدم المطابقة والإجراءات التصحيحية والتحسين المستمر' }
  ];

  /* ---------------- Risk register (illustrative) ----------------
     L = likelihood 1..5, I = impact 1..5, inherent = L×I. rL/rI = target residual after treatment. */
  MW.risks = [
    { id: 'R01', asset: 'ERP Database', risk: 'وصول غير مصرح به لقاعدة البيانات من الخارج', threat: 'مهاجم خارجي', vuln: 'شبكة مسطحة أو منافذ قاعدة بيانات مكشوفة', L: 4, I: 5, rL: 1, rI: 5, treat: 'Mitigate', ctrls: ['A.8.20', 'A.8.22', 'A.8.3'], scen: 'T02' },
    { id: 'R02', asset: 'ERP Web Portal', risk: 'هجمات تطبيقات الويب (SQL Injection / XSS)', threat: 'مهاجم خارجي', vuln: 'ثغرات في التطبيق أو عدم وجود WAF', L: 4, I: 4, rL: 2, rI: 4, treat: 'Mitigate', ctrls: ['A.8.26', 'A.8.20', 'A.8.8'], scen: 'T04' },
    { id: 'R03', asset: 'DMZ / Internal Network', risk: 'حركة جانبية بعد اختراق جهاز في الـ DMZ', threat: 'مهاجم داخل الشبكة', vuln: 'غياب الفصل بين المناطق', L: 3, I: 5, rL: 1, rI: 4, treat: 'Mitigate', ctrls: ['A.8.22', 'A.8.16'], scen: 'T03' },
    { id: 'R04', asset: 'ERP Servers & Data', risk: 'هجوم Ransomware يوقف نظام ERP', threat: 'برمجيات خبيثة', vuln: 'منافذ SMB مفتوحة، نسخ احتياطي غير محمي', L: 3, I: 5, rL: 2, rI: 3, treat: 'Mitigate', ctrls: ['A.8.7', 'A.8.13', 'A.8.22'], scen: 'T09' },
    { id: 'R05', asset: 'Privileged Accounts', risk: 'إساءة استخدام الحسابات الإدارية أو سرقتها', threat: 'داخلي / خارجي', vuln: 'إدارة من أي مكان بدون MFA', L: 3, I: 5, rL: 1, rI: 4, treat: 'Mitigate', ctrls: ['A.8.2', 'A.8.5'], scen: 'T07' },
    { id: 'R06', asset: 'Security Monitoring', risk: 'تأخر اكتشاف الحوادث بسبب ضعف السجلات', threat: 'أي هجوم', vuln: 'عدم مركزية السجلات وغياب الربط', L: 4, I: 3, rL: 2, rI: 3, treat: 'Mitigate', ctrls: ['A.8.15', 'A.8.16', 'A.8.17'], scen: 'T11' },
    { id: 'R07', asset: 'Data Center', risk: 'توقف الخدمة بسبب نقطة فشل واحدة', threat: 'عطل فني / طاقة', vuln: 'جهاز Firewall أو خادم واحد بدون HA', L: 3, I: 4, rL: 2, rI: 3, treat: 'Mitigate', ctrls: ['A.8.14', 'A.5.30', 'A.7.11'], scen: '—' },
    { id: 'R08', asset: 'Firewall Configuration', risk: 'خطأ في إعدادات الـ Firewall يفتح منافذ غير مقصودة', threat: 'خطأ بشري', vuln: 'تغييرات بدون موافقة أو مراجعة', L: 3, I: 4, rL: 1, rI: 4, treat: 'Mitigate', ctrls: ['A.8.32', 'A.8.9'], scen: 'Policies' },
    { id: 'R09', asset: 'Servers & Appliances', risk: 'استغلال ثغرات غير محدّثة', threat: 'مهاجم خارجي', vuln: 'تأخر تطبيق التحديثات', L: 4, I: 4, rL: 2, rI: 3, treat: 'Mitigate', ctrls: ['A.8.8', 'A.8.7'], scen: 'T05' },
    { id: 'R10', asset: 'ERP Data', risk: 'فقدان البيانات لعدم القدرة على الاستعادة', threat: 'عطل / Ransomware', vuln: 'عدم اختبار الاستعادة', L: 2, I: 5, rL: 1, rI: 4, treat: 'Mitigate', ctrls: ['A.8.13', 'A.5.30'], scen: 'T09' }
  ];

  /* ---------------- Implementation roadmap ---------------- */
  MW.roadmap = [
    { n: 1, title: 'Gap Assessment & Scoping', ar: 'تقييم الفجوات وتحديد النطاق', dur: '2–3', items: ['تحديد نطاق الـ ISMS', 'مراجعة الوضع الحالي للشبكة', 'مقابلات مع فريق IT'], out: 'تقرير الفجوات + النطاق المعتمد' },
    { n: 2, title: 'Asset Inventory & Risk Assessment', ar: 'حصر الأصول وتقييم المخاطر', dur: '2–3', items: ['سجل الأصول', 'ورشة تقييم المخاطر مع العميل', 'خطة معالجة المخاطر'], out: 'Risk register + Treatment plan' },
    { n: 3, title: 'Network Design & Segmentation', ar: 'تصميم الشبكة وفصل المناطق', dur: '3–4', items: ['تصميم المناطق الخمس', 'خطة العناوين و VLANs', 'خطة الترحيل بدون توقف'], out: 'High/Low-level design معتمد' },
    { n: 4, title: 'Perimeter Security Deployment', ar: 'تنفيذ حماية المحيط', dur: '3–4', items: ['FortiGate HA + IPS', 'WAF أمام بوابة ERP', 'تطبيق السياسات تدريجياً'], out: 'سياسات مفعّلة + توثيق' },
    { n: 5, title: 'Logging, SIEM & Monitoring', ar: 'السجلات والمراقبة', dur: '3', items: ['ربط كل الأجهزة بالـ SIEM', 'Use cases للتنبيهات', 'NTP موحد'], out: 'Dashboards + إجراءات الاستجابة' },
    { n: 6, title: 'Hardening, Backup & DR', ar: 'تقوية الأنظمة والنسخ الاحتياطي', dur: '3–4', items: ['Baselines للخوادم', 'نسخ احتياطي Immutable', 'اختبار الاستعادة'], out: 'تقارير الاختبار' },
    { n: 7, title: 'Verification & Certification Readiness', ar: 'التحقق والجاهزية للاعتماد', dur: '4–6', items: ['اختبار اختراق مستقل', 'مراجعة داخلية + مراجعة الإدارة', 'تجهيز الأدلة و SoA'], out: 'جاهزية لمراجعة جهة الاعتماد' }
  ];

  /* ---------------- Simulated vs real ---------------- */
  MW.simVsReal = [
    ['تقييم سياسات الـ Firewall (ALLOW / DENY)', 'محرك قواعد JavaScript داخل الصفحة', 'FortiGate حقيقي بإعدادات معتمدة'],
    ['حركة الترافيك والحزم', 'رسوم متحركة SVG فقط — لا يتم إرسال أي حزمة', 'ترافيك فعلي على الشبكة'],
    ['IPS / WAF', 'توقيعات محاكاة (SQLI / EXPLOIT / BRUTE)', 'FortiGate IPS + FortiWeb بتوقيعات محدّثة'],
    ['سجلات الـ Firewall', 'سجلات مولّدة بصيغة قريبة من FortiOS', 'FortiAnalyzer / Syslog من الأجهزة'],
    ['تنبيهات الـ SIEM', 'قواعد ربط مبسطة داخل الصفحة', 'منصة SIEM حقيقية + فريق SOC'],
    ['فصل الشبكات', 'مصفوفة اتصال محسوبة من السياسات', 'VLANs + Switches + Firewall zones'],
    ['MFA / PAM', 'موضّحة كمتطلب فقط', 'حل PAM و MFA فعلي'],
    ['النسخ الاحتياطي و DR', 'غير محاكى — موضح في خارطة الطريق', 'نظام نسخ احتياطي + موقع تعافي'],
    ['تقييم المخاطر', 'قيم توضيحية للنقاش', 'ورشة عمل مع العميل وقيم معتمدة']
  ];

  /* ---------------- Presenter notes & suggested timing (15 min) ---------------- */
  MW.screens = [
    { n: 1, key: 'overview',   ar: 'نظرة عامة',           en: 'Executive Overview',   min: 2.0, notes: ['هدف العرض: إثبات تصميم آمن لبيئة ERP داخل الـ Data Center.', 'كل ما يظهر محاكاة — لا يوجد اتصال بأي جهاز حقيقي.'] },
    { n: 2, key: 'business',   ar: 'بيئة العمل والأهداف', en: 'Business Environment', min: 2.0, notes: ['التحديات الحالية: شبكة غير مقسمة، رؤية محدودة للسجلات.', 'وضّح النطاق: ما هو داخل المعمل وما هو خارجه.'] },
    { n: 3, key: 'topology',   ar: 'تصميم الشبكة',        en: 'Network Topology',     min: 3.0, notes: ['المخطط الأصلي مرجعي، والتصميم المقترح بخمس مناطق.', 'اضغط على الـ NGFW ثم على منطقة قاعدة البيانات لعرض الاتصالات المسموحة.'] },
    { n: 4, key: 'components', ar: 'مكونات التصميم',      en: 'Network Components',   min: 2.5, notes: ['ركّز على الـ NGFW كنقطة تحكم مركزية.', 'كل مكوّن مرتبط بضوابط ISO وأدلة مراجعة متوقعة.'] },
    { n: 5, key: 'sim',        ar: 'محاكاة الترافيك',     en: 'Traffic Simulation',   min: 3.5, notes: ['شغّل السيناريو المسموح ثم SQL Injection ثم الحركة الجانبية.', 'استخدم "الخطوة التالية" للشرح خطوة بخطوة، والمخطط المرجعي للمقارنة.'] },
    { n: 6, key: 'risk',       ar: 'تقييم المخاطر',       en: 'Risk Assessment',      min: 2.0, notes: ['القيم توضيحية وتحتاج ورشة عمل مع العميل.', 'بدّل بين الخطر الأصلي والمستهدف بعد المعالجة لتوضيح أثر التصميم.'] }
  ];
})();
