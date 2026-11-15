/* =========================================================
   Cartellina — Home: panoramica e "Da fare"
   "Da fare" raccoglie da solo ciò che richiede attenzione,
   ricavandolo dai dati veri (email, calendario, farmaci).
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };

  // ---------- attività da fare ----------
  A.compiti = function () {
    var out = [], oggi = A.oggi(), fatti = D().fatti;
    var push = function (c) { if (!fatti[c.key]) out.push(c); };
    A.listaEmail().forEach(function (m) {
      var x = m.analisi || {};
      if (m.stato === 'verifica') push({ key: 'ver:' + m.id, ic: 'help', testo: 'Controlla una comunicazione', sub: (m.subject || '(senza oggetto)') + ' — riguarda la salute?', ord: 'a', btn: { l: 'Controlla', act: 'apriEmail', id: m.id } });
      if (m.stato !== 'sanitaria') return;
      (x.eventi || []).forEach(function (ev, i) {
        if (ev.stato || ev.data < oggi) return;
        push({ key: 'prop:' + m.id + ':' + ev.data + ev.ora, ic: 'cal', testo: 'Aggiungi al calendario: ' + ev.titolo, sub: A.cap(A.fmtLunga(ev.data)) + (ev.ora ? ' alle ' + ev.ora : '') + ' · da ' + A.nomeMitt(m), data: ev.data, ord: 'b', btn: { l: 'Aggiungi', act: 'propHome', id: m.id, i: i } });
      });
      (x.azioni || []).forEach(function (a) {
        if (a.k === 'confermare' && !(x.eventi || []).some(function (e) { return e.data >= oggi; })) return;
        push({ key: 'az:' + m.id + ':' + a.k, ic: { ritirare: 'down', confermare: 'check', prenotare: 'phone', inviare: 'upload', pagare: 'Amministrativo', rinnovare: 'Rinnovo' }[a.k] || 'list', testo: a.nome, sub: '«' + A.taglia(a.testo, 110) + '» — ' + A.nomeMitt(m), ord: 'c', btn: { l: 'Vedi email', act: 'apriEmail', id: m.id } });
      });
      (x.scadenze || []).forEach(function (s) {
        if (s.data < oggi) return;
        push({ key: 'scad:' + m.id + ':' + s.data, ic: 'Scadenza', testo: 'Scadenza ' + A.quando(s.data).toLowerCase(), sub: A.taglia(s.testo, 110), data: s.data, ord: 'b', btn: { l: 'Vedi email', act: 'apriEmail', id: m.id } });
      });
      if ((x.richieste || []).length && !(x.azioni || []).some(function (a) { return a.k === 'inviare'; })) push({ key: 'doc:' + m.id, ic: 'doc', testo: 'Ti chiedono dei documenti', sub: '«' + A.taglia(x.richieste[0], 110) + '»', ord: 'c', btn: { l: 'Vedi email', act: 'apriEmail', id: m.id } });
    });
    var nonLette = A.listaEmail('sanitaria').filter(function (m) { return !m.letta; });
    if (nonLette.length) push({ key: 'leggi:' + nonLette.map(function (m) { return m.id; }).join(',').slice(0, 200), ic: 'mail', testo: nonLette.length === 1 ? 'Leggi la nuova comunicazione' : 'Leggi ' + nonLette.length + ' nuove comunicazioni', sub: nonLette.slice(0, 2).map(function (m) { return m.subject; }).join(' · '), ord: 'd', btn: { l: 'Apri', act: nonLette.length === 1 ? 'apriEmail' : 'go', id: nonLette[0].id, to: '#/email' }, nofatto: true });
    // impegni in arrivo
    A.istanze(oggi, A.addGiorni(oggi, 14)).forEach(function (x) {
      var e = x.e, manca = (e.portare || []).filter(function (p) { return !p.ok; });
      if ((e.tipo === 'Scadenza' || e.tipo === 'Rinnovo') ) push({ key: 'evs:' + x.key, ic: e.tipo, testo: (e.tipo === 'Rinnovo' ? 'Rinnova: ' : 'Scadenza: ') + (e.titolo || e.tipo), sub: A.quando(x.data), data: x.data, ord: 'b', btn: { l: 'Apri', act: 'apriEvento', id: e.id, g: x.data } });
      else if (manca.length && x.data <= A.addGiorni(oggi, 7)) push({ key: 'prep:' + x.key + ':' + manca.length, ic: 'list', testo: 'Prepara per ' + (e.titolo || e.tipo), sub: A.quando(x.data) + ' · ' + manca.length + (manca.length > 1 ? ' cose' : ' cosa') + ' da portare: ' + manca.slice(0, 3).map(function (p) { return p.t.toLowerCase(); }).join(', '), data: x.data, ord: 'b', btn: { l: 'Lista', act: 'apriEvento', id: e.id, g: x.data } });
    });
    // farmaci in esaurimento
    D().farmaci.forEach(function (f) {
      if (!f.sospeso && A.scorteBasse(f)) push({ key: 'scorte:' + f.id + ':' + f.scorte, ic: 'pill', testo: 'Rinnova la prescrizione di ' + f.nome, sub: 'Restano ' + f.scorte + ' unità', ord: 'b', btn: { l: 'Farmaco', act: 'go', to: '#/farmaci' } });
    });
    // promemoria personali
    D().todo.filter(function (t) { return !t.fatto; }).forEach(function (t) { out.push({ key: 'todo:' + t.id, ic: 'check', testo: t.t, sub: t.data ? 'Entro ' + A.fmtLunga(t.data) : 'Promemoria personale', data: t.data, ord: 'b', todo: t.id }); });
    var tra3 = A.addGiorni(oggi, 3);  // le attività senza data stanno tra quelle urgenti e quelle lontane
    return out.sort(function (a, b) { return (a.data || tra3).localeCompare(b.data || tra3) || a.ord.localeCompare(b.ord); });
  };
  A.compitoHtml = function (c) {
    var b = c.btn;
    return '<div class="todo"><span class="ticon sm c8">' + A.ico(c.ic) + '</span><div class="grow"><p class="t1">' + esc(c.testo) + '</p>' + (c.sub ? '<p class="t2">' + esc(c.sub) + '</p>' : '') +
      '<div class="btns">' + (b ? '<button class="btn sm" data-act="' + b.act + '"' + (b.id ? ' data-id="' + esc(b.id) + '"' : '') + (b.i != null ? ' data-i="' + b.i + '"' : '') + (b.g ? ' data-g="' + b.g + '"' : '') + (b.to ? ' data-to="' + b.to + '"' : '') + '>' + b.l + '</button>' : '') +
      (c.nofatto ? '' : '<button class="btn sm ghost" data-act="fatto" data-k="' + esc(c.key) + '">' + IC.check + 'Fatto</button>') + '</div></div></div>';
  };
  A.ACT.fatto = function (el) {
    var k = el.dataset.k;
    if (/^todo:/.test(k)) { var t = D().todo.filter(function (x) { return 'todo:' + x.id === k; })[0]; if (t) t.fatto = Date.now(); }
    else D().fatti[k] = Date.now();
    A.save(); A.ridisegna(); A.toast('Segnato come fatto');
  };
  A.ACT.propHome = function (el) { A.aggiungiProposta(el.dataset.id, +el.dataset.i); };
  A.ACT.nuovoTodo = function () {
    A.sheet('Nuovo promemoria', '<form id="fTd"><label class="f"><span>Cosa devi fare</span><input class="inp" name="t" required placeholder="Es. Chiamare il CUP per spostare la visita"></label><label class="f"><span>Entro quando (facoltativo)</span><input class="inp" type="date" name="data"></label><button class="btn block" type="submit">' + IC.check + 'Salva</button></form>', function (s) {
      A.$('#fTd', s).addEventListener('submit', function (e) {
        e.preventDefault(); var f = new FormData(e.target), t = String(f.get('t')).trim(); if (!t) return;
        D().todo.push({ id: A.uid(), t: t, data: f.get('data') || '', creato: Date.now() }); A.save(); A.chiudiSheet(); A.ridisegna(); A.toast('Promemoria aggiunto');
      });
    });
  };

  function saluto() {
    var h = new Date().getHours();
    return (h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera') + (D().imp.nome ? ', ' + esc(D().imp.nome) : '');
  }

  A.VIEWS.home = function (v) {
    var oggi = A.oggi(), now = new Date();
    var vuota = !D().eventi.length && !D().farmaci.length && !D().documenti.length && !Object.keys(D().email).length;
    var h = '<header class="hello"><h1>' + saluto() + '</h1><p>' + A.cap(A.GGL[now.getDay()]) + ' ' + now.getDate() + ' ' + A.MML[now.getMonth()] + '</p></header>';

    if (vuota) {
      h += '<section class="card welcome"><h2>Benvenuto in Cartellina</h2><p>Ti aiuto a tenere in ordine visite, esami, documenti e comunicazioni sanitarie. Si comincia così:</p>' +
        '<ol class="steps"><li><b>Collega la tua email</b><br><span class="muted">Riconosco da sola le email sanitarie e ti propongo le date.</span></li><li><b>Carica i tuoi documenti</b><br><span class="muted">Referti, analisi, ricette: tutti in un posto.</span></li><li><b>Proteggi i dati con un PIN</b><br><span class="muted">Così sono cifrati sul dispositivo.</span></li></ol>' +
        '<div class="btns col"><a class="btn" href="#/impostazioni">' + IC.link + 'Collega l\'email</a><a class="btn sec" href="#/documenti">' + IC.doc + 'Carica un documento</a><button class="btn ghost" data-act="demo">' + IC.spark + 'Prova con email di esempio</button></div></section>';
    }

    // DA FARE
    var cc = A.compiti();
    h += A.titolo('Da fare' + (cc.length ? ' <span class="count">' + cc.length + '</span>' : ''), '<button class="linkbtn" data-act="nuovoTodo">' + IC.plus + 'Promemoria</button>');
    if (cc.length) h += '<div class="todos">' + cc.slice(0, 4).map(A.compitoHtml).join('') + '</div>' + (cc.length > 4 ? '<a class="btn ghost block" href="#/fare">Vedi tutte le ' + cc.length + ' attività</a>' : '');
    else if (!vuota) h += '<p class="allok">' + IC.check + ' Niente da fare per ora.</p>';

    // PROSSIMI APPUNTAMENTI
    var pros = A.prossimi(3);
    if (pros.length) {
      var x = pros[0], e = x.e, c = A.contatto(e.contattoId) || {}, dove = e.indirizzo || e.luogo || c.indirizzo;
      h += A.titolo('Prossimi appuntamenti', '<a class="linkbtn" href="#/calendario">Calendario</a>');
      h += '<section class="next"><button class="plain" data-act="apriEvento" data-id="' + e.id + '" data-g="' + x.data + '"><span class="lbl">' + A.quando(x.data) + (e.ora ? ' · ore ' + e.ora : '') + '</span><span class="tit">' + esc(e.titolo || A.nomeTipo(e.tipo)) + '</span>' + (e.luogo ? '<span class="where">' + esc(e.luogo) + '</span>' : '') + '</button>' +
        '<div class="quick">' + (dove ? '<a class="qa" href="' + esc(A.mapsDir(dove)) + '" target="_blank" rel="noopener">' + IC.route + 'Percorso</a>' : '') + (c.tel ? '<a class="qa" href="tel:' + esc(A.telPulito(c.tel)) + '">' + IC.phone + 'Chiama</a>' : '') +
        '<button class="qa" data-act="portareEvento" data-id="' + e.id + '">' + IC.list + 'Cosa portare</button></div></section>';
      if (pros.length > 1) h += '<div class="list">' + pros.slice(1).map(A.eventoItem).join('') + '</div>';
    }

    // FARMACI DI OGGI
    var dosi = A.dosiDelGiorno(oggi);
    if (dosi.length) h += A.titolo('Farmaci di oggi', '<a class="linkbtn" href="#/farmaci">Tutti</a>') + '<div class="list">' + dosi.map(A.doseHtml).join('') + '</div>';

    // COMUNICAZIONI
    var mail = A.listaEmail('sanitaria').slice(0, 3);
    if (mail.length || D().imp.gmailUrl) {
      h += A.titolo('Comunicazioni', '<a class="linkbtn" href="#/email">Tutte</a>');
      if (D().imp.erroreGmail) h += '<p class="notice warn">Email: ' + esc(D().imp.erroreGmail) + ' <a href="#/impostazioni">Risolvi</a></p>';
      h += mail.length ? '<div class="list">' + mail.map(A.mailCard).join('') + '</div>' : '<p class="muted pad">Nessuna email sanitaria recente.</p>';
    }

    // DOCUMENTI RECENTI
    var docs = D().documenti.slice().sort(function (a, b) { return (b.creato || 0) - (a.creato || 0); }).slice(0, 3);
    if (docs.length) h += A.titolo('Documenti recenti', '<a class="linkbtn" href="#/documenti">Archivio</a>') + '<div class="list">' + docs.map(A.docItem).join('') + '</div>';

    // strumenti
    h += A.titolo('Strumenti') + '<div class="tiles">' +
      '<a class="tile" href="#/farmaci">' + IC.pill + '<span>Farmaci</span></a>' +
      '<a class="tile" href="#/rubrica">' + IC.user + '<span>Rubrica</span></a>' +
      '<a class="tile" href="#/glossario">' + IC.book + '<span>Cosa significa?</span></a>' +
      '<a class="tile" href="#/trasporti">' + IC.van + '<span>Trasporto e aiuto</span></a></div>';
    h += '<p class="disclaimer">Cartellina ti aiuta a organizzarti: non sostituisce il medico. In emergenza chiama il <a href="tel:112">112</a>.</p>';
    v.innerHTML = h;
  };

  A.VIEWS.fare = function (v) {
    var cc = A.compiti();
    var fatti = D().todo.filter(function (t) { return t.fatto; });
    v.innerHTML = '<a class="back" href="#/home">' + IC.left + 'Home</a>' + A.pagina('Da fare', 'Tutto ciò che richiede la tua attenzione', '<button class="btn sec sm" data-act="nuovoTodo">' + IC.plus + 'Promemoria</button>') +
      (cc.length ? '<div class="todos">' + cc.map(A.compitoHtml).join('') + '</div>' : '<p class="allok">' + IC.check + ' Niente da fare per ora.</p>') +
      (Object.keys(D().fatti).length || fatti.length ? '<p class="muted small pad">Le attività segnate come fatte non compaiono più. <button class="linkbtn" data-act="ripristinaFatti">Mostrale di nuovo</button></p>' : '');
  };
  A.ACT.ripristinaFatti = function () { D().fatti = {}; D().todo.forEach(function (t) { delete t.fatto; }); A.save(); A.ridisegna(); };
})(CA);
