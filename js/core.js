/* =========================================================
   Cartellina — nucleo: utilità, icone, dati, navigazione
   Tutti i moduli si appoggiano all'oggetto globale CA.
   ========================================================= */
var CA = (function () {
  'use strict';
  var A = {};

  // ---------- utilità ----------
  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  A.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  A.ymd = function (d) { return d.getFullYear() + '-' + A.pad(d.getMonth() + 1) + '-' + A.pad(d.getDate()); };
  A.oggi = function () { return A.ymd(new Date()); };
  A.parseYmd = function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  A.at = function (dataYmd, ora) { var d = A.parseYmd(dataYmd); if (ora) { var h = ora.split(':'); d.setHours(+h[0], +h[1], 0, 0); } return d; };
  A.hm = function (d) { return A.pad(d.getHours()) + ':' + A.pad(d.getMinutes()); };
  A.addGiorni = function (s, n) { var d = A.parseYmd(s); d.setDate(d.getDate() + n); return A.ymd(d); };
  A.GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  A.GGL = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  A.MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  A.MML = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  A.fmtData = function (s) { var d = A.parseYmd(s); return A.GG[d.getDay()] + ' ' + d.getDate() + ' ' + A.MM[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };
  A.fmtLunga = function (s) { var d = A.parseYmd(s); return A.GGL[d.getDay()] + ' ' + d.getDate() + ' ' + A.MML[d.getMonth()] + ' ' + d.getFullYear(); };
  A.fmtBreve = function (s) { var d = A.parseYmd(s); return d.getDate() + ' ' + A.MM[d.getMonth()] + ' ' + d.getFullYear(); };
  A.quando = function (s) {
    var diff = Math.round((A.parseYmd(s) - A.parseYmd(A.oggi())) / 864e5);
    if (diff === 0) return 'Oggi'; if (diff === 1) return 'Domani'; if (diff === -1) return 'Ieri';
    if (diff > 1 && diff < 7) return 'Tra ' + diff + ' giorni';
    return A.fmtData(s);
  };
  A.fmtTs = function (ts) { var d = new Date(ts); return d.getDate() + ' ' + A.MM[d.getMonth()] + ' ' + A.hm(d); };
  A.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
  A.norm = function (s) { return Classificatore.norm(s); };
  A.taglia = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  A.kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };

  // ---------- icone (tratto semplice, riconoscibili) ----------
  var I = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  A.IC = {
    home: I('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    mail: I('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>'),
    doc: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    cal: I('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    chat: I('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.7A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    left: I('<path d="m15 18-6-6 6-6"/>'),
    right: I('<path d="m9 18 6-6-6-6"/>'),
    check: I('<path d="M5 12.5 10 17l9-10"/>'),
    phone: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    wa: I('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/><path d="M9 9.5c.3 1.8 2.6 4.3 4.6 4.7l1-1"/>'),
    map: I('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    route: I('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>'),
    web: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    pill: I('<path d="M10.5 3.5a4.95 4.95 0 0 1 7 7l-7 7a4.95 4.95 0 0 1-7-7z"/><path d="M7 7l7 7"/>'),
    user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/>'),
    book: I('<path d="M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 1h12v-3"/><path d="M9 8h6"/>'),
    van: I('<path d="M2 16V7a1 1 0 0 1 1-1h11v10"/><path d="M14 9h4l4 4v3h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6M6 9v4M4 11h4"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    down: I('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    up: I('<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>'),
    refresh: I('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>'),
    bell: I('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>'),
    copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    locate: I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>'),
    spark: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    camera: I('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
    upload: I('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'),
    lock: I('<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    shield: I('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    clip: I('<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.6 8.5a2 2 0 0 1-2.8-2.8L15.5 7"/>'),
    alert: I('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    list: I('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    eye: I('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    help: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>'),
    // tipi di appuntamento
    Visita: I('<path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/>'),
    Esame: I('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5-10V3"/><path d="M7.5 15h9"/>'),
    Diagnostica: I('<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h3l1.5-3 2 6 1.5-3h2"/>'),
    Intervento: I('<path d="M12 3v18M3 12h18"/><rect x="4" y="4" width="16" height="16" rx="4"/>'),
    Ricovero: I('<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>'),
    Terapia: I('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
    Controllo: I('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
    Scadenza: I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'),
    Rinnovo: I('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9.5 15.5a3 3 0 1 0 1-3.5M9 11v2h2"/>'),
    Amministrativo: I('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    Altro: I('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>')
  };
  A.ico = function (k, size) { var s = A.IC[k] || A.IC.Altro; return size ? s.replace('<svg', '<svg style="width:' + size + 'px;height:' + size + 'px"') : s; };

  // tipi di impegno nel calendario
  A.TIPI = ['Visita', 'Esame', 'Diagnostica', 'Controllo', 'Terapia', 'Intervento', 'Ricovero', 'Scadenza', 'Rinnovo', 'Amministrativo', 'Altro'];
  A.NOME_TIPO = { Rinnovo: 'Rinnovo prescrizione', Amministrativo: 'Appuntamento amministrativo', Diagnostica: 'Esame diagnostico' };
  A.nomeTipo = function (t) { return A.NOME_TIPO[t] || t; };
  A.COL = { Visita: 'c1', Esame: 'c2', Diagnostica: 'c3', Controllo: 'c1', Terapia: 'c4', Intervento: 'c5', Ricovero: 'c6', Scadenza: 'c6', Rinnovo: 'c4', Amministrativo: 'c7', Altro: 'c7' };
  A.TIPI_C = ['Medico', 'Ospedale', 'Centro esami', 'Diagnostica', 'Farmacia', 'Trasporto / Associazione', 'Altro'];
  A.IC_C = { 'Medico': 'Visita', 'Ospedale': 'Intervento', 'Centro esami': 'Esame', 'Diagnostica': 'Diagnostica', 'Farmacia': 'pill', 'Trasporto / Associazione': 'van', 'Altro': 'user' };
  A.PORTARE = ['Impegnativa / ricetta', 'Tessera sanitaria', 'Documento d\'identità', 'Esami e referti precedenti', 'Elenco farmaci che prendi', 'Presentarsi a digiuno', 'Attestato di esenzione', 'Ricevuta del ticket', 'Consenso informato firmato', 'Accompagnatore'];

  // ---------- dati ----------
  A.DEF = {
    eventi: [], contatti: [], farmaci: [], assunzioni: {}, rinvii: {}, email: {}, notificati: {},
    documenti: [], todo: [], fatti: {}, registro: [],
    regole: { fidati: [], bloccati: [], categorie: {} },
    consensi: { ai: false, aiTs: 0 },
    imp: { nome: '', gmailUrl: '', token: '', giorni: 7, intervallo: 10, citta: '', allarme: 'schermo', suono: true, vibra: true,
      impara: true, promEventi: true, ultimoControllo: 0, erroreGmail: '', emailViste: 0, versioneScript: 0,
      tema: 'auto', testo: 'normale', bloccoMin: 5, avvisi: ['vigilia', '2h'], aiKey: '', benvenuto: false }
  };
  A.normalizza = function (d) {
    d = d || {};
    Object.keys(A.DEF).forEach(function (k) {
      if (d[k] == null) d[k] = JSON.parse(JSON.stringify(A.DEF[k]));
      else if (k === 'imp' || k === 'regole' || k === 'consensi') Object.keys(A.DEF[k]).forEach(function (j) { if (d[k][j] == null) d[k][j] = JSON.parse(JSON.stringify(A.DEF[k][j])); });
    });
    d.eventi.forEach(function (e) { if (!e.ripeti) e.ripeti = { f: 'no' }; if (!e.avvisi) e.avvisi = null; if (!e.docIds) e.docIds = []; });
    return d;
  };
  A.D = A.normalizza({});
  A.save = function () {
    window.Archivio.salvaDati(A.D);
    if (window.Ponte) Ponte.cambiato();
  };
  // registro delle operazioni sui dati (visibile in Impostazioni → Privacy)
  A.log = function (azione, dettaglio) {
    A.D.registro.unshift({ ts: Date.now(), a: azione, d: dettaglio || '' });
    if (A.D.registro.length > 1000) A.D.registro.length = 1000;
  };

  // ---------- avvisi e fogli ----------
  A.toast = function (msg, ms) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    A.$('#toastRoot').appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3000);
  };
  A.sheet = function (titolo, html, onMount, opz) {
    opz = opz || {};
    var bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet' + (opz.largo ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + A.esc(String(titolo).replace(/<[^>]+>/g, '')) + '"><div class="sheet-h"><h2 tabindex="-1">' + titolo + '</h2><button class="x" data-act="closeSheet" aria-label="Chiudi">' + A.IC.x + '</button></div><div class="sheet-b">' + html + '</div></div>';
    bg.addEventListener('click', function (e) { if (e.target === bg) A.chiudiSheet(); });
    A.$('#sheetRoot').appendChild(bg);
    document.body.classList.add('noscroll');
    var s = bg.querySelector('.sheet');
    setTimeout(function () { var h = s.querySelector('h2'); if (h) h.focus(); }, 30);
    if (onMount) onMount(s);
    return s;
  };
  A.chiudiSheet = function (tutti) {
    var all = A.$$('#sheetRoot .sheet-bg');
    if (all.length) { if (tutti) all.forEach(function (x) { x.remove(); }); else all[all.length - 1].remove(); }
    if (!A.$$('#sheetRoot .sheet-bg').length) document.body.classList.remove('noscroll');
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') A.chiudiSheet(); });
  A.banner = function (html, onAct, ms) {
    var b = document.createElement('div');
    b.className = 'banner'; b.setAttribute('role', 'alert');
    b.innerHTML = html;
    b.addEventListener('click', function (e) {
      var a = e.target.closest('[data-b]');
      if (a) { if (onAct) onAct(a.dataset.b); b.remove(); }
    });
    A.$('#bannerRoot').appendChild(b);
    if (ms) setTimeout(function () { b.remove(); }, ms);
    return b;
  };
  A.scarica = function (nome, contenuto, tipo) {
    var blob = contenuto instanceof Blob ? contenuto : new Blob([contenuto], { type: tipo }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };

  // ---------- pezzi di interfaccia ricorrenti ----------
  A.titolo = function (t, destra) { return '<div class="sec-title"><h2>' + t + '</h2>' + (destra || '') + '</div>'; };
  A.vuoto = function (ic, t, sub) { return '<div class="empty">' + A.ico(ic, 44) + '<p><b>' + t + '</b>' + (sub ? '<br>' + sub : '') + '</p></div>'; };
  A.fatto = function (etichetta, valore) { return valore ? '<div class="fact"><span>' + etichetta + '</span><div>' + valore + '</div></div>' : ''; };
  A.pagina = function (titolo, sotto, destra) { return '<header class="page-head"><div><h1>' + titolo + '</h1>' + (sotto ? '<p>' + sotto + '</p>' : '') + '</div>' + (destra || '') + '</header>'; };

  // ---------- collegamenti rapidi ----------
  A.telPulito = function (n) { return String(n || '').replace(/[^\d+]/g, ''); };
  A.waNumero = function (n) {
    var d = String(n || '').replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (/^3\d{8,9}$/.test(d) || /^0\d{5,10}$/.test(d)) d = '39' + d;
    return d;
  };
  A.isCell = function (n) { var d = String(n || '').replace(/\D/g, '').replace(/^(0039|39)(?=3)/, ''); return /^3\d{8,9}$/.test(d); };
  A.mapsDir = function (dest) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest); };
  A.mapsCerca = function (q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); };
  A.qaHtml = function (c, opz) {
    opz = opz || {};
    var h = '';
    if (c.tel) h += '<a class="qa" href="tel:' + A.esc(A.telPulito(c.tel)) + '">' + A.IC.phone + 'Chiama</a>';
    var wa = c.whatsapp || (A.isCell(c.tel) ? c.tel : (A.isCell(c.tel2) ? c.tel2 : ''));
    if (wa) h += '<a class="qa" href="https://wa.me/' + A.esc(A.waNumero(wa)) + '" target="_blank" rel="noopener">' + A.IC.wa + 'WhatsApp</a>';
    if (c.email) h += '<a class="qa" href="mailto:' + A.esc(c.email) + '">' + A.IC.mail + 'Scrivi</a>';
    var dove = c.indirizzo || (opz.nomeComeLuogo ? c.nome : '');
    if (dove) h += '<a class="qa" href="' + A.esc(A.mapsDir(dove)) + '" target="_blank" rel="noopener">' + A.IC.route + 'Percorso</a>';
    if (c.web) h += '<a class="qa" href="' + A.esc(/^https?:/.test(c.web) ? c.web : 'https://' + c.web) + '" target="_blank" rel="noopener">' + A.IC.web + 'Sito</a>';
    return h;
  };

  // ---------- navigazione ----------
  A.VIEWS = {};
  // sottopagine: a quale delle 5 sezioni appartengono
  A.SEZIONE = { farmaci: 'calendario', rubrica: 'home', glossario: 'assistente', trasporti: 'assistente', impostazioni: '', privacy: '', fare: 'home' };
  A.route = function () {
    var parts = (location.hash || '#/home').slice(2).split('/');
    var name = A.VIEWS[parts[0]] ? parts[0] : 'home';
    var tab = A.SEZIONE[name] != null ? A.SEZIONE[name] : name;
    A.$$('.tabbar a').forEach(function (a) { var on = a.dataset.tab === tab; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var gear = A.$('.gear'); if (gear) gear.classList.toggle('on', name === 'impostazioni' || name === 'privacy');
    var v = A.$('#view');
    v.innerHTML = '';
    try { A.VIEWS[name](v, parts.slice(1)); }
    catch (e) { console.error(e); v.innerHTML = '<div class="notice warn">Si è verificato un errore nel mostrare questa pagina. I tuoi dati non sono stati toccati. <button class="btn sm" data-act="go" data-to="#/home">Torna alla Home</button></div>'; }
    A.aggiornaBadge();
  };
  A.ridisegna = function () { var y = window.scrollY; A.route(); window.scrollTo(0, y); };
  window.addEventListener('hashchange', function () { if (!A.pronto) return; A.chiudiSheet(true); A.route(); window.scrollTo(0, 0); var v = A.$('#view'); if (v) v.focus({ preventScroll: true }); });

  A.aggiornaBadge = function () {
    var b = A.$('#navBadge'); if (!b || !A.contaEmailNuove) return;
    var n = A.contaEmailNuove();
    b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
    b.setAttribute('aria-label', n + ' comunicazioni da vedere');
  };

  // azioni con data-act
  A.ACT = {};
  document.addEventListener('click', function (e) {
    if (A.sbloccaAudio) A.sbloccaAudio();
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = A.ACT[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  A.ACT.closeSheet = function () { A.chiudiSheet(); };
  A.ACT.go = function (el) { A.chiudiSheet(true); location.hash = el.dataset.to; };
  A.ACT.copia = function (el) {
    if (!navigator.clipboard) { A.toast('Copia non disponibile su questo dispositivo'); return; }
    navigator.clipboard.writeText(el.dataset.t).then(function () { A.toast('Copiato'); });
  };

  // ---------- aspetto ----------
  A.applicaAspetto = function () {
    var r = document.documentElement;
    if (A.D.imp.tema === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', A.D.imp.tema === 'scuro' ? 'dark' : 'light');
    r.setAttribute('data-testo', A.D.imp.testo || 'normale');
    try { localStorage.setItem('cartellina.aspetto', JSON.stringify({ tema: A.D.imp.tema, testo: A.D.imp.testo })); } catch (e) { /* facoltativo */ }
  };

  return A;
})();
