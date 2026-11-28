/* =========================================================
   Cartellina — profili su questo telefono
   Un profilo = una persona (se stessi, un genitore, un assistito).
   Ogni profilo ha dati, documenti, PIN, chiave AI e collegamento
   email propri. Non sono account online: nessun login, nessun
   server, nessuna sincronizzazione con altri telefoni.
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC;

  function iniziale(n) { return esc((String(n || '?').trim().charAt(0) || '?').toUpperCase()); }

  // ---------- etichetta in alto: dice sempre di chi sono i dati ----------
  A.mostraChip = function () {
    var b = A.$('#profChip'); if (!b) return;
    var n = (A.profilo && A.profilo.nome) || '';
    b.hidden = !n;
    b.innerHTML = '<span class="ini" aria-hidden="true">' + iniziale(n) + '</span><span class="nm">' + esc(n) + '</span>';
    b.setAttribute('aria-label', 'Profilo in uso: ' + n + '. Tocca per cambiare o gestire i profili');
  };

  // ---------- scelta del profilo (all'avvio, se ce n'è più di uno) ----------
  A.schermataScelta = function () {
    var r = A.$('#lockRoot'); r.hidden = false;
    var l = Archivio.lista();
    r.innerHTML = '<div class="lock"><img src="icons/logo.svg" alt="" width="72" height="72"><h1>Cartellina</h1><p>Di chi sono i dati che vuoi aprire?</p>' +
      '<div class="list scelta">' + l.map(function (p) {
        return '<button class="item" data-p="' + esc(p.id) + '"><span class="avatar">' + iniziale(p.nome) + '</span><span class="grow"><span class="t1">' + esc(p.nome) + '</span><span class="t2">' + (Archivio.pinAttivo(p.id) ? 'Protetto da PIN' : 'Senza PIN') + '</span></span>' + (Archivio.pinAttivo(p.id) ? A.ico('lock', 20) : A.ico('right', 20)) + '</button>';
      }).join('') + '</div>' +
      '<form id="fNuovoP" class="inline-form"><label class="f"><span>Aggiungi un profilo</span><input class="inp" name="n" maxlength="30" placeholder="Nome o soprannome" autocomplete="off"></label><button class="btn sec block" type="submit">' + IC.plus + 'Aggiungi</button></form>' +
      '<a class="sos" href="tel:112">Emergenza 112</a></div>';
    r.addEventListener('click', function click(e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      r.removeEventListener('click', click);
      A.apriProfilo(b.dataset.p);
    });
    A.$('#fNuovoP', r).addEventListener('submit', function (e) {
      e.preventDefault();
      var n = String(new FormData(e.target).get('n') || '').trim(); if (!n) { A.toast('Scrivi un nome'); return; }
      A.apriProfilo(Archivio.nuovoProfilo(n));
    });
  };

  // ---------- gestione dei profili ----------
  A.ACT.apriProfili = function () {
    var l = Archivio.lista(), cur = Archivio.corrente();
    var h = '<p>Ogni profilo ha <b>dati, documenti, PIN e collegamento email separati</b>. Servono, per esempio, a chi assiste più persone.</p>' +
      '<p class="notice">Non sono account online: non c\'è login e non si portano su un altro telefono (per questo ci sono l\'esportazione e la copia nella cartella). I <b>nomi dei profili si vedono senza PIN</b>: usa un nome semplice o un soprannome.</p>' +
      '<div class="list">' + l.map(function (p) {
        var uso = p.id === cur;
        return '<button class="item' + (uso ? ' on' : '') + '" data-act="passaProfilo" data-id="' + esc(p.id) + '"' + (uso ? ' aria-current="true"' : '') + '><span class="avatar">' + iniziale(p.nome) + '</span><span class="grow"><span class="t1">' + esc(p.nome) + '</span><span class="t2">' + (uso ? 'In uso adesso' : 'Tocca per passare a questo profilo') + ' · ' + (Archivio.pinAttivo(p.id) ? 'con PIN' : 'senza PIN') + '</span></span>' + (uso ? A.ico('check', 20) : A.ico('right', 20)) + '</button>';
      }).join('') + '</div>' +
      '<form id="fNP"><label class="f"><span>Aggiungi un profilo</span><div class="row"><input class="inp grow" name="n" maxlength="30" placeholder="Nome o soprannome" autocomplete="off"><button class="btn sec" type="submit">' + IC.plus + 'Aggiungi</button></div></label></form>' +
      '<h3>Profilo in uso: ' + esc(A.profilo.nome) + '</h3><div class="btns"><button class="btn ghost" data-act="rinominaProfilo">' + IC.edit + 'Cambia nome</button><button class="btn danger" data-act="eliminaProfilo">' + IC.trash + 'Elimina questo profilo</button></div>' +
      (window.Cartella && Cartella.supportata() ? '<button class="btn ghost block" data-act="ripristinaCartella">' + IC.up + 'Ripristina un profilo da una cartella</button>' : '') +
      '<p class="muted small">Gli allarmi dei farmaci e il controllo delle email lavorano solo per il profilo aperto. Per avere i promemoria di un profilo anche quando ne usi un altro, esporta il suo calendario e i suoi farmaci nel calendario del telefono.</p>';
    A.sheet('Profili su questo telefono', h, function (s) {
      A.$('#fNP', s).addEventListener('submit', function (e) {
        e.preventDefault();
        var n = String(new FormData(e.target).get('n') || '').trim(); if (!n) { A.toast('Scrivi un nome'); return; }
        var id = Archivio.nuovoProfilo(n); A.log('Profilo aggiunto', n); A.save();
        A.cambiaProfilo(id);
      });
    });
  };
  A.cambiaProfilo = function (id) {
    A.pronto = false;
    var fine = window.Cartella ? Cartella.chiudi() : Promise.resolve();
    Promise.all([Archivio.flush(), fine]).then(function () {
      try { sessionStorage.setItem('cartellina.apri', id); } catch (e) { /* si passa dalla scelta */ }
      location.reload();
    });
  };
  A.ACT.passaProfilo = function (el) {
    if (el.dataset.id === Archivio.corrente()) { A.chiudiSheet(); return; }
    A.cambiaProfilo(el.dataset.id);
  };
  A.ACT.rinominaProfilo = function () {
    var n = prompt('Nuovo nome del profilo (meglio un soprannome: si vede senza PIN)', A.profilo.nome);
    if (n == null || !n.trim()) return;
    Archivio.campoProfilo(Archivio.corrente(), 'nome', n); A.profilo = Archivio.profilo(); A.mostraChip();
    A.log('Profilo rinominato', A.profilo.nome); A.save(); A.chiudiSheet(); A.toast('Nome cambiato. La cartella sul telefono, se c\'è, mantiene il vecchio nome.', 4500);
  };
  // eliminazione completa di un profilo: collegamento con le altre app, copia nella cartella, dati
  A.rimuoviProfilo = function (id) {
    var cart = window.Cartella ? Cartella.eliminaProfilo(id).catch(function () { return false; }) : Promise.resolve(true);
    return cart.then(function (tolta) {
      if (Archivio.ponteProfilo() === id) { try { localStorage.removeItem('ponte.v1.pkt.cartellina'); localStorage.removeItem('ponte.v1.imp.cartellina'); } catch (e) { /* no */ } }
      return Archivio.eliminaProfilo(id).then(function () {
        if (!tolta) { try { sessionStorage.setItem('cartellina.avviso', 'Profilo eliminato dal telefono. I suoi file nella cartella scelta non erano raggiungibili: toglili a mano.'); } catch (e) { /* no */ } }
      });
    });
  };
  A.ACT.eliminaProfilo = function () {
    var nome = A.profilo.nome, id = Archivio.corrente(), ultimo = Archivio.lista().length === 1;
    if (!confirm('Eliminare DEFINITIVAMENTE il profilo "' + nome + '" con tutti i suoi dati e documenti da questo telefono?' + (window.Cartella && Cartella.collegata() ? '\n\nSe ha una copia nella cartella sul telefono, viene tolta anche quella.' : '') + (ultimo ? '\n\nÈ l\'unico profilo: Cartellina ripartirà vuota.' : ''))) return;
    if (prompt('Per confermare scrivi CANCELLA') !== 'CANCELLA') { A.toast('Eliminazione annullata'); return; }
    A.pronto = false;
    A.rimuoviProfilo(id).then(function () { location.replace(location.pathname); });
  };
})(CA);
