/* =========================================================
   Cartellina — Farmaci e terapie, allarmi, notifiche
   (funzioni della versione 1.x, mantenute)
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };
  var GIORNI_UI = [[1, 'L', 'lunedì'], [2, 'M', 'martedì'], [3, 'M', 'mercoledì'], [4, 'G', 'giovedì'], [5, 'V', 'venerdì'], [6, 'S', 'sabato'], [0, 'D', 'domenica']];

  A.farmaco = function (id) { return D().farmaci.filter(function (f) { return f.id === id; })[0]; };
  function attivoIl(f, g) {
    if (f.sospeso) return false;
    if (f.inizio && g < f.inizio) return false;
    if (f.fine && g > f.fine) return false;
    if (f.giorni && f.giorni.length && f.giorni.indexOf(A.parseYmd(g).getDay()) < 0) return false;
    return true;
  }
  A.dosiDelGiorno = function (g) {
    var out = [];
    D().farmaci.forEach(function (f) {
      if (!attivoIl(f, g)) return;
      (f.orari || []).forEach(function (o) { out.push({ f: f, ora: o, data: g, key: f.id + '|' + g + '|' + o }); });
    });
    return out.sort(function (a, b) { return a.ora.localeCompare(b.ora); });
  };
  A.scorteBasse = function (f) { return f.scorte != null && f.scorte !== '' && +f.scorte <= +(f.soglia || 0); };
  function allarmeNome(a) { return a === 'notifica' ? 'notifica' : a === 'banner' ? 'avviso' : 'schermo intero'; }
  A.doseHtml = function (d) {
    var st = D().assunzioni[d.key], now = new Date(), t = A.at(d.data, d.ora);
    var ora = !st && now >= t && now - t < 3 * 36e5;
    var badge = st ? (st.s === 'presa' ? '<span class="tag ok">' + A.ico('check', 14) + 'presa alle ' + A.hm(new Date(st.at)) + '</span>' : '<span class="tag">saltata</span>')
      : ora ? '<button class="btn sm" data-act="presa" data-key="' + esc(d.key) + '">' + IC.check + 'Presa</button>' : (now > t ? '<button class="btn sm ghost" data-act="presa" data-key="' + esc(d.key) + '">L\'ho presa</button>' : '<span class="tag">' + A.ico('bell', 14) + allarmeNome(d.f.allarme) + '</span>');
    return '<div class="item static dose' + (st && st.s === 'presa' ? ' presa' : '') + (ora ? ' ora' : '') + '"><span class="t-ora">' + d.ora + '</span><span class="grow"><span class="t1">' + esc(d.f.nome) + '</span><span class="t2">' + esc([d.f.dose, d.f.istruzioni].filter(Boolean).join(' · ')) + '</span></span>' + badge + '</div>';
  };

  A.VIEWS.farmaci = function (v) {
    var oggi = A.oggi(), dosi = A.dosiDelGiorno(oggi);
    var prese = dosi.filter(function (d) { return D().assunzioni[d.key] && D().assunzioni[d.key].s === 'presa'; }).length;
    var h = '<a class="back" href="#/calendario">' + IC.left + 'Calendario</a>' + A.pagina('Farmaci e terapie', 'Come, quando e quanto', '<button class="btn ghost sm" data-act="icsFarmaci">' + IC.down + 'Nel telefono</button>');
    if (dosi.length) {
      h += '<section class="card"><div class="row"><div class="grow"><h2>Oggi</h2><p class="muted">' + prese + ' di ' + dosi.length + ' assunzioni fatte</p></div><b class="num">' + Math.round(prese / dosi.length * 100) + '%</b></div>' +
        '<div class="bar" role="progressbar" aria-valuenow="' + prese + '" aria-valuemin="0" aria-valuemax="' + dosi.length + '"><i style="width:' + (prese / dosi.length * 100) + '%"></i></div></section><div class="list">' + dosi.map(A.doseHtml).join('') + '</div>';
    }
    h += A.titolo('I miei farmaci', '<span class="muted">' + D().farmaci.length + '</span>');
    if (!D().farmaci.length) h += A.vuoto('pill', 'Nessun farmaco inserito', 'Aggiungilo con il tasto qui sotto: ti ricordo quando prenderlo.');
    else h += '<div class="list">' + D().farmaci.map(function (f) {
      var basse = A.scorteBasse(f);
      return '<button class="item" data-act="modFarmaco" data-id="' + f.id + '"><span class="ticon c4">' + IC.pill + '</span><span class="grow"><span class="t1">' + esc(f.nome) + (f.sospeso ? ' <span class="tag">sospeso</span>' : '') + '</span><span class="t2">' + esc(f.dose || '') + ' · ' + (f.orari || []).join(', ') +
        (f.giorni && f.giorni.length ? ' · ' + GIORNI_UI.filter(function (g) { return f.giorni.indexOf(g[0]) >= 0; }).map(function (g) { return A.GG[g[0]]; }).join(' ') : '') + '</span>' +
        (f.scorte != null && f.scorte !== '' ? '<span class="t2' + (basse ? ' warn-t' : '') + '">' + (basse ? 'Scorte basse: ' : 'Scorte: ') + f.scorte + '</span>' : '') + '</span>' + A.ico('right', 20) + '</button>';
    }).join('') + '</div>';
    h += '<p class="notice">Gli allarmi suonano quando Cartellina è aperta o in secondo piano. Per averli anche ad app chiusa, usa <b>Nel telefono</b> e aggiungi i promemoria al calendario del telefono.</p>';
    h += '<button class="fab" data-act="nuovoFarmaco">' + IC.plus + '<span>Farmaco</span></button>';
    v.innerHTML = h;
  };
  A.ACT.nuovoFarmaco = function () { formFarmaco({}); };
  A.ACT.modFarmaco = function (el) { formFarmaco(A.farmaco(el.dataset.id)); };
  function formFarmaco(f) {
    f = f || {};
    var nuovo = !f.id;
    var orari = (f.orari && f.orari.length ? f.orari : ['08:00']).slice();
    var giorni = (f.giorni || []).slice();
    var allarme = f.allarme || D().imp.allarme || 'schermo';
    var h = '<form id="fFa"><label class="f"><span>Nome del farmaco</span><div class="row"><input class="inp grow" name="nome" required placeholder="Es. Cardioaspirin 100 mg" value="' + esc(f.nome || '') + '"><button type="button" class="iconbtn" id="faInfo" aria-label="Che cos\'è questo farmaco?">' + IC.book + '</button></div></label>' +
      '<div class="two"><label class="f"><span>Quanto per volta</span><input class="inp" name="dose" placeholder="Es. 1 compressa" value="' + esc(f.dose || '') + '"></label>' +
      '<label class="f"><span>Unità tolte dalle scorte</span><input class="inp" name="perDose" type="number" min="0" step="0.5" value="' + esc(f.perDose != null ? f.perDose : 1) + '"></label></div>' +
      '<fieldset class="f"><legend>Orari</legend><div class="times" id="faOrari"></div><button type="button" class="btn sec sm" id="faAddOra">' + IC.plus + 'Aggiungi orario</button></fieldset>' +
      '<fieldset class="f"><legend>Giorni (nessuno = tutti i giorni)</legend><div class="days" id="faGiorni">' + GIORNI_UI.map(function (g) { return '<button type="button" data-g="' + g[0] + '" aria-label="' + g[2] + '" aria-pressed="' + (giorni.indexOf(g[0]) >= 0) + '" class="' + (giorni.indexOf(g[0]) >= 0 ? 'on' : '') + '">' + g[1] + '</button>'; }).join('') + '</div></fieldset>' +
      '<div class="two"><label class="f"><span>Dal</span><input class="inp" type="date" name="inizio" value="' + esc(f.inizio || A.oggi()) + '"></label><label class="f"><span>Al (vuoto = sempre)</span><input class="inp" type="date" name="fine" value="' + esc(f.fine || '') + '"></label></div>' +
      '<label class="f"><span>Come prenderlo</span><input class="inp" name="istruzioni" list="istrList" placeholder="Es. a stomaco pieno" value="' + esc(f.istruzioni || '') + '"><datalist id="istrList"><option>a stomaco pieno</option><option>a stomaco vuoto</option><option>lontano dai pasti</option><option>prima di dormire</option><option>con un bicchiere d\'acqua</option><option>sotto la lingua</option><option>al bisogno</option></datalist></label>' +
      '<fieldset class="f"><legend>Tipo di allarme</legend><div class="seg" id="faAll"><button type="button" data-a="schermo">Schermo intero</button><button type="button" data-a="notifica">Notifica</button><button type="button" data-a="banner">Avviso</button></div></fieldset>' +
      '<div class="two"><label class="f"><span>Scorte (unità rimaste)</span><input class="inp" name="scorte" type="number" min="0" placeholder="Es. 28" value="' + esc(f.scorte != null ? f.scorte : '') + '"></label><label class="f"><span>Avvisami sotto</span><input class="inp" name="soglia" type="number" min="0" value="' + esc(f.soglia != null ? f.soglia : 5) + '"></label></div>' +
      '<label class="f"><span>Note (chi l\'ha prescritto, piano terapeutico…)</span><textarea class="inp" name="note">' + esc(f.note || '') + '</textarea></label>' +
      (nuovo ? '' : '<label class="toggle"><span><b>Sospeso</b><br><span class="muted">Nessun allarme finché è sospeso</span></span><span class="switch"><input type="checkbox" name="sospeso"' + (f.sospeso ? ' checked' : '') + '><i></i></span></label>') +
      '<button class="btn block" type="submit">' + IC.check + 'Salva farmaco</button>' +
      '<div class="btns"><button type="button" class="btn ghost" id="faProva">' + IC.bell + 'Prova l\'allarme</button>' + (nuovo ? '' : '<button type="button" class="btn danger" id="faDel">' + IC.trash + 'Elimina</button>') + '</div>' +
      '<p class="notice small">Cartellina ricorda gli orari che inserisci tu: non suggerisce né modifica dosi o terapie. Per qualsiasi cambiamento chiedi al medico.</p></form>';
    A.sheet(nuovo ? 'Nuovo farmaco' : esc(f.nome), h, function (s) {
      function disegnaOrari() {
        A.$('#faOrari', s).innerHTML = orari.map(function (o, i) { return '<span class="tm"><input class="inp" type="time" aria-label="Orario ' + (i + 1) + '" value="' + o + '" data-i="' + i + '">' + (orari.length > 1 ? '<button type="button" data-rm="' + i + '" aria-label="Togli orario">×</button>' : '') + '</span>'; }).join('');
      }
      disegnaOrari();
      A.$('#faOrari', s).addEventListener('change', function (ev) { if (ev.target.dataset.i != null) orari[+ev.target.dataset.i] = ev.target.value; });
      A.$('#faOrari', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-rm]'); if (b) { orari.splice(+b.dataset.rm, 1); disegnaOrari(); } });
      A.$('#faAddOra', s).addEventListener('click', function () { orari.push(orari.length ? (A.pad((+orari[orari.length - 1].slice(0, 2) + 8) % 24) + ':00') : '08:00'); disegnaOrari(); });
      A.$('#faGiorni', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-g]'); if (!b) return; b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); });
      function segAll() { A.$$('#faAll button', s).forEach(function (b) { b.classList.toggle('on', b.dataset.a === allarme); b.setAttribute('aria-pressed', b.dataset.a === allarme); }); }
      segAll();
      A.$('#faAll', s).addEventListener('click', function (ev) { var b = ev.target.closest('[data-a]'); if (b) { allarme = b.dataset.a; segAll(); } });
      A.$('#faInfo', s).addEventListener('click', function () { var n = A.$('[name=nome]', s).value.trim(); if (!n) { A.toast('Scrivi prima il nome'); return; } A.spiegaTermine(n.split(/\s+\d/)[0], true); });
      A.$('#faProva', s).addEventListener('click', function () {
        var nome = A.$('[name=nome]', s).value.trim() || 'Farmaco di prova';
        lanciaAllarme({ f: { id: 'prova', nome: nome, dose: A.$('[name=dose]', s).value, istruzioni: A.$('[name=istruzioni]', s).value, allarme: allarme }, ora: A.hm(new Date()), data: A.oggi(), key: 'prova|' + Date.now() }, true);
      });
      if (!nuovo) A.$('#faDel', s).addEventListener('click', function () {
        if (!confirm('Eliminare ' + f.nome + '?')) return;
        A.D.farmaci = A.D.farmaci.filter(function (x) { return x.id !== f.id; }); A.log('Farmaco eliminato', f.nome); A.save(); A.chiudiSheet(); A.ridisegna(); A.toast('Farmaco eliminato');
      });
      A.$('#fFa', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var fd = new FormData(ev.target);
        var rec = {
          id: f.id || A.uid(), nome: String(fd.get('nome')).trim(), dose: String(fd.get('dose')).trim(), perDose: +fd.get('perDose') || 0,
          orari: orari.filter(Boolean).sort().filter(function (x, i, a) { return a.indexOf(x) === i; }),
          giorni: A.$$('#faGiorni button.on', s).map(function (b) { return +b.dataset.g; }),
          inizio: fd.get('inizio'), fine: fd.get('fine'), istruzioni: String(fd.get('istruzioni')).trim(), allarme: allarme,
          scorte: fd.get('scorte') === '' ? null : +fd.get('scorte'), soglia: +fd.get('soglia') || 0, note: String(fd.get('note')).trim(),
          sospeso: !!fd.get('sospeso'), creato: f.creato || Date.now()
        };
        if (!rec.nome) { A.toast('Scrivi il nome del farmaco'); return; }
        if (!rec.orari.length) { A.toast('Aggiungi almeno un orario'); return; }
        if (nuovo) A.D.farmaci.push(rec); else A.D.farmaci = A.D.farmaci.map(function (x) { return x.id === rec.id ? rec : x; });
        A.log(nuovo ? 'Farmaco aggiunto' : 'Farmaco modificato', rec.nome);
        A.save(); A.chiudiSheet(); A.ridisegna(); A.toast('Farmaco salvato');
        if (allarme !== 'banner') A.chiediNotifiche();
      });
    });
  }

  // --- suono e vibrazione ---
  var audioCtx = null, suonoTimer = null;
  A.sbloccaAudio = function () {
    try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { /* senza audio */ }
  };
  function nota(freq, t0, dur) {
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function suona() {
    fermaSuono();
    var giro = function () {
      if (D().imp.suono && audioCtx) { var t = audioCtx.currentTime; nota(880, t, 0.35); nota(1175, t + 0.22, 0.4); nota(1568, t + 0.46, 0.55); }
      if (D().imp.vibra && navigator.vibrate) navigator.vibrate([400, 150, 400]);
    };
    A.sbloccaAudio(); giro(); suonoTimer = setInterval(giro, 2200);
  }
  function fermaSuono() { if (suonoTimer) clearInterval(suonoTimer); suonoTimer = null; if (navigator.vibrate) navigator.vibrate(0); }

  // --- notifiche di sistema ---
  A.chiediNotifiche = function () {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    Notification.requestPermission().then(function (p) { if (p === 'granted') A.toast('Notifiche attivate'); });
  };
  A.notificaSistema = function (titolo, testo, dati, azioni) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    if (Archivio.lista().length > 1 && A.profilo.nome) titolo = '[' + A.profilo.nome + '] ' + titolo;
    var opz = { body: testo, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: (dati && (dati.key || dati.id)) || ('c' + Date.now()), data: dati || {}, requireInteraction: !!azioni, vibrate: [300, 120, 300] };
    if (azioni) opz.actions = azioni;
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (r) { r.showNotification(titolo, opz); }).catch(function () {});
    else { try { new Notification(titolo, opz); } catch (e) { return false; } }
    return true;
  };

  // --- allarme farmaci ---
  var codaAllarmi = [], allarmeAperto = null;
  function lanciaAllarme(d, prova) {
    var tipo = d.f.allarme || 'schermo';
    var testo = [d.f.dose, d.f.istruzioni].filter(Boolean).join(' · ') || 'È il momento di prenderlo';
    var azioni = [{ action: 'presa', title: 'Presa' }, { action: 'rimanda', title: 'Rimanda 10 min' }];
    if (tipo === 'notifica') {
      if (!A.notificaSistema(d.f.nome + ' · ' + d.ora, testo, { tipo: 'dose', key: d.key }, azioni) || !document.hidden) mostraBannerDose(d, testo);
      return;
    }
    if (document.hidden) A.notificaSistema(d.f.nome + ' · ' + d.ora, testo, { tipo: 'dose', key: d.key }, azioni);
    if (tipo === 'banner') { mostraBannerDose(d, testo); return; }
    codaAllarmi.push({ d: d, prova: prova });
    if (!allarmeAperto) prossimoAllarme();
  }
  A.lanciaAllarme = lanciaAllarme;
  function mostraBannerDose(d, testo) {
    if (A.$('.banner[data-key="' + CSS.escape(d.key) + '"]')) return;
    var b = A.banner('<span class="ticon c4">' + IC.pill + '</span><div class="grow"><b>' + esc(d.f.nome) + ' · ' + d.ora + '</b><span>' + esc(testo) + '</span></div><button class="btn sm" data-b="presa">Presa</button><button class="btn sm ghost" data-b="rimanda">Tra 10 min</button>',
      function (a) { A.azioneDose(d.key, a); });
    b.dataset.key = d.key;
    if (D().imp.vibra && navigator.vibrate) navigator.vibrate([300, 120, 300]);
    if (D().imp.suono && audioCtx) { var t = audioCtx.currentTime; nota(880, t, 0.3); nota(1175, t + 0.2, 0.4); }
  }
  function prossimoAllarme() {
    var x = codaAllarmi.shift();
    if (!x) { allarmeAperto = null; return; }
    var d = x.d;
    var el = document.createElement('div');
    el.className = 'alarm'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', 'Promemoria farmaco ' + d.f.nome);
    el.innerHTML = '<div class="ring">' + IC.pill + '</div><div class="clock">' + d.ora + '</div>' + (Archivio.lista().length > 1 ? '<div class="note">Profilo: ' + esc(A.profilo.nome) + '</div>' : '') + '<h1>' + esc(d.f.nome) + '</h1><p>' + esc(d.f.dose || 'È il momento del farmaco') + '</p>' +
      (d.f.istruzioni ? '<div class="note">' + esc(d.f.istruzioni) + '</div>' : '') + (x.prova ? '<div class="note">Allarme di prova</div>' : '') +
      '<div class="acts"><button class="go" data-a="presa">L\'ho preso</button><button class="later" data-a="rimanda">Rimanda di 10 minuti</button><button class="skip" data-a="saltata">Salta questa dose</button></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      fermaSuono(); el.remove();
      if (!x.prova) A.azioneDose(d.key, b.dataset.a); else A.toast('Così suonerà il promemoria');
      prossimoAllarme();
    });
    document.body.appendChild(el);
    allarmeAperto = el;
    setTimeout(function () { var g = el.querySelector('.go'); if (g) g.focus(); }, 50);
    suona();
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) { /* no */ }
  }
  A.azioneDose = function (key, a) {
    var p = key.split('|'), f = A.farmaco(p[0]);
    if (a === 'rimanda') { D().rinvii[key] = Date.now() + 10 * 60000; A.save(); A.toast('Te lo ricordo tra 10 minuti'); return; }
    if (D().assunzioni[key]) return;
    D().assunzioni[key] = { s: a === 'presa' ? 'presa' : 'saltata', at: Date.now() };
    if (a === 'presa' && f && f.scorte != null) {
      f.scorte = Math.max(0, +f.scorte - (f.perDose != null ? +f.perDose : 1));
      if (A.scorteBasse(f)) setTimeout(function () { A.toast(f.nome + ': restano ' + f.scorte + ' unità. Ricordati la ricetta.', 5000); }, 600);
    }
    A.save();
    A.$$('.banner').forEach(function (b) { if (b.dataset.key === key) b.remove(); });
    if (/farmaci|home/.test(location.hash) || !location.hash) A.ridisegna();
    if (a === 'presa') A.toast('Segnato come preso');
  };
  A.ACT.presa = function (el) { A.azioneDose(el.dataset.key, 'presa'); };

  var scattati = {};
  A.tick = function () {
    if (!A.pronto) return;
    var now = new Date();
    [A.ymd(now), A.ymd(new Date(now.getTime() - 3 * 36e5))].filter(function (x, i, a) { return a.indexOf(x) === i; }).forEach(function (g) {
      A.dosiDelGiorno(g).forEach(function (d) {
        if (D().assunzioni[d.key]) return;
        var t = A.at(d.data, d.ora);
        if (now < t || now - t > 3 * 36e5) return;
        var r = D().rinvii[d.key];
        if (r && now.getTime() < r) return;
        var sig = d.key + '|' + (r || 0);
        if (scattati[sig]) return;
        scattati[sig] = 1;
        lanciaAllarme(d);
      });
    });
    A.controllaEventi(now);
  };

  A.ACT.icsFarmaci = function () {
    var by = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' }, r = [];
    D().farmaci.filter(function (f) { return !f.sospeso; }).forEach(function (f) {
      f.orari.forEach(function (o) {
        var s = A.at(f.inizio || A.oggi(), o);
        var rr = 'RRULE:FREQ=' + (f.giorni && f.giorni.length ? 'WEEKLY;BYDAY=' + f.giorni.map(function (g) { return by[g]; }).join(',') : 'DAILY') + (f.fine ? ';UNTIL=' + f.fine.replace(/-/g, '') + 'T235959' : '');
        var dt = function (d) { return d.getFullYear() + A.pad(d.getMonth() + 1) + A.pad(d.getDate()) + 'T' + A.pad(d.getHours()) + A.pad(d.getMinutes()) + '00'; };
        var e = function (x) { return String(x || '').replace(/[,;\\]/g, '\\$&'); };
        r.push(['BEGIN:VEVENT', 'UID:' + f.id + '-' + o.replace(':', '') + '@cartellina', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART:' + dt(s), 'DTEND:' + dt(new Date(s.getTime() + 10 * 60000)), rr,
          'SUMMARY:' + e(f.nome + (f.dose ? ' – ' + f.dose : '')), 'DESCRIPTION:' + e(f.istruzioni), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + e(f.nome), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
      });
    });
    if (!r.length) { A.toast('Nessun farmaco attivo'); return; }
    A.scarica('cartellina-farmaci.ics', A.icsWrap(r), 'text/calendar'); A.toast('File scaricato: aprilo per aggiungere i promemoria al calendario', 4000);
  };
})(CA);
