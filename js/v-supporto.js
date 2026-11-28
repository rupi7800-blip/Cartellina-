/* =========================================================
   Cartellina — Rubrica, "Cosa significa?", Trasporto e aiuto
   (funzioni della versione 1.x, mantenute e riordinate)
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };

  // =================== RUBRICA ===================
  var rubFiltro = '', rubTipo = '';
  A.VIEWS.rubrica = function (v) {
    var h = '<a class="back" href="#/home">' + IC.left + 'Home</a>' + A.pagina('Rubrica', 'Medici, ospedali, centri esami') +
      '<label class="search"><span class="sr">Cerca nella rubrica</span>' + IC.search + '<input class="inp" id="rubQ" type="search" placeholder="Cerca nome, specialità, città…" value="' + esc(rubFiltro) + '"></label>' +
      '<div class="chips"><button class="chip' + (!rubTipo ? ' on' : '') + '" data-act="rubTipo" data-t="">Tutti</button>' + A.TIPI_C.map(function (t) {
        var n = D().contatti.filter(function (c) { return c.tipo === t; }).length;
        return n ? '<button class="chip' + (rubTipo === t ? ' on' : '') + '" data-act="rubTipo" data-t="' + t + '">' + t + ' <span class="n">' + n + '</span></button>' : '';
      }).join('') + '</div><div id="rubList"></div>' +
      '<button class="fab" data-act="nuovoContatto">' + IC.plus + '<span>Contatto</span></button>';
    v.innerHTML = h;
    var q = A.$('#rubQ');
    q.addEventListener('input', function () { rubFiltro = q.value; listaRubrica(); });
    listaRubrica();
  };
  function listaRubrica() {
    var q = A.norm(rubFiltro);
    var lst = D().contatti.filter(function (c) {
      if (rubTipo && c.tipo !== rubTipo) return false;
      return !q || A.norm([c.nome, c.specialita, c.indirizzo, c.email, c.tel, c.note].join(' ')).indexOf(q) >= 0;
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
    A.$('#rubList').innerHTML = lst.length ? lst.map(contattoCard).join('') :
      A.vuoto('user', D().contatti.length ? 'Nessun risultato' : 'La rubrica è vuota', D().contatti.length ? '' : 'I contatti arrivano dalle email sanitarie, oppure aggiungili tu.');
  }
  function contattoCard(c) {
    return '<div class="card tight"><button class="row plain" data-act="apriContatto" data-id="' + c.id + '"><span class="ticon c1">' + A.ico(A.IC_C[c.tipo] || 'user') + '</span>' +
      '<span class="grow"><span class="t1">' + esc(c.nome) + '</span><span class="t2">' + esc([c.specialita || c.tipo, c.indirizzo].filter(Boolean).join(' · ')) + '</span></span>' + A.ico('right', 20) + '</button>' +
      '<div class="quick">' + A.qaHtml(c) + '</div></div>';
  }
  A.ACT.rubTipo = function (el) { rubTipo = el.dataset.t; A.ridisegna(); };
  A.ACT.nuovoContatto = function () { A.formContatto({}); };
  A.ACT.apriContatto = function (el) { A.apriContatto(el.dataset.id); };
  A.apriContatto = function (id) {
    var c = A.contatto(id); if (!c) return;
    var evs = A.prossimi().filter(function (x) { return x.e.contattoId === c.id; });
    var h = '<p><span class="tag">' + esc(c.tipo) + '</span>' + (c.specialita ? ' <b>' + esc(c.specialita) + '</b>' : '') + '</p>';
    [['Telefono', c.tel], ['Altro telefono', c.tel2], ['WhatsApp', c.whatsapp], ['Email', c.email], ['Indirizzo', c.indirizzo], ['Sito', c.web], ['Note', c.note]].forEach(function (r) { h += A.fatto(r[0], r[1] ? esc(r[1]) : ''); });
    h += '<div class="quick">' + A.qaHtml(c) + (c.tel2 ? '<a class="qa" href="tel:' + esc(A.telPulito(c.tel2)) + '">' + IC.phone + 'Chiama il 2°</a>' : '') + '</div>';
    if (evs.length) h += '<h3>Appuntamenti</h3><div class="list">' + evs.map(A.eventoItem).join('') + '</div>';
    h += '<div class="btns"><button class="btn sec" data-act="nuovoEventoCon" data-id="' + c.id + '">' + IC.cal + 'Appuntamento</button><button class="btn ghost" data-act="modContatto" data-id="' + c.id + '">' + IC.edit + 'Modifica</button><button class="btn danger" data-act="delContatto" data-id="' + c.id + '" aria-label="Elimina">' + IC.trash + '</button></div>';
    A.sheet(esc(c.nome), h);
  };
  A.ACT.nuovoEventoCon = function (el) { var c = A.contatto(el.dataset.id); A.chiudiSheet(); A.formEvento({ contattoId: c.id, luogo: c.nome, indirizzo: c.indirizzo, data: A.oggi(), tipo: c.tipo === 'Centro esami' ? 'Esame' : c.tipo === 'Diagnostica' ? 'Diagnostica' : 'Visita' }); };
  A.ACT.modContatto = function (el) { A.chiudiSheet(); A.formContatto(A.contatto(el.dataset.id)); };
  A.ACT.delContatto = function (el) {
    if (!confirm('Eliminare questo contatto?')) return;
    A.D.contatti = A.D.contatti.filter(function (c) { return c.id !== el.dataset.id; });
    A.D.eventi.forEach(function (e) { if (e.contattoId === el.dataset.id) e.contattoId = ''; });
    A.save(); A.chiudiSheet(true); A.ridisegna(); A.toast('Contatto eliminato');
  };
  A.formContatto = function (c, dopo) {
    c = c || {};
    var nuovo = !c.id;
    var campo = function (n, l, ph, t) { return '<label class="f"><span>' + l + '</span><input class="inp" name="' + n + '" type="' + (t || 'text') + '" placeholder="' + (ph || '') + '" value="' + esc(c[n] || '') + '"></label>'; };
    var h = '<form id="fCo">' + campo('nome', 'Nome', 'Es. Dott. Rossi, Ospedale di Circolo') +
      '<label class="f"><span>Tipo</span><select class="inp" name="tipo">' + A.TIPI_C.map(function (t) { return '<option' + (t === (c.tipo || 'Medico') ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      campo('specialita', 'Specialità o reparto', 'Es. Cardiologia') +
      '<div class="two">' + campo('tel', 'Telefono', '0332 …', 'tel') + campo('tel2', 'Altro telefono', '', 'tel') + '</div>' +
      campo('whatsapp', 'WhatsApp (se diverso)', '333 …', 'tel') + campo('email', 'Email', '', 'email') + campo('indirizzo', 'Indirizzo', 'Via, numero, città') + campo('web', 'Sito web', '') +
      '<label class="f"><span>Note</span><textarea class="inp" name="note" placeholder="Orari, piano, come prenotare…">' + esc(c.note || '') + '</textarea></label>' +
      '<button class="btn block" type="submit">' + IC.check + 'Salva contatto</button></form>';
    A.sheet(nuovo ? 'Nuovo contatto' : 'Modifica contatto', h, function (s) {
      A.$('#fCo', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target), rec = { id: c.id || A.uid(), fonte: c.fonte || 'manuale', demo: c.demo || false };
        ['nome', 'tipo', 'specialita', 'tel', 'tel2', 'whatsapp', 'email', 'indirizzo', 'web', 'note'].forEach(function (k) { rec[k] = String(f.get(k) || '').trim(); });
        if (!rec.nome) { A.toast('Scrivi almeno il nome'); return; }
        if (nuovo) A.D.contatti.push(rec); else A.D.contatti = A.D.contatti.map(function (x) { return x.id === rec.id ? rec : x; });
        A.save(); A.chiudiSheet(); A.toast('Contatto salvato'); if (dopo) dopo(rec); A.ridisegna();
      });
    });
  };
  A.trovaContatto = function (email, tels) {
    email = (email || '').toLowerCase();
    var t = (tels || []).map(A.telPulito);
    return D().contatti.filter(function (c) {
      return (email && (c.email || '').toLowerCase() === email) || t.some(function (x) { return x && (A.telPulito(c.tel) === x || A.telPulito(c.tel2) === x); });
    })[0];
  };

  // =================== COSA SIGNIFICA? (glossario) ===================
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
    var n = A.norm(parola).replace(/\s+/g, ' ');
    return GL.filter(function (g) { return g.nomi.some(function (x) { return A.norm(x) === n; }); })[0];
  }
  // evidenzia nel testo i termini del glossario (il testo resta quello originale)
  A.evidenzia = function (testo) {
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
    ranges.forEach(function (r) { out += esc(t.slice(pos, r.s)) + '<button type="button" class="term" data-act="voce" data-i="' + r.i + '">' + esc(t.slice(r.s, r.e)) + '</button>'; pos = r.e; });
    return out + esc(t.slice(pos));
  };
  A.ACT.voce = function (el) { mostraVoce(GL[+el.dataset.i]); };
  function voceHtml(g, aperta) {
    return '<article class="voce"><h3>' + esc(g.t) + ' <span class="tag">' + g.c + '</span></h3>' + (g.a && g.a.length ? '<p class="muted small">Anche: ' + g.a.map(esc).join(', ') + '</p>' : '') + '<p>' + esc(g.d) + '</p>' +
      (aperta ? '' : '<button class="linkbtn" data-act="online" data-q="' + esc(g.t) + '">Approfondisci online</button>') + '</article>';
  }
  function mostraVoce(g) {
    A.sheet(esc(g.t), voceHtml(g, true) + '<p class="src">Fonte: glossario di Cartellina (spiegazione divulgativa, non un parere medico).</p><div id="onl"></div>', function (s) { onlineBox(g.t, A.$('#onl', s)); });
  }
  A.spiegaTermine = function (q, farmaco) {
    var v = trovaVoce(q);
    if (v) { mostraVoce(v); return; }
    A.sheet(esc(q), '<div id="onl"></div>', function (s) { onlineBox(q, A.$('#onl', s), farmaco, true); });
  };
  A.ACT.online = function (el) { A.spiegaTermine(el.dataset.q); };
  // la ricerca online parte solo se la chiedi: la parola viene inviata a Wikipedia e alla National Library of Medicine
  function onlineBox(q, box, farmaco, subito) {
    if (subito) { cercaOnline(q, box, farmaco); return; }
    box.innerHTML = '<button class="btn sec block" id="goOnl">' + IC.web + 'Cerca anche su Wikipedia</button><p class="muted small">Verrà inviata solo la parola "' + esc(q) + '" a Wikipedia e alla National Library of Medicine (USA).</p>';
    A.$('#goOnl', box).addEventListener('click', function () { cercaOnline(q, box, farmaco); });
  }
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
    if (!navigator.onLine) { box.innerHTML = '<p class="notice">Sei senza connessione: la ricerca online non è disponibile.</p>'; return; }
    box.innerHTML = '<p class="muted"><span class="spinner"></span> Cerco…</p>';
    var codice = /^[A-TV-Z]\d{2}(\.\w{1,4})?$/i.test(q.trim());
    Promise.all([codice ? Promise.resolve(null) : wiki('it', q), icd(q)]).then(function (r) {
      return (r[0] || codice ? Promise.resolve(r[0]) : wiki('en', q)).then(function (w2) { return [w2, r[1]]; });
    }).then(function (r) {
      var w = r[0], cod = r[1], h = '';
      if (w && w.testo) h += '<article class="voce"><h3>' + esc(w.titolo) + ' <span class="tag">Wikipedia ' + w.lang.toUpperCase() + '</span></h3><p>' + esc(w.testo) + '</p>' +
        (w.altri.length ? '<p class="small">Non è questo? ' + w.altri.map(function (a) { return '<button class="linkbtn" data-act="online" data-q="' + esc(a) + '">' + esc(a) + '</button>'; }).join(' · ') + '</p>' : '') +
        '<p class="src"><a href="' + esc(w.url) + '" target="_blank" rel="noopener">Leggi su Wikipedia</a></p></article>';
      if (cod.length) h += '<article class="voce"><h3>Classificazione ICD-10 <span class="tag">NIH · in inglese</span></h3><p class="small">Codici internazionali usati su referti e certificati:</p>' +
        cod.map(function (c) { return '<p class="small"><b>' + esc(c[0]) + '</b> — ' + esc(c[1]) + '</p>'; }).join('') + '</article>';
      if (!h) h = '<p class="muted">Nessun risultato. Prova con un\'altra parola o usa i collegamenti qui sotto.</p>';
      var g = function (site) { return 'https://www.google.com/search?q=' + encodeURIComponent(q + ' site:' + site); };
      h += '<h3>Fonti sanitarie affidabili</h3><div class="quick">' +
        '<a class="qa" target="_blank" rel="noopener" href="' + g('msdmanuals.com/it') + '">' + IC.book + 'Manuale MSD</a>' +
        '<a class="qa" target="_blank" rel="noopener" href="' + g('issalute.it') + '">' + IC.book + 'ISSalute</a>' +
        (farmaco ? '<a class="qa" target="_blank" rel="noopener" href="' + g('medicinali.aifa.gov.it') + '">' + IC.pill + 'Foglietto AIFA</a>' : '') + '</div>' +
        '<p class="src">Servono a capire. Per la tua situazione chiedi sempre al medico.</p>';
      box.innerHTML = h;
    });
  }

  var glQ = '', glCat = '';
  A.VIEWS.glossario = function (v) {
    var cats = ['Burocrazia', 'Diagnostica', 'Esami', 'Termini medici', 'Farmaci'];
    var h = '<a class="back" href="#/assistente">' + IC.left + 'Assistente</a>' + A.pagina('Cosa significa?', 'Parole di medicina e burocrazia spiegate semplici') +
      '<label class="search"><span class="sr">Cerca una parola</span>' + IC.search + '<input class="inp" id="glQ" type="search" placeholder="Es. impegnativa, TAC, PCR…" value="' + esc(glQ) + '" autocomplete="off"></label>' +
      '<div class="chips"><button class="chip' + (!glCat ? ' on' : '') + '" data-act="glCat" data-c="">Tutte</button>' + cats.map(function (c) { return '<button class="chip' + (glCat === c ? ' on' : '') + '" data-act="glCat" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
      '<button class="btn sec block" data-act="spiegaTesto">' + IC.spark + 'Spiegami un referto o una lettera</button><div id="glList"></div>';
    v.innerHTML = h;
    var inp = A.$('#glQ');
    inp.addEventListener('input', function () { glQ = inp.value; listaGlossario(); });
    listaGlossario();
  };
  function listaGlossario() {
    var q = A.norm(glQ.trim());
    var lst = GL.filter(function (g) {
      if (glCat && g.c !== glCat) return false;
      return !q || g.nomi.some(function (n) { return A.norm(n).indexOf(q) >= 0; }) || A.norm(g.d).indexOf(q) >= 0;
    });
    if (q) lst.sort(function (a, b) {
      var sa = a.nomi.some(function (n) { return A.norm(n).indexOf(q) === 0; }) ? 0 : 1, sb = b.nomi.some(function (n) { return A.norm(n).indexOf(q) === 0; }) ? 0 : 1;
      return sa - sb;
    }); else lst.sort(function (a, b) { return a.t.localeCompare(b.t); });
    var h = lst.slice(0, 80).map(function (g) { return voceHtml(g); }).join('');
    if (q) h = '<div class="notice row"><span class="grow">' + (lst.length ? lst.length + ' nel glossario.' : 'Non è nel glossario.') + ' Cerco <b>"' + esc(glQ.trim()) + '"</b> online?</span><button class="btn sm" data-act="online" data-q="' + esc(glQ.trim()) + '">' + IC.web + 'Cerca</button></div>' + h;
    A.$('#glList').innerHTML = h || A.vuoto('book', 'Nessuna voce');
  }
  A.ACT.glCat = function (el) { glCat = el.dataset.c; A.ridisegna(); };
  A.ACT.spiegaTesto = function () {
    A.sheet('Spiegami un testo', '<p class="muted">Incolla un referto, una lettera o una richiesta: evidenzio le parole difficili. Toccale per la spiegazione. Il testo resta sul tuo dispositivo.</p><label class="f"><span class="sr">Testo da spiegare</span><textarea class="inp tall" id="stT" placeholder="Incolla qui il testo…"></textarea></label><button class="btn block" id="stGo">' + IC.spark + 'Spiega le parole</button><div id="stOut"></div>', function (s) {
      A.$('#stGo', s).addEventListener('click', function () {
        var t = A.$('#stT', s).value.trim(); if (!t) return;
        var html = A.evidenzia(t), n = (html.match(/class="term"/g) || []).length;
        A.$('#stOut', s).innerHTML = '<p><b>' + n + '</b> parole spiegate nel glossario.</p><div class="mailbody">' + html + '</div>' +
          (A.aiPronta && A.aiPronta() ? '<button class="btn sec block" data-act="aiSpiegaTesto">' + IC.chat + 'Chiedi all\'assistente AI cosa mi chiedono di fare</button>' : '');
        A.testoDaSpiegare = t;
      });
    });
  };

  // =================== TRASPORTO E AIUTO ===================
  var trRis = null, trStato = '';
  A.VIEWS.trasporti = function (v) {
    var citta = D().imp.citta || '';
    var h = '<a class="back" href="#/assistente">' + IC.left + 'Assistente</a>' + A.pagina('Trasporto e aiuto', 'Emergenze, ambulanze, associazioni') +
      '<div class="emerg"><a href="tel:112"><b>112</b>Emergenza</a><a href="tel:118"><b>118</b>Ambulanza</a><a href="tel:116117"><b>116117</b>Guardia medica</a></div>' +
      '<p class="muted small">112 e 118 per le emergenze. Il 116117 (guardia medica e servizi non urgenti) è attivo in molte regioni, non ancora in tutte.</p>' +
      A.titolo('Trasporto per chi non può muoversi') +
      '<section class="card"><p>Cerco ambulanze, Croce Rossa, Pubbliche Assistenze, Misericordie, AUSER vicino a te (dati OpenStreetMap). Viene inviato solo il comune o la posizione.</p>' +
      '<div class="row"><label class="grow"><span class="sr">Comune</span><input class="inp" id="trC" placeholder="Comune, es. Varese" value="' + esc(citta) + '"></label><button class="iconbtn" data-act="trGps" aria-label="Usa la mia posizione">' + IC.locate + '</button></div>' +
      '<button class="btn block" data-act="trCerca">' + IC.search + 'Cerca vicino</button></section>' +
      '<div id="trOut">' + (trStato || (trRis ? risTrasporti() : '')) + '</div>' +
      A.titolo('A chi chiedere') +
      infoCard('Intervento', 'Trasporto sanitario dell\'ASL', 'Per dialisi, chemioterapia, radioterapia o per chi non cammina, il trasporto può essere a carico del Servizio Sanitario. Chiedi al medico di famiglia o al reparto la richiesta di trasporto e contatta il distretto ASL/ASST.') +
      infoCard('user', 'Servizi sociali del Comune', 'Molti comuni hanno un trasporto sociale (spesso con volontari) per visite ed esami di anziani e persone fragili.', A.mapsCerca('servizi sociali comune ' + citta)) +
      infoCard('van', 'Associazioni di volontariato', 'Croce Rossa, ANPAS (Pubbliche Assistenze, Croce Verde, Croce Bianca), Misericordie e AUSER offrono trasporti programmati, a volte con un piccolo rimborso spese.', A.mapsCerca('Croce Rossa ' + (citta || 'vicino a me'))) +
      '<p class="notice">Verifica sempre numeri e orari chiamando la struttura: i dati delle mappe sono inseriti da volontari.</p>';
    v.innerHTML = h;
  };
  function infoCard(ic, t, d, link) {
    return '<section class="card"><div class="row top"><span class="ticon c6">' + A.ico(ic) + '</span><div class="grow"><h3>' + t + '</h3><p>' + d + '</p>' +
      (link ? '<a class="qa" target="_blank" rel="noopener" href="' + esc(link) + '">' + IC.map + 'Cerca sulla mappa</a>' : '') + '</div></div></section>';
  }
  function dist(a, b, c, d) { var R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; var h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) * Math.sin(y / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
  function cercaTrasporti(lat, lon) {
    trStato = '<p class="muted"><span class="spinner"></span> Cerco nel raggio di 20 km…</p>'; trRis = null;
    var out = A.$('#trOut'); if (out) out.innerHTML = trStato;
    var R = 20000, nomi = 'croce rossa|croce verde|croce bianca|croce azzurra|croce gialla|misericordia|pubblica assistenza|anpas|auser|volontari|soccorso|ambulanz|trasporto|cri ';
    var q = '[out:json][timeout:30];(nwr["emergency"="ambulance_station"](around:' + R + ',' + lat + ',' + lon + ');nwr["amenity"="ambulance_station"](around:' + R + ',' + lat + ',' + lon + ');nwr["name"~"' + nomi + '",i](around:' + R + ',' + lat + ',' + lon + '););out center tags 80;';
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
          var k = A.norm(x.nome) + Math.round(x.km * 10); if (visti[k]) return false; visti[k] = 1; return true;
        }).sort(function (a, b) { return a.km - b.km; }).slice(0, 30);
        trStato = '';
        var o = A.$('#trOut'); if (o) o.innerHTML = risTrasporti();
      })
      .catch(function () { trStato = '<p class="notice warn">Il servizio mappe non risponde ora. Riprova tra poco o usa i pulsanti di ricerca qui sotto.</p>'; var o = A.$('#trOut'); if (o) o.innerHTML = trStato; });
  }
  function risTrasporti() {
    if (!trRis) return '';
    if (!trRis.length) return '<p class="notice">Nessuna struttura trovata nelle mappe in questa zona.</p>';
    return A.titolo('Trovati vicino', '<span class="muted">' + trRis.length + '</span>') + trRis.map(function (x, i) {
      var tel = (x.tel || '').split(/[;,]/)[0];
      return '<section class="card tight"><div class="row"><span class="ticon c6">' + IC.van + '</span><div class="grow"><span class="t1">' + esc(x.nome) + '</span><span class="t2">' + (x.km < 99 ? x.km.toFixed(1) + ' km' : '') + (x.indirizzo ? ' · ' + esc(x.indirizzo) : '') + '</span></div></div>' +
        '<div class="quick">' + (tel ? '<a class="qa" href="tel:' + esc(A.telPulito(tel)) + '">' + IC.phone + esc(tel) + '</a>' : '<a class="qa" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(x.nome + ' ' + (x.indirizzo || D().imp.citta || '') + ' telefono') + '">' + IC.search + 'Trova il numero</a>') +
        (x.lat ? '<a class="qa" target="_blank" rel="noopener" href="' + esc(A.mapsDir(x.lat + ',' + x.lon)) + '">' + IC.route + 'Percorso</a>' : '') +
        '<button class="qa" data-act="trSalva" data-i="' + i + '">' + IC.plus + 'In rubrica</button></div></section>';
    }).join('');
  }
  A.ACT.trCerca = function () {
    var c = A.$('#trC').value.trim(); if (!c) { A.toast('Scrivi il comune o usa la posizione'); return; }
    D().imp.citta = c; A.save();
    trStato = '<p class="muted"><span class="spinner"></span> Cerco ' + esc(c) + '…</p>'; A.$('#trOut').innerHTML = trStato;
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&accept-language=it&q=' + encodeURIComponent(c))
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.length) throw new Error('nf'); cercaTrasporti(+j[0].lat, +j[0].lon); })
      .catch(function () { trStato = '<p class="notice warn">Non trovo "' + esc(c) + '". Controlla il nome del comune.</p>'; A.$('#trOut').innerHTML = trStato; });
  };
  A.ACT.trGps = function () {
    if (!navigator.geolocation) { A.toast('Posizione non disponibile'); return; }
    A.toast('Cerco la tua posizione…');
    navigator.geolocation.getCurrentPosition(function (p) { cercaTrasporti(p.coords.latitude, p.coords.longitude); }, function () { A.toast('Nessun permesso per la posizione: scrivi il comune'); }, { enableHighAccuracy: false, timeout: 15000 });
  };
  A.ACT.trSalva = function (el) {
    var x = trRis[+el.dataset.i];
    A.formContatto({ nome: x.nome, tipo: 'Trasporto / Associazione', tel: (x.tel || '').split(/[;,]/)[0], email: x.email, web: x.web, indirizzo: x.indirizzo || (x.lat ? x.lat + ',' + x.lon : '') });
  };
})(CA);
