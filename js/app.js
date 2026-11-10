/* =========================================================
   Cartellina — app principale
   Dati salvati solo sul telefono (localStorage).
   ========================================================= */
(function () {
  'use strict';

  // ---------------------------------------------------------
  // Utilità
  // ---------------------------------------------------------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function at(dataYmd, ora) { var d = parseYmd(dataYmd); if (ora) { var h = ora.split(':'); d.setHours(+h[0], +h[1], 0, 0); } return d; }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  var GGL = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var MML = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  function fmtData(s) { var d = parseYmd(s); return GG[d.getDay()] + ' ' + d.getDate() + ' ' + MM[d.getMonth()]; }
  function fmtLunga(s) { var d = parseYmd(s); return GGL[d.getDay()] + ' ' + d.getDate() + ' ' + MML[d.getMonth()] + ' ' + d.getFullYear(); }
  function quando(s) {
    var oggi = parseYmd(ymd(new Date())), d = parseYmd(s);
    var diff = Math.round((d - oggi) / 864e5);
    if (diff === 0) return 'Oggi'; if (diff === 1) return 'Domani'; if (diff === -1) return 'Ieri';
    if (diff > 1 && diff < 7) return 'Tra ' + diff + ' giorni';
    return fmtData(s);
  }
  function fmtTs(ts) { var d = new Date(ts); return d.getDate() + ' ' + MM[d.getMonth()] + ' ' + hm(d); }

  var IC = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17l9-10"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/><path d="M9 9.5c.3 1.8 2.6 4.3 4.6 4.7l1-1"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    route: '<svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/></svg>',
    web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    pill: '<svg viewBox="0 0 24 24"><path d="M10.5 3.5a4.95 4.95 0 0 1 7 7l-7 7a4.95 4.95 0 0 1-7-7z"/><path d="M7 7l7 7"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h12v-3"/><path d="M9 8h6"/></svg>',
    van: '<svg viewBox="0 0 24 24"><path d="M2 16V7a1 1 0 0 1 1-1h11v10"/><path d="M14 9h4l4 4v3h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6M6 9v4M4 11h4"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    locate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>',
    // tipi di appuntamento
    Visita: '<svg viewBox="0 0 24 24"><path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/></svg>',
    Esame: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-10V3"/><path d="M7.5 15h9"/></svg>',
    Diagnostica: '<svg viewBox="0 0 24 24"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h3l1.5-3 2 6 1.5-3h2"/></svg>',
    Intervento: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/><rect x="4" y="4" width="16" height="16" rx="4"/></svg>',
    Ricovero: '<svg viewBox="0 0 24 24"><path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/></svg>',
    Terapia: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
    Altro: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>'
  };
  var TIPI = ['Visita', 'Esame', 'Diagnostica', 'Intervento', 'Ricovero', 'Terapia', 'Altro'];
  var COL = { Visita: '#4c7df0', Esame: '#9466e0', Diagnostica: '#17a89a', Intervento: '#e0475b', Ricovero: '#f0913a', Terapia: '#46b05c', Altro: '#8996a8' };
  var TIPI_C = ['Medico', 'Ospedale', 'Centro esami', 'Diagnostica', 'Farmacia', 'Trasporto / Associazione', 'Altro'];
  var COL_C = { 'Medico': '#4c7df0', 'Ospedale': '#e0475b', 'Centro esami': '#9466e0', 'Diagnostica': '#17a89a', 'Farmacia': '#46b05c', 'Trasporto / Associazione': '#f0913a', 'Altro': '#8996a8' };
  var IC_C = { 'Medico': IC.Visita, 'Ospedale': IC.Intervento, 'Centro esami': IC.Esame, 'Diagnostica': IC.Diagnostica, 'Farmacia': IC.pill, 'Trasporto / Associazione': IC.van, 'Altro': IC.user };
  var PORTARE = ['Impegnativa / ricetta', 'Tessera sanitaria', 'Documento d\'identità', 'Esami e referti precedenti', 'Elenco farmaci che prendi', 'Presentarsi a digiuno', 'Attestato di esenzione', 'Ricevuta del ticket', 'Consenso informato firmato', 'Accompagnatore'];

  // ---------------------------------------------------------
  // Dati
  // ---------------------------------------------------------
  var KEY = 'cartellina.dati';
  var DEF = {
    eventi: [], contatti: [], farmaci: [], assunzioni: {}, rinvii: {}, email: {}, notificati: {},
    regole: { fidati: [], bloccati: [] },
    imp: { nome: '', gmailUrl: '', token: '', giorni: 7, intervallo: 10, citta: '', allarme: 'schermo', suono: true, vibra: true,
      autoEventi: true, impara: true, promEventi: true, ultimoControllo: 0, erroreGmail: '', emailViste: 0 }
  };
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    d = d || {};
    Object.keys(DEF).forEach(function (k) {
      if (d[k] == null) d[k] = JSON.parse(JSON.stringify(DEF[k]));
      else if (k === 'imp' || k === 'regole') Object.keys(DEF[k]).forEach(function (j) { if (d[k][j] == null) d[k][j] = DEF[k][j]; });
    });
    return d;
  }
  var D = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(D)); }
    catch (e) { pulisci(true); try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e2) { toast('Memoria del telefono piena: esporta un backup'); } }
    if (window.Ponte) Ponte.cambiato();
  }
  // tiene leggero l'archivio: assunzioni oltre 120 giorni, email scartate vecchie
  function pulisci(forte) {
    var lim = Date.now() - (forte ? 30 : 120) * 864e5;
    Object.keys(D.assunzioni).forEach(function (k) { if ((D.assunzioni[k].at || 0) < lim) delete D.assunzioni[k]; });
    Object.keys(D.rinvii).forEach(function (k) { if (D.rinvii[k] < Date.now() - 864e5) delete D.rinvii[k]; });
    Object.keys(D.notificati).forEach(function (k) { if (D.notificati[k] < lim) delete D.notificati[k]; });
    var limMail = Date.now() - (forte ? 15 : 60) * 864e5;
    Object.keys(D.email).forEach(function (k) {
      var m = D.email[k];
      if (m.stato === 'scartata' && (m.arrivata || 0) < limMail) delete D.email[k];
      else if (m.stato === 'scartata' && m.body && m.body.length > 1500) m.body = m.body.slice(0, 1500);
    });
  }

  // ---------------------------------------------------------
  // Interfaccia di base: fogli, avvisi
  // ---------------------------------------------------------
  function toast(msg, ms) {
    var t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toastRoot').appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2600);
  }
  function sheet(titolo, html, onMount) {
    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-h"><h2>' + titolo + '</h2><button class="x" data-act="closeSheet" aria-label="Chiudi">' + IC.x + '</button></div>' + html + '</div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) chiudiSheet(); });
    $('#sheetRoot').appendChild(bg);
    var s = bg.querySelector('.sheet');
    if (onMount) onMount(s);
    return s;
  }
  function chiudiSheet(tutti) {
    var all = $$('#sheetRoot .sheet-bg');
    if (!all.length) return;
    if (tutti) all.forEach(function (x) { x.remove(); }); else all[all.length - 1].remove();
  }
  function banner(html, onAct, ms) {
    var b = document.createElement('div');
    b.className = 'banner';
    b.innerHTML = html;
    b.addEventListener('click', function (e) {
      var a = e.target.closest('[data-b]');
      if (a) { if (onAct) onAct(a.dataset.b); b.remove(); }
    });
    $('#bannerRoot').appendChild(b);
    if (ms) setTimeout(function () { b.remove(); }, ms);
    return b;
  }

  // ---------------------------------------------------------
  // Collegamenti rapidi (chiamate, WhatsApp, mail, mappe)
  // ---------------------------------------------------------
  function telPulito(n) { return String(n || '').replace(/[^\d+]/g, ''); }
  function waNumero(n) {
    var d = String(n || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (/^3\d{8,9}$/.test(d) || /^0\d{5,10}$/.test(d)) d = '39' + d;
    return d;
  }
  function isCell(n) { var d = String(n || '').replace(/\D/g, '').replace(/^(0039|39)(?=3)/, ''); return /^3\d{8,9}$/.test(d); }
  function mapsDir(dest) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest) + '&travelmode=driving'; }
  function mapsCerca(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function qaHtml(c, opz) {
    opz = opz || {};
    var h = '';
    if (c.tel) h += '<a class="qa call" href="tel:' + esc(telPulito(c.tel)) + '">' + IC.phone + 'Chiama</a>';
    var wa = c.whatsapp || (isCell(c.tel) ? c.tel : (isCell(c.tel2) ? c.tel2 : ''));
    if (wa) h += '<a class="qa wa" href="https://wa.me/' + esc(waNumero(wa)) + '" target="_blank" rel="noopener">' + IC.wa + 'WhatsApp</a>';
    if (c.email) h += '<a class="qa mail" href="mailto:' + esc(c.email) + '">' + IC.mail + 'Mail</a>';
    var dove = c.indirizzo || (opz.nomeComeLuogo ? c.nome : '');
    if (dove) h += '<a class="qa map" href="' + esc(mapsDir(dove)) + '" target="_blank" rel="noopener">' + IC.route + 'Percorso</a>';
    if (c.web) h += '<a class="qa web" href="' + esc(/^https?:/.test(c.web) ? c.web : 'https://' + c.web) + '" target="_blank" rel="noopener">' + IC.web + 'Sito</a>';
    return h;
  }

  // ---------------------------------------------------------
  // Navigazione
  // ---------------------------------------------------------
  var VIEWS = {};
  var ALTRO = { email: 1, glossario: 1, trasporti: 1, impostazioni: 1 };
  function route() {
    var parts = (location.hash || '#/home').slice(2).split('/');
    var name = VIEWS[parts[0]] ? parts[0] : 'home';
    $$('.tabbar a').forEach(function (a) { a.classList.toggle('on', a.dataset.tab === (ALTRO[name] ? 'altro' : name)); });
    var v = $('#view');
    v.innerHTML = '';
    VIEWS[name](v, parts.slice(1));
    aggiornaBadge();
    window.scrollTo(0, 0);
  }
  function ridisegna() { var y = window.scrollY; route(); window.scrollTo(0, y); }
  window.addEventListener('hashchange', function () { chiudiSheet(true); route(); });

  function contaDaVedere() {
    var n = 0;
    Object.keys(D.email).forEach(function (k) {
      var m = D.email[k];
      if (m.stato === 'verifica') n++;
      else if (m.stato === 'sanitaria' && (m.arrivata || 0) > (D.imp.emailViste || 0)) n++;
    });
    return n;
  }
  function aggiornaBadge() {
    var n = contaDaVedere(), b = $('#navBadge');
    b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
  }

  // azioni con data-act
  var ACT = {};
  document.addEventListener('click', function (e) {
    sbloccaAudio();
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  ACT.closeSheet = function () { chiudiSheet(); };
  ACT.go = function (el) { location.hash = el.dataset.to; };

  // ---------------------------------------------------------
  // HOME
  // ---------------------------------------------------------
  function prossimiEventi(n) {
    var ora = Date.now() - 60 * 60 * 1000;
    return D.eventi.filter(function (e) { return at(e.data, e.ora || '23:59').getTime() >= ora; })
      .sort(function (a, b) { return at(a.data, a.ora || '00:00') - at(b.data, b.ora || '00:00'); }).slice(0, n || 99);
  }
  function saluto() {
    var h = new Date().getHours();
    var s = h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    return s + (D.imp.nome ? ', ' + esc(D.imp.nome) : '');
  }
  VIEWS.home = function (v) {
    var oggi = ymd(new Date());
    var next = prossimiEventi(1)[0];
    var dosi = dosiDelGiorno(oggi);
    var daVedere = contaDaVedere();
    var verifica = Object.keys(D.email).filter(function (k) { return D.email[k].stato === 'verifica'; }).length;
    var vuota = !D.eventi.length && !D.farmaci.length && !D.contatti.length && !Object.keys(D.email).length;
    var h = '<div class="hello"><h1>' + saluto() + ' 👋</h1><p>' + GGL[new Date().getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + new Date().getDate() + ' ' + MML[new Date().getMonth()] + '</p></div>';

    if (vuota) {
      h += '<div class="card"><div class="row" style="align-items:flex-start"><img src="icons/logo.svg" width="56" height="56" alt="" style="border-radius:16px"><div class="grow"><h2>Ciao, sono Cartellina!</h2><p class="muted small" style="margin:4px 0 0">Ti aiuto con visite, esami, farmaci e carte. Iniziamo?</p></div></div>' +
        '<ol class="steps" style="margin-top:14px"><li><b>Collega la tua email</b><br><span class="small muted">Trovo da sola le email sanitarie e segno le date.</span></li><li><b>Aggiungi i farmaci</b><br><span class="small muted">Ti avviso a schermo intero quando prenderli.</span></li><li><b>Prova con le email di esempio</b><br><span class="small muted">Per vedere come funziona.</span></li></ol>' +
        '<div class="btns"><button class="btn" data-act="go" data-to="#/impostazioni">Collega email</button><button class="btn sec" data-act="demo">Prova esempio</button></div></div>';
    }

    if (next) {
      var c = contatto(next.contattoId) || {};
      var dove = next.indirizzo || next.luogo || c.indirizzo;
      h += '<div class="next" data-act="apriEvento" data-id="' + next.id + '"><div class="lbl">Prossimo appuntamento</div><h2>' + esc(next.titolo || next.tipo) + '</h2>' +
        '<div class="when">' + quando(next.data) + (next.ora ? ' · ore ' + next.ora : '') + '</div>' +
        (next.luogo ? '<div class="where">' + esc(next.luogo) + '</div>' : '') +
        '<div class="quick" style="margin-top:12px">' + (dove ? '<a class="qa" href="' + esc(mapsDir(dove)) + '" target="_blank" rel="noopener">' + IC.route + 'Percorso</a>' : '') +
        (c.tel ? '<a class="qa" href="tel:' + esc(telPulito(c.tel)) + '">' + IC.phone + 'Chiama</a>' : '') +
        (next.portare && next.portare.length ? '<span class="qa">' + IC.check + next.portare.filter(function (p) { return p.ok; }).length + '/' + next.portare.length + ' da portare</span>' : '') + '</div></div>';
    }

    h += '<div class="card mailbox" data-act="go" data-to="#/email"><div class="ic">' + IC.mail + '</div><div class="grow"><h3>Email sanitarie</h3><p class="small muted" style="margin:2px 0 0">' +
      (D.imp.gmailUrl ? (verifica ? '<b style="color:var(--acc)">' + verifica + ' da verificare</b> · ' : '') + 'controllo: ' + (D.imp.ultimoControllo ? fmtTs(D.imp.ultimoControllo) : 'mai') : 'Email non ancora collegata') +
      '</p></div>' + (daVedere ? '<b class="num" style="color:var(--acc)">' + daVedere + '</b>' : IC.right.replace('<svg', '<svg style="width:22px;color:var(--muted)"')) + '</div>';

    h += '<div class="tiles">' +
      tile('nuovoEvento', IC.cal, '#e5edff', '#3159c9', 'Nuovo<br>appuntam.') +
      tile('nuovoFarmaco', IC.pill, '#ffe9e2', '#d4492f', 'Nuovo<br>farmaco') +
      '<a class="tile" href="#/glossario"><i style="background:#fff3cf;color:#b07b00">' + IC.book + '</i>Cosa<br>significa?</a>' +
      '<a class="tile" href="#/trasporti"><i style="background:#dff3ee;color:#167565">' + IC.van + '</i>Trasporto<br>e aiuto</a></div>';

    // farmaci di oggi
    if (dosi.length) {
      h += '<div class="section-title"><h2>Farmaci di oggi</h2><a href="#/farmaci">Tutti</a></div>' + dosi.map(doseHtml).join('');
    }
    var pros = prossimiEventi(5).slice(next ? 1 : 0, 4);
    if (pros.length) h += '<div class="section-title"><h2>In arrivo</h2><a href="#/agenda">Agenda</a></div>' + pros.map(eventoItem).join('');
    h += '<p class="disclaimer">Cartellina ti aiuta con l\'organizzazione: non sostituisce il parere del medico. In emergenza chiama il <a href="tel:112">112</a>.</p>';
    v.innerHTML = h;
  };
  function tile(act, ic, bg, col, txt) { return '<button class="tile" data-act="' + act + '"><i style="background:' + bg + ';color:' + col + '">' + ic + '</i>' + txt + '</button>'; }

  // ---------------------------------------------------------
  // AGENDA
  // ---------------------------------------------------------
  var calMese = new Date(); calMese.setDate(1);
  var calSel = ymd(new Date());
  function eventiDel(g) { return D.eventi.filter(function (e) { return e.data === g; }).sort(function (a, b) { return (a.ora || '').localeCompare(b.ora || ''); }); }
  function eventoItem(e) {
    var d = parseYmd(e.data);
    return '<div class="item" data-act="apriEvento" data-id="' + e.id + '"><div class="date"><small>' + GG[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + MM[d.getMonth()] + '</small></div>' +
      '<div class="bar" style="background:' + COL[e.tipo] + '"></div><div class="grow"><h3 class="ellipsis">' + esc(e.titolo || e.tipo) + '</h3><p class="ellipsis">' + (e.ora ? 'ore ' + e.ora + ' · ' : '') + esc(e.luogo || e.tipo) + '</p></div>' +
      (e.fonte === 'email' ? '<span class="tag grey" title="Aggiunto da email">' + IC.mail.replace('<svg', '<svg style="width:13px;height:13px"') + '</span>' : '') +
      (e.fonte === 'agendapp' ? '<span class="tag grey" title="Arrivato da AgendApp">AgendApp</span>' : '') + '</div>';
  }
  VIEWS.agenda = function (v) {
    var y = calMese.getFullYear(), m = calMese.getMonth();
    var primo = new Date(y, m, 1), offset = (primo.getDay() + 6) % 7;
    var start = new Date(y, m, 1 - offset);
    var oggi = ymd(new Date());
    var h = '<div class="page-head"><div><h1>Agenda</h1><p>Visite, esami, diagnostica, interventi</p></div><button class="iconbtn" data-act="exportIcs" title="Esporta nel calendario del telefono">' + IC.down + '</button></div>';
    h += '<div class="card"><div class="cal-head"><button class="iconbtn" data-act="mese" data-d="-1" aria-label="Mese precedente">' + IC.left + '</button><h2>' + MML[m] + ' ' + y + '</h2><button class="iconbtn" data-act="mese" data-d="1" aria-label="Mese successivo">' + IC.right + '</button></div><div class="cal">';
    ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(function (g) { h += '<div class="wd">' + g + '</div>'; });
    for (var i = 0; i < 42; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      var k = ymd(d), evs = eventiDel(k);
      if (i >= 35 && d.getMonth() !== m) break;
      h += '<button class="d' + (d.getMonth() !== m ? ' out' : '') + (k === oggi ? ' today' : '') + (k === calSel ? ' sel' : '') + '" data-act="selGiorno" data-g="' + k + '">' + d.getDate() +
        '<span class="dots">' + evs.slice(0, 4).map(function (e) { return '<i style="background:' + COL[e.tipo] + '"></i>'; }).join('') + '</span></button>';
    }
    h += '</div><div class="legend">' + TIPI.map(function (t) { return '<span><i style="background:' + COL[t] + '"></i>' + t + '</span>'; }).join('') + '</div></div>';
    var evs = eventiDel(calSel);
    h += '<div class="section-title"><h2 style="text-transform:capitalize">' + fmtLunga(calSel) + '</h2><button class="linkbtn" data-act="nuovoEvento" data-g="' + calSel + '">+ Aggiungi</button></div>';
    h += evs.length ? evs.map(eventoItem).join('') : '<div class="card flat empty small">Niente in programma in questo giorno.</div>';
    var pros = prossimiEventi(30);
    if (pros.length) h += '<div class="section-title"><h2>Tutti i prossimi</h2><span class="muted small">' + pros.length + '</span></div>' + pros.map(eventoItem).join('');
    h += '<button class="fab" data-act="nuovoEvento" data-g="' + calSel + '" aria-label="Nuovo appuntamento">' + IC.plus + '</button>';
    v.innerHTML = h;
  };
  ACT.mese = function (el) { calMese.setMonth(calMese.getMonth() + (+el.dataset.d)); ridisegna(); };
  ACT.selGiorno = function (el) { calSel = el.dataset.g; var d = parseYmd(calSel); if (d.getMonth() !== calMese.getMonth()) { calMese = new Date(d.getFullYear(), d.getMonth(), 1); } ridisegna(); };

  function evento(id) { return D.eventi.filter(function (e) { return e.id === id; })[0]; }
  function contatto(id) { return id ? D.contatti.filter(function (c) { return c.id === id; })[0] : null; }

  ACT.apriEvento = function (el) { apriEvento(el.dataset.id); };
  function apriEvento(id) {
    var e = evento(id); if (!e) return;
    var c = contatto(e.contattoId);
    var dove = e.indirizzo || e.luogo || (c && c.indirizzo);
    var h = '<div class="row" style="margin-bottom:12px"><div class="ticon" style="background:' + COL[e.tipo] + '">' + IC[e.tipo] + '</div><div class="grow"><span class="tag" style="background:' + COL[e.tipo] + '22;color:' + COL[e.tipo] + '">' + e.tipo + '</span>' +
      (e.fonte === 'email' ? ' <span class="tag grey">da email</span>' : '') + (e.fonte === 'agendapp' ? ' <span class="tag grey">da AgendApp</span>' : '') + '<h3 style="margin-top:4px;text-transform:capitalize">' + fmtLunga(e.data) + (e.ora ? ' · ore ' + e.ora : '') + '</h3></div></div>';
    if (e.luogo || e.indirizzo) h += '<p style="margin:0 0 4px"><b>' + esc(e.luogo) + '</b>' + (e.indirizzo && e.indirizzo !== e.luogo ? '<br><span class="muted">' + esc(e.indirizzo) + '</span>' : '') + '</p>';
    h += '<div class="quick" style="margin:10px 0 14px">' + (dove ? '<a class="qa map" href="' + esc(mapsDir(dove)) + '" target="_blank" rel="noopener">' + IC.route + 'Percorso</a>' : '') + (c ? qaHtml({ tel: c.tel, whatsapp: c.whatsapp, email: c.email, tel2: c.tel2 }) : '') + '</div>';
    if (c) h += '<div class="found" data-act="apriContatto" data-id="' + c.id + '" style="cursor:pointer"><span class="small muted">Contatto</span><br><b>' + esc(c.nome) + '</b>' + (c.tel ? ' · ' + esc(c.tel) : '') + '</div>';
    if (e.portare && e.portare.length) {
      h += '<h3 style="margin:14px 0 4px">Da portare / ricordare</h3>' + e.portare.map(function (p, i) {
        return '<label class="check' + (p.ok ? ' done' : '') + '"><input type="checkbox" data-chg="portare" data-id="' + e.id + '" data-i="' + i + '"' + (p.ok ? ' checked' : '') + '><span>' + esc(p.t) + '</span></label>';
      }).join('');
    }
    if (e.note) h += '<h3 style="margin:14px 0 4px">Note</h3><p class="mailbody" style="max-height:none">' + esc(e.note) + '</p>';
    if (e.emailId && D.email[e.emailId]) h += '<button class="btn ghost block sm" style="margin-top:10px" data-act="apriEmail" data-id="' + e.emailId + '">' + IC.mail + 'Vedi email di origine</button>';
    h += '<div class="btns" style="margin-top:16px"><button class="btn sec" data-act="modEvento" data-id="' + e.id + '">' + IC.edit + 'Modifica</button><button class="btn ghost" data-act="icsEvento" data-id="' + e.id + '">' + IC.down + 'Calendario</button><button class="btn danger" data-act="delEvento" data-id="' + e.id + '">' + IC.trash + '</button></div>';
    sheet(esc(e.titolo || e.tipo), h);
  }
  document.addEventListener('change', function (ev) {
    var el = ev.target.closest('[data-chg]'); if (!el) return;
    if (el.dataset.chg === 'portare') {
      var e = evento(el.dataset.id); if (!e) return;
      e.portare[+el.dataset.i].ok = el.checked; save();
      el.closest('.check').classList.toggle('done', el.checked);
    }
  });
  ACT.delEvento = function (el) {
    if (!confirm('Eliminare questo appuntamento?')) return;
    var ev = evento(el.dataset.id); if (ev && ev.ponte && window.Ponte) Ponte.ignora(ev.ponte);
    D.eventi = D.eventi.filter(function (e) { return e.id !== el.dataset.id; }); save(); chiudiSheet(true); ridisegna(); toast('Appuntamento eliminato');
  };
  ACT.nuovoEvento = function (el) { formEvento({ data: el.dataset.g || ymd(new Date()) }); };
  ACT.modEvento = function (el) { chiudiSheet(); formEvento(evento(el.dataset.id)); };

  function formEvento(e, dopo) {
    e = e || {};
    var nuovo = !e.id;
    var tipo = e.tipo || 'Visita';
    var portare = (e.portare || []).map(function (p) { return p.t; });
    var opzC = '<option value="">— nessuno —</option>' + D.contatti.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (c) { return '<option value="' + c.id + '"' + (c.id === e.contattoId ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('');
    var h = '<form id="fEv"><div class="chips" id="tipiEv">' + TIPI.map(function (t) { return '<button type="button" class="chip' + (t === tipo ? ' on' : '') + '" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div>' +
      '<label class="f"><span>Cosa</span><input class="inp" name="titolo" placeholder="Es. Visita cardiologica, TAC torace" value="' + esc(e.titolo || '') + '"></label>' +
      '<div class="two"><label class="f"><span>Giorno</span><input class="inp" type="date" name="data" required value="' + esc(e.data || ymd(new Date())) + '"></label><label class="f"><span>Ora</span><input class="inp" type="time" name="ora" value="' + esc(e.ora || '') + '"></label></div>' +
      '<label class="f"><span>Dove (struttura, reparto)</span><input class="inp" name="luogo" placeholder="Es. Ospedale di Circolo, Cardiologia" value="' + esc(e.luogo || '') + '"></label>' +
      '<label class="f"><span>Indirizzo (per il navigatore)</span><input class="inp" name="indirizzo" placeholder="Via, numero, città" value="' + esc(e.indirizzo || '') + '"></label>' +
      '<label class="f"><span>Medico / struttura in rubrica</span><select class="inp" name="contattoId">' + opzC + '</select></label>' +
      '<label class="f"><span>Da portare / ricordare</span></label><div class="chips wrap" id="portEv" style="flex-wrap:wrap">' +
      PORTARE.concat(portare.filter(function (p) { return PORTARE.indexOf(p) < 0; })).map(function (p) { return '<button type="button" class="chip' + (portare.indexOf(p) >= 0 ? ' on' : '') + '" data-p="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div>' +
      '<label class="f" style="margin-top:6px"><span>Note</span><textarea class="inp" name="note" placeholder="Codice prenotazione, piano, domande da fare al medico…">' + esc(e.note || '') + '</textarea></label>' +
      '<button class="btn block" type="submit">' + IC.check + (nuovo ? 'Salva appuntamento' : 'Salva modifiche') + '</button></form>';
    sheet(nuovo ? 'Nuovo appuntamento' : 'Modifica appuntamento', h, function (s) {
      $('#tipiEv', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-t]'); if (!b) return; tipo = b.dataset.t; $$('#tipiEv .chip', s).forEach(function (x) { x.classList.toggle('on', x === b); }); });
      $('#portEv', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-p]'); if (b) b.classList.toggle('on'); });
      $('[name=contattoId]', s).addEventListener('change', function () {
        var c = contatto(this.value); if (!c) return;
        if (!$('[name=luogo]', s).value) $('[name=luogo]', s).value = c.nome;
        if (!$('[name=indirizzo]', s).value && c.indirizzo) $('[name=indirizzo]', s).value = c.indirizzo;
      });
      $('#fEv', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target);
        var vecchi = {}; (e.portare || []).forEach(function (p) { vecchi[p.t] = p.ok; });
        var rec = {
          id: e.id || uid(), tipo: tipo, titolo: f.get('titolo').trim() || tipo, data: f.get('data'), ora: f.get('ora'),
          luogo: f.get('luogo').trim(), indirizzo: f.get('indirizzo').trim(), contattoId: f.get('contattoId'), note: f.get('note').trim(),
          portare: $$('#portEv .chip.on', s).map(function (b) { return { t: b.dataset.p, ok: !!vecchi[b.dataset.p] }; }),
          fonte: e.fonte || 'manuale', emailId: e.emailId || '', demo: e.demo || false, creato: e.creato || Date.now(), ponte: e.ponte || ''
        };
        if (nuovo) D.eventi.push(rec); else D.eventi = D.eventi.map(function (x) { return x.id === rec.id ? rec : x; });
        save(); chiudiSheet(); calSel = rec.data; var dd = parseYmd(rec.data); calMese = new Date(dd.getFullYear(), dd.getMonth(), 1);
        toast(nuovo ? 'Appuntamento salvato ✓' : 'Modifiche salvate ✓');
        if (dopo) dopo(rec); ridisegna();
      });
    });
  }

  // ---------------------------------------------------------
  // RUBRICA
  // ---------------------------------------------------------
  var rubFiltro = '', rubTipo = '';
  VIEWS.rubrica = function (v) {
    var h = '<div class="page-head"><div><h1>Rubrica</h1><p>Medici, ospedali, centri esami</p></div></div>' +
      '<div class="search" style="margin-bottom:10px">' + IC.search + '<input class="inp" id="rubQ" placeholder="Cerca nome, specialità, città…" value="' + esc(rubFiltro) + '"></div>' +
      '<div class="chips"><button class="chip' + (!rubTipo ? ' on' : '') + '" data-act="rubTipo" data-t="">Tutti</button>' + TIPI_C.map(function (t) {
        var n = D.contatti.filter(function (c) { return c.tipo === t; }).length;
        return n ? '<button class="chip' + (rubTipo === t ? ' on' : '') + '" data-act="rubTipo" data-t="' + t + '">' + t + '<span class="n">' + n + '</span></button>' : '';
      }).join('') + '</div><div id="rubList"></div>' +
      '<button class="fab" data-act="nuovoContatto" aria-label="Nuovo contatto">' + IC.plus + '</button>';
    v.innerHTML = h;
    var q = $('#rubQ');
    q.addEventListener('input', function () { rubFiltro = q.value; listaRubrica(); });
    listaRubrica();
  };
  function listaRubrica() {
    var q = Classificatore.norm(rubFiltro);
    var lst = D.contatti.filter(function (c) {
      if (rubTipo && c.tipo !== rubTipo) return false;
      if (!q) return true;
      return Classificatore.norm([c.nome, c.specialita, c.indirizzo, c.email, c.tel, c.note].join(' ')).indexOf(q) >= 0;
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
    $('#rubList').innerHTML = lst.length ? lst.map(contattoCard).join('') :
      '<div class="card flat empty"><div class="big" style="color:var(--pri)">' + IC.user.replace('<svg', '<svg style="width:70px;height:70px;stroke-width:1.4"') + '</div>' +
      (D.contatti.length ? 'Nessun risultato.' : 'La rubrica è vuota.<br><span class="small muted">I contatti arrivano da soli dalle email sanitarie, oppure aggiungili con +.</span>') + '</div>';
  }
  function contattoCard(c) {
    return '<div class="card" style="padding:13px"><div class="row" data-act="apriContatto" data-id="' + c.id + '" style="cursor:pointer"><div class="ticon" style="background:' + (COL_C[c.tipo] || '#8996a8') + '">' + (IC_C[c.tipo] || IC.user) + '</div>' +
      '<div class="grow"><h3 class="ellipsis">' + esc(c.nome) + '</h3><p class="small muted ellipsis" style="margin:1px 0 0">' + esc([c.specialita || c.tipo, c.indirizzo].filter(Boolean).join(' · ')) + '</p></div>' +
      (c.fonte === 'email' ? '<span class="tag grey">auto</span>' : '') + '</div><div class="quick" style="margin-top:10px">' + qaHtml(c) + '</div></div>';
  }
  ACT.rubTipo = function (el) { rubTipo = el.dataset.t; ridisegna(); };
  ACT.nuovoContatto = function () { formContatto({}); };
  ACT.apriContatto = function (el) { apriContatto(el.dataset.id); };
  function apriContatto(id) {
    var c = contatto(id); if (!c) return;
    var evs = prossimiEventi().filter(function (e) { return e.contattoId === c.id; });
    var h = '<div class="row" style="margin-bottom:10px"><div class="ticon" style="background:' + (COL_C[c.tipo] || '#8996a8') + '">' + (IC_C[c.tipo] || IC.user) + '</div><div class="grow"><span class="tag grey">' + esc(c.tipo) + '</span>' + (c.specialita ? '<p style="margin:4px 0 0"><b>' + esc(c.specialita) + '</b></p>' : '') + '</div></div>';
    var righe = [['Telefono', c.tel], ['Altro telefono', c.tel2], ['WhatsApp', c.whatsapp], ['Email', c.email], ['Indirizzo', c.indirizzo], ['Sito', c.web], ['Note', c.note]];
    h += righe.filter(function (r) { return r[1]; }).map(function (r) { return '<div class="toggle"><span class="muted small">' + r[0] + '</span><b style="text-align:right;word-break:break-word">' + esc(r[1]) + '</b></div>'; }).join('');
    h += '<div class="quick" style="margin:14px 0">' + qaHtml(c) + (c.tel2 ? '<a class="qa call" href="tel:' + esc(telPulito(c.tel2)) + '">' + IC.phone + 'Chiama 2°</a>' : '') + '</div>';
    if (evs.length) h += '<h3 style="margin:8px 0">Appuntamenti</h3>' + evs.map(eventoItem).join('');
    h += '<div class="btns" style="margin-top:14px"><button class="btn sec" data-act="nuovoEventoCon" data-id="' + c.id + '">' + IC.cal + 'Appuntamento</button><button class="btn ghost" data-act="modContatto" data-id="' + c.id + '">' + IC.edit + 'Modifica</button><button class="btn danger" data-act="delContatto" data-id="' + c.id + '">' + IC.trash + '</button></div>';
    sheet(esc(c.nome), h);
  }
  ACT.nuovoEventoCon = function (el) { var c = contatto(el.dataset.id); chiudiSheet(); formEvento({ contattoId: c.id, luogo: c.nome, indirizzo: c.indirizzo, data: ymd(new Date()), tipo: c.tipo === 'Centro esami' ? 'Esame' : c.tipo === 'Diagnostica' ? 'Diagnostica' : 'Visita' }); };
  ACT.modContatto = function (el) { chiudiSheet(); formContatto(contatto(el.dataset.id)); };
  ACT.delContatto = function (el) {
    if (!confirm('Eliminare questo contatto?')) return;
    D.contatti = D.contatti.filter(function (c) { return c.id !== el.dataset.id; });
    D.eventi.forEach(function (e) { if (e.contattoId === el.dataset.id) e.contattoId = ''; });
    save(); chiudiSheet(true); ridisegna(); toast('Contatto eliminato');
  };
  function formContatto(c, dopo) {
    c = c || {};
    var nuovo = !c.id;
    var campo = function (n, l, ph, t) { return '<label class="f"><span>' + l + '</span><input class="inp" name="' + n + '" type="' + (t || 'text') + '" placeholder="' + (ph || '') + '" value="' + esc(c[n] || '') + '"></label>'; };
    var h = '<form id="fCo">' + campo('nome', 'Nome', 'Es. Dott. Rossi, Ospedale di Circolo') +
      '<label class="f"><span>Tipo</span><select class="inp" name="tipo">' + TIPI_C.map(function (t) { return '<option' + (t === (c.tipo || 'Medico') ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      campo('specialita', 'Specialità / reparto', 'Es. Cardiologia') +
      '<div class="two">' + campo('tel', 'Telefono', '0332 …', 'tel') + campo('tel2', 'Altro telefono', '', 'tel') + '</div>' +
      campo('whatsapp', 'WhatsApp (se diverso)', '333 …', 'tel') + campo('email', 'Email', '', 'email') + campo('indirizzo', 'Indirizzo', 'Via, numero, città') + campo('web', 'Sito web', '') +
      '<label class="f"><span>Note</span><textarea class="inp" name="note" placeholder="Orari, piano, come prenotare…">' + esc(c.note || '') + '</textarea></label>' +
      '<button class="btn block" type="submit">' + IC.check + 'Salva contatto</button></form>';
    sheet(nuovo ? 'Nuovo contatto' : 'Modifica contatto', h, function (s) {
      $('#fCo', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target), rec = { id: c.id || uid(), fonte: c.fonte || 'manuale', demo: c.demo || false };
        ['nome', 'tipo', 'specialita', 'tel', 'tel2', 'whatsapp', 'email', 'indirizzo', 'web', 'note'].forEach(function (k) { rec[k] = String(f.get(k) || '').trim(); });
        if (!rec.nome) { toast('Scrivi almeno il nome'); return; }
        if (nuovo) D.contatti.push(rec); else D.contatti = D.contatti.map(function (x) { return x.id === rec.id ? rec : x; });
        save(); chiudiSheet(); toast('Contatto salvato ✓'); if (dopo) dopo(rec); ridisegna();
      });
    });
  }
  function trovaContatto(email, tels) {
    email = (email || '').toLowerCase();
    var t = (tels || []).map(telPulito);
    return D.contatti.filter(function (c) {
      return (email && (c.email || '').toLowerCase() === email) || t.some(function (x) { return x && (telPulito(c.tel) === x || telPulito(c.tel2) === x); });
    })[0];
  }

  // ---------------------------------------------------------
  // FARMACI e allarmi
  // ---------------------------------------------------------
  var GIORNI_UI = [[1, 'L'], [2, 'M'], [3, 'M'], [4, 'G'], [5, 'V'], [6, 'S'], [0, 'D']];
  function farmaco(id) { return D.farmaci.filter(function (f) { return f.id === id; })[0]; }
  function attivoIl(f, g) {
    if (f.sospeso) return false;
    if (f.inizio && g < f.inizio) return false;
    if (f.fine && g > f.fine) return false;
    if (f.giorni && f.giorni.length && f.giorni.indexOf(parseYmd(g).getDay()) < 0) return false;
    return true;
  }
  function dosiDelGiorno(g) {
    var out = [];
    D.farmaci.forEach(function (f) {
      if (!attivoIl(f, g)) return;
      (f.orari || []).forEach(function (o) { out.push({ f: f, ora: o, data: g, key: f.id + '|' + g + '|' + o }); });
    });
    return out.sort(function (a, b) { return a.ora.localeCompare(b.ora); });
  }
  function doseHtml(d) {
    var st = D.assunzioni[d.key], now = new Date(), t = at(d.data, d.ora);
    var ora = !st && now >= t && now - t < 3 * 36e5;
    var badge = st ? (st.s === 'presa' ? '<span class="tag ok">' + IC.check.replace('<svg', '<svg style="width:13px;height:13px"') + 'presa ' + hm(new Date(st.at)) + '</span>' : '<span class="tag grey">saltata</span>')
      : ora ? '<button class="btn sm acc" data-act="presa" data-key="' + d.key + '">Presa</button>' : (now > t ? '<button class="btn sm ghost" data-act="presa" data-key="' + d.key + '">Presa?</button>' : '<span class="tag">' + IC.bell.replace('<svg', '<svg style="width:13px;height:13px"') + allarmeNome(d.f.allarme) + '</span>');
    return '<div class="dose' + (st && st.s === 'presa' ? ' presa' : '') + (ora ? ' ora' : '') + '"><div class="t">' + d.ora + '</div><div class="pill">' + IC.pill + '</div><div class="grow"><h3 class="ellipsis">' + esc(d.f.nome) + '</h3><p class="small muted ellipsis" style="margin:1px 0 0">' + esc([d.f.dose, d.f.istruzioni].filter(Boolean).join(' · ')) + '</p></div>' + badge + '</div>';
  }
  function allarmeNome(a) { return a === 'notifica' ? 'notifica' : a === 'banner' ? 'banner' : 'schermo intero'; }
  VIEWS.farmaci = function (v) {
    var oggi = ymd(new Date()), dosi = dosiDelGiorno(oggi);
    var prese = dosi.filter(function (d) { return D.assunzioni[d.key] && D.assunzioni[d.key].s === 'presa'; }).length;
    var h = '<div class="page-head"><div><h1>Farmaci</h1><p>Come, quando e quanto</p></div><button class="iconbtn" data-act="icsFarmaci" title="Promemoria nel calendario del telefono">' + IC.down + '</button></div>';
    if (dosi.length) {
      h += '<div class="card" style="padding:14px 16px"><div class="row"><div class="grow"><h3>Oggi</h3><p class="small muted" style="margin:2px 0 0">' + prese + ' di ' + dosi.length + ' assunzioni fatte</p></div><b style="font-size:24px;color:var(--pri)">' + Math.round(prese / dosi.length * 100) + '%</b></div>' +
        '<div style="height:8px;background:var(--pri-l);border-radius:5px;margin-top:10px;overflow:hidden"><div style="height:100%;width:' + (prese / dosi.length * 100) + '%;background:var(--pri);border-radius:5px"></div></div></div>' + dosi.map(doseHtml).join('');
    }
    h += '<div class="section-title"><h2>I miei farmaci</h2><span class="muted small">' + D.farmaci.length + '</span></div>';
    if (!D.farmaci.length) h += '<div class="card flat empty"><div class="big" style="color:var(--acc)">' + IC.pill.replace('<svg', '<svg style="width:70px;height:70px;stroke-width:1.4"') + '</div>Nessun farmaco inserito.<br><span class="small muted">Aggiungilo con + e ti ricorderò quando prenderlo.</span></div>';
    D.farmaci.forEach(function (f) {
      var basse = f.scorte != null && f.scorte !== '' && +f.scorte <= +(f.soglia || 0);
      h += '<div class="item" data-act="modFarmaco" data-id="' + f.id + '"><div class="pill">' + IC.pill + '</div><div class="grow"><h3 class="ellipsis">' + esc(f.nome) + (f.sospeso ? ' <span class="tag grey">sospeso</span>' : '') + '</h3><p class="ellipsis">' + esc(f.dose || '') + ' · ' + (f.orari || []).join(', ') +
        (f.giorni && f.giorni.length ? ' · ' + GIORNI_UI.filter(function (g) { return f.giorni.indexOf(g[0]) >= 0; }).map(function (g) { return GG[g[0]]; }).join(' ') : '') + '</p>' +
        (f.scorte != null && f.scorte !== '' ? '<p class="small" style="color:' + (basse ? 'var(--danger)' : 'var(--ink2)') + '">' + (basse ? '⚠ ' : '') + 'Scorte: ' + f.scorte + '</p>' : '') + '</div>' + IC.right.replace('<svg', '<svg style="width:20px;color:var(--muted);flex:none"') + '</div>';
    });
    h += '<p class="disclaimer">Gli allarmi suonano quando Cartellina è aperta o in background sul telefono. Per avere il promemoria anche ad app chiusa, tocca ' + IC.down.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"') + ' in alto e aggiungilo al calendario del telefono.</p>';
    h += '<button class="fab" data-act="nuovoFarmaco" aria-label="Nuovo farmaco">' + IC.plus + '</button>';
    v.innerHTML = h;
  };
  ACT.nuovoFarmaco = function () { formFarmaco({}); };
  ACT.modFarmaco = function (el) { formFarmaco(farmaco(el.dataset.id)); };
  function formFarmaco(f) {
    f = f || {};
    var nuovo = !f.id;
    var orari = (f.orari && f.orari.length ? f.orari : ['08:00']).slice();
    var giorni = (f.giorni || []).slice();
    var allarme = f.allarme || D.imp.allarme || 'schermo';
    var h = '<form id="fFa"><label class="f"><span>Nome del farmaco</span><div class="row"><input class="inp grow" name="nome" required placeholder="Es. Cardioaspirin 100 mg" value="' + esc(f.nome || '') + '"><button type="button" class="iconbtn" id="faInfo" title="Cos\'è?">' + IC.book + '</button></div></label>' +
      '<div class="two"><label class="f"><span>Quanto per volta</span><input class="inp" name="dose" placeholder="Es. 1 compressa, 20 gocce" value="' + esc(f.dose || '') + '"></label>' +
      '<label class="f"><span>Unità tolte dalle scorte</span><input class="inp" name="perDose" type="number" min="0" step="0.5" value="' + esc(f.perDose != null ? f.perDose : 1) + '"></label></div>' +
      '<label class="f"><span>Orari</span></label><div class="times" id="faOrari"></div><button type="button" class="btn sec sm" id="faAddOra" style="margin:8px 0 14px">' + IC.plus + 'Aggiungi orario</button>' +
      '<label class="f"><span>Giorni (nessuno selezionato = tutti i giorni)</span></label><div class="days" id="faGiorni">' + GIORNI_UI.map(function (g) { return '<button type="button" data-g="' + g[0] + '" class="' + (giorni.indexOf(g[0]) >= 0 ? 'on' : '') + '">' + g[1] + '</button>'; }).join('') + '</div>' +
      '<div class="two" style="margin-top:12px"><label class="f"><span>Dal</span><input class="inp" type="date" name="inizio" value="' + esc(f.inizio || ymd(new Date())) + '"></label><label class="f"><span>Al (vuoto = sempre)</span><input class="inp" type="date" name="fine" value="' + esc(f.fine || '') + '"></label></div>' +
      '<label class="f"><span>Come prenderlo</span><input class="inp" name="istruzioni" list="istrList" placeholder="Es. a stomaco pieno" value="' + esc(f.istruzioni || '') + '"><datalist id="istrList"><option>a stomaco pieno</option><option>a stomaco vuoto</option><option>lontano dai pasti</option><option>prima di dormire</option><option>con un bicchiere d\'acqua</option><option>sotto la lingua</option><option>al bisogno</option></datalist></label>' +
      '<label class="f"><span>Tipo di allarme</span></label><div class="seg" id="faAll"><button type="button" data-a="schermo">Schermo intero</button><button type="button" data-a="notifica">Notifica</button><button type="button" data-a="banner">Banner</button></div>' +
      '<div class="two" style="margin-top:12px"><label class="f"><span>Scorte (unità rimaste)</span><input class="inp" name="scorte" type="number" min="0" placeholder="Es. 28" value="' + esc(f.scorte != null ? f.scorte : '') + '"></label><label class="f"><span>Avvisami sotto</span><input class="inp" name="soglia" type="number" min="0" value="' + esc(f.soglia != null ? f.soglia : 5) + '"></label></div>' +
      '<label class="f"><span>Note (chi l\'ha prescritto, piano terapeutico…)</span><textarea class="inp" name="note">' + esc(f.note || '') + '</textarea></label>' +
      (nuovo ? '' : '<label class="toggle"><span><b>Sospeso</b><br><span class="small muted">Nessun allarme finché è sospeso</span></span><span class="switch"><input type="checkbox" name="sospeso"' + (f.sospeso ? ' checked' : '') + '><i></i></span></label>') +
      '<button class="btn block" type="submit" style="margin-top:10px">' + IC.check + 'Salva farmaco</button>' +
      '<div class="btns" style="margin-top:8px"><button type="button" class="btn ghost" id="faProva">' + IC.bell + 'Prova allarme</button>' + (nuovo ? '' : '<button type="button" class="btn danger" id="faDel">' + IC.trash + 'Elimina</button>') + '</div></form>';
    sheet(nuovo ? 'Nuovo farmaco' : esc(f.nome), h, function (s) {
      function disegnaOrari() {
        $('#faOrari', s).innerHTML = orari.map(function (o, i) { return '<span class="tm"><input class="inp" type="time" value="' + o + '" data-i="' + i + '">' + (orari.length > 1 ? '<button type="button" data-rm="' + i + '">×</button>' : '') + '</span>'; }).join('');
      }
      disegnaOrari();
      $('#faOrari', s).addEventListener('change', function (ev) { if (ev.target.dataset.i != null) orari[+ev.target.dataset.i] = ev.target.value; });
      $('#faOrari', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-rm]'); if (b) { orari.splice(+b.dataset.rm, 1); disegnaOrari(); } });
      $('#faAddOra', s).addEventListener('click', function () { orari.push(orari.length ? (pad((+orari[orari.length - 1].slice(0, 2) + 8) % 24) + ':00') : '08:00'); disegnaOrari(); });
      $('#faGiorni', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-g]'); if (!b) return; b.classList.toggle('on'); });
      function segAll() { $$('#faAll button', s).forEach(function (b) { b.classList.toggle('on', b.dataset.a === allarme); }); }
      segAll();
      $('#faAll', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-a]'); if (b) { allarme = b.dataset.a; segAll(); } });
      $('#faInfo', s).addEventListener('click', function () { var n = $('[name=nome]', s).value.trim(); if (!n) { toast('Scrivi prima il nome'); return; } spiegaTermine(n.split(/\s+\d/)[0], true); });
      $('#faProva', s).addEventListener('click', function () {
        var nome = $('[name=nome]', s).value.trim() || 'Farmaco di prova';
        lanciaAllarme({ f: { id: 'prova', nome: nome, dose: $('[name=dose]', s).value, istruzioni: $('[name=istruzioni]', s).value, allarme: allarme }, ora: hm(new Date()), data: ymd(new Date()), key: 'prova|' + Date.now() }, true);
      });
      if (!nuovo) $('#faDel', s).addEventListener('click', function () {
        if (!confirm('Eliminare ' + f.nome + '?')) return;
        D.farmaci = D.farmaci.filter(function (x) { return x.id !== f.id; }); save(); chiudiSheet(); ridisegna(); toast('Farmaco eliminato');
      });
      $('#fFa', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(ev.target);
        var rec = {
          id: f.id || uid(), nome: fd.get('nome').trim(), dose: fd.get('dose').trim(), perDose: +fd.get('perDose') || 0,
          orari: orari.filter(Boolean).sort().filter(function (x, i, a) { return a.indexOf(x) === i; }),
          giorni: $$('#faGiorni button.on', s).map(function (b) { return +b.dataset.g; }),
          inizio: fd.get('inizio'), fine: fd.get('fine'), istruzioni: fd.get('istruzioni').trim(), allarme: allarme,
          scorte: fd.get('scorte') === '' ? null : +fd.get('scorte'), soglia: +fd.get('soglia') || 0, note: fd.get('note').trim(),
          sospeso: !!fd.get('sospeso'), creato: f.creato || Date.now()
        };
        if (!rec.orari.length) { toast('Aggiungi almeno un orario'); return; }
        if (nuovo) D.farmaci.push(rec); else D.farmaci = D.farmaci.map(function (x) { return x.id === rec.id ? rec : x; });
        save(); chiudiSheet(); ridisegna(); toast('Farmaco salvato ✓');
        if (allarme !== 'banner') chiediNotifiche();
      });
    });
  }

  // --- suono e vibrazione ---
  var audioCtx = null, suonoTimer = null;
  function sbloccaAudio() {
    try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { /* no audio */ }
  }
  function nota(freq, t0, dur) {
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function suona() {
    fermaSuono();
    var giro = function () {
      if (D.imp.suono && audioCtx) { var t = audioCtx.currentTime; nota(880, t, 0.35); nota(1175, t + 0.22, 0.4); nota(1568, t + 0.46, 0.55); }
      if (D.imp.vibra && navigator.vibrate) navigator.vibrate([400, 150, 400]);
    };
    sbloccaAudio(); giro(); suonoTimer = setInterval(giro, 2200);
  }
  function fermaSuono() { if (suonoTimer) clearInterval(suonoTimer); suonoTimer = null; if (navigator.vibrate) navigator.vibrate(0); }

  // --- notifiche di sistema ---
  function chiediNotifiche() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    Notification.requestPermission().then(function (p) { if (p === 'granted') toast('Notifiche attivate ✓'); });
  }
  function notificaSistema(titolo, testo, dati, azioni) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    var opz = { body: testo, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: (dati && dati.key) || ('c' + Date.now()), data: dati || {}, requireInteraction: !!azioni, vibrate: [300, 120, 300] };
    if (azioni) opz.actions = azioni;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (r) { r.showNotification(titolo, opz); }).catch(function () {});
    } else { try { new Notification(titolo, opz); } catch (e) { return false; } }
    return true;
  }

  // --- allarme ---
  var codaAllarmi = [], allarmeAperto = null;
  function lanciaAllarme(d, prova) {
    var tipo = d.f.allarme || 'schermo';
    var testo = [d.f.dose, d.f.istruzioni].filter(Boolean).join(' · ') || 'È il momento di prenderlo';
    var azioni = [{ action: 'presa', title: '✓ Presa' }, { action: 'rimanda', title: 'Rimanda 10 min' }];
    if (tipo === 'notifica') {
      if (!notificaSistema('💊 ' + d.f.nome + ' · ' + d.ora, testo, { tipo: 'dose', key: d.key }, azioni)) mostraBannerDose(d, testo);
      else if (!document.hidden) mostraBannerDose(d, testo);
      return;
    }
    if (document.hidden) notificaSistema('💊 ' + d.f.nome + ' · ' + d.ora, testo, { tipo: 'dose', key: d.key }, azioni);
    if (tipo === 'banner') { mostraBannerDose(d, testo); return; }
    codaAllarmi.push({ d: d, prova: prova });
    if (!allarmeAperto) prossimoAllarme();
  }
  function mostraBannerDose(d, testo) {
    if ($('.banner[data-key="' + d.key + '"]')) return;
    var b = banner('<div class="pill">' + IC.pill + '</div><div class="grow"><b>' + esc(d.f.nome) + ' · ' + d.ora + '</b><span class="small muted">' + esc(testo) + '</span></div><button class="btn sm" data-b="presa">Presa</button><button class="btn sm ghost" data-b="rimanda">10′</button>',
      function (a) { azioneDose(d.key, a); });
    b.dataset.key = d.key;
    if (D.imp.vibra && navigator.vibrate) navigator.vibrate([300, 120, 300]);
    if (D.imp.suono && audioCtx) { var t = audioCtx.currentTime; nota(880, t, 0.3); nota(1175, t + 0.2, 0.4); }
  }
  function prossimoAllarme() {
    var x = codaAllarmi.shift();
    if (!x) { allarmeAperto = null; return; }
    var d = x.d;
    var el = document.createElement('div');
    el.className = 'alarm'; el.setAttribute('role', 'alertdialog');
    el.innerHTML = '<div class="ring">' + IC.pill + '</div><div class="clock">' + d.ora + '</div><h1>' + esc(d.f.nome) + '</h1><p>' + esc(d.f.dose || 'È il momento del farmaco') + '</p>' +
      (d.f.istruzioni ? '<div class="note">' + esc(d.f.istruzioni) + '</div>' : '') + (x.prova ? '<div class="note">Allarme di prova</div>' : '') +
      '<div class="acts"><button class="go" data-a="presa">✓ L\'ho preso</button><button class="later" data-a="rimanda">Rimanda di 10 minuti</button><button class="skip" data-a="saltata">Salta questa dose</button></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      fermaSuono(); el.remove();
      if (!x.prova) azioneDose(d.key, b.dataset.a); else toast('Così suonerà il promemoria ✓');
      prossimoAllarme();
    });
    document.body.appendChild(el);
    allarmeAperto = el;
    suona();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) { /* no */ }
  }
  function azioneDose(key, a) {
    var p = key.split('|'), f = farmaco(p[0]);
    if (a === 'rimanda') { D.rinvii[key] = Date.now() + 10 * 60000; save(); toast('Te lo ricordo tra 10 minuti'); return; }
    if (D.assunzioni[key]) return;
    D.assunzioni[key] = { s: a === 'presa' ? 'presa' : 'saltata', at: Date.now() };
    if (a === 'presa' && f && f.scorte != null) {
      f.scorte = Math.max(0, +f.scorte - (f.perDose != null ? +f.perDose : 1));
      if (f.scorte <= (f.soglia || 0)) setTimeout(function () { toast('⚠ ' + f.nome + ': restano ' + f.scorte + ' unità, ricordati la ricetta', 4500); }, 600);
    }
    save();
    $$('.banner[data-key="' + key + '"]').forEach(function (b) { b.remove(); });
    if (location.hash.indexOf('farmaci') >= 0 || location.hash === '' || location.hash.indexOf('home') >= 0) ridisegna();
    if (a === 'presa') toast('Segnato come preso ✓');
  }
  ACT.presa = function (el) { azioneDose(el.dataset.key, 'presa'); };

  // --- promemoria appuntamenti ---
  function controllaEventi(now) {
    if (!D.imp.promEventi) return;
    D.eventi.forEach(function (e) {
      var inizio = at(e.data, e.ora || '08:00');
      if (inizio < now) return;
      var vigilia = at(e.data, '00:00'); vigilia.setDate(vigilia.getDate() - 1); vigilia.setHours(18, 0, 0, 0);
      var due = new Date(inizio.getTime() - 2 * 36e5);
      var portare = (e.portare || []).filter(function (p) { return !p.ok; }).map(function (p) { return p.t; });
      [['vigilia', vigilia, 'Domani'], ['2h', due, 'Tra poco']].forEach(function (x) {
        var k = e.id + '|' + x[0];
        if (now >= x[1] && !D.notificati[k] && !(x[0] === '2h' && !e.ora)) {
          D.notificati[k] = Date.now(); save();
          var titolo = x[2] + ': ' + (e.titolo || e.tipo) + (e.ora ? ' alle ' + e.ora : '');
          var testo = (e.luogo ? e.luogo + '. ' : '') + (portare.length ? 'Porta: ' + portare.join(', ') : '');
          notificaSistema('🗓 ' + titolo, testo, { tipo: 'evento', id: e.id });
          if (!document.hidden) banner('<div class="ticon" style="background:' + COL[e.tipo] + '">' + IC[e.tipo] + '</div><div class="grow"><b>' + esc(titolo) + '</b><span class="small muted">' + esc(testo) + '</span></div><button class="btn sm sec" data-b="apri">Apri</button><button class="btn sm ghost" data-b="ok">OK</button>',
            function (a) { if (a === 'apri') apriEvento(e.id); }, 30000);
        }
      });
    });
  }

  var scattati = {};
  function tick() {
    var now = new Date();
    [ymd(now), ymd(new Date(now.getTime() - 3 * 36e5))].filter(function (x, i, a) { return a.indexOf(x) === i; }).forEach(function (g) {
      dosiDelGiorno(g).forEach(function (d) {
        if (D.assunzioni[d.key]) return;
        var t = at(d.data, d.ora);
        if (now < t || now - t > 3 * 36e5) return;
        var r = D.rinvii[d.key];
        if (r && now.getTime() < r) return;
        var sig = d.key + '|' + (r || 0);
        if (scattati[sig]) return; // una volta per sessione: se chiudi l'app senza rispondere, riapparirà alla riapertura
        scattati[sig] = 1;
        lanciaAllarme(d);
      });
    });
    controllaEventi(now);
  }

  // ---------------------------------------------------------
  // EMAIL
  // ---------------------------------------------------------
  var mailTab = '';
  function listaEmail(stato) {
    return Object.keys(D.email).map(function (k) { return D.email[k]; }).filter(function (m) { return m.stato === stato; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }
  VIEWS.email = function (v) {
    var n = { verifica: listaEmail('verifica').length, sanitaria: listaEmail('sanitaria').length, scartata: listaEmail('scartata').length };
    if (!mailTab) mailTab = n.verifica ? 'verifica' : 'sanitaria';
    var coll = !!D.imp.gmailUrl;
    var h = '<div class="page-head"><div><h1>Email sanitarie</h1><p>Trovate e lette per te</p></div>' + (coll ? '<button class="iconbtn" data-act="controllaEmail" title="Controlla ora">' + IC.refresh + '</button>' : '') + '</div>';
    h += '<div class="card" style="padding:13px 15px"><div class="status-line"><i class="' + (coll && !D.imp.erroreGmail ? 'on' : '') + '"></i><span class="grow">' +
      (coll ? (D.imp.erroreGmail ? '<b style="color:var(--danger)">Problema: ' + esc(D.imp.erroreGmail) + '</b>' : 'Gmail collegata · ultimo controllo ' + (D.imp.ultimoControllo ? fmtTs(D.imp.ultimoControllo) : 'mai')) : 'Email non collegata') +
      '</span>' + (coll ? '' : '<button class="btn sm" data-act="go" data-to="#/impostazioni">Collega</button>') + '</div>' +
      '<div class="btns" style="margin-top:12px"><button class="btn sec sm" data-act="incollaEmail">' + IC.plus + 'Analizza un\'email</button>' + (!Object.keys(D.email).length ? '<button class="btn ghost sm" data-act="demo">' + IC.spark + 'Email di prova</button>' : '') + '</div></div>';
    h += '<div class="chips"><button class="chip' + (mailTab === 'verifica' ? ' on' : '') + '" data-act="mailTab" data-t="verifica">Da verificare<span class="n">' + n.verifica + '</span></button>' +
      '<button class="chip' + (mailTab === 'sanitaria' ? ' on' : '') + '" data-act="mailTab" data-t="sanitaria">Sanitarie<span class="n">' + n.sanitaria + '</span></button>' +
      '<button class="chip' + (mailTab === 'scartata' ? ' on' : '') + '" data-act="mailTab" data-t="scartata">Non sanitarie<span class="n">' + n.scartata + '</span></button></div>';
    var lst = listaEmail(mailTab);
    if (mailTab === 'verifica' && lst.length) h += '<p class="small muted" style="margin:0 2px 10px">Non sono sicura al 100%: dimmi tu. Imparo il mittente e la prossima volta decido da sola.</p>';
    if (mailTab === 'scartata' && lst.length) h += '<p class="small muted" style="margin:0 2px 10px">Nessun segnale sanitario. Se una è sanitaria, aprila e segnalalo: non la perderemo.</p>';
    h += lst.length ? lst.map(mailCard).join('') : '<div class="card flat empty small">' + (mailTab === 'verifica' ? 'Nessuna email in dubbio 👍' : 'Nessuna email qui.') + '</div>';
    v.innerHTML = h;
    D.imp.emailViste = Date.now(); save();
  };
  function mailCard(m) {
    var d = new Date(m.date);
    return '<div class="mail" data-act="apriEmail" data-id="' + esc(m.id) + '"><div class="row"><span class="from grow ellipsis">' + esc(String(m.from).replace(/<.*>/, '').replace(/"/g, '') || m.from) + '</span><span class="small muted">' + d.getDate() + ' ' + MM[d.getMonth()] + '</span></div>' +
      '<h3>' + esc(m.subject || '(senza oggetto)') + '</h3><div class="why">' + esc((m.motivi || []).slice(0, 2).join(' · ')) + '</div>' +
      (m.stato === 'verifica' ? '<div class="act"><button class="btn sm" data-act="confermaEmail" data-id="' + esc(m.id) + '">' + IC.check + 'Sì, sanitaria</button><button class="btn sm ghost" data-act="rifiutaEmail" data-id="' + esc(m.id) + '">No</button></div>' : '') +
      (m.stato === 'sanitaria' && m.estratto ? '<div class="row wrap" style="gap:6px;margin-top:8px">' + (m.estratto.eventi || []).map(function (e) { return '<span class="tag" style="background:' + COL[e.tipo] + '1f;color:' + COL[e.tipo] + '">' + (e.aggiunto ? '✓ ' : '') + fmtData(e.data) + (e.ora ? ' ' + e.ora : '') + '</span>'; }).join('') + (m.contattoId ? '<span class="tag grey">✓ rubrica</span>' : '') + '</div>' : '') + '</div>';
  }
  ACT.mailTab = function (el) { mailTab = el.dataset.t; ridisegna(); };
  ACT.controllaEmail = function () { controllaEmail(true); };

  // elabora una serie di email arrivate (da Gmail, incollate o di prova)
  function elabora(lista, fonte) {
    var stat = { sanitarie: 0, verifica: 0, eventi: 0, contatti: 0, nuove: 0, primo: null };
    lista.forEach(function (e) {
      if (!e || !e.id || D.email[e.id]) return;
      var c = Classificatore.classifica(e, D.regole);
      var rec = { id: e.id, from: e.from || '', subject: e.subject || '', date: e.date || new Date().toISOString(), body: String(e.body || '').slice(0, 8000), labels: e.labels || [], attachments: e.attachments || [],
        stato: c.stato, punteggio: c.punteggio, motivi: c.motivi, fonte: fonte, arrivata: Date.now(), demo: /^demo-/.test(e.id) };
      D.email[rec.id] = rec; stat.nuove++;
      if (!stat.primo) stat.primo = rec.id;
      if (rec.stato === 'sanitaria') { stat.sanitarie++; var r = acquisisci(rec); stat.eventi += r.eventi; stat.contatti += r.contatti; }
      else if (rec.stato === 'verifica') stat.verifica++;
    });
    save();
    return stat;
  }
  function tipoContattoDa(rec) {
    var s = Classificatore.norm(rec.from + ' ' + rec.subject);
    if (/laborator|analisi|prelievi/.test(s)) return 'Centro esami';
    if (/diagnostic|radiolog|imaging|risonanza/.test(s)) return 'Diagnostica';
    if (/ospedal|asst|asl|ats|aulss|usl|policlinic|irccs|clinica|aou|azienda/.test(s)) return 'Ospedale';
    if (/farmac/.test(s)) return 'Farmacia';
    if (/dott|dr\.|medico|studio/.test(s)) return 'Medico';
    return 'Altro';
  }
  // estrae appuntamenti e contatti da un'email sanitaria
  function acquisisci(rec) {
    var x = Classificatore.estrai(rec, new Date());
    var out = { eventi: 0, contatti: 0 };
    var c = trovaContatto(x.mittente.email, x.telefoni);
    if (!c && (x.mittente.email || x.telefoni.length)) {
      c = { id: uid(), nome: x.mittente.nome.replace(/^(info|noreply|no-reply|prenotazioni|segreteria)\s*/i, '') || x.mittente.email || (x.luogo.presso || '').split(',')[0] || 'Contatto da: ' + (rec.subject || 'email'), tipo: tipoContattoDa({ from: rec.from + ' ' + (x.luogo.presso || ''), subject: rec.subject }), specialita: '',
        tel: x.telefoni[0] || '', tel2: x.telefoni[1] || '', whatsapp: '', email: x.mittente.email || x.emails[0] || '', indirizzo: x.luogo.indirizzo || '', web: '', note: 'Aggiunto dall\'email: ' + rec.subject, fonte: 'email', demo: rec.demo };
      D.contatti.push(c); out.contatti++;
    } else if (c) {
      if (!c.tel && x.telefoni[0]) c.tel = x.telefoni[0];
      if (!c.indirizzo && x.luogo.indirizzo) c.indirizzo = x.luogo.indirizzo;
    }
    rec.contattoId = c ? c.id : '';
    x.eventi.forEach(function (ev) {
      var gia = D.eventi.filter(function (e) { return e.data === ev.data && (e.ora || '') === (ev.ora || '') && (e.emailId === rec.id || e.tipo === ev.tipo); })[0];
      if (gia) { ev.aggiunto = gia.id; return; }
      if (!(ev.certo && D.imp.autoEventi)) return;
      var note = [x.prenotazione ? 'Codice prenotazione: ' + x.prenotazione : '', 'Da email: ' + rec.subject].filter(Boolean).join('\n');
      var nuovo = { id: uid(), tipo: ev.tipo, titolo: ev.titolo, data: ev.data, ora: ev.ora, luogo: ev.luogo || (c ? c.nome : ''), indirizzo: ev.indirizzo || (c ? c.indirizzo : ''),
        contattoId: c ? c.id : '', portare: x.portare.map(function (p) { return { t: p, ok: false }; }), note: note, fonte: 'email', emailId: rec.id, demo: rec.demo, creato: Date.now() };
      D.eventi.push(nuovo); ev.aggiunto = nuovo.id; out.eventi++;
    });
    rec.estratto = x;
    return out;
  }

  // ---- collegamento Gmail ----
  var inControllo = false;
  function urlScript(extra) {
    var u = new URL(D.imp.gmailUrl);
    u.searchParams.set('token', D.imp.token || '');
    Object.keys(extra || {}).forEach(function (k) { u.searchParams.set(k, extra[k]); });
    return u.toString();
  }
  function controllaEmail(manuale) {
    if (!D.imp.gmailUrl) { if (manuale) toast('Collega prima la tua email in Impostazioni'); return Promise.resolve(); }
    if (inControllo || !navigator.onLine) return Promise.resolve();
    inControllo = true;
    if (manuale) toast('Controllo le email…');
    return fetch(urlScript({ giorni: D.imp.giorni || 7 }))
      .then(function (r) { if (!r.ok) throw new Error('il server ha risposto ' + r.status); return r.json(); })
      .then(function (j) {
        if (j.error) throw new Error(j.error === 'token' ? 'codice segreto sbagliato' : j.error);
        var s = elabora(j.emails || [], 'gmail');
        D.imp.ultimoControllo = Date.now(); D.imp.erroreGmail = ''; save();
        avvisaNuove(s, manuale);
        if (/email|home|altro/.test(location.hash) || !location.hash) ridisegna(); else aggiornaBadge();
      })
      .catch(function (e) {
        D.imp.erroreGmail = String(e.message || e).replace('Failed to fetch', 'collegamento non raggiungibile'); save();
        if (manuale) toast('Errore: ' + D.imp.erroreGmail, 4000);
        if (/email/.test(location.hash)) ridisegna();
      })
      .then(function () { inControllo = false; });
  }
  function avvisaNuove(s, manuale) {
    if (!s.nuove) { if (manuale) toast('Nessuna email nuova'); return; }
    var parti = [];
    if (s.sanitarie) parti.push(s.sanitarie + ' sanitari' + (s.sanitarie > 1 ? 'e' : 'a'));
    if (s.verifica) parti.push(s.verifica + ' da verificare');
    if (!parti.length) { if (manuale) toast('Nessuna email sanitaria nuova'); return; }
    var extra = s.eventi ? ' · ' + s.eventi + ' appuntament' + (s.eventi > 1 ? 'i' : 'o') + ' in agenda' : '';
    toast('📩 ' + parti.join(', ') + extra, 4000);
    notificaSistema('📩 Cartellina: ' + parti.join(', '), s.eventi ? 'Ho aggiunto ' + s.eventi + ' appuntament' + (s.eventi > 1 ? 'i' : 'o') + ' al calendario.' : 'Tocca per vedere', { tipo: 'email' });
  }
  function avvisaScript(params) {
    if (!D.imp.gmailUrl) return;
    fetch(urlScript(params)).catch(function () {});
  }
  function syncRegole() { avvisaScript({ azione: 'regole', fidati: D.regole.fidati.join(','), bloccati: D.regole.bloccati.join(',') }); }
  function mittente(m) { var x = String(m.from).match(/<([^>]+)>/); return (x ? x[1] : m.from).trim().toLowerCase(); }

  ACT.confermaEmail = function (el) { confermaEmail(el.dataset.id); };
  function confermaEmail(id) {
    var m = D.email[id]; if (!m) return;
    m.stato = 'sanitaria'; m.motivi = ['Confermata da te'].concat(m.motivi || []); m.arrivata = Date.now();
    var a = mittente(m), extra = 0;
    if (D.imp.impara && a && D.regole.fidati.indexOf(a) < 0) {
      D.regole.fidati.push(a);
      D.regole.bloccati = D.regole.bloccati.filter(function (b) { return b !== a; });
      // altre email in dubbio dallo stesso mittente
      listaEmail('verifica').forEach(function (o) { if (mittente(o) === a) { o.stato = 'sanitaria'; o.motivi = ['Mittente confermato da te']; acquisisci(o); extra++; } });
      syncRegole();
    }
    var r = acquisisci(m);
    if (!m.demo) avvisaScript({ azione: 'etichetta', id: m.id, stato: 'sanitaria' });
    save(); chiudiSheet(true); ridisegna();
    toast('✓ Segnata come sanitaria' + (r.eventi ? ' · ' + r.eventi + ' in agenda' : '') + (extra ? ' · altre ' + extra + ' dallo stesso mittente' : ''), 3500);
  }
  ACT.rifiutaEmail = function (el) { rifiutaEmail(el.dataset.id, false); };
  ACT.bloccaMittente = function (el) { rifiutaEmail(el.dataset.id, true); };
  function rifiutaEmail(id, sempre) {
    var m = D.email[id]; if (!m) return;
    var auto = D.eventi.filter(function (e) { return e.emailId === id && e.fonte === 'email'; });
    if (m.stato === 'sanitaria' && auto.length && !confirm('Tolgo anche ' + auto.length + ' appuntament' + (auto.length > 1 ? 'i aggiunti' : 'o aggiunto') + ' da questa email?')) return;
    D.eventi = D.eventi.filter(function (e) { return !(e.emailId === id && e.fonte === 'email'); });
    m.stato = 'scartata'; m.motivi = ['Indicata da te come non sanitaria']; delete m.estratto;
    var a = mittente(m);
    D.regole.fidati = D.regole.fidati.filter(function (f) { return f !== a; });
    if (sempre && a && D.regole.bloccati.indexOf(a) < 0) D.regole.bloccati.push(a);
    if (sempre || m.labels) syncRegole();
    if (!m.demo) avvisaScript({ azione: 'etichetta', id: m.id, stato: 'scartata' });
    save(); chiudiSheet(true); ridisegna(); toast(sempre ? 'Non leggerò più le email di ' + a : 'Ok, non è sanitaria');
  }
  ACT.recuperaEmail = function (el) {
    var m = D.email[el.dataset.id]; if (!m) return;
    D.regole.bloccati = D.regole.bloccati.filter(function (b) { return b !== mittente(m); });
    m.stato = 'verifica'; confermaEmail(m.id);
  };

  ACT.apriEmail = function (el) { apriEmail(el.dataset.id); };
  function apriEmail(id) {
    var m = D.email[id]; if (!m) return;
    var d = new Date(m.date);
    var colSt = { sanitaria: 'ok', verifica: 'acc', scartata: 'grey' }[m.stato];
    var nomeSt = { sanitaria: 'Sanitaria', verifica: 'Da verificare', scartata: 'Non sanitaria' }[m.stato];
    var h = '<p class="small" style="margin:0 0 6px"><b>' + esc(m.from) + '</b><br><span class="muted">' + d.getDate() + ' ' + MML[d.getMonth()] + ' ' + d.getFullYear() + ', ' + hm(d) + '</span></p>' +
      '<div class="row wrap" style="gap:6px;margin-bottom:10px"><span class="tag ' + colSt + '">' + nomeSt + '</span>' + (m.motivi || []).slice(0, 4).map(function (x) { return '<span class="tag grey">' + esc(x) + '</span>'; }).join('') + '</div>';
    if (m.stato === 'sanitaria') {
      var x = m.estratto || {};
      h += '<h3 style="margin:12px 0 8px">Cosa ho trovato</h3>';
      (x.eventi || []).forEach(function (ev, i) {
        h += '<div class="found"><div class="row"><div class="ticon" style="background:' + COL[ev.tipo] + ';width:36px;height:36px">' + IC[ev.tipo] + '</div><div class="grow"><b>' + esc(ev.titolo) + '</b><br><span class="small" style="text-transform:capitalize">' + fmtLunga(ev.data) + (ev.ora ? ' · ore ' + ev.ora : ' · <i>orario non trovato</i>') + '</span>' + (ev.luogo || ev.indirizzo ? '<br><span class="small muted">' + esc(ev.luogo || ev.indirizzo) + '</span>' : '') + '</div>' +
          (ev.aggiunto && evento(ev.aggiunto) ? '<button class="btn sm sec" data-act="apriEvento" data-id="' + ev.aggiunto + '">✓ In agenda</button>' : '<button class="btn sm" data-act="aggEvDaEmail" data-id="' + esc(m.id) + '" data-i="' + i + '">' + IC.plus + 'Agenda</button>') + '</div></div>';
      });
      if (!(x.eventi || []).length) h += '<p class="small muted" style="margin:0 0 8px">Nessuna data futura di appuntamento nel testo.</p>';
      var c = contatto(m.contattoId);
      if (c) h += '<div class="found" data-act="apriContatto" data-id="' + c.id + '" style="cursor:pointer"><span class="small muted">In rubrica</span><br><b>' + esc(c.nome) + '</b><div class="quick" style="margin-top:8px">' + qaHtml(c) + '</div></div>';
      if ((x.telefoni || []).length) h += '<div class="quick" style="margin-bottom:8px">' + x.telefoni.map(function (t) { return '<a class="qa call" href="tel:' + esc(t) + '">' + IC.phone + esc(t) + '</a>'; }).join('') + '</div>';
      if (x.prenotazione || x.nre) h += '<div class="found small">' + (x.prenotazione ? 'Codice prenotazione: <b>' + esc(x.prenotazione) + '</b> <button class="linkbtn" data-act="copia" data-t="' + esc(x.prenotazione) + '">copia</button><br>' : '') + (x.nre ? 'NRE ricetta: <b>' + esc(x.nre) + '</b> <button class="linkbtn" data-act="copia" data-t="' + esc(x.nre) + '">copia</button>' : '') + '</div>';
      if ((x.portare || []).length) h += '<div class="found small"><b>Da portare:</b> ' + x.portare.map(esc).join(' · ') + '</div>';
    }
    h += '<h3 style="margin:14px 0 6px">Testo <span class="small muted" style="font-weight:600">— tocca le parole evidenziate</span></h3><div class="mailbody">' + evidenzia(m.body || '') + '</div>';
    h += '<div class="btns" style="margin-top:14px">';
    if (m.stato === 'verifica') h += '<button class="btn" data-act="confermaEmail" data-id="' + esc(m.id) + '">' + IC.check + 'È sanitaria</button><button class="btn ghost" data-act="rifiutaEmail" data-id="' + esc(m.id) + '">Non lo è</button>';
    if (m.stato === 'sanitaria') h += '<button class="btn ghost" data-act="rifiutaEmail" data-id="' + esc(m.id) + '">Non è sanitaria</button>';
    if (m.stato === 'scartata') h += '<button class="btn" data-act="recuperaEmail" data-id="' + esc(m.id) + '">' + IC.check + 'In realtà è sanitaria</button>';
    h += '</div>';
    if (m.stato !== 'sanitaria') h += '<button class="btn danger block sm" style="margin-top:8px" data-act="bloccaMittente" data-id="' + esc(m.id) + '">Ignora sempre questo mittente</button>';
    sheet(esc(m.subject || '(senza oggetto)'), h);
  }
  ACT.aggEvDaEmail = function (el) {
    var m = D.email[el.dataset.id], ev = m.estratto.eventi[+el.dataset.i], x = m.estratto, c = contatto(m.contattoId);
    formEvento({ tipo: ev.tipo, titolo: ev.titolo, data: ev.data, ora: ev.ora, luogo: ev.luogo || (c ? c.nome : ''), indirizzo: ev.indirizzo || (c ? c.indirizzo : ''), contattoId: m.contattoId,
      portare: (x.portare || []).map(function (p) { return { t: p, ok: false }; }), note: (x.prenotazione ? 'Codice prenotazione: ' + x.prenotazione + '\n' : '') + 'Da email: ' + m.subject, fonte: 'email', emailId: m.id, demo: m.demo },
      function (rec) { ev.aggiunto = rec.id; save(); chiudiSheet(true); });
  };
  ACT.copia = function (el) { navigator.clipboard && navigator.clipboard.writeText(el.dataset.t).then(function () { toast('Copiato ✓'); }); };
  ACT.incollaEmail = function () {
    sheet('Analizza un\'email', '<p class="small muted" style="margin-top:0">Hai una email su un altro servizio (Libero, Outlook, PEC…)? Copia e incolla qui il testo: la leggo e trovo date e contatti.</p>' +
      '<form id="fIn"><label class="f"><span>Mittente (facoltativo)</span><input class="inp" name="from" placeholder="es. cup@asst-…it"></label><label class="f"><span>Oggetto</span><input class="inp" name="subject"></label>' +
      '<label class="f"><span>Testo dell\'email</span><textarea class="inp" name="body" required style="min-height:160px"></textarea></label><button class="btn block" type="submit">' + IC.search + 'Analizza</button></form>', function (s) {
      $('#fIn', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target), id = 'man-' + uid();
        elabora([{ id: id, from: f.get('from'), subject: f.get('subject'), body: f.get('body'), date: new Date().toISOString(), labels: [] }], 'incollata');
        chiudiSheet(); mailTab = D.email[id].stato; if (location.hash !== '#/email') location.hash = '#/email'; else ridisegna();
        setTimeout(function () { apriEmail(id); }, 80);
      });
    });
  };
  ACT.demo = function () {
    if (D.email['demo-1']) { toast('Le email di prova sono già caricate'); location.hash = '#/email'; return; }
    var s = elabora(EMAIL_ESEMPIO, 'prova');
    mailTab = 'sanitaria';
    toast('Ho letto 8 email di prova: ' + s.sanitarie + ' sanitarie, ' + s.verifica + ' da verificare, ' + s.eventi + ' appuntamenti in agenda', 5000);
    if (location.hash === '#/email') ridisegna(); else location.hash = '#/email';
  };

  // ---------------------------------------------------------
  // GLOSSARIO
  // ---------------------------------------------------------
  var GL = GLOSSARIO.map(function (g, i) { g.i = i; g.nomi = [g.t].concat(g.a || []); return g; });
  var reGl = (function () {
    var sigle = [], parole = [];
    GL.forEach(function (g) {
      g.nomi.forEach(function (n) {
        if (n.length < 2) return;
        var e = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        if (n === n.toUpperCase() && /[A-Z]/.test(n) && n.length <= 6) sigle.push(e); else parole.push(e);
      });
    });
    var ord = function (a, b) { return b.length - a.length; };
    var b1 = '(^|[^A-Za-zÀ-ÿ0-9])(', b2 = ')(?=$|[^A-Za-zÀ-ÿ0-9])';
    return { s: new RegExp(b1 + sigle.sort(ord).join('|') + b2, 'g'), p: new RegExp(b1 + parole.sort(ord).join('|') + b2, 'gi') };
  })();
  function trovaVoce(parola) {
    var n = Classificatore.norm(parola).replace(/\s+/g, ' ');
    return GL.filter(function (g) { return g.nomi.some(function (x) { return Classificatore.norm(x) === n; }); })[0];
  }
  // evidenzia nel testo i termini del glossario
  function evidenzia(testo) {
    var t = String(testo), ranges = [];
    [reGl.s, reGl.p].forEach(function (re) {
      re.lastIndex = 0; var m;
      while ((m = re.exec(t))) {
        var s = m.index + m[1].length, e = s + m[2].length;
        if (!ranges.some(function (r) { return s < r.e && e > r.s; })) { var v = trovaVoce(m[2]); if (v) ranges.push({ s: s, e: e, i: v.i }); }
        if (re.lastIndex === m.index) re.lastIndex++;
      }
    });
    ranges.sort(function (a, b) { return a.s - b.s; });
    var out = '', pos = 0;
    ranges.forEach(function (r) { out += esc(t.slice(pos, r.s)) + '<mark class="term" data-act="voce" data-i="' + r.i + '">' + esc(t.slice(r.s, r.e)) + '</mark>'; pos = r.e; });
    return out + esc(t.slice(pos));
  }
  ACT.voce = function (el) { mostraVoce(GL[+el.dataset.i]); };
  function voceHtml(g, aperta) {
    return '<div class="term"><h3>' + esc(g.t) + ' <span class="tag grey">' + g.c + '</span></h3>' + (g.a && g.a.length ? '<div class="al">Anche: ' + g.a.map(esc).join(', ') + '</div>' : '') + '<p>' + esc(g.d) + '</p>' +
      (aperta ? '' : '<button class="linkbtn small" style="margin-top:8px" data-act="online" data-q="' + esc(g.t) + '">Approfondisci online ›</button>') + '</div>';
  }
  function mostraVoce(g) {
    sheet(esc(g.t), voceHtml(g, true) + '<p class="src">Fonte: glossario di Cartellina (spiegazione divulgativa).</p><div id="onl"></div>', function (s) { cercaOnline(g.t, $('#onl', s)); });
  }
  function spiegaTermine(q, farmaco) {
    var v = trovaVoce(q);
    if (v) { mostraVoce(v); return; }
    sheet(esc(q), '<div id="onl"></div>', function (s) { cercaOnline(q, $('#onl', s), farmaco); });
  }
  ACT.online = function (el) { spiegaTermine(el.dataset.q); };

  // ricerca su database esterni: Wikipedia (it/en) e classificazione ICD-10
  function wiki(lang, q) {
    var base = 'https://' + lang + '.wikipedia.org';
    return fetch(base + '/w/api.php?action=query&list=search&srlimit=3&format=json&origin=*&srsearch=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var res = (j.query && j.query.search) || [];
        if (!res.length) return null;
        return fetch(base + '/api/rest_v1/page/summary/' + encodeURIComponent(res[0].title.replace(/ /g, '_')))
          .then(function (r) { return r.json(); })
          .then(function (s) { return { lang: lang, titolo: s.title, testo: s.extract, url: s.content_urls && s.content_urls.mobile ? s.content_urls.mobile.page : base + '/wiki/' + encodeURIComponent(res[0].title), altri: res.slice(1).map(function (x) { return x.title; }) }; });
      }).catch(function () { return null; });
  }
  function icd(q) {
    return fetch('https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&maxList=6&terms=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); }).then(function (j) { return (j && j[3]) || []; }).catch(function () { return []; });
  }
  function cercaOnline(q, box, farmaco) {
    if (!navigator.onLine) { box.innerHTML = '<p class="small muted">Sei offline: la ricerca nei database online non è disponibile.</p>'; return; }
    box.innerHTML = '<p class="small muted"><span class="spinner"></span> Cerco nei database…</p>';
    var codice = /^[A-TV-Z]\d{2}(\.\w{1,4})?$/i.test(q.trim());
    Promise.all([codice ? Promise.resolve(null) : wiki('it', q), icd(q)]).then(function (r) {
      var w = r[0], cod = r[1];
      var p = w || codice ? Promise.resolve(w) : wiki('en', q);
      return p.then(function (w2) { return [w2, cod]; });
    }).then(function (r) {
      var w = r[0], cod = r[1], h = '';
      if (w && w.testo) {
        h += '<div class="term"><h3>' + esc(w.titolo) + ' <span class="tag grey">Wikipedia ' + w.lang.toUpperCase() + '</span></h3><p>' + esc(w.testo) + '</p>' +
          (w.altri.length ? '<div class="al">Non è questo? ' + w.altri.map(function (a) { return '<button class="linkbtn small" data-act="online" data-q="' + esc(a) + '">' + esc(a) + '</button>'; }).join(' · ') + '</div>' : '') +
          '<p class="src"><a href="' + esc(w.url) + '" target="_blank" rel="noopener">Leggi su Wikipedia ›</a></p></div>';
      }
      if (cod.length) {
        h += '<div class="term"><h3>Classificazione ICD-10 <span class="tag grey">NIH · in inglese</span></h3><p class="small">Codici internazionali delle malattie usati su referti e certificati:</p>' +
          cod.map(function (c) { return '<p class="small" style="margin:4px 0 0"><b>' + esc(c[0]) + '</b> — ' + esc(c[1]) + '</p>'; }).join('') + '</div>';
      }
      if (!h) h = '<p class="small muted">Non ho trovato risultati nei database. Prova con un\'altra parola o usa i link qui sotto.</p>';
      var g = function (site) { return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' site:' + site); };
      h += '<h3 style="margin:14px 0 8px">Approfondisci su fonti sanitarie</h3><div class="quick">' +
        '<a class="qa web" target="_blank" rel="noopener" href="' + g('msdmanuals.com/it') + '">' + IC.book + 'Manuale MSD</a>' +
        '<a class="qa web" target="_blank" rel="noopener" href="' + g('issalute.it') + '">' + IC.book + 'ISSalute (ISS)</a>' +
        '<a class="qa web" target="_blank" rel="noopener" href="' + g('humanitas.it') + '">' + IC.book + 'Humanitas</a>' +
        (farmaco ? '<a class="qa map" target="_blank" rel="noopener" href="' + g('medicinali.aifa.gov.it') + '">' + IC.pill + 'Bugiardino AIFA</a>' : '') + '</div>' +
        '<p class="src">Le informazioni servono a capire: per la tua situazione chiedi al medico.</p>';
      box.innerHTML = h;
    });
  }

  var glQ = '', glCat = '';
  VIEWS.glossario = function (v) {
    var cats = ['Burocrazia', 'Diagnostica', 'Esami', 'Termini medici', 'Farmaci'];
    var h = '<div class="page-head"><div><h1>Cosa significa?</h1><p>Termini medici, esami e burocrazia</p></div></div>' +
      '<div class="search" style="margin-bottom:10px">' + IC.search + '<input class="inp" id="glQ" placeholder="Es. impegnativa, TAC, PCR, stenosi…" value="' + esc(glQ) + '" autocomplete="off"></div>' +
      '<div class="chips"><button class="chip' + (!glCat ? ' on' : '') + '" data-act="glCat" data-c="">Tutti</button>' + cats.map(function (c) { return '<button class="chip' + (glCat === c ? ' on' : '') + '" data-act="glCat" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
      '<button class="btn sec block" data-act="spiegaTesto" style="margin-bottom:12px">' + IC.spark + 'Spiegami un referto o una lettera</button><div id="glList"></div>';
    v.innerHTML = h;
    var inp = $('#glQ');
    inp.addEventListener('input', function () { glQ = inp.value; listaGlossario(); });
    listaGlossario();
  };
  function listaGlossario() {
    var q = Classificatore.norm(glQ.trim());
    var lst = GL.filter(function (g) {
      if (glCat && g.c !== glCat) return false;
      if (!q) return true;
      return g.nomi.some(function (n) { return Classificatore.norm(n).indexOf(q) >= 0; }) || Classificatore.norm(g.d).indexOf(q) >= 0;
    });
    if (q) lst.sort(function (a, b) {
      var sa = a.nomi.some(function (n) { return Classificatore.norm(n).indexOf(q) === 0; }) ? 0 : 1, sb = b.nomi.some(function (n) { return Classificatore.norm(n).indexOf(q) === 0; }) ? 0 : 1;
      return sa - sb;
    }); else lst.sort(function (a, b) { return a.t.localeCompare(b.t); });
    var h = lst.slice(0, 80).map(function (g) { return voceHtml(g); }).join('');
    if (q) h = '<div class="card flat" style="padding:12px"><div class="row"><div class="grow small">' + (lst.length ? lst.length + ' nel glossario.' : 'Non è nel glossario.') + ' Cerco <b>"' + esc(glQ.trim()) + '"</b> nei database online?</div><button class="btn sm" data-act="online" data-q="' + esc(glQ.trim()) + '">' + IC.web + 'Cerca</button></div></div>' + h;
    $('#glList').innerHTML = h || '<div class="card flat empty small">Nessuna voce.</div>';
  }
  ACT.glCat = function (el) { glCat = el.dataset.c; ridisegna(); };
  ACT.spiegaTesto = function () {
    sheet('Spiegami un testo', '<p class="small muted" style="margin-top:0">Incolla un referto, una lettera di dimissione o una prescrizione: evidenzio le parole difficili, toccale per la spiegazione.</p><textarea class="inp" id="stT" style="min-height:150px" placeholder="Incolla qui il testo…"></textarea><button class="btn block" id="stGo" style="margin-top:10px">' + IC.spark + 'Spiega</button><div id="stOut" style="margin-top:14px"></div>', function (s) {
      $('#stGo', s).addEventListener('click', function () {
        var t = $('#stT', s).value.trim(); if (!t) return;
        var html = evidenzia(t), n = (html.match(/<mark/g) || []).length;
        $('#stOut', s).innerHTML = '<p class="small"><b>' + n + '</b> termini trovati.</p><div class="mailbody" style="max-height:none">' + html + '</div>';
      });
    });
  };

  // ---------------------------------------------------------
  // TRASPORTI E AIUTO
  // ---------------------------------------------------------
  var trRis = null, trStato = '';
  VIEWS.trasporti = function (v) {
    var citta = D.imp.citta || '';
    var h = '<div class="page-head"><div><h1>Trasporto e aiuto</h1><p>Emergenze, ambulanze, associazioni</p></div></div>' +
      '<div class="emerg"><a href="tel:112" style="background:linear-gradient(135deg,#ef5b6a,#c9364a)"><b>112</b>Emergenza</a><a href="tel:118" style="background:linear-gradient(135deg,#f0913a,#d9701a)"><b>118</b>Ambulanza</a><a href="tel:116117" style="background:linear-gradient(135deg,#4c7df0,#3159c9)"><b>116117</b>Guardia medica</a></div>' +
      '<p class="small muted" style="margin:8px 2px 0">112/118 per le emergenze. Il 116117 (guardia medica e servizi non urgenti) è attivo in molte regioni, non ancora in tutte.</p>' +
      '<div class="section-title"><h2>Trasporto per chi non può muoversi</h2></div>' +
      '<div class="card"><p class="small" style="margin:0 0 10px">Cerco ambulanze, Croce Rossa, Pubbliche Assistenze, Misericordie, AUSER e associazioni di trasporto vicino a te (dati OpenStreetMap).</p>' +
      '<div class="row"><input class="inp grow" id="trC" placeholder="Comune, es. Taino" value="' + esc(citta) + '"><button class="iconbtn" data-act="trGps" title="Usa la mia posizione">' + IC.locate + '</button></div>' +
      '<button class="btn block" data-act="trCerca" style="margin-top:10px">' + IC.search + 'Cerca vicino</button></div>' +
      '<div id="trOut">' + (trStato || (trRis ? risTrasporti() : '')) + '</div>' +
      '<div class="section-title"><h2>A chi chiedere</h2></div>' +
      infoCard(IC.Intervento, '#e0475b', 'Trasporto sanitario dell\'ASL', 'Per dialisi, chemioterapia, radioterapia o per chi non cammina, il trasporto può essere a carico del Servizio Sanitario. Chiedi al medico di famiglia o al reparto la richiesta di trasporto e contatta il distretto ASL/ASST.') +
      infoCard(IC.user, '#4c7df0', 'Servizi sociali del Comune', 'Molti comuni hanno un servizio di trasporto sociale (spesso con volontari) per visite ed esami di anziani e persone fragili. Chiama l\'ufficio servizi sociali del tuo comune.', mapsCerca('servizi sociali comune ' + (citta || ''))) +
      infoCard(IC.van, '#f0913a', 'Associazioni di volontariato', 'Croce Rossa, ANPAS (Pubbliche Assistenze, Croce Verde, Croce Bianca), Misericordie e AUSER offrono trasporti programmati, a volte con un piccolo rimborso spese.', mapsCerca('Croce Rossa ' + (citta || 'vicino a me'))) +
      '<div class="quick" style="margin-top:4px">' + ['Croce Rossa', 'Croce Verde', 'Pubblica Assistenza', 'Misericordia', 'AUSER', 'trasporto disabili', 'taxi sociale'].map(function (q) { return '<a class="qa map" target="_blank" rel="noopener" href="' + esc(mapsCerca(q + ' ' + (citta || 'vicino a me'))) + '">' + IC.map + q + '</a>'; }).join('') + '</div>' +
      '<p class="disclaimer">Verifica sempre numeri e orari chiamando la struttura: i dati delle mappe sono inseriti da volontari e possono non essere aggiornati.</p>';
    v.innerHTML = h;
  };
  function infoCard(ic, col, t, d, link) {
    return '<div class="card"><div class="row" style="align-items:flex-start"><div class="ticon" style="background:' + col + '">' + ic + '</div><div class="grow"><h3>' + t + '</h3><p class="small" style="margin:4px 0 0;color:var(--ink2)">' + d + '</p>' +
      (link ? '<a class="qa map" style="margin-top:10px" target="_blank" rel="noopener" href="' + esc(link) + '">' + IC.map + 'Cerca sulla mappa</a>' : '') + '</div></div></div>';
  }
  function dist(a, b, c, d) { var R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; var h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) * Math.sin(y / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
  function cercaTrasporti(lat, lon) {
    trStato = '<div class="card flat small"><span class="spinner"></span> Cerco nel raggio di 20 km…</div>'; trRis = null;
    var out = $('#trOut'); if (out) out.innerHTML = trStato;
    var R = 20000, nomi = 'croce rossa|croce verde|croce bianca|croce azzurra|croce gialla|misericordia|pubblica assistenza|anpas|auser|volontari|soccorso|ambulanz|trasporto|cri ';
    var q = '[out:json][timeout:30];(' +
      'nwr["emergency"="ambulance_station"](around:' + R + ',' + lat + ',' + lon + ');' +
      'nwr["amenity"="ambulance_station"](around:' + R + ',' + lat + ',' + lon + ');' +
      'nwr["name"~"' + nomi + '",i](around:' + R + ',' + lat + ',' + lon + ');' +
      ');out center tags 80;';
    fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var visti = {};
        trRis = (j.elements || []).map(function (e) {
          var t = e.tags || {}, la = e.lat || (e.center && e.center.lat), lo = e.lon || (e.center && e.center.lon);
          var indir = [t['addr:street'] ? t['addr:street'] + (t['addr:housenumber'] ? ' ' + t['addr:housenumber'] : '') : '', t['addr:city'] || ''].filter(Boolean).join(', ');
          return { nome: t.name || t.operator || 'Postazione ambulanze', tel: t.phone || t['contact:phone'] || '', email: t.email || t['contact:email'] || '', web: t.website || t['contact:website'] || '',
            indirizzo: indir, lat: la, lon: lo, km: la ? dist(lat, lon, la, lo) : 99, amb: t.emergency === 'ambulance_station' || t.amenity === 'ambulance_station' };
        }).filter(function (x) {
          if (/negozio|bar|ristorante|pizzeria|hotel|via |piazza /i.test(x.nome) && !x.amb) return false;
          var k = Classificatore.norm(x.nome) + Math.round(x.km * 10); if (visti[k]) return false; visti[k] = 1; return true;
        }).sort(function (a, b) { return a.km - b.km; }).slice(0, 30);
        trStato = '';
        var o = $('#trOut'); if (o) o.innerHTML = risTrasporti();
      })
      .catch(function () { trStato = '<div class="card flat small">Il servizio mappe non risponde ora. Riprova tra poco o usa i pulsanti di ricerca qui sotto.</div>'; var o = $('#trOut'); if (o) o.innerHTML = trStato; });
  }
  function risTrasporti() {
    if (!trRis) return '';
    if (!trRis.length) return '<div class="card flat small">Nessuna struttura trovata nelle mappe in questa zona. Usa i pulsanti qui sotto per cercare su Google Maps.</div>';
    return '<div class="section-title"><h2>Trovati vicino</h2><span class="muted small">' + trRis.length + '</span></div>' + trRis.map(function (x, i) {
      return '<div class="card" style="padding:13px"><div class="row"><div class="ticon" style="background:#f0913a">' + IC.van + '</div><div class="grow"><h3>' + esc(x.nome) + '</h3><p class="small muted" style="margin:1px 0 0">' + (x.km < 99 ? x.km.toFixed(1) + ' km' : '') + (x.indirizzo ? ' · ' + esc(x.indirizzo) : '') + '</p></div></div>' +
        '<div class="quick" style="margin-top:10px">' + (x.tel ? '<a class="qa call" href="tel:' + esc(telPulito(x.tel.split(/[;,]/)[0])) + '">' + IC.phone + esc(x.tel.split(/[;,]/)[0]) + '</a>' : '<a class="qa web" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(x.nome + ' ' + (x.indirizzo || D.imp.citta || '') + ' telefono') + '">' + IC.search + 'Trova numero</a>') +
        (x.lat ? '<a class="qa map" target="_blank" rel="noopener" href="' + esc(mapsDir(x.lat + ',' + x.lon)) + '">' + IC.route + 'Percorso</a>' : '') +
        (x.web ? '<a class="qa web" target="_blank" rel="noopener" href="' + esc(/^https?:/.test(x.web) ? x.web : 'https://' + x.web) + '">' + IC.web + 'Sito</a>' : '') +
        '<button class="qa web" data-act="trSalva" data-i="' + i + '">' + IC.plus + 'Rubrica</button></div></div>';
    }).join('');
  }
  ACT.trCerca = function () {
    var c = $('#trC').value.trim(); if (!c) { toast('Scrivi il comune o usa la posizione'); return; }
    D.imp.citta = c; save();
    trStato = '<div class="card flat small"><span class="spinner"></span> Cerco ' + esc(c) + '…</div>'; $('#trOut').innerHTML = trStato;
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=' + encodeURIComponent(c))
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.length) throw new Error('nf'); cercaTrasporti(+j[0].lat, +j[0].lon); })
      .catch(function () { trStato = '<div class="card flat small">Non trovo "' + esc(c) + '". Controlla il nome del comune.</div>'; $('#trOut').innerHTML = trStato; });
  };
  ACT.trGps = function () {
    if (!navigator.geolocation) { toast('Posizione non disponibile'); return; }
    toast('Cerco la tua posizione…');
    navigator.geolocation.getCurrentPosition(function (p) { cercaTrasporti(p.coords.latitude, p.coords.longitude); }, function () { toast('Non ho il permesso per la posizione: scrivi il comune'); }, { enableHighAccuracy: false, timeout: 15000 });
  };
  ACT.trSalva = function (el) {
    var x = trRis[+el.dataset.i];
    formContatto({ nome: x.nome, tipo: 'Trasporto / Associazione', tel: (x.tel || '').split(/[;,]/)[0], email: x.email, web: x.web, indirizzo: x.indirizzo || (x.lat ? x.lat + ',' + x.lon : '') });
  };

  // ---------------------------------------------------------
  // ALTRO e IMPOSTAZIONI
  // ---------------------------------------------------------
  VIEWS.altro = function (v) {
    var n = contaDaVedere();
    v.innerHTML = '<div class="page-head"><div><h1>Altro</h1></div></div><div class="menu">' +
      '<a href="#/email"><i style="background:var(--acc-l);color:var(--acc)">' + IC.mail + '</i><b>Email sanitarie</b><small>Lette e smistate per te</small>' + (n ? '<span class="dot">' + n + '</span>' : '') + '</a>' +
      '<a href="#/glossario"><i style="background:#fff3cf;color:#b07b00">' + IC.book + '</i><b>Cosa significa?</b><small>Glossario e database</small></a>' +
      '<a href="#/trasporti"><i style="background:var(--pri-l);color:var(--pri-d)">' + IC.van + '</i><b>Trasporto e aiuto</b><small>Ambulanze, associazioni</small></a>' +
      '<a href="#" data-act="ponte"><i style="background:#e8ecfb;color:#14244a">' + IC.spark + '</i><b>Collega le app</b><small>' + (window.Ponte && Ponte.attivo() ? 'AgendApp e Smistino collegate' : 'AgendApp e Smistino') + '</small></a>' +
      '<a href="#/impostazioni"><i style="background:#e9efed;color:var(--ink2)">' + IC.gear + '</i><b>Impostazioni</b><small>Email, allarmi, backup</small></a></div>' +
      '<div class="card" style="margin-top:14px"><h3>I tuoi dati restano tuoi</h3><p class="small muted" style="margin:6px 0 0">Tutto è salvato solo su questo telefono. Le email vengono lette dal tuo account Google con uno script che crei tu: nessun server esterno. Fai ogni tanto un backup dalle Impostazioni.</p></div>' +
      '<p class="disclaimer">Cartellina v' + ((window.AppUpdate && window.AppUpdate.current) || '1.0.0') + '</p>';
  };

  VIEWS.impostazioni = function (v) {
    var I = D.imp;
    var sw = function (k, t, d) { return '<label class="toggle"><span><b>' + t + '</b>' + (d ? '<br><span class="small muted">' + d + '</span>' : '') + '</span><span class="switch"><input type="checkbox" data-imp="' + k + '"' + (I[k] ? ' checked' : '') + '><i></i></span></label>'; };
    var notif = !('Notification' in window) ? 'non supportate' : Notification.permission === 'granted' ? 'attive ✓' : Notification.permission === 'denied' ? 'bloccate (sbloccale dalle impostazioni del browser)' : 'da attivare';
    var h = '<div class="page-head"><div><h1>Impostazioni</h1></div></div>' +
      '<div class="card"><label class="f" style="margin:0"><span>Il tuo nome (per il saluto)</span><input class="inp" data-impv="nome" value="' + esc(I.nome) + '" placeholder="Facoltativo"></label></div>' +
      // --- email ---
      '<div class="section-title"><h2>Collegamento email (Gmail)</h2></div><div class="card">' +
      '<div class="status-line" style="margin-bottom:12px"><i class="' + (I.gmailUrl && !I.erroreGmail ? 'on' : '') + '"></i>' + (I.gmailUrl ? (I.erroreGmail ? 'Problema: ' + esc(I.erroreGmail) : 'Collegata') : 'Non collegata') + '</div>' +
      '<details' + (I.gmailUrl ? '' : ' open') + '><summary style="font-weight:800;cursor:pointer;margin-bottom:10px">Come collegarla (5 minuti, una volta sola)</summary><ol class="steps">' +
      '<li>Dal computer apri <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> con il tuo account Gmail: si crea un progetto nuovo.</li>' +
      '<li>Cancella il testo che c\'è e incolla lo script qui sotto (tasto <b>Copia script</b>).</li>' +
      '<li>Alla riga <code>CODICE_SEGRETO</code> scrivi una parola segreta a tua scelta e salva (icona del dischetto).</li>' +
      '<li>In alto scegli la funzione <b>installa</b> e premi <b>Esegui</b>: Google ti chiede i permessi, accetta (è il tuo script). Da ora controlla le email ogni 5 minuti.</li>' +
      '<li>Premi <b>Esegui il deployment → Nuovo deployment</b>, tipo <b>App web</b>, "Esegui come: Me", "Chi può accedere: Chiunque". Copia l\'URL che finisce con <code>/exec</code>.</li>' +
      '<li>Incolla qui sotto l\'URL e la parola segreta, poi premi <b>Prova</b>.</li></ol>' +
      '<div class="btns" style="margin-bottom:12px"><button class="btn sec sm" data-act="copiaScript">' + IC.copy + 'Copia script</button><button class="btn ghost sm" data-act="vediScript">Vedi script</button></div></details>' +
      '<label class="f"><span>URL dello script (finisce con /exec)</span><input class="inp" data-impv="gmailUrl" value="' + esc(I.gmailUrl) + '" placeholder="https://script.google.com/macros/s/…/exec"></label>' +
      '<label class="f"><span>Parola segreta</span><input class="inp" data-impv="token" value="' + esc(I.token) + '" autocomplete="off"></label>' +
      '<div class="two"><label class="f"><span>Controlla ogni</span><select class="inp" data-impv="intervallo">' + [5, 10, 15, 30, 60].map(function (n) { return '<option value="' + n + '"' + (+I.intervallo === n ? ' selected' : '') + '>' + n + ' minuti</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>Guarda indietro</span><select class="inp" data-impv="giorni">' + [3, 7, 14, 30].map(function (n) { return '<option value="' + n + '"' + (+I.giorni === n ? ' selected' : '') + '>' + n + ' giorni</option>'; }).join('') + '</select></label></div>' +
      '<button class="btn block" data-act="provaGmail">' + IC.refresh + 'Prova e controlla ora</button>' +
      sw('autoEventi', 'Appuntamenti automatici', 'Segna in agenda le date trovate con certezza (giorno, ora e tipo)') +
      sw('impara', 'Impara i mittenti', 'Quando confermi un\'email, il mittente diventa fidato') + '</div>' +
      // --- mittenti ---
      '<div class="section-title"><h2>Mittenti</h2></div><div class="card">' + listaMittenti('fidati', 'Sempre sanitari') + '<div style="height:12px"></div>' + listaMittenti('bloccati', 'Mai sanitari') +
      '<div class="row" style="margin-top:12px"><input class="inp grow" id="nuovoFid" placeholder="Aggiungi indirizzo o dominio fidato (es. asst-settelaghi.it)"><button class="iconbtn" data-act="addFidato">' + IC.plus + '</button></div></div>' +
      // --- allarmi ---
      '<div class="section-title"><h2>Allarmi e promemoria</h2></div><div class="card">' +
      '<label class="f"><span>Allarme predefinito per i nuovi farmaci</span></label><div class="seg" id="segAll">' + [['schermo', 'Schermo intero'], ['notifica', 'Notifica'], ['banner', 'Banner']].map(function (a) { return '<button data-act="impAllarme" data-a="' + a[0] + '" class="' + (I.allarme === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      sw('suono', 'Suono') + sw('vibra', 'Vibrazione') + sw('promEventi', 'Promemoria appuntamenti', 'Il giorno prima alle 18 e 2 ore prima') +
      '<div class="toggle"><span><b>Notifiche</b><br><span class="small muted">' + notif + '</span></span>' + ('Notification' in window && Notification.permission === 'default' ? '<button class="btn sm" data-act="attivaNotifiche">Attiva</button>' : '') + '</div></div>' +
      // --- dati ---
      '<div class="section-title"><h2>I tuoi dati</h2></div><div class="card"><div class="btns"><button class="btn sec" data-act="backup">' + IC.down + 'Backup</button><button class="btn ghost" data-act="ripristina">' + IC.up + 'Ripristina</button></div>' +
      '<button class="btn ghost block" style="margin-top:8px" data-act="exportIcs">' + IC.cal + 'Esporta agenda nel calendario del telefono</button>' +
      (Object.keys(D.email).some(function (k) { return D.email[k].demo; }) ? '<button class="btn ghost block" style="margin-top:8px" data-act="togliDemo">Togli i dati di prova</button>' : '') +
      '<button class="btn danger block" style="margin-top:8px" data-act="cancellaTutto">' + IC.trash + 'Cancella tutti i dati</button></div>' +
      '<div class="card"><div class="row"><div class="grow"><b>Versione ' + ((window.AppUpdate && window.AppUpdate.current) || '1.0.0') + '</b><br><span class="small muted">Il tasto Aggiorna compare in alto quando c\'è una novità</span></div><button class="btn sm sec" data-act="checkUpd">Controlla</button></div></div>';
    v.innerHTML = h;
    $$('[data-imp]', v).forEach(function (el) { el.addEventListener('change', function () { D.imp[el.dataset.imp] = el.checked; save(); }); });
    $$('[data-impv]', v).forEach(function (el) {
      el.addEventListener('change', function () {
        var k = el.dataset.impv, val = el.value.trim();
        D.imp[k] = (k === 'intervallo' || k === 'giorni') ? +val : val;
        if (k === 'gmailUrl' || k === 'token') D.imp.erroreGmail = '';
        save(); if (k === 'intervallo') avviaPolling();
      });
    });
  };
  function listaMittenti(k, t) {
    var l = D.regole[k];
    return '<h3 style="margin-bottom:6px">' + t + ' <span class="muted small">' + l.length + '</span></h3>' + (l.length ? l.map(function (a) { return '<div class="toggle" style="padding:7px 0"><span class="small ellipsis">' + esc(a) + '</span><button class="linkbtn small" style="color:var(--danger)" data-act="togliMitt" data-k="' + k + '" data-a="' + esc(a) + '">Togli</button></div>'; }).join('') : '<p class="small muted" style="margin:0">Nessuno.</p>');
  }
  ACT.ponte = function () { if (window.Ponte) Ponte.apri(); };
  ACT.togliMitt = function (el) { D.regole[el.dataset.k] = D.regole[el.dataset.k].filter(function (a) { return a !== el.dataset.a; }); save(); syncRegole(); ridisegna(); };
  ACT.addFidato = function () { var a = $('#nuovoFid').value.trim().toLowerCase(); if (!a) return; if (D.regole.fidati.indexOf(a) < 0) D.regole.fidati.push(a); save(); syncRegole(); ridisegna(); toast('Aggiunto ✓'); };
  ACT.impAllarme = function (el) { D.imp.allarme = el.dataset.a; save(); $$('#segAll button').forEach(function (b) { b.classList.toggle('on', b === el); }); };
  ACT.attivaNotifiche = function () { Notification.requestPermission().then(function () { ridisegna(); }); };
  ACT.checkUpd = function () { if (window.AppUpdate) window.AppUpdate.check().then(function (n) { if (!n) toast('Hai già l\'ultima versione ✓'); }); };
  ACT.provaGmail = function () {
    $$('[data-impv]').forEach(function (el) { var k = el.dataset.impv; D.imp[k] = (k === 'intervallo' || k === 'giorni') ? +el.value : el.value.trim(); });
    D.imp.erroreGmail = ''; save();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(D.imp.gmailUrl)) { toast('L\'URL deve iniziare con https://script.google.com/', 3500); return; }
    chiediNotifiche();
    controllaEmail(true).then(function () { ridisegna(); if (!D.imp.erroreGmail) { syncRegole(); avviaPolling(); } });
  };
  var scriptTesto = null;
  function caricaScript() { return scriptTesto ? Promise.resolve(scriptTesto) : fetch('gmail/Codice.gs').then(function (r) { return r.text(); }).then(function (t) { scriptTesto = t; return t; }); }
  ACT.copiaScript = function () { caricaScript().then(function (t) { return navigator.clipboard.writeText(t); }).then(function () { toast('Script copiato ✓ — incollalo su script.google.com', 3500); }).catch(function () { ACT.vediScript(); }); };
  ACT.vediScript = function () { caricaScript().then(function (t) { sheet('Script per Gmail', '<p class="small muted" style="margin-top:0">Tieni premuto per selezionare e copiare.</p><pre class="code" style="max-height:60vh;user-select:text">' + esc(t) + '</pre>'); }); };

  // backup / ripristino / export
  function scarica(nome, testo, tipo) {
    var blob = new Blob([testo], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  ACT.backup = function () { scarica('cartellina-backup-' + ymd(new Date()) + '.json', JSON.stringify(D), 'application/json'); toast('Backup scaricato ✓'); };
  ACT.ripristina = function () {
    var i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = function () {
      var r = new FileReader();
      r.onload = function () {
        try { var x = JSON.parse(r.result); if (!x.eventi || !x.imp) throw 0; if (!confirm('Sostituire i dati attuali con il backup?')) return; localStorage.setItem(KEY, JSON.stringify(x)); D = load(); toast('Dati ripristinati ✓'); route(); }
        catch (e) { toast('File di backup non valido'); }
      };
      r.readAsText(i.files[0]);
    };
    i.click();
  };
  ACT.cancellaTutto = function () {
    if (!confirm('Cancellare TUTTI i dati di Cartellina da questo telefono?')) return;
    if (!confirm('Sicuro? Consiglio prima un backup. Confermi?')) return;
    localStorage.removeItem(KEY); D = load(); route(); toast('Dati cancellati');
  };
  ACT.togliDemo = function () {
    Object.keys(D.email).forEach(function (k) { if (D.email[k].demo) delete D.email[k]; });
    D.eventi = D.eventi.filter(function (e) { return !e.demo; });
    D.contatti = D.contatti.filter(function (c) { return !c.demo; });
    save(); route(); toast('Dati di prova rimossi');
  };

  // esportazione calendario .ics
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&'); }
  function icsDt(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function icsEvento(e) {
    var r = ['BEGIN:VEVENT', 'UID:' + e.id + '@cartellina', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'];
    if (e.ora) { var s = at(e.data, e.ora); r.push('DTSTART:' + icsDt(s), 'DTEND:' + icsDt(new Date(s.getTime() + 36e5))); }
    else { r.push('DTSTART;VALUE=DATE:' + e.data.replace(/-/g, '')); }
    r.push('SUMMARY:' + icsEsc((e.titolo || e.tipo)), 'LOCATION:' + icsEsc([e.luogo, e.indirizzo].filter(Boolean).join(', ')),
      'DESCRIPTION:' + icsEsc([e.note, (e.portare || []).length ? 'Da portare: ' + e.portare.map(function (p) { return p.t; }).join(', ') : ''].filter(Boolean).join('\n')),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.titolo), 'TRIGGER:-PT2H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.titolo), 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT');
    return r.join('\r\n');
  }
  function icsWrap(x) { return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cartellina//IT\r\nCALSCALE:GREGORIAN\r\n' + x.join('\r\n') + '\r\nEND:VCALENDAR'; }
  ACT.exportIcs = function () { var l = prossimiEventi(); if (!l.length) { toast('Nessun appuntamento futuro da esportare'); return; } scarica('cartellina-agenda.ics', icsWrap(l.map(icsEvento)), 'text/calendar'); toast('Aprilo per aggiungerlo al calendario ✓', 3500); };
  ACT.icsEvento = function (el) { var e = evento(el.dataset.id); scarica((e.titolo || 'appuntamento').replace(/\W+/g, '-') + '.ics', icsWrap([icsEvento(e)]), 'text/calendar'); };
  ACT.icsFarmaci = function () {
    var by = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' }, r = [];
    D.farmaci.filter(function (f) { return !f.sospeso; }).forEach(function (f) {
      f.orari.forEach(function (o) {
        var s = at(f.inizio || ymd(new Date()), o);
        var rr = 'RRULE:FREQ=' + (f.giorni && f.giorni.length ? 'WEEKLY;BYDAY=' + f.giorni.map(function (g) { return by[g]; }).join(',') : 'DAILY') + (f.fine ? ';UNTIL=' + f.fine.replace(/-/g, '') + 'T235959' : '');
        r.push(['BEGIN:VEVENT', 'UID:' + f.id + '-' + o.replace(':', '') + '@cartellina', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART:' + icsDt(s), 'DTEND:' + icsDt(new Date(s.getTime() + 10 * 60000)), rr,
          'SUMMARY:' + icsEsc('💊 ' + f.nome + (f.dose ? ' – ' + f.dose : '')), 'DESCRIPTION:' + icsEsc(f.istruzioni || ''), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(f.nome), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
      });
    });
    if (!r.length) { toast('Nessun farmaco attivo'); return; }
    scarica('cartellina-farmaci.ics', icsWrap(r), 'text/calendar'); toast('Aprilo per aggiungere i promemoria al calendario ✓', 3500);
  };

  // ---------------------------------------------------------
  // Ponte: collaborazione con AgendApp e Smistino
  // ---------------------------------------------------------
  function tipoDaTitolo(t) {
    var n = Classificatore.norm(t || '');
    if (/ricover|degenza/.test(n)) return 'Ricovero';
    if (/intervent|operazion|chirurg/.test(n)) return 'Intervento';
    if (/\btac\b|risonanz|\brm\b|ecograf|radiograf|\brx\b|mammograf|\bpet\b|scintigraf|densitometr|ecocardio|\becg\b|elettrocard|holter/.test(n)) return 'Diagnostica';
    if (/esam|analisi|prelie|sangue|urine|tampone/.test(n)) return 'Esame';
    if (/terapi|fisio|riabilit|seduta|infusion|chemio|dialisi|vaccin/.test(n)) return 'Terapia';
    if (/visit|control|dott|medic|special|consulto/.test(n)) return 'Visita';
    return 'Altro';
  }
  function pontePubblica() {
    var lim = ymd(new Date(Date.now() - 30 * 864e5)), eventi = [], mitt = [];
    D.eventi.forEach(function (e) {
      if (e.demo || e.fonte === 'agendapp' || !e.data || e.data < lim) return;
      var c = contatto(e.contattoId), porta = (e.portare || []).map(function (p) { return p.t; });
      eventi.push({ id: e.id, tipo: 'appuntamento', titolo: e.titolo || e.tipo, data: e.data, ora: e.ora || '', luogo: e.luogo || '', indirizzo: e.indirizzo || '', area: 'salute',
        note: [e.tipo, c ? c.nome + (c.tel ? ' · ' + c.tel : '') : '', porta.length ? 'Da portare: ' + porta.join(', ') : '', e.note].filter(Boolean).join('\n') });
    });
    var add = function (a) { a = String(a || '').trim().toLowerCase(); if (a && mitt.indexOf(a) < 0) mitt.push(a); };
    D.regole.fidati.forEach(add);
    D.contatti.forEach(function (c) { if (c.email && !c.demo) add(c.email); });
    return { eventi: eventi, mittenti: mitt };
  }
  function ponteRicevi(da, dati) {
    var n = 0, parti = [];
    if (da === 'smistino') {
      var lista = [];
      (dati.messaggi || []).forEach(function (m) {
        var id = m.gid || ('sm-' + m.id);
        if (!m.id || D.email[id] || Ponte.ignorato('smistino:' + m.id)) return;
        lista.push({ id: id, from: m.from || '', subject: m.subject || '', body: m.body || '', date: m.date, labels: m.labels || [], attachments: m.attachments || [] });
      });
      if (lista.length) {
        var st = elabora(lista, 'smistino');
        // Smistino l'ha già messa in Salute: se non sono sicura, la metto almeno da verificare
        lista.forEach(function (e) { var r = D.email[e.id]; if (r && r.stato === 'scartata') { r.stato = 'verifica'; r.motivi = ['Smistino l\'ha messa in Salute'].concat(r.motivi || []); st.verifica++; } });
        save();
        n += st.nuove;
        parti.push(st.nuove + ' email' + (st.sanitarie ? ', ' + st.sanitarie + ' sanitari' + (st.sanitarie > 1 ? 'e' : 'a') : '') + (st.verifica ? ', ' + st.verifica + ' da verificare' : '') + (st.eventi ? ', ' + st.eventi + ' in agenda' : ''));
      }
    }
    if (da === 'agendapp') {
      var lim = ymd(new Date(Date.now() - 30 * 864e5)), visti = {}, nuovi = 0, agg = 0;
      (dati.eventi || []).forEach(function (x) {
        if (!x || !x.id || !x.data || x.area !== 'salute') return;
        var u = 'agendapp:' + x.id; visti[u] = 1;
        if (Ponte.ignorato(u)) return;
        var e = D.eventi.filter(function (y) { return y.ponte === u; })[0];
        var v = { titolo: x.titolo || 'Appuntamento', data: x.data, ora: x.ora || '', luogo: x.luogo || '', note: x.note || '' };
        if (!e) {
          // già in agenda (es. arrivato da un'email)? allora è lo stesso
          if (D.eventi.some(function (y) { return y.data === x.data && (y.ora || '') === (x.ora || '') && y.fonte !== 'agendapp'; })) return;
          D.eventi.push({ id: uid(), tipo: tipoDaTitolo(x.titolo), titolo: v.titolo, data: v.data, ora: v.ora, luogo: v.luogo, indirizzo: '', contattoId: '', portare: [], note: v.note,
            fonte: 'agendapp', ponte: u, emailId: '', demo: false, creato: Date.now() });
          nuovi++;
        } else {
          var prima = JSON.stringify([e.titolo, e.data, e.ora, e.luogo, e.note]);
          e.titolo = v.titolo; e.data = v.data; e.ora = v.ora; e.luogo = v.luogo; e.note = v.note;
          if (prima !== JSON.stringify([e.titolo, e.data, e.ora, e.luogo, e.note])) agg++;
        }
      });
      var prima = D.eventi.length;
      D.eventi = D.eventi.filter(function (e) { return !(e.fonte === 'agendapp' && e.ponte && !visti[e.ponte] && e.data >= lim); });
      var tolti = prima - D.eventi.length;
      if (nuovi + agg + tolti) {
        save(); n += nuovi + agg + tolti;
        parti.push([nuovi ? nuovi + ' appuntament' + (nuovi === 1 ? 'o' : 'i') + ' in agenda' : '', agg ? agg + ' aggiornat' + (agg === 1 ? 'o' : 'i') : '', tolti ? tolti + ' tolt' + (tolti === 1 ? 'o' : 'i') : ''].filter(Boolean).join(', '));
      }
    }
    return { n: n, testo: parti.join(', ') };
  }
  function ponteScollega(da, prova) {
    if (da === 'agendapp') {
      var k = D.eventi.filter(function (e) { return e.fonte === 'agendapp'; }).length;
      if (!prova && k) { D.eventi = D.eventi.filter(function (e) { return e.fonte !== 'agendapp'; }); save(); }
      return k;
    }
    if (da === 'smistino') {
      var ids = Object.keys(D.email).filter(function (i) { return D.email[i].fonte === 'smistino'; });
      if (!prova && ids.length) { ids.forEach(function (i) { D.eventi = D.eventi.filter(function (e) { return e.emailId !== i; }); delete D.email[i]; }); save(); }
      return ids.length;
    }
    return 0;
  }
  function avviaPonte() {
    if (!window.Ponte) return;
    Ponte.init({
      app: 'cartellina', pubblica: pontePubblica, ricevi: ponteRicevi, scollega: ponteScollega, dopo: ridisegna, toast: toast,
      descr: {
        agendapp: 'Riceve visite, esami e interventi con orari e luogo. Gli impegni che metti in AgendApp nell\'area Salute arrivano qui.',
        smistino: 'Mi manda le email e i messaggi della sezione Salute, da tutte le tue caselle e chat. Io gli passo medici e ospedali della rubrica.'
      }
    });
  }

  // ---------------------------------------------------------
  // Avvio
  // ---------------------------------------------------------
  var pollTimer = null;
  function avviaPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () { controllaEmail(false); }, Math.max(5, +D.imp.intervallo || 10) * 60000);
  }
  function gestisciParametri() {
    var p = new URLSearchParams(location.search);
    if (p.get('dose')) {
      var k = p.get('dose'), a = p.get('azione');
      if (a === 'presa' || a === 'rimanda') azioneDose(k, a);
      else { var q = k.split('|'), f = farmaco(q[0]); if (f && !D.assunzioni[k]) setTimeout(function () { lanciaAllarme({ f: f, data: q[1], ora: q[2], key: k }); }, 400); }
    }
    if (p.get('evento')) setTimeout(function () { apriEvento(p.get('evento')); }, 300);
    if (p.get('vai')) location.hash = '#/' + p.get('vai');
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'dose') {
        if (d.azione === 'presa' || d.azione === 'rimanda') azioneDose(d.key, d.azione);
        else { var p = d.key.split('|'), f = farmaco(p[0]); if (f && !D.assunzioni[d.key]) lanciaAllarme({ f: f, data: p[1], ora: p[2], key: d.key }); }
      }
      if (d.type === 'evento' && d.id) apriEvento(d.id);
      if (d.type === 'email') location.hash = '#/email';
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { tick(); if (Date.now() - (D.imp.ultimoControllo || 0) > 3 * 60000) controllaEmail(false); }
  });
  window.addEventListener('online', function () { controllaEmail(false); });

  pulisci(false); save();
  gestisciParametri();
  route();
  avviaPonte();
  setInterval(tick, 15000);
  setTimeout(tick, 1500);
  avviaPolling();
  setTimeout(function () { controllaEmail(false); }, 3000);
})();
