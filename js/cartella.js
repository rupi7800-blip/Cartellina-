/* =========================================================
   Cartellina — copia di tutto in una cartella del telefono
   Una web app NON può creare da sola una cartella nella memoria del
   telefono: è il telefono a chiedere che la scelga tu, una volta
   (File System Access API: Chrome ed Edge su Android e computer;
   non esiste su iPhone/iPad). Scelta la cartella, Cartellina vi
   crea "Cartellina/<profilo>/" e vi tiene la copia aggiornata:
     profilo.json · dati.json (o dati.cifrato) · documenti/ · LEGGIMI.txt
   Con il PIN attivo dati e documenti nella cartella sono cifrati
   (AES-GCM, stessa chiave del profilo); senza PIN sono in chiaro.
   L'archivio principale resta quello protetto dell'app.
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC;
  var radice = null, perm = 'none', timer = null, coda = Promise.resolve(), errore = '';
  var te = new TextEncoder();
  var KU = 'cartellina.cartella.ultima.';

  // app Android: la cartella "Documenti/Cartellina" si crea da sola (js/cartella-nativa.js)
  function nativa() { return !!(window.CartellaNativa && CartellaNativa.disponibile()); }
  function supportata() { return typeof window.showDirectoryPicker === 'function' || nativa(); }
  function collegata() { return !!radice; }
  function attiva() { return !!radice && perm === 'granted' && A.pronto && A.D.imp.cartella !== false; }
  // senza PIN i file sarebbero in chiaro: si copia solo dopo una conferma esplicita (che imposta "ultima")
  function consenso() { return attiva() && (Archivio.pinAttivo() || ultima() > 0); }
  function ultima() { try { return +localStorage.getItem(KU + Archivio.corrente()) || 0; } catch (e) { return 0; } }
  function segnaUltima() { try { localStorage.setItem(KU + Archivio.corrente(), String(Date.now())); } catch (e) { /* facoltativo */ } }
  function inCoda(fn) { coda = coda.then(fn).catch(function (e) { gestisciErrore(e); }); return coda; }
  function gestisciErrore(e) {
    var n = e && e.name;
    errore = nativa() ? 'Non riesco a scrivere nella cartella «' + CartellaNativa.percorso + '» (' + ((e && e.message) || n || 'errore') + '). Riprova più tardi.'
      : n === 'NotAllowedError' || n === 'SecurityError' ? 'Il telefono non permette più di scrivere nella cartella: riattiva l\'accesso.' : 'Non riesco a scrivere nella cartella (' + ((e && e.message) || n || 'errore') + ').';
    if (n === 'NotAllowedError' || n === 'SecurityError') perm = 'prompt';
    console.warn('Cartella:', e);
    if (A.avvisoCartellaMostrato !== errore) { A.avvisoCartellaMostrato = errore; A.toast(errore, 6000); }
    aggiornaVista();
  }
  function aggiornaVista() { if (A.pronto && !A.$('#sheetRoot .sheet-bg') && /^(#\/(home|privacy)?)?$/.test(location.hash)) A.ridisegna(); }

  // ---------- scrittura ----------
  function slug(n) { var s = A.norm(n).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); return s || 'profilo'; }
  function pulisciNome(s) { return String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'documento'; }
  function estensione(doc) {
    var m = String(doc.nome || '').match(/\.([a-z0-9]{2,5})$/i); if (m) return m[1].toLowerCase();
    return /pdf/.test(doc.mime) ? 'pdf' : /png/.test(doc.mime) ? 'png' : /jpe?g/.test(doc.mime) ? 'jpg' : 'bin';
  }
  async function leggiJson(dir, nome) {
    try { var f = await (await dir.getFileHandle(nome)).getFile(); return JSON.parse(await f.text()); } catch (e) { return null; }
  }
  async function scrivi(dir, nome, dati) {
    var fh = await dir.getFileHandle(nome, { create: true }), w = await fh.createWritable();
    try { await w.write(dati); await w.close(); } catch (e) { try { await w.abort(); } catch (e2) { /* no */ } throw e; }
  }
  async function togli(dir, nome) { try { await dir.removeEntry(nome); } catch (e) { /* non c'era */ } }
  async function esiste(dir, nome) { try { await dir.getFileHandle(nome); return true; } catch (e) { return false; } }
  async function dirProfilo() {
    var pr = Archivio.profilo();
    if (pr.dir) {
      // la sottocartella già assegnata si usa solo se è davvero di questo profilo (o appena adottata dal ripristino)
      var gia = null; try { gia = await radice.getDirectoryHandle(pr.dir); } catch (e) { gia = null; }
      if (!gia) return radice.getDirectoryHandle(pr.dir, { create: true });
      var inf = await leggiJson(gia, 'profilo.json');
      if (!inf || inf.id === pr.id || pr.adotta) { if (pr.adotta) Archivio.campoProfilo(pr.id, 'adotta', false); return gia; }
      Archivio.campoProfilo(pr.id, 'dir', '');
      pr = Archivio.profilo();
    }
    var base = slug(pr.nome), nome = base, n = 1;
    for (;;) {
      var d = null;
      try { d = await radice.getDirectoryHandle(nome); } catch (e) { d = null; }
      if (!d) break;
      var info = await leggiJson(d, 'profilo.json');
      if (info && info.id === pr.id) break;
      n++; nome = base + '-' + n;
    }
    Archivio.campoProfilo(pr.id, 'dir', nome);
    return radice.getDirectoryHandle(nome, { create: true });
  }
  var LEGGIMI = 'CARTELLINA — copia dei tuoi dati\r\n\r\nQuesta cartella è stata creata da Cartellina. Contiene una copia dei dati e dei documenti, una sottocartella per ogni profilo.\r\n\r\n' +
    '  profilo.json   nome del profilo e informazioni sulla copia\r\n  dati.json      appuntamenti, email lette, rubrica, farmaci, note (in chiaro, se il profilo non ha il PIN)\r\n  dati.cifrato   come sopra, ma cifrato (se il profilo ha il PIN)\r\n  documenti/     i file originali (cifrati e con nomi numerici se il profilo ha il PIN)\r\n\r\n' +
    'Sono dati sanitari: non condividere questa cartella e non metterla in uno spazio online condiviso.\r\nPer tornare ai dati su un altro telefono: Cartellina → profilo in alto → "Ripristina un profilo da una cartella".\r\nPuoi cancellare questa cartella quando vuoi: i dati nell\'app non cambiano.\r\n';

  async function scriviDati() {
    var dir = await dirProfilo(), cifrato = Archivio.pinAttivo(), pr = Archivio.profilo();
    var copia = JSON.parse(JSON.stringify(A.D));
    copia.imp.aiKey = ''; copia.imp.token = ''; // le chiavi segrete non vanno in una copia
    var json = JSON.stringify(copia);
    if (cifrato) {
      var b = await Archivio.cifraBytes(te.encode(json));
      if (!b) throw new Error('profilo bloccato');
      await scrivi(dir, 'dati.cifrato', b); await togli(dir, 'dati.json'); await togli(dir, 'dati.json.tmp');
    } else { await scrivi(dir, 'dati.json', json); await togli(dir, 'dati.cifrato'); await togli(dir, 'dati.cifrato.tmp'); }
    await scrivi(dir, 'profilo.json', JSON.stringify({ formato: 'cartellina-cartella', versione: 1, id: pr.id, nome: pr.nome, cifrato: cifrato, aggiornato: new Date().toISOString(), sicurezza: cifrato ? Archivio.infoLock() : null }, null, 1));
    segnaUltima(); errore = '';
  }
  async function scriviDocIn(dd, doc, blob) {
    if (Archivio.pinAttivo()) {
      var b = await Archivio.cifraBytes(await blob.arrayBuffer()); if (!b) throw new Error('profilo bloccato');
      await scrivi(dd, doc.fileId + '.cifrato', b); delete doc.nomeCartella; return doc.fileId + '.cifrato';
    } else {
      var ext = estensione(doc), base = pulisciNome((doc.data || 'senza-data') + ' ' + doc.titolo), nome = base + '.' + ext, i = 1;
      while (await esiste(dd, nome) && doc.nomeCartella !== nome) { i++; nome = base + ' (' + i + ').' + ext; }
      await scrivi(dd, nome, blob); doc.nomeCartella = nome; return nome;
    }
  }
  async function sincronizzaTutto() {
    if (!attiva()) throw Object.assign(new Error('cartella non accessibile'), { name: 'NotAllowedError' });
    var dir = await dirProfilo(), dd = await dir.getDirectoryHandle('documenti', { create: true });
    var vecchi = []; for await (var e of dd.entries()) vecchi.push(e[0]);
    var docs = A.D.documenti, fatti = 0, scritti = {};
    // prima si scrivono i file nuovi, poi si tolgono quelli rimasti senza documento: un'interruzione non lascia la copia vuota
    for (var doc of docs) {
      var blob = await Archivio.leggiFile(doc.fileId);
      if (blob) scritti[await scriviDocIn(dd, doc, blob)] = 1;
      fatti++; if (docs.length > 5 && fatti % 5 === 0) A.toast('Copio i documenti nella cartella… ' + fatti + ' di ' + docs.length, 1500);
    }
    for (var n of vecchi) if (!scritti[n]) await togli(dd, n);
    await scriviDati();
    await scrivi(radice, 'LEGGIMI.txt', LEGGIMI);
    A.log('Copia nella cartella del telefono', docs.length + ' documenti'); A.save();
  }

  // ---------- API usata dal resto dell'app ----------
  function cambiato() {
    if (!consenso()) return;
    clearTimeout(timer);
    timer = setTimeout(function () { timer = null; inCoda(scriviDati); }, 4000);
  }
  // dopo un cambio di PIN o un'importazione: se la copia non si può aggiornare lo dico, perché nella cartella resterebbero i file di prima
  function risincronizza() {
    if (consenso()) return inCoda(sincronizzaTutto);
    if (radice && ultima()) A.toast('Attenzione: la copia nella cartella NON è stata aggiornata (accesso non attivo). Finché non la aggiorni lì restano i file di prima' + (Archivio.pinAttivo() ? ', anche quelli in chiaro.' : '.'), 8000);
    return Promise.resolve();
  }
  function subito() { if (timer && consenso()) { clearTimeout(timer); timer = null; inCoda(scriviDati); } }
  function chiudi() { if (timer && consenso()) { clearTimeout(timer); timer = null; return inCoda(scriviDati); } return coda; }
  function scriviDoc(doc, blob) {
    if (!consenso()) return Promise.resolve();
    return inCoda(async function () { var dir = await dirProfilo(), dd = await dir.getDirectoryHandle('documenti', { create: true }); await scriviDocIn(dd, doc, blob); A.save(); });
  }
  function togliDoc(doc) {
    if (!consenso()) return Promise.resolve();
    return inCoda(async function () {
      var dir = await dirProfilo(), dd = await dir.getDirectoryHandle('documenti', { create: true });
      await togli(dd, Archivio.pinAttivo() ? doc.fileId + '.cifrato' : doc.nomeCartella || '');
    });
  }
  async function caricaRadice() {
    if (radice || !supportata()) return;
    if (nativa()) { try { radice = await CartellaNativa.radice(); perm = 'granted'; } catch (e) { radice = null; } return; }
    try { var h = await Archivio.impGet('root'); if (h) radice = h; } catch (e) { radice = null; }
  }
  async function eliminaProfilo(id) {
    var pr = Archivio.profilo(id);
    await caricaRadice();
    if (!pr || !pr.dir) return true;     // mai copiato nella cartella: niente da togliere
    if (!radice) return false;           // la cartella non è raggiungibile: lo si dice all'utente
    if (await permesso(false) !== 'granted') return false;
    // si cancella solo la sottocartella scritta da QUESTO profilo: una copia adottata dal ripristino e mai riscritta
    // è forse l'unica copia originale e non si tocca
    var dir = null;
    try { dir = await radice.getDirectoryHandle(pr.dir); }
    catch (e) { return !!e && e.name === 'NotFoundError'; }   // già assente = tolta; qualsiasi altro errore = non raggiungibile, lo si dice all'utente
    var inf = await leggiJson(dir, 'profilo.json');
    if (!inf || inf.id !== pr.id) return false;
    try { await radice.removeEntry(pr.dir, { recursive: true }); return true; } catch (e) { return e && e.name === 'NotFoundError'; }
  }

  async function permesso(richiedi) {
    if (!radice) { perm = 'none'; return perm; }
    if (!radice.queryPermission) { perm = 'granted'; return perm; }
    var p = await radice.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && richiedi) p = await radice.requestPermission({ mode: 'readwrite' });
    perm = p; return p;
  }
  // Protezione contro i blocchi: prima di rileggere la cartella salvata si alza un segnale; se la lettura non finisce
  // (il telefono si blocca o la pagina si chiude) al prossimo avvio la cartella viene scollegata invece di ripetere il blocco.
  var SEGNALE = 'cartellina.cartella.lettura', SOSPESA = 'cartellina.cartella.sospesa';
  var erroreNativo = '';
  async function avviaNativa(senzaSync) {
    try { radice = await CartellaNativa.radice(); perm = 'granted'; errore = ''; erroreNativo = ''; }
    catch (e) {
      radice = null; perm = 'none';
      erroreNativo = 'Non riesco a creare la cartella «' + CartellaNativa.percorso + '»: ' + ((e && e.message) || e) + '. Su alcune versioni di Android questa cartella non si può creare.';
      console.warn('Cartella nativa:', e);
    }
    if (!senzaSync && attiva() && !ultima() && Archivio.pinAttivo()) inCoda(sincronizzaTutto);   // senza PIN serve la conferma dell'utente
    aggiornaVista();
  }
  async function avvia() {
    if (!supportata()) return;
    if (nativa()) return avviaNativa();
    try {
      if (localStorage.getItem(SEGNALE)) {
        localStorage.removeItem(SEGNALE); localStorage.setItem(SOSPESA, '1');
        await Archivio.impDel('root'); radice = null; perm = 'none';
        A.log('Cartella del telefono scollegata', 'la lettura della cartella non è finita'); A.save(); aggiornaVista(); return;
      }
      localStorage.setItem(SEGNALE, '1');
    } catch (e) { /* senza protezione si procede */ }
    try { var h = await Archivio.impGet('root'); if (h) { radice = h; await permesso(false); } } catch (e) { radice = null; }
    try { localStorage.removeItem(SEGNALE); } catch (e) { /* no */ }
    if (attiva() && !ultima() && Archivio.pinAttivo()) inCoda(sincronizzaTutto);   // senza PIN serve la conferma dell'utente
    aggiornaVista();
  }

  // ---------- scelta, riattivazione, scollegamento ----------
  A.ACT.cartellaScegli = async function () {
    if (!supportata()) return;
    if (!Archivio.pinAttivo() && !confirm('Questo profilo non ha il PIN: i dati e i documenti nella cartella saranno LEGGIBILI da chiunque apra quella cartella. Per averli cifrati attiva prima il PIN. Continuo lo stesso?')) return;
    var h;
    try { h = await window.showDirectoryPicker({ id: 'cartellina', mode: 'readwrite', startIn: 'documents' }); }
    catch (e) {
      if (e && e.name === 'AbortError') return;
      if (e && e.name === 'TypeError') { try { h = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (e2) { if (e2 && e2.name === 'AbortError') return; A.toast('Non riesco ad aprire la scelta della cartella: ' + (e2.message || e2), 6000); return; } }
      else { A.toast('Non riesco ad aprire la scelta della cartella: ' + (e.message || e), 6000); return; }
    }
    try {
      var r = /^cartellina$/i.test(h.name) ? h : await h.getDirectoryHandle('Cartellina', { create: true });
      await scrivi(r, 'LEGGIMI.txt', LEGGIMI);
      Archivio.lista().forEach(function (p) { Archivio.campoProfilo(p.id, 'dir', ''); Archivio.campoProfilo(p.id, 'adotta', false); });
      radice = r; await Archivio.impPut('root', r); perm = 'granted'; errore = ''; try { localStorage.removeItem(SOSPESA); } catch (e0) { /* no */ }
      A.log('Cartella del telefono collegata', r.name); A.D.imp.cartella = true; A.save();
      A.toast('Cartella collegata. Copio i dati…', 3000);
      await inCoda(sincronizzaTutto);
      if (!errore) A.toast('Copia nella cartella completata', 3500);
      A.ridisegna();
    } catch (e) {
      radice = null; perm = 'none';
      A.toast(e && e.name === 'NotAllowedError' ? 'Il telefono non accetta questa cartella (alcune cartelle di sistema sono bloccate). Creane una nuova, ad esempio dentro Documenti, e scegli quella.' : 'Non riesco a usare questa cartella: ' + (e.message || e), 7000);
    }
  };
  A.ACT.cartellaChiudiAvviso = function () { try { localStorage.removeItem(SOSPESA); } catch (e) { /* no */ } A.ridisegna(); };
  A.ACT.cartellaRiattiva = async function () {
    if (nativa()) {
      await avviaNativa(true);
      if (!radice) { A.toast(erroreNativo, 7000); return; }
      try { await inCoda(sincronizzaTutto); A.toast('Cartella pronta e aggiornata', 3000); A.ridisegna(); } catch (e) { gestisciErrore(e); }
      return;
    }
    try {
      var p = await permesso(true);
      if (p !== 'granted') { A.toast('Accesso alla cartella non concesso', 4000); return; }
      errore = ''; await inCoda(sincronizzaTutto); A.toast('Cartella aggiornata', 3000); A.ridisegna();
    } catch (e) { gestisciErrore(e); }
  };
  function apribile() { try { return !!(nativa() && window.Capacitor.Plugins.ApriCartella); } catch (e) { return false; } }
  A.ACT.cartellaApri = async function () {
    try { await window.Capacitor.Plugins.ApriCartella.apri(); }
    catch (e) { A.toast('Non riesco ad aprirla da qui. Apri l\'app «File» del telefono, poi Documenti, poi «Cartellina».', 8000); }
  };
  A.ACT.cartellaSincronizza = async function () {
    if (!Archivio.pinAttivo() && !ultima() && !confirm('Questo profilo non ha il PIN: la copia nella cartella sarà LEGGIBILE da chiunque apra la cartella. Per averla cifrata attiva prima il PIN. Copio lo stesso in chiaro?')) return;
    try { if (await permesso(true) !== 'granted') { A.toast('Accesso alla cartella non concesso', 4000); return; } errore = ''; A.toast('Salvo la copia…', 1500); await inCoda(sincronizzaTutto); if (!errore) A.toast('Copia salvata nella cartella', 3000); A.ridisegna(); }
    catch (e) { gestisciErrore(e); }
  };
  A.ACT.cartellaScollega = async function () {
    if (!confirm('Scollegare la cartella? I file già copiati restano dove sono (cancellali tu se non ti servono). I dati nell\'app non cambiano.')) return;
    await Archivio.impDel('root'); radice = null; perm = 'none';
    Archivio.lista().forEach(function (p) { Archivio.campoProfilo(p.id, 'dir', ''); Archivio.campoProfilo(p.id, 'adotta', false); }); A.log('Cartella del telefono scollegata'); A.save(); A.ridisegna();
  };
  A.ACT.cartellaProfilo = function (el) { A.D.imp.cartella = el.checked; A.save(); A.ridisegna(); };

  // ---------- ripristino da una cartella ----------
  async function trovaProfili(h, livello) {
    var info = await leggiJson(h, 'profilo.json');
    if (info && info.formato === 'cartellina-cartella') return [{ dir: h, info: info, padre: null }];
    var out = [];
    for await (var e of h.entries()) {
      if (e[1].kind !== 'directory') continue;
      var i = await leggiJson(e[1], 'profilo.json');
      if (i && i.formato === 'cartellina-cartella') out.push({ dir: e[1], info: i, padre: h });
      else if (livello < 1 && /^cartellina$/i.test(e[0])) out = out.concat(await trovaProfili(e[1], livello + 1));
    }
    return out;
  }
  A.ACT.ripristinaCartella = async function () {
    if (!supportata()) return;
    var h;
    if (nativa()) {
      try { h = await CartellaNativa.radice(); } catch (e) { A.toast('Non riesco ad aprire la cartella «' + CartellaNativa.percorso + '»: ' + (e.message || e), 6000); return; }
    } else {
      try { h = await window.showDirectoryPicker({ id: 'cartellina-ripristino', mode: 'read' }); } catch (e) { if (e && e.name !== 'AbortError') A.toast('Non riesco ad aprire la scelta della cartella: ' + (e.message || e), 6000); return; }
    }
    var trovati;
    try { trovati = await trovaProfili(h, 0); } catch (e) { A.toast('Non riesco a leggere la cartella: ' + (e.message || e), 6000); return; }
    A.chiudiSheet(true);
    if (!trovati.length) { A.sheet('Ripristina da una cartella', '<p class="notice warn">' + (nativa() ? 'In «' + CartellaNativa.percorso + '» non trovo copie di Cartellina. Se hai reinstallato l\'app, Android può nascondere i file creati dall\'installazione precedente: in quel caso usa un\'esportazione.' : 'In questa cartella non trovo copie di Cartellina. Scegli la cartella «Cartellina» (o una sua sottocartella di un profilo).') + '</p>'); return; }
    window.__ripristino = trovati;
    A.sheet('Ripristina da una cartella', '<p>Ho trovato queste copie. Il ripristino crea un <b>nuovo profilo</b> su questo telefono: non tocca gli altri.</p><div class="list">' + trovati.map(function (c, i) {
      return '<button class="item" data-act="ripristinaProfilo" data-i="' + i + '"><span class="avatar">' + esc(String(c.info.nome || '?').charAt(0).toUpperCase()) + '</span><span class="grow"><span class="t1">' + esc(c.info.nome || 'Profilo') + '</span><span class="t2">' + (c.info.cifrato ? 'Cifrata: serve il PIN di quel profilo' : 'In chiaro') + ' · copia del ' + esc(String(c.info.aggiornato || '').slice(0, 10)) + '</span></span>' + A.ico('right', 20) + '</button>';
    }).join('') + '</div>');
  };
  A.ACT.ripristinaProfilo = async function (el) {
    var c = (window.__ripristino || [])[+el.dataset.i]; if (!c) return;
    el.disabled = true; A.toast('Ripristino in corso…', 2000);
    try {
      var nome = c.info.nome || 'Profilo', esistente = Archivio.lista().some(function (p) { return p.nome === nome; });
      if (c.info.cifrato && !(c.info.sicurezza && c.info.sicurezza.salt && c.info.sicurezza.v)) throw new Error('la copia cifrata è incompleta (mancano i dati di sicurezza)');
      var pid = Archivio.nuovoProfilo(esistente ? nome + ' (ripristinato)' : nome), dd = null, mancanti = 0;
      try { dd = await c.dir.getDirectoryHandle('documenti'); } catch (e) { dd = null; }
      if (c.info.cifrato) {
        var f = await (await c.dir.getFileHandle('dati.cifrato')).getFile(), b = new Uint8Array(await f.arrayBuffer());
        await Archivio.grezzo.putDati(pid, { enc: 1, iv: b.slice(0, 12), ct: b.slice(12).buffer });
        if (dd) for await (var e of dd.entries()) {
          if (e[1].kind !== 'file' || !/\.cifrato$/.test(e[0])) continue;
          var bb = new Uint8Array(await (await e[1].getFile()).arrayBuffer());
          await Archivio.grezzo.putFile(pid, e[0].replace(/\.cifrato$/, ''), { enc: 1, iv: bb.slice(0, 12), ct: bb.slice(12).buffer, mime: '' });
        }
        await Archivio.grezzo.setLock(pid, c.info.sicurezza);
      } else {
        var dati = A.normalizza(JSON.parse(await (await (await c.dir.getFileHandle('dati.json')).getFile()).text()));
        for (var doc of dati.documenti) {
          try { var file = await (await dd.getFileHandle(doc.nomeCartella)).getFile(); await Archivio.grezzo.putFile(pid, doc.fileId, file); } catch (e2) { mancanti++; }
        }
        await Archivio.grezzo.putDati(pid, dati);
      }
      // se la copia sta nella cartella già collegata, la si adotta invece di duplicarla
      try { if (radice && c.padre && await radice.isSameEntry(c.padre) && !Archivio.lista().some(function (p) { return p.dir === c.dir.name; })) { Archivio.campoProfilo(pid, 'dir', c.dir.name); Archivio.campoProfilo(pid, 'adotta', true); } } catch (e3) { /* si crea una nuova cartella */ }
      window.__ripristino = null;
      try { sessionStorage.setItem('cartellina.avviso', 'Profilo "' + nome + '" ripristinato' + (mancanti ? ' (' + mancanti + ' documenti non trovati nella cartella)' : '') + (c.info.cifrato ? '. Inserisci il suo PIN.' : '.') + ' Il collegamento Gmail e la chiave dell\'assistente AI non si copiano: vanno reinseriti.'); } catch (e4) { /* no */ }
      A.cambiaProfilo(pid);
    } catch (e) {
      console.error(e); A.toast('Ripristino non riuscito: ' + (e.message || e), 7000); el.disabled = false;
      if (typeof pid !== 'undefined' && pid) { try { await Archivio.eliminaProfilo(pid); } catch (e5) { /* resta vuoto */ } }
    }
  };

  // ---------- pezzi di interfaccia ----------
  function quando(ts) { return ts ? A.fmtTs(ts) : 'mai'; }
  function card() {
    var h = '<section class="card"><h2>Cartella sul telefono</h2>';
    if (nativa()) {
      var u0 = ultima();
      if (!radice) {
        return h + '<p class="status warn"><i></i>' + esc(erroreNativo || 'La cartella non è ancora pronta.') + '</p><div class="btns col"><button class="btn" data-act="cartellaRiattiva">' + IC.refresh + 'Riprova a creare la cartella</button></div>' +
          '<p class="muted small">I dati restano comunque nell\'archivio protetto dell\'app. Per una copia fuori dall\'app usa <b>Esporta i dati di questo profilo</b> qui sotto.</p></section>';
      }
      var ok0 = perm === 'granted';
      return h + '<p>Cartellina ha creato da sola la cartella <b>' + esc(CartellaNativa.percorso) + '</b> nella memoria del telefono (la trovi nell\'app «File», sotto Documenti) e vi tiene una copia di dati e documenti, una sottocartella per ogni profilo.</p>' +
        '<p class="status ' + (ok0 && !errore ? 'ok' : 'warn') + '"><i></i>' + (errore ? esc(errore) : 'Pronta') + '</p>' +
        A.fatto('Ultima copia di questo profilo', quando(u0)) +
        A.fatto('Contenuto', Archivio.pinAttivo() ? 'Cifrato con il PIN di questo profilo' : (u0 ? 'In chiaro (il profilo non ha il PIN)' : 'Non ancora copiato: senza PIN la copia sarebbe in chiaro')) +
        '<label class="toggle"><span><b>Copia anche questo profilo</b></span><span class="switch"><input type="checkbox" data-act="cartellaProfilo"' + (A.D.imp.cartella !== false ? ' checked' : '') + '><i></i></span></label>' +
        '<div class="btns col">' + (apribile() ? '<button class="btn" data-act="cartellaApri">' + IC.doc + 'Apri la cartella nei File</button>' : '') + '<button class="btn' + (apribile() ? ' ghost' : '') + '" data-act="cartellaSincronizza">' + IC.refresh + (!Archivio.pinAttivo() && !u0 ? 'Copia adesso (in chiaro)' : 'Salva la copia adesso') + '</button><button class="btn ghost" data-act="ripristinaCartella">' + IC.down + 'Ripristina un profilo dalla cartella</button></div>' +
        '<p class="muted small">' + (Archivio.pinAttivo() ? 'La copia si aggiorna da sola dopo ogni modifica ed è cifrata. Chi copia la cartella può provare i PIN senza limiti di tentativi: con un PIN corto di sole cifre la protezione è debole, usa una frase lunga. Il nome della sottocartella è il nome del profilo, anche con il PIN, e nel file profilo.json resta il verificatore del PIN (serve al ripristino).' : 'Senza PIN i file nella cartella sono leggibili da chiunque abbia accesso ai file del telefono: per questo la prima copia parte solo se la confermi tu. Attiva il PIN in Impostazioni per averla cifrata e automatica.') +
        ' Se disinstalli l\'app, Android può non lasciare più accesso ai file che aveva creato: tieni anche un\'esportazione.</p></section>';
    }
    if (!supportata() && A.nativo()) {
      return h + '<p>Su questo telefono la copia in cartella non è disponibile (manca il componente per i file). I dati restano nell\'archivio protetto dell\'app. Usa <b>Esporta i dati di questo profilo</b> qui sotto.</p></section>';
    }
    if (!supportata()) {
      return h + '<p>Questo browser non permette alle app web di scrivere in una cartella del telefono (è così su iPhone e iPad). I dati restano comunque nell\'archivio protetto di Cartellina, su questo dispositivo.</p><p class="muted">Per avere una copia fuori dall\'app usa <b>Esporta tutti i dati</b> qui sotto.</p></section>';
    }
    if (!radice) {
      return h + '<p>Cartellina non può creare da sola una cartella visibile nella memoria del telefono: il telefono vuole che sia <b>tu a sceglierla, una volta</b>. Premi il pulsante e, nella finestra che si apre, crea una cartella nuova (per esempio dentro Documenti) e sceglila. Cartellina vi crea la cartella «Cartellina» con una sottocartella per ogni profilo e vi tiene una copia aggiornata di dati e documenti.</p>' +
        '<ul class="plain-list small"><li>' + (Archivio.pinAttivo() ? 'Il PIN è attivo: i file nella cartella saranno <b>cifrati</b>.' : 'Senza PIN i file nella cartella sono <b>leggibili da chiunque</b> apra la cartella. Attiva prima il PIN in Impostazioni.') + '</li><li>Se la cartella scelta è sincronizzata da un servizio online (per esempio Google Drive), i file andranno anche lì.</li></ul>' +
        '<div class="btns col"><button class="btn" data-act="cartellaScegli">' + IC.upload + 'Scegli la cartella</button><button class="btn ghost" data-act="ripristinaCartella">' + IC.down + 'Ripristina un profilo da una cartella</button></div></section>';
    }
    var ok = perm === 'granted', u = ultima();
    h += '<p class="status ' + (ok && !errore ? 'ok' : 'warn') + '"><i></i>' + (ok ? (errore ? esc(errore) : 'Collegata') : 'Da riattivare: il telefono ha chiuso l\'accesso alla cartella') + '</p>' +
      A.fatto('Cartella', esc(radice.name)) + A.fatto('Ultima copia di questo profilo', quando(u)) +
      A.fatto('Contenuto', Archivio.pinAttivo() ? 'Cifrato con il PIN di questo profilo' : 'In chiaro (il profilo non ha il PIN)') +
      '<label class="toggle"><span><b>Copia anche questo profilo</b><br><span class="muted">Ogni profilo ha la sua sottocartella</span></span><span class="switch"><input type="checkbox" data-act="cartellaProfilo"' + (A.D.imp.cartella !== false ? ' checked' : '') + '><i></i></span></label>' +
      '<div class="btns col">' + (ok ? '<button class="btn" data-act="cartellaSincronizza">' + IC.refresh + 'Salva la copia adesso</button>' : '<button class="btn" data-act="cartellaRiattiva">' + IC.lock + 'Riattiva l\'accesso alla cartella</button>') +
      '<button class="btn ghost" data-act="ripristinaCartella">' + IC.down + 'Ripristina un profilo da una cartella</button><button class="btn ghost" data-act="cartellaScollega">Scollega la cartella</button></div>' +
      '<p class="muted small">La copia si aggiorna da sola dopo ogni modifica quando il telefono lo permette; su alcuni telefoni l\'accesso va riattivato con un tocco dopo aver chiuso il browser (lo segnalo nella Home).' +
      (Archivio.pinAttivo() ? ' Chi copia la cartella può provare i PIN senza limiti di tentativi: con un PIN corto di sole cifre la protezione è debole, usa una frase lunga. Il nome della sottocartella è il nome del profilo, anche con il PIN.' : '') + '</p></section>';
    return h;
  }
  // avviso nella Home: mai far credere di avere una copia che non c'è
  function avviso() {
    if (nativa() && !radice && erroreNativo) return '<div class="notice warn"><b>La cartella sul telefono non è pronta.</b> ' + esc(erroreNativo) + ' <button class="btn sm" data-act="cartellaRiattiva">Riprova</button></div>';
    var sosp = false; try { sosp = !!localStorage.getItem(SOSPESA); } catch (e) { /* no */ }
    if (!radice && sosp) return '<div class="notice warn"><b>Ho scollegato la cartella sul telefono.</b> Il telefono si è bloccato mentre la riaprivo, e per evitare che succeda a ogni avvio l\'ho messa da parte. I tuoi dati nell\'app non sono cambiati. <button class="btn sm" data-act="cartellaScegli">Ricollega la cartella</button> <button class="btn sm ghost" data-act="cartellaChiudiAvviso">Ho capito</button></div>';
    if (!radice || A.D.imp.cartella === false) return '';
    if (perm !== 'granted') return '<div class="notice warn"><b>La copia nella cartella è ferma.</b> ' + (nativa() ? 'L\'ultima scrittura in «' + esc(CartellaNativa.percorso) + '» non è riuscita.' : 'Il telefono ha chiuso l\'accesso alla cartella «' + esc(radice.name) + '».') + ' <button class="btn sm" data-act="cartellaRiattiva">' + (nativa() ? 'Riprova' : 'Riattiva') + '</button></div>';
    var u = ultima();
    if (!Archivio.pinAttivo() && !u) return '<div class="notice">Questo profilo non è ancora copiato nella cartella. Senza PIN la copia sarebbe leggibile da chiunque apra la cartella. <button class="btn sm sec" data-act="cartellaSincronizza">Copia in chiaro</button> <a href="#/impostazioni">Attiva il PIN</a></div>';
    if (errore) return '<div class="notice warn">' + esc(errore) + ' <a href="#/privacy">Dettagli</a></div>';
    if (u && Date.now() - u > 7 * 864e5) return '<div class="notice">L\'ultima copia nella cartella è del ' + A.fmtTs(u) + '. <button class="btn sm sec" data-act="cartellaSincronizza">Aggiorna ora</button></div>';
    return '';
  }

  window.Cartella = { supportata: supportata, collegata: collegata, avvia: avvia, cambiato: cambiato, risincronizza: risincronizza, subito: subito, chiudi: chiudi, scriviDoc: scriviDoc, togliDoc: togliDoc, eliminaProfilo: eliminaProfilo, card: card, avviso: avviso };
})(CA);
