/* =========================================================
   Cartellina — Calendario della salute
   visite, esami, controlli periodici, terapie, scadenze,
   rinnovi di prescrizioni, appuntamenti amministrativi
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };

  A.RIPETI = [['no', 'Non si ripete'], ['giorno', 'Ogni giorno'], ['sett', 'Ogni settimana'], ['mese', 'Ogni mese'], ['anno', 'Ogni anno']];
  A.AVVISI = [['1s', 'Una settimana prima'], ['2g', 'Due giorni prima'], ['vigilia', 'Il giorno prima, alle 18'], ['mattina', 'La mattina stessa, alle 8'], ['2h', 'Due ore prima'], ['1h', 'Un\'ora prima'], ['30m', 'Mezz\'ora prima']];
  var NOME_AVV = {}; A.AVVISI.forEach(function (a) { NOME_AVV[a[0]] = a[1]; });

  // ---------- occorrenze (appuntamenti che si ripetono) ----------
  A.occorrenze = function (e, da, a) {
    var r = e.ripeti || { f: 'no' }, out = [];
    if (!r.f || r.f === 'no') { if (e.data >= da && e.data <= a) out.push(e.data); return out; }
    var fino = r.fino && r.fino < a ? r.fino : a, ogni = Math.max(1, +r.ogni || 1), d0 = A.parseYmd(e.data);
    for (var i = 0, cur = e.data; cur <= fino && i < 4000; i++) {
      var d;
      if (r.f === 'giorno') d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i * ogni);
      else if (r.f === 'sett') d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 7 * i * ogni);
      else if (r.f === 'mese') d = new Date(d0.getFullYear(), d0.getMonth() + i * ogni, d0.getDate());
      else d = new Date(d0.getFullYear() + i * ogni, d0.getMonth(), d0.getDate());
      cur = A.ymd(d);
      if (cur > fino) break;
      if (cur >= da) out.push(cur);
    }
    return out;
  };
  A.istanze = function (da, a) {
    var out = [];
    D().eventi.forEach(function (e) { A.occorrenze(e, da, a).forEach(function (g) { out.push({ e: e, data: g, key: e.id + '@' + g }); }); });
    return out.sort(function (x, y) { return (x.data + (x.e.ora || '00:00')).localeCompare(y.data + (y.e.ora || '00:00')); });
  };
  A.prossimi = function (n) {
    var ora = Date.now() - 60 * 60 * 1000;
    return A.istanze(A.addGiorni(A.oggi(), -1), A.addGiorni(A.oggi(), 1100))
      .filter(function (x) { return A.at(x.data, x.e.ora || '23:59').getTime() >= ora; }).slice(0, n || 999);
  };
  A.passati = function () {
    return A.istanze('2000-01-01', A.addGiorni(A.oggi(), -1)).reverse();
  };
  A.evento = function (id) { return D().eventi.filter(function (e) { return e.id === id; })[0]; };
  A.contatto = function (id) { return id ? D().contatti.filter(function (c) { return c.id === id; })[0] : null; };

  function descRipeti(r) {
    if (!r || !r.f || r.f === 'no') return '';
    var base = { giorno: ['ogni giorno', 'ogni %n giorni'], sett: ['ogni settimana', 'ogni %n settimane'], mese: ['ogni mese', 'ogni %n mesi'], anno: ['ogni anno', 'ogni %n anni'] }[r.f];
    var t = (+r.ogni > 1 ? base[1].replace('%n', r.ogni) : base[0]);
    return A.cap(t) + (r.fino ? ', fino al ' + A.fmtBreve(r.fino) : '');
  }

  // ---------- elemento di elenco ----------
  A.eventoItem = function (x) {
    var e = x.e || x, data = x.data || e.data, d = A.parseYmd(data);
    return '<button class="item" data-act="apriEvento" data-id="' + e.id + '" data-g="' + data + '"><span class="date ' + (A.COL[e.tipo] || 'c7') + '"><small>' + A.GG[d.getDay()] + '</small><b>' + d.getDate() + '</b><small>' + A.MM[d.getMonth()] + '</small></span>' +
      '<span class="grow"><span class="t1">' + esc(e.titolo || A.nomeTipo(e.tipo)) + '</span><span class="t2">' + (e.ora ? 'ore ' + e.ora + ' · ' : '') + esc(e.luogo || A.nomeTipo(e.tipo)) + '</span></span>' +
      (e.ripeti && e.ripeti.f !== 'no' ? '<span class="tag" title="Si ripete">' + A.ico('refresh', 14) + '</span>' : '') +
      (e.fonte === 'email' ? '<span class="tag" title="Arrivato da un\'email">' + A.ico('mail', 14) + '</span>' : '') + '</button>';
  };

  // ---------- vista ----------
  var calMese = new Date(); calMese.setDate(1);
  var calSel = A.oggi();
  A.VIEWS.calendario = function (v) {
    var y = calMese.getFullYear(), m = calMese.getMonth();
    var primo = new Date(y, m, 1), offset = (primo.getDay() + 6) % 7, start = new Date(y, m, 1 - offset);
    var oggi = A.oggi();
    var mappa = {};
    A.istanze(A.ymd(start), A.ymd(new Date(y, m, 1 - offset + 41))).forEach(function (x) { (mappa[x.data] = mappa[x.data] || []).push(x); });
    var h = A.pagina('Calendario', 'Visite, esami, terapie e scadenze',
      '<div class="head-acts"><a class="btn sec sm" href="#/farmaci">' + IC.pill + 'Farmaci</a><button class="btn ghost sm" data-act="exportIcs" aria-label="Esporta nel calendario del telefono">' + IC.down + 'Esporta</button></div>');
    h += '<section class="card"><div class="cal-head"><button class="iconbtn" data-act="mese" data-d="-1" aria-label="Mese precedente">' + IC.left + '</button><h2>' + A.cap(A.MML[m]) + ' ' + y + '</h2><button class="iconbtn" data-act="mese" data-d="1" aria-label="Mese successivo">' + IC.right + '</button></div>' +
      '<div class="cal" role="grid">';
    ['L', 'M', 'M', 'G', 'V', 'S', 'D'].forEach(function (g) { h += '<div class="wd" aria-hidden="true">' + g + '</div>'; });
    for (var i = 0; i < 42; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      if (i >= 35 && d.getMonth() !== m) break;
      var k = A.ymd(d), evs = mappa[k] || [];
      h += '<button class="d' + (d.getMonth() !== m ? ' out' : '') + (k === oggi ? ' today' : '') + (k === calSel ? ' sel' : '') + '" data-act="selGiorno" data-g="' + k + '" aria-label="' + A.fmtLunga(k) + (evs.length ? ', ' + evs.length + ' impegni' : '') + '">' + d.getDate() +
        '<span class="dots">' + evs.slice(0, 3).map(function (x) { return '<i class="' + (A.COL[x.e.tipo] || 'c7') + '"></i>'; }).join('') + '</span></button>';
    }
    h += '</div>' + (calMese.getMonth() !== new Date().getMonth() || calMese.getFullYear() !== new Date().getFullYear() ? '<button class="linkbtn" data-act="meseOggi">Torna a oggi</button>' : '') + '</section>';
    var del = mappa[calSel] || A.istanze(calSel, calSel);
    h += A.titolo(A.cap(A.fmtLunga(calSel)), '<button class="linkbtn" data-act="nuovoEvento" data-g="' + calSel + '">' + IC.plus + 'Aggiungi</button>');
    h += del.length ? '<div class="list">' + del.map(A.eventoItem).join('') + '</div>' : '<p class="muted pad">Niente in programma in questo giorno.</p>';
    var pros = A.prossimi(20);
    h += A.titolo('Prossimi impegni', '<span class="muted">' + pros.length + (pros.length === 20 ? '+' : '') + '</span>');
    h += pros.length ? '<div class="list">' + pros.map(A.eventoItem).join('') + '</div>' : A.vuoto('cal', 'Nessun impegno in arrivo', 'Aggiungilo con il tasto qui sotto, oppure dalle email sanitarie.');
    h += '<button class="fab" data-act="nuovoEvento" data-g="' + calSel + '">' + IC.plus + '<span>Nuovo</span></button>';
    v.innerHTML = h;
  };
  A.ACT.mese = function (el) { calMese.setMonth(calMese.getMonth() + (+el.dataset.d)); A.ridisegna(); };
  A.ACT.meseOggi = function () { calMese = new Date(); calMese.setDate(1); calSel = A.oggi(); A.ridisegna(); };
  A.ACT.selGiorno = function (el) { calSel = el.dataset.g; var d = A.parseYmd(calSel); if (d.getMonth() !== calMese.getMonth()) calMese = new Date(d.getFullYear(), d.getMonth(), 1); A.ridisegna(); };

  // ---------- dettaglio ----------
  A.ACT.apriEvento = function (el) { A.apriEvento(el.dataset.id, el.dataset.g); };
  A.apriEvento = function (id, g) {
    var e = A.evento(id); if (!e) { A.toast('Appuntamento non trovato'); return; }
    var data = g || e.data, c = A.contatto(e.contattoId);
    var dove = e.indirizzo || e.luogo || (c && c.indirizzo);
    var h = '<div class="row"><span class="ticon ' + (A.COL[e.tipo] || 'c7') + '">' + A.ico(e.tipo) + '</span><div class="grow"><span class="tag">' + esc(A.nomeTipo(e.tipo)) + '</span>' +
      (e.fonte === 'email' ? ' <span class="tag">da email</span>' : '') + (e.fonte === 'agendapp' ? ' <span class="tag">da AgendApp</span>' : '') +
      '<p class="big">' + A.cap(A.fmtLunga(data)) + (e.ora ? ' · ore ' + e.ora : '') + '</p></div></div>';
    h += A.fatto('Dove', e.luogo || e.indirizzo ? esc(e.luogo) + (e.indirizzo && e.indirizzo !== e.luogo ? '<br><span class="muted">' + esc(e.indirizzo) + '</span>' : '') : '');
    h += A.fatto('Si ripete', esc(descRipeti(e.ripeti)));
    h += A.fatto('Promemoria', (e.avvisi || D().imp.avvisi).map(function (a) { return NOME_AVV[a]; }).filter(Boolean).join(', ') || 'nessuno');
    var qa = (dove ? '<a class="qa" href="' + esc(A.mapsDir(dove)) + '" target="_blank" rel="noopener">' + IC.route + 'Percorso</a>' : '') + (c ? A.qaHtml({ tel: c.tel, whatsapp: c.whatsapp, email: c.email, tel2: c.tel2 }) : '');
    if (qa) h += '<div class="quick">' + qa + '</div>';
    if (c) h += '<button class="found" data-act="apriContatto" data-id="' + c.id + '"><span class="muted">Contatto</span><b>' + esc(c.nome) + '</b>' + (c.tel ? '<span>' + esc(c.tel) + '</span>' : '') + '</button>';
    if (e.preparazione) h += '<h3>Preparazione</h3><p class="prewrap">' + esc(e.preparazione) + '</p>';
    if (e.portare && e.portare.length) {
      h += '<h3>Da portare</h3>' + e.portare.map(function (p, i) {
        return '<label class="check' + (p.ok ? ' done' : '') + '"><input type="checkbox" data-chg="portare" data-id="' + e.id + '" data-i="' + i + '"' + (p.ok ? ' checked' : '') + '><span>' + esc(p.t) + '</span></label>';
      }).join('');
    }
    var docs = (e.docIds || []).map(A.documento).filter(Boolean);
    if (docs.length) h += '<h3>Documenti collegati</h3><div class="list">' + docs.map(A.docItem).join('') + '</div>';
    if (e.domande) h += '<h3>Domande per il medico</h3><p class="prewrap">' + esc(e.domande) + '</p>';
    if (e.note) h += '<h3>Note</h3><p class="prewrap">' + esc(e.note) + '</p>';
    h += '<div class="btns col">' +
      '<button class="btn sec" data-act="portareEvento" data-id="' + e.id + '">' + IC.list + 'Cosa portare e documenti</button>' +
      '<button class="btn sec" data-act="domandeEvento" data-id="' + e.id + '">' + IC.help + 'Domande da fare al medico</button>' +
      (e.emailId && D().email[e.emailId] ? '<button class="btn ghost" data-act="apriEmail" data-id="' + esc(e.emailId) + '">' + IC.mail + 'Vedi l\'email di origine</button>' : '') + '</div>' +
      '<div class="btns"><button class="btn" data-act="modEvento" data-id="' + e.id + '">' + IC.edit + 'Modifica</button><button class="btn ghost" data-act="icsEvento" data-id="' + e.id + '">' + IC.down + 'Nel telefono</button><button class="btn danger" data-act="delEvento" data-id="' + e.id + '" aria-label="Elimina">' + IC.trash + '</button></div>';
    A.sheet(esc(e.titolo || A.nomeTipo(e.tipo)), h);
  };
  document.addEventListener('change', function (ev) {
    var el = ev.target.closest('[data-chg="portare"]'); if (!el) return;
    var e = A.evento(el.dataset.id); if (!e) return;
    e.portare[+el.dataset.i].ok = el.checked; A.save();
    el.closest('.check').classList.toggle('done', el.checked);
  });
  A.ACT.delEvento = function (el) {
    var e = A.evento(el.dataset.id); if (!e) return;
    if (!confirm('Eliminare "' + (e.titolo || e.tipo) + '"' + (e.ripeti && e.ripeti.f !== 'no' ? ' e tutte le sue ripetizioni' : '') + '?')) return;
    if (e.ponte && window.Ponte) Ponte.ignora(e.ponte);
    A.D.eventi = A.D.eventi.filter(function (x) { return x.id !== e.id; });
    // l'email da cui veniva torna "da proporre"? no: resta segnata come ignorata
    A.log('Appuntamento eliminato', e.titolo || e.tipo);
    A.save(); A.chiudiSheet(true); A.ridisegna(); A.toast('Appuntamento eliminato');
  };
  A.ACT.nuovoEvento = function (el) { A.formEvento({ data: (el && el.dataset.g) || A.oggi() }); };
  A.ACT.modEvento = function (el) { A.chiudiSheet(); A.formEvento(A.evento(el.dataset.id)); };

  // ---------- modulo ----------
  A.formEvento = function (e, dopo) {
    e = e || {};
    var nuovo = !e.id, tipo = e.tipo || 'Visita';
    var portare = (e.portare || []).map(function (p) { return p.t; });
    var rip = e.ripeti || { f: 'no' };
    var avvisi = (e.avvisi || D().imp.avvisi).slice();
    var docIds = (e.docIds || []).slice();
    var opzC = '<option value="">— nessuno —</option>' + D().contatti.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); }).map(function (c) { return '<option value="' + c.id + '"' + (c.id === e.contattoId ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('');
    var docs = D().documenti.slice().sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); }).slice(0, 40);
    var h = '<form id="fEv" novalidate><fieldset class="f"><legend>Che cos\'è</legend><div class="chips wrap" id="tipiEv">' + A.TIPI.map(function (t) { return '<button type="button" class="chip' + (t === tipo ? ' on' : '') + '" aria-pressed="' + (t === tipo) + '" data-t="' + t + '">' + A.nomeTipo(t) + '</button>'; }).join('') + '</div></fieldset>' +
      '<label class="f"><span>Titolo</span><input class="inp" name="titolo" placeholder="Es. Visita cardiologica, Rinnovo piano terapeutico" value="' + esc(e.titolo || '') + '"></label>' +
      '<div class="two"><label class="f"><span>Giorno</span><input class="inp" type="date" name="data" required value="' + esc(e.data || A.oggi()) + '"></label><label class="f"><span>Ora (facoltativa)</span><input class="inp" type="time" name="ora" value="' + esc(e.ora || '') + '"></label></div>' +
      '<label class="f"><span>Dove (struttura, reparto)</span><input class="inp" name="luogo" placeholder="Es. Ospedale di Circolo, Cardiologia" value="' + esc(e.luogo || '') + '"></label>' +
      '<label class="f"><span>Indirizzo (per il navigatore)</span><input class="inp" name="indirizzo" placeholder="Via, numero, città" value="' + esc(e.indirizzo || '') + '"></label>' +
      '<label class="f"><span>Medico o struttura in rubrica</span><select class="inp" name="contattoId">' + opzC + '</select></label>' +
      '<div class="two"><label class="f"><span>Ripetizione</span><select class="inp" name="rf">' + A.RIPETI.map(function (r) { return '<option value="' + r[0] + '"' + (rip.f === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="f rip"><span>Ogni quanti</span><input class="inp" type="number" min="1" max="60" name="rogni" value="' + esc(rip.ogni || 1) + '"></label></div>' +
      '<label class="f rip"><span>Fino al (vuoto = sempre)</span><input class="inp" type="date" name="rfino" value="' + esc(rip.fino || '') + '"></label>' +
      '<fieldset class="f"><legend>Promemoria</legend><div class="chips wrap" id="avvEv">' + A.AVVISI.map(function (a) { var on = avvisi.indexOf(a[0]) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div></fieldset>' +
      '<label class="f"><span>Preparazione (digiuno, farmaci da sospendere…)</span><textarea class="inp" name="preparazione" placeholder="Scrivi le istruzioni ricevute">' + esc(e.preparazione || '') + '</textarea></label>' +
      '<fieldset class="f"><legend>Da portare</legend><div class="chips wrap" id="portEv">' +
      A.PORTARE.concat(portare.filter(function (p) { return A.PORTARE.indexOf(p) < 0; })).map(function (p) { var on = portare.indexOf(p) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-p="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div>' +
      '<div class="row"><input class="inp grow" id="altroPort" placeholder="Altro da portare…"><button type="button" class="btn sec sm" id="addPort">' + IC.plus + 'Aggiungi</button></div></fieldset>' +
      (docs.length ? '<fieldset class="f"><legend>Documenti da collegare</legend><div class="chips wrap" id="docEv">' + docs.map(function (d) { var on = docIds.indexOf(d.id) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-d="' + d.id + '">' + esc(A.taglia(d.titolo, 34)) + (d.data ? ' · ' + A.fmtBreve(d.data) : '') + '</button>'; }).join('') + '</div></fieldset>' : '') +
      '<label class="f"><span>Note</span><textarea class="inp" name="note" placeholder="Codice prenotazione, piano, reparto…">' + esc(e.note || '') + '</textarea></label>' +
      '<button class="btn block" type="submit">' + IC.check + (nuovo ? 'Salva nel calendario' : 'Salva le modifiche') + '</button></form>';
    A.sheet(nuovo ? 'Nuovo impegno' : 'Modifica impegno', h, function (s) {
      function toggle(box, attr, multi) {
        A.$(box, s).addEventListener('click', function (ev) {
          var b = ev.target.closest('[' + attr + ']'); if (!b) return;
          if (!multi) A.$$(box + ' .chip', s).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
          else { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); }
          if (!multi) tipo = b.dataset.t;
        });
      }
      toggle('#tipiEv', 'data-t', false); toggle('#avvEv', 'data-a', true); toggle('#portEv', 'data-p', true);
      if (A.$('#docEv', s)) toggle('#docEv', 'data-d', true);
      function mostraRip() { var on = A.$('[name=rf]', s).value !== 'no'; A.$$('.rip', s).forEach(function (x) { x.hidden = !on; }); }
      A.$('[name=rf]', s).addEventListener('change', mostraRip); mostraRip();
      A.$('#addPort', s).addEventListener('click', function () {
        var t = A.$('#altroPort', s).value.trim(); if (!t) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip on'; b.dataset.p = t; b.textContent = t; b.setAttribute('aria-pressed', 'true');
        A.$('#portEv', s).appendChild(b); A.$('#altroPort', s).value = '';
      });
      A.$('[name=contattoId]', s).addEventListener('change', function () {
        var c = A.contatto(this.value); if (!c) return;
        if (!A.$('[name=luogo]', s).value) A.$('[name=luogo]', s).value = c.nome;
        if (!A.$('[name=indirizzo]', s).value && c.indirizzo) A.$('[name=indirizzo]', s).value = c.indirizzo;
      });
      A.$('#fEv', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target);
        if (!f.get('data')) { A.toast('Scegli il giorno'); return; }
        var vecchi = {}; (e.portare || []).forEach(function (p) { vecchi[p.t] = p.ok; });
        var rec = Object.assign({}, e, {
          id: e.id || A.uid(), tipo: tipo, titolo: String(f.get('titolo')).trim() || A.nomeTipo(tipo), data: f.get('data'), ora: f.get('ora'),
          luogo: String(f.get('luogo')).trim(), indirizzo: String(f.get('indirizzo')).trim(), contattoId: f.get('contattoId'), note: String(f.get('note')).trim(),
          preparazione: String(f.get('preparazione')).trim(),
          ripeti: f.get('rf') === 'no' ? { f: 'no' } : { f: f.get('rf'), ogni: Math.max(1, +f.get('rogni') || 1), fino: f.get('rfino') || '' },
          avvisi: A.$$('#avvEv .chip.on', s).map(function (b) { return b.dataset.a; }),
          docIds: A.$('#docEv', s) ? A.$$('#docEv .chip.on', s).map(function (b) { return b.dataset.d; }) : docIds,
          portare: A.$$('#portEv .chip.on', s).map(function (b) { return { t: b.dataset.p, ok: !!vecchi[b.dataset.p] }; }),
          fonte: e.fonte || 'manuale', emailId: e.emailId || '', demo: e.demo || false, creato: e.creato || Date.now(), ponte: e.ponte || ''
        });
        if (nuovo) A.D.eventi.push(rec); else A.D.eventi = A.D.eventi.map(function (x) { return x.id === rec.id ? rec : x; });
        A.log(nuovo ? 'Appuntamento aggiunto' : 'Appuntamento modificato', rec.titolo + ' · ' + rec.data);
        A.save(); A.chiudiSheet(); calSel = rec.data; var dd = A.parseYmd(rec.data); calMese = new Date(dd.getFullYear(), dd.getMonth(), 1);
        A.toast(nuovo ? 'Salvato nel calendario' : 'Modifiche salvate');
        if (rec.avvisi.length && window.Notification && Notification.permission === 'default') A.chiediNotifiche();
        if (dopo) dopo(rec); A.ridisegna();
      });
    });
  };

  // ---------- promemoria ----------
  function momento(code, x) {
    var e = x.e, inizio = A.at(x.data, e.ora || '08:00'), d = A.parseYmd(x.data);
    switch (code) {
      case '1s': d.setDate(d.getDate() - 7); d.setHours(9, 0, 0, 0); return d;
      case '2g': d.setDate(d.getDate() - 2); d.setHours(9, 0, 0, 0); return d;
      case 'vigilia': d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); return d;
      case 'mattina': d.setHours(8, 0, 0, 0); return d < inizio ? d : null;
      case '2h': return e.ora ? new Date(inizio - 2 * 36e5) : null;
      case '1h': return e.ora ? new Date(inizio - 36e5) : null;
      case '30m': return e.ora ? new Date(inizio - 18e5) : null;
    }
    return null;
  }
  A.controllaEventi = function (now) {
    if (!D().imp.promEventi) return;
    A.istanze(A.addGiorni(A.oggi(), -1), A.addGiorni(A.oggi(), 8)).forEach(function (x) {
      var e = x.e, inizio = A.at(x.data, e.ora || '08:00');
      if (inizio < now) return;
      (e.avvisi || D().imp.avvisi).forEach(function (code) {
        var t = momento(code, x), k = x.key + '|' + code;
        if (!t || now < t || D().notificati[k]) return;
        D().notificati[k] = Date.now(); A.save();
        if (now - t > 12 * 36e5) return; // troppo vecchio: non disturbo
        var portare = (e.portare || []).filter(function (p) { return !p.ok; }).map(function (p) { return p.t; });
        var titolo = A.quando(x.data) + ': ' + (e.titolo || e.tipo) + (e.ora ? ' alle ' + e.ora : '');
        var testo = [e.luogo, e.preparazione ? 'Preparazione: ' + A.taglia(e.preparazione, 80) : '', portare.length ? 'Porta: ' + portare.join(', ') : ''].filter(Boolean).join('. ');
        A.notificaSistema(titolo, testo, { tipo: 'evento', id: e.id });
        if (!document.hidden) A.banner('<span class="ticon ' + (A.COL[e.tipo] || 'c7') + '">' + A.ico(e.tipo) + '</span><div class="grow"><b>' + esc(titolo) + '</b><span>' + esc(testo) + '</span></div><button class="btn sm" data-b="apri">Apri</button><button class="btn sm ghost" data-b="ok">OK</button>',
          function (a) { if (a === 'apri') A.apriEvento(e.id, x.data); }, 60000);
      });
    });
  };

  // ---------- esportazione nel calendario del telefono (.ics) ----------
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&'); }
  function icsDt(d) { return d.getFullYear() + A.pad(d.getMonth() + 1) + A.pad(d.getDate()) + 'T' + A.pad(d.getHours()) + A.pad(d.getMinutes()) + '00'; }
  var TRIG = { '1s': '-P7D', '2g': '-P2D', '2h': '-PT2H', '1h': '-PT1H', '30m': '-PT30M' };
  A.icsEvento = function (e) {
    var r = ['BEGIN:VEVENT', 'UID:' + e.id + '@cartellina', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'];
    if (e.ora) { var s = A.at(e.data, e.ora); r.push('DTSTART:' + icsDt(s), 'DTEND:' + icsDt(new Date(s.getTime() + 36e5))); }
    else r.push('DTSTART;VALUE=DATE:' + e.data.replace(/-/g, ''));
    var rp = e.ripeti;
    if (rp && rp.f && rp.f !== 'no') r.push('RRULE:FREQ=' + { giorno: 'DAILY', sett: 'WEEKLY', mese: 'MONTHLY', anno: 'YEARLY' }[rp.f] + ';INTERVAL=' + (rp.ogni || 1) + (rp.fino ? ';UNTIL=' + rp.fino.replace(/-/g, '') + 'T235959' : ''));
    r.push('SUMMARY:' + icsEsc(e.titolo || e.tipo), 'LOCATION:' + icsEsc([e.luogo, e.indirizzo].filter(Boolean).join(', ')),
      'DESCRIPTION:' + icsEsc([e.preparazione ? 'Preparazione: ' + e.preparazione : '', (e.portare || []).length ? 'Da portare: ' + e.portare.map(function (p) { return p.t; }).join(', ') : '', e.note].filter(Boolean).join('\n')));
    var min = e.ora ? (+e.ora.slice(0, 2)) * 60 + (+e.ora.slice(3, 5)) : 0;
    (e.avvisi || D().imp.avvisi).forEach(function (a) {
      var t = TRIG[a];
      if (a === 'vigilia') t = '-PT' + (min + 360) + 'M';                 // giorno prima alle 18
      if (a === 'mattina') { if (min < 480 && e.ora) return; t = e.ora ? '-PT' + (min - 480) + 'M' : 'PT480M'; } // alle 8
      if (!e.ora && /^(2h|1h|30m)$/.test(a)) return;
      r.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.titolo || e.tipo), 'TRIGGER:' + t, 'END:VALARM');
    });
    r.push('END:VEVENT');
    return r.join('\r\n');
  };
  A.icsWrap = function (x) { return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Cartellina//IT\r\nCALSCALE:GREGORIAN\r\n' + x.join('\r\n') + '\r\nEND:VCALENDAR'; };
  A.ACT.exportIcs = function () {
    var l = A.D.eventi.filter(function (e) { return A.occorrenze(e, A.oggi(), A.addGiorni(A.oggi(), 1100)).length; });
    if (!l.length) { A.toast('Nessun impegno futuro da esportare'); return; }
    A.scarica('cartellina-calendario.ics', A.icsWrap(l.map(A.icsEvento)), 'text/calendar');
    A.log('Calendario esportato', l.length + ' impegni (.ics)'); A.save();
    A.toast('File scaricato: aprilo per aggiungere gli impegni al calendario del telefono', 4500);
  };
  A.ACT.icsEvento = function (el) { var e = A.evento(el.dataset.id); A.scarica((e.titolo || 'appuntamento').replace(/\W+/g, '-') + '.ics', A.icsWrap([A.icsEvento(e)]), 'text/calendar'); };
})(CA);
