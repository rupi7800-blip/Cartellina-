/* =========================================================
   Cartellina — avvio, sblocco, collegamento con le altre app
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC;

  // aspetto subito, prima ancora dello sblocco (niente lampi di colore)
  try { var asp = JSON.parse(localStorage.getItem('cartellina.aspetto')); if (asp) { A.D.imp.tema = asp.tema || 'auto'; A.D.imp.testo = asp.testo || 'normale'; } } catch (e) { /* facoltativo */ }
  A.applicaAspetto();

  Archivio.onErrore = function (e) { console.error(e); A.toast('Attenzione: non riesco a salvare sul dispositivo (' + (e && e.message || 'errore') + '). Libera spazio o esporta i dati.', 6000); };

  // ---------- sblocco ----------
  function schermataBlocco() {
    var r = A.$('#lockRoot');
    r.hidden = false;
    r.innerHTML = '<div class="lock"><img src="icons/logo.svg" alt="" width="72" height="72"><h1>Cartellina</h1><p>I tuoi dati sono protetti. Inserisci il PIN.</p>' +
      '<form id="fLock"><label class="sr" for="pinIn">PIN</label><input class="inp pin" id="pinIn" type="password" autocomplete="current-password" required><button class="btn block" type="submit">' + IC.lock + 'Sblocca</button></form><p class="err" id="lockErr" role="alert"></p>' +
      '<details><summary>Ho dimenticato il PIN</summary><p class="small">Il PIN non è salvato da nessuna parte: senza, i dati cifrati non si possono leggere. Puoi ripartire da zero (perdendo i dati su questo dispositivo) e poi importare un\'esportazione, se ne hai una.</p><button class="btn danger sm" id="lockReset">Cancella tutto e ricomincia</button></details>' +
      '<a class="sos" href="tel:112">Emergenza 112</a></div>';
    var inp = A.$('#pinIn'), tentativi = 0;
    setTimeout(function () { inp.focus(); }, 50);
    A.$('#fLock').addEventListener('submit', function (e) {
      e.preventDefault();
      var b = A.$('#fLock button'); b.disabled = true; b.innerHTML = '<span class="spinner"></span> Verifico…';
      Archivio.sblocca(inp.value).then(function (ok) {
        if (ok) { r.hidden = true; r.innerHTML = ''; avvia(true); return; }
        tentativi++;
        A.$('#lockErr').textContent = 'PIN non corretto.' + (tentativi >= 3 ? ' Attendi qualche secondo e riprova.' : '');
        inp.value = '';
        setTimeout(function () { b.disabled = false; b.innerHTML = IC.lock + 'Sblocca'; inp.focus(); }, tentativi >= 3 ? 1500 * tentativi : 0);
      });
    });
    A.$('#lockReset').addEventListener('click', function () {
      if (prompt('Tutti i dati di Cartellina su questo dispositivo verranno cancellati. Per confermare scrivi CANCELLA') !== 'CANCELLA') return;
      Archivio.cancellaTutto().then(function () { location.replace(location.pathname); });
    });
  }
  A.blocca = function () {
    if (!Archivio.pinAttivo()) return;
    A.pronto = false;
    Archivio.flush().then(function () { Archivio.blocca(); location.reload(); });
  };

  // ---------- avvio vero e proprio ----------
  function avvia(conPin) {
    Archivio.caricaDati().then(function (d) {
      A.D = A.normalizza(d);
      if (conPin) A.log('App sbloccata con il PIN');
      var migrate = A.migraEmail();
      A.pulisci();
      A.save();
      A.applicaAspetto();
      A.pronto = true;
      document.body.classList.remove('caricamento');
      gestisciParametri();
      A.route();
      avviaPonte();
      setInterval(A.tick, 15000);
      setTimeout(A.tick, 1500);
      A.avviaPolling();
      setTimeout(function () { A.controllaEmail(false); }, 3000);
      if (migrate) console.info('Cartellina: analizzate ' + migrate + ' email della versione precedente');
    }).catch(function (e) {
      console.error(e);
      A.$('#view').innerHTML = '<div class="notice warn"><h2>Non riesco ad aprire l\'archivio</h2><p>' + esc(e.message || e) + '</p><p>Se stai usando la navigazione privata, aprila in una finestra normale: in quella modalità il browser non conserva i dati.</p><button class="btn" data-act="ricarica">Riprova</button></div>';
      document.body.classList.remove('caricamento');
    });
  }

  var pollTimer = null;
  A.avviaPolling = function () {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () { A.controllaEmail(false); }, Math.max(5, +A.D.imp.intervallo || 10) * 60000);
  };
  function gestisciParametri() {
    var p = new URLSearchParams(location.search);
    if (p.get('dose')) {
      var k = p.get('dose'), a = p.get('azione');
      if (a === 'presa' || a === 'rimanda') A.azioneDose(k, a);
      else { var q = k.split('|'), f = A.farmaco(q[0]); if (f && !A.D.assunzioni[k]) setTimeout(function () { A.lanciaAllarme({ f: f, data: q[1], ora: q[2], key: k }); }, 400); }
    }
    if (p.get('evento')) setTimeout(function () { A.apriEvento(p.get('evento')); }, 300);
    if (p.get('vai')) location.hash = '#/' + p.get('vai');
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (!A.pronto) return;
      var d = e.data || {};
      if (d.type === 'dose') {
        if (d.azione === 'presa' || d.azione === 'rimanda') A.azioneDose(d.key, d.azione);
        else { var p = d.key.split('|'), f = A.farmaco(p[0]); if (f && !A.D.assunzioni[d.key]) A.lanciaAllarme({ f: f, data: p[1], ora: p[2], key: d.key }); }
      }
      if (d.type === 'evento' && d.id) A.apriEvento(d.id);
      if (d.type === 'email') location.hash = '#/email';
    });
  }

  // blocco automatico e salvataggio quando l'app va in secondo piano
  var nascostaDa = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { nascostaDa = Date.now(); Archivio.flush(); return; }
    if (!A.pronto) return;
    var min = +A.D.imp.bloccoMin;
    if (Archivio.pinAttivo() && min > 0 && nascostaDa && Date.now() - nascostaDa > min * 60000) { A.blocca(); return; }
    A.tick();
    if (Date.now() - (A.D.imp.ultimoControllo || 0) > 3 * 60000) A.controllaEmail(false);
  });
  window.addEventListener('pagehide', function () { Archivio.flush(); });
  window.addEventListener('online', function () { if (A.pronto) A.controllaEmail(false); });

  // ---------- Ponte: AgendApp e Smistino ----------
  function tipoDaTitolo(t) {
    var n = A.norm(t || '');
    if (/ricover|degenza/.test(n)) return 'Ricovero';
    if (/intervent|operazion|chirurg/.test(n)) return 'Intervento';
    if (/\btac\b|risonanz|\brm\b|ecograf|radiograf|\brx\b|mammograf|\bpet\b|scintigraf|densitometr|ecocardio|\becg\b|elettrocard|holter/.test(n)) return 'Diagnostica';
    if (/esam|analisi|prelie|sangue|urine|tampone/.test(n)) return 'Esame';
    if (/terapi|fisio|riabilit|seduta|infusion|chemio|dialisi|vaccin/.test(n)) return 'Terapia';
    if (/rinnov|ricett|piano terapeutico/.test(n)) return 'Rinnovo';
    if (/visit|control|dott|medic|special|consulto/.test(n)) return 'Visita';
    return 'Altro';
  }
  function pontePubblica() {
    var lim = A.ymd(new Date(Date.now() - 30 * 864e5)), eventi = [], mitt = [];
    A.D.eventi.forEach(function (e) {
      if (e.demo || e.fonte === 'agendapp' || !e.data || e.data < lim) return;
      var c = A.contatto(e.contattoId), porta = (e.portare || []).map(function (p) { return p.t; });
      eventi.push({ id: e.id, tipo: 'appuntamento', titolo: e.titolo || e.tipo, data: e.data, ora: e.ora || '', luogo: e.luogo || '', indirizzo: e.indirizzo || '', area: 'salute',
        note: [A.nomeTipo(e.tipo), c ? c.nome + (c.tel ? ' · ' + c.tel : '') : '', porta.length ? 'Da portare: ' + porta.join(', ') : '', e.note].filter(Boolean).join('\n') });
    });
    var add = function (a) { a = String(a || '').trim().toLowerCase(); if (a && mitt.indexOf(a) < 0) mitt.push(a); };
    A.D.regole.fidati.forEach(add);
    A.D.contatti.forEach(function (c) { if (c.email && !c.demo) add(c.email); });
    return { eventi: eventi, mittenti: mitt };
  }
  function ponteRicevi(da, dati) {
    var n = 0, parti = [];
    if (da === 'smistino') {
      var lista = [];
      (dati.messaggi || []).forEach(function (m) {
        var id = m.gid || ('sm-' + m.id);
        if (!m.id || A.D.email[id] || Ponte.ignorato('smistino:' + m.id)) return;
        lista.push({ id: id, from: m.from || '', subject: m.subject || '', body: m.body || '', date: m.date, labels: m.labels || [], attachments: m.attachments || [] });
      });
      if (lista.length) {
        var st = A.elaboraEmail(lista, 'smistino');
        // Smistino l'ha già messa in Salute: se non sono sicura, la chiedo a te
        lista.forEach(function (e) { var r = A.D.email[e.id]; if (r && r.stato === 'scartata') { r.stato = 'verifica'; r.motivi = ['Smistino l\'ha messa in Salute'].concat(r.motivi || []); A.analizzaEmail(r); st.verifica++; } });
        A.save(); n += st.nuove;
        parti.push(st.nuove + ' email' + (st.sanitarie ? ', ' + st.sanitarie + ' sanitari' + (st.sanitarie > 1 ? 'e' : 'a') : '') + (st.verifica ? ', ' + st.verifica + ' da verificare' : ''));
      }
    }
    if (da === 'agendapp') {
      var lim = A.ymd(new Date(Date.now() - 30 * 864e5)), visti = {}, nuovi = 0, agg = 0;
      (dati.eventi || []).forEach(function (x) {
        if (!x || !x.id || !x.data || x.area !== 'salute') return;
        var u = 'agendapp:' + x.id; visti[u] = 1;
        if (Ponte.ignorato(u)) return;
        var e = A.D.eventi.filter(function (y) { return y.ponte === u; })[0];
        var v = { titolo: x.titolo || 'Appuntamento', data: x.data, ora: x.ora || '', luogo: x.luogo || '', note: x.note || '' };
        if (!e) {
          if (A.D.eventi.some(function (y) { return y.data === x.data && (y.ora || '') === (x.ora || '') && y.fonte !== 'agendapp'; })) return;
          A.D.eventi.push({ id: A.uid(), tipo: tipoDaTitolo(x.titolo), titolo: v.titolo, data: v.data, ora: v.ora, luogo: v.luogo, indirizzo: '', contattoId: '', portare: [], note: v.note,
            ripeti: { f: 'no' }, avvisi: null, docIds: [], fonte: 'agendapp', ponte: u, emailId: '', demo: false, creato: Date.now() });
          nuovi++;
        } else {
          var prima = JSON.stringify([e.titolo, e.data, e.ora, e.luogo, e.note]);
          e.titolo = v.titolo; e.data = v.data; e.ora = v.ora; e.luogo = v.luogo; e.note = v.note;
          if (prima !== JSON.stringify([e.titolo, e.data, e.ora, e.luogo, e.note])) agg++;
        }
      });
      var quanti = A.D.eventi.length;
      A.D.eventi = A.D.eventi.filter(function (e) { return !(e.fonte === 'agendapp' && e.ponte && !visti[e.ponte] && e.data >= lim); });
      var tolti = quanti - A.D.eventi.length;
      if (nuovi + agg + tolti) {
        A.save(); n += nuovi + agg + tolti;
        parti.push([nuovi ? nuovi + ' appuntament' + (nuovi === 1 ? 'o' : 'i') + ' in calendario' : '', agg ? agg + ' aggiornat' + (agg === 1 ? 'o' : 'i') : '', tolti ? tolti + ' tolt' + (tolti === 1 ? 'o' : 'i') : ''].filter(Boolean).join(', '));
      }
    }
    return { n: n, testo: parti.join(', ') };
  }
  function ponteScollega(da, prova) {
    if (da === 'agendapp') {
      var k = A.D.eventi.filter(function (e) { return e.fonte === 'agendapp'; }).length;
      if (!prova && k) { A.D.eventi = A.D.eventi.filter(function (e) { return e.fonte !== 'agendapp'; }); A.save(); }
      return k;
    }
    if (da === 'smistino') {
      var ids = Object.keys(A.D.email).filter(function (i) { return A.D.email[i].fonte === 'smistino'; });
      if (!prova && ids.length) { ids.forEach(function (i) { A.D.eventi = A.D.eventi.filter(function (e) { return e.emailId !== i; }); delete A.D.email[i]; }); A.save(); }
      return ids.length;
    }
    return 0;
  }
  function avviaPonte() {
    if (!window.Ponte) return;
    Ponte.init({
      app: 'cartellina', pubblica: pontePubblica, ricevi: ponteRicevi, scollega: ponteScollega, dopo: A.ridisegna, toast: A.toast,
      descr: {
        agendapp: 'Riceve visite, esami e interventi con orari e luogo. Gli impegni che metti in AgendApp nell\'area Salute arrivano qui.',
        smistino: 'Mi manda le email e i messaggi della sezione Salute, da tutte le tue caselle e chat. Io gli passo medici e ospedali della rubrica.'
      }
    });
  }

  A.ACT.ricarica = function () { location.reload(); };
  // indirizzi della versione 1.x (segnalibri, notifiche)
  A.VIEWS.agenda = function () { location.replace('#/calendario'); };
  A.VIEWS.altro = function () { location.replace('#/impostazioni'); };

  // ---------- via ----------
  if (!window.indexedDB || !window.crypto || !crypto.subtle) {
    A.$('#view').innerHTML = '<div class="notice warn"><h2>Browser non compatibile</h2><p>Cartellina ha bisogno di un browser aggiornato (Chrome, Safari, Firefox o Edge recenti) aperto su un indirizzo sicuro (https).</p></div>';
    document.body.classList.remove('caricamento');
  } else if (Archivio.pinAttivo()) { document.body.classList.remove('caricamento'); schermataBlocco(); }
  else avvia(false);
})(CA);
