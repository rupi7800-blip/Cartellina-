/* =========================================================
   Cartellina — Impostazioni e Privacy
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };

  function sw(k, t, d) { return '<label class="toggle"><span><b>' + t + '</b>' + (d ? '<br><span class="muted">' + d + '</span>' : '') + '</span><span class="switch"><input type="checkbox" data-imp="' + k + '"' + (D().imp[k] ? ' checked' : '') + '><i></i></span></label>'; }
  function seg(k, opz) { return '<div class="seg" data-seg="' + k + '">' + opz.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (D().imp[k] === o[0] ? 'on' : '') + '" aria-pressed="' + (D().imp[k] === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }

  A.VIEWS.impostazioni = function (v) {
    var I = D().imp;
    var notif = A.nativo() ? 'nell\'app Android non ci sono ancora le notifiche di sistema: i promemoria compaiono quando l\'app è aperta; per averli sempre usa l\'esportazione nel calendario del telefono' : !('Notification' in window) ? 'non supportate da questo browser' : Notification.permission === 'granted' ? 'attive' : Notification.permission === 'denied' ? 'bloccate: sbloccale dalle impostazioni del browser' : 'non ancora attivate';
    var h = A.pagina('Impostazioni', '', '<a class="btn ghost sm" href="#/privacy">' + IC.shield + 'Privacy e dati</a>');
    h += '<nav class="toc" aria-label="Sezioni delle impostazioni"><a href="#sAspetto">Aspetto</a><a href="#sSic">Sicurezza</a><a href="#sMail">Email</a><a href="#sProm">Promemoria</a><a href="#sAi">Assistente AI</a><a href="#sApp">Altre app</a></nav>';
    // aspetto
    h += '<section class="card" id="sAspetto"><h2>Aspetto</h2><label class="f"><span>Il tuo nome (per il saluto)</span><input class="inp" data-impv="nome" value="' + esc(I.nome) + '" placeholder="Facoltativo"></label>' +
      '<fieldset class="f"><legend>Colori</legend>' + seg('tema', [['auto', 'Come il telefono'], ['chiaro', 'Chiari'], ['scuro', 'Scuri']]) + '</fieldset>' +
      '<fieldset class="f"><legend>Grandezza del testo</legend>' + seg('testo', [['normale', 'Normale'], ['grande', 'Grande'], ['molto', 'Molto grande']]) + '</fieldset></section>';
    // sicurezza
    var pin = Archivio.pinAttivo();
    h += '<section class="card" id="sSic"><h2>Sicurezza</h2><p class="status ' + (pin ? 'ok' : 'warn') + '"><i></i>' + (pin ? 'PIN attivo: dati e documenti sono cifrati su questo dispositivo.' : 'PIN non attivo: i dati sono solo su questo dispositivo ma non cifrati.') + '</p>' +
      '<div class="btns">' + (pin ? '<button class="btn sec" data-act="cambiaPin">' + IC.lock + 'Cambia PIN</button><button class="btn ghost" data-act="togliPin">Togli il PIN</button><button class="btn ghost" data-act="bloccaOra">' + IC.lock + 'Blocca ora</button>' : '<button class="btn" data-act="impostaPin">' + IC.lock + 'Attiva il PIN</button>') + '</div>' +
      (pin ? '<label class="f"><span>Blocca da sola dopo</span><select class="inp" data-impv="bloccoMin">' + [[1, '1 minuto in secondo piano'], [5, '5 minuti in secondo piano'], [15, '15 minuti in secondo piano'], [60, '1 ora in secondo piano'], [0, 'Solo quando chiudo l\'app']].map(function (o) { return '<option value="' + o[0] + '"' + (+I.bloccoMin === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' : '') +
      '<p class="muted small">Con il PIN la chiave di cifratura nasce dal PIN stesso e non viene salvata da nessuna parte: se lo dimentichi i dati non sono recuperabili. Tieni un\'esportazione dei dati in un posto sicuro.</p></section>';
    // email
    h += '<section class="card" id="sMail"><h2>Email (Gmail)</h2>' +
      '<p class="status ' + (I.gmailUrl && !I.erroreGmail ? 'ok' : I.gmailUrl ? 'err' : 'warn') + '"><i></i>' + (I.gmailUrl ? (I.erroreGmail ? 'Problema: ' + esc(I.erroreGmail) : 'Collegata' + (I.ultimoControllo ? ' · ultimo controllo ' + A.fmtTs(I.ultimoControllo) : '')) : 'Non collegata') + '</p>' +
      (I.gmailUrl && I.versioneScript && I.versioneScript < 2 ? '<p class="notice warn">C\'è una versione nuova dello script Gmail (salva gli allegati in Documenti). Copia lo script qui sotto, incollalo al posto del vecchio, salva e scegli <b>Esegui il deployment → Gestisci deployment → Modifica → Nuova versione</b>.</p>' : '') +
      '<details' + (I.gmailUrl ? '' : ' open') + '><summary>Come collegarla (circa 5 minuti, una volta sola)</summary><ol class="steps">' +
      '<li>Dal computer apri <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> con il tuo account Gmail: si crea un progetto nuovo.</li>' +
      '<li>Cancella il testo che c\'è e incolla lo script (tasto <b>Copia lo script</b>).</li>' +
      '<li>Premi <b>Crea una parola segreta</b> qui sotto e copiala nella riga <code>CODICE_SEGRETO</code> dello script. Salva.</li>' +
      '<li>In alto scegli la funzione <b>installa</b> e premi <b>Esegui</b>. Google chiede i permessi: accetta, è il tuo script.</li>' +
      '<li>Premi <b>Esegui il deployment → Nuovo deployment</b>, tipo <b>App web</b>, "Esegui come: Me", "Chi può accedere: Chiunque". Copia l\'indirizzo che finisce con <code>/exec</code>.</li>' +
      '<li>Incolla qui sotto l\'indirizzo e premi <b>Prova</b>.</li></ol>' +
      '<div class="btns"><button class="btn sec sm" data-act="copiaScript">' + IC.copy + 'Copia lo script</button><button class="btn ghost sm" data-act="vediScript">Leggi lo script</button></div>' +
      '<p class="muted small">Lo script gira sul tuo account Google e passa le email solo a questa app. Non cancella, non sposta, non archivia e non invia email.</p></details>' +
      '<label class="f"><span>Indirizzo dello script (finisce con /exec)</span><input class="inp" data-impv="gmailUrl" value="' + esc(I.gmailUrl) + '" placeholder="https://script.google.com/macros/s/…/exec" inputmode="url" autocomplete="off"></label>' +
      '<label class="f"><span>Parola segreta</span><div class="row"><input class="inp grow" data-impv="token" value="' + esc(I.token) + '" autocomplete="off" spellcheck="false"><button class="btn sec sm" data-act="generaToken">Crea una parola segreta</button></div></label>' +
      '<div class="two"><label class="f"><span>Controlla ogni</span><select class="inp" data-impv="intervallo">' + [5, 10, 15, 30, 60].map(function (n) { return '<option value="' + n + '"' + (+I.intervallo === n ? ' selected' : '') + '>' + n + ' minuti</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span>Guarda indietro</span><select class="inp" data-impv="giorni">' + [3, 7, 14, 30].map(function (n) { return '<option value="' + n + '"' + (+I.giorni === n ? ' selected' : '') + '>' + n + ' giorni</option>'; }).join('') + '</select></label></div>' +
      '<button class="btn block" data-act="provaGmail">' + IC.refresh + 'Prova e controlla ora</button>' +
      sw('impara', 'Impara dalle mie scelte', 'Quando confermi o correggi un\'email, ricordo il mittente e l\'argomento') +
      '<h3>Mittenti</h3>' + listaMittenti('fidati', 'Sempre sanitari') + listaMittenti('bloccati', 'Mai sanitari') +
      '<div class="row"><label class="grow"><span class="sr">Nuovo mittente fidato</span><input class="inp" id="nuovoFid" placeholder="Indirizzo o dominio, es. asst-settelaghi.it"></label><button class="btn sec sm" data-act="addFidato">' + IC.plus + 'Aggiungi</button></div></section>';
    // promemoria
    h += '<section class="card" id="sProm"><h2>Promemoria e allarmi</h2>' + sw('promEventi', 'Promemoria degli appuntamenti') +
      '<fieldset class="f"><legend>Promemoria predefiniti per i nuovi impegni</legend><div class="chips wrap" id="avvDef">' + A.AVVISI.map(function (a) { var on = I.avvisi.indexOf(a[0]) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div></fieldset>' +
      '<fieldset class="f"><legend>Allarme predefinito per i farmaci</legend>' + seg('allarme', [['schermo', 'Schermo intero'], ['notifica', 'Notifica'], ['banner', 'Avviso']]) + '</fieldset>' +
      sw('suono', 'Suono') + sw('vibra', 'Vibrazione') +
      '<div class="toggle"><span><b>Notifiche del telefono</b><br><span class="muted">' + notif + '</span></span>' + ('Notification' in window && Notification.permission === 'default' ? '<button class="btn sm" data-act="attivaNotifiche">Attiva</button>' : '') + '</div>' +
      '<p class="muted small">Le notifiche arrivano quando Cartellina è aperta o in secondo piano. Per avvisi sicuri anche ad app chiusa usa "Esporta" nel Calendario: i promemoria passano al calendario del telefono.</p></section>';
    // AI
    var aiOn = A.aiPronta();
    h += '<section class="card" id="sAi"><h2>Assistente AI (facoltativo)</h2><p class="status ' + (aiOn ? 'ok' : 'warn') + '"><i></i>' + (aiOn ? 'Attivo' : 'Spento') + '</p>' +
      '<p>Ricerca, riassunti automatici e strumenti funzionano già <b>senza</b> AI, sul dispositivo. L\'assistente AI aggiunge spiegazioni più ricche e domande libere usando il servizio esterno di <b>Anthropic</b> (Stati Uniti).</p>' +
      '<details><summary>Cosa comporta, prima di attivarlo</summary><ul class="plain-list">' +
      '<li>Quando premi un tasto "assistente AI", il testo di quell\'email o documento (o i risultati di quella ricerca) viene inviato ad Anthropic. Niente parte da solo.</li>' +
      '<li>Sono dati sanitari: li stai condividendo tu, per tua scelta, con un fornitore esterno. Anthropic tratta i dati inviati tramite API secondo le proprie condizioni commerciali e informativa privacy: leggile su anthropic.com prima di procedere.</li>' +
      '<li>Serve una tua chiave API personale (console.anthropic.com): le richieste sono a tuo carico. La chiave resta su questo dispositivo' + (Archivio.pinAttivo() ? ', cifrata con il PIN.' : '. Attiva il PIN per cifrarla.') + '</li>' +
      '<li>Ogni invio è annotato in Privacy e dati → Registro. Puoi revocare il consenso quando vuoi.</li>' +
      '<li>L\'assistente non fa diagnosi, non prescrive e non modifica terapie.</li></ul></details>' +
      (aiOn ? '<div class="btns"><button class="btn sec" data-act="provaAi">' + IC.refresh + 'Prova il collegamento</button><button class="btn danger" data-act="spegniAi">Revoca il consenso e cancella la chiave</button></div>'
        : '<label class="check"><input type="checkbox" id="aiCons"><span>Ho letto cosa comporta e acconsento a inviare ad Anthropic, solo quando lo chiedo io, i dati necessari a ogni richiesta.</span></label>' +
          '<label class="f"><span>Chiave API di Anthropic</span><input class="inp" id="aiKey" type="password" autocomplete="off" placeholder="sk-ant-…"></label><button class="btn block" data-act="accendiAi">' + IC.check + 'Attiva l\'assistente AI</button>') + '</section>';
    // ponte
    h += '<section class="card" id="sApp"><h2>Collega le app</h2><p>Scambia appuntamenti ed email con AgendApp e Smistino sullo stesso telefono.' + (Archivio.pinAttivo() ? ' <b>Attenzione:</b> i dati condivisi con le altre app non sono protetti dal PIN di Cartellina.' : '') + '</p>' + (A.ponteQui ? '<button class="btn sec" data-act="ponte">' + IC.link + (window.Ponte && Ponte.attivo() ? 'Gestisci il collegamento' : 'Collega AgendApp e Smistino') + '</button>' : '<p class="notice">Il collegamento con AgendApp e Smistino è unico per telefono e riguarda il profilo «' + esc((Archivio.profilo(Archivio.ponteProfilo()) || {}).nome || '') + '». Passa a quel profilo per gestirlo.</p>') + '</section>';
    // dati di prova e versione
    if (Object.keys(D().email).some(function (k) { return D().email[k].demo; })) h += '<section class="card"><h2>Dati di prova</h2><button class="btn ghost" data-act="togliDemo">' + IC.trash + 'Togli le email e gli appuntamenti di prova</button></section>';
    h += '<section class="card"><div class="row"><div class="grow"><b>Cartellina ' + ((window.AppUpdate && window.AppUpdate.current) || '') + '</b><br><span class="muted small">Il tasto Aggiorna compare in alto quando c\'è una novità</span></div><button class="btn sm sec" data-act="checkUpd">Controlla</button></div></section>';
    v.innerHTML = h;

    A.$$('[data-imp]', v).forEach(function (el) { el.addEventListener('change', function () { D().imp[el.dataset.imp] = el.checked; A.save(); }); });
    A.$$('[data-impv]', v).forEach(function (el) {
      el.addEventListener('change', function () {
        var k = el.dataset.impv, val = el.value.trim();
        D().imp[k] = /^(intervallo|giorni|bloccoMin)$/.test(k) ? +val : val;
        if (k === 'gmailUrl' || k === 'token') D().imp.erroreGmail = '';
        A.save(); if (k === 'intervallo') A.avviaPolling();
      });
    });
    A.$$('[data-seg]', v).forEach(function (s) {
      s.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        D().imp[s.dataset.seg] = b.dataset.v; A.save();
        A.$$('button', s).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
        if (s.dataset.seg === 'tema' || s.dataset.seg === 'testo') A.applicaAspetto();
      });
    });
    A.$('#avvDef', v).addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on'));
      D().imp.avvisi = A.$$('#avvDef .chip.on', v).map(function (x) { return x.dataset.a; }); A.save();
    });
  };
  function listaMittenti(k, t) {
    var l = D().regole[k];
    return '<p class="muted small lab">' + t + ' (' + l.length + ')</p>' + (l.length ? l.map(function (a) { return '<div class="toggle slim"><span class="ellipsis">' + esc(a) + '</span><button class="linkbtn danger-t" data-act="togliMitt" data-k="' + k + '" data-a="' + esc(a) + '">Togli</button></div>'; }).join('') : '<p class="muted small">Nessuno.</p>');
  }
  A.ACT.ponte = function () { if (window.Ponte) Ponte.apri(); };
  A.ACT.togliMitt = function (el) { D().regole[el.dataset.k] = D().regole[el.dataset.k].filter(function (a) { return a !== el.dataset.a; }); A.save(); A.syncRegole(); A.ridisegna(); };
  A.ACT.addFidato = function () { var a = A.$('#nuovoFid').value.trim().toLowerCase(); if (!a) return; if (D().regole.fidati.indexOf(a) < 0) D().regole.fidati.push(a); A.save(); A.syncRegole(); A.ridisegna(); A.toast('Aggiunto'); };
  A.ACT.attivaNotifiche = function () { Notification.requestPermission().then(function () { A.ridisegna(); }); };
  A.ACT.checkUpd = function () { if (window.AppUpdate) window.AppUpdate.check().then(function (n) { if (!n) A.toast('Hai già l\'ultima versione'); }); };
  A.ACT.generaToken = function () {
    var a = new Uint8Array(18); crypto.getRandomValues(a);
    var t = Array.prototype.map.call(a, function (x) { return 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]; }).join('');
    var inp = A.$('[data-impv="token"]'); inp.value = t; D().imp.token = t; D().imp.erroreGmail = ''; A.save();
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { A.toast('Parola segreta creata e copiata: incollala nello script'); }); else A.toast('Parola segreta creata');
  };
  A.ACT.provaGmail = function () {
    A.$$('[data-impv]').forEach(function (el) { var k = el.dataset.impv; D().imp[k] = /^(intervallo|giorni|bloccoMin)$/.test(k) ? +el.value : el.value.trim(); });
    D().imp.erroreGmail = ''; A.save();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(D().imp.gmailUrl)) { A.toast('L\'indirizzo deve iniziare con https://script.google.com/', 4000); return; }
    if ((D().imp.token || '').length < 8) { A.toast('Usa una parola segreta di almeno 8 caratteri (premi "Crea una parola segreta")', 4500); return; }
    A.chiediNotifiche();
    A.controllaEmail(true).then(function () { A.ridisegna(); if (!D().imp.erroreGmail) { A.syncRegole(); A.avviaPolling(); A.toast('Gmail collegata'); } });
  };
  var scriptTesto = null;
  function caricaScript() { return scriptTesto ? Promise.resolve(scriptTesto) : fetch('gmail/Codice.gs').then(function (r) { return r.text(); }).then(function (t) { scriptTesto = t; return t; }); }
  A.ACT.copiaScript = function () { caricaScript().then(function (t) { return navigator.clipboard.writeText(t); }).then(function () { A.toast('Script copiato: incollalo su script.google.com', 4000); }).catch(function () { A.ACT.vediScript(); }); };
  A.ACT.vediScript = function () { caricaScript().then(function (t) { A.sheet('Script per Gmail', '<p class="muted">Tieni premuto per selezionare e copiare.</p><pre class="code">' + esc(t) + '</pre>', null, { largo: true }); }); };

  // ---------- PIN ----------
  function chiediPin(titolo, dopo) {
    A.sheet(titolo, '<form id="fPin"><p>Scegli un PIN o una parola d\'accesso di <b>almeno 6 caratteri</b>. Più è lungo, più i dati sono al sicuro.</p>' +
      '<label class="f"><span>Nuovo PIN</span><input class="inp pin" type="password" name="p1" autocomplete="new-password" minlength="6" required></label>' +
      '<label class="f"><span>Ripeti il PIN</span><input class="inp pin" type="password" name="p2" autocomplete="new-password" required></label>' +
      '<p class="notice warn">Se dimentichi il PIN i dati non si possono recuperare. Prima conviene esportare i dati (Privacy e dati).</p>' +
      '<button class="btn block" type="submit">' + IC.lock + 'Conferma</button></form>', function (s) {
      A.$('#fPin', s).addEventListener('submit', function (e) {
        e.preventDefault(); var f = new FormData(e.target), p = String(f.get('p1'));
        if (p.length < 6) { A.toast('Almeno 6 caratteri'); return; }
        if (p !== f.get('p2')) { A.toast('I due PIN non coincidono'); return; }
        var b = A.$('button[type=submit]', s); b.disabled = true; b.innerHTML = '<span class="spinner"></span> Cifro i dati…';
        dopo(p).then(function () { A.chiudiSheet(); A.ridisegna(); }).catch(function (er) { b.disabled = false; b.textContent = 'Riprova'; A.toast('Errore: ' + (er.message || er), 5000); });
      });
    });
  }
  A.ACT.impostaPin = function () { chiediPin('Attiva il PIN', function (p) { return Archivio.impostaPin(p, A.D).then(function () { A.log('PIN attivato', 'dati e documenti cifrati'); A.save(); if (window.Cartella) Cartella.risincronizza(); A.toast('PIN attivo: dati cifrati'); }); }); };
  A.ACT.cambiaPin = function () { chiediPin('Cambia il PIN', function (p) { return Archivio.impostaPin(p, A.D).then(function () { A.log('PIN cambiato'); A.save(); if (window.Cartella) Cartella.risincronizza(); A.toast('PIN cambiato'); }); }); };
  A.ACT.togliPin = function () {
    if (!confirm('Togliere il PIN? Dati e documenti non saranno più cifrati su questo dispositivo.')) return;
    Archivio.togliPin(A.D).then(function () { A.log('PIN tolto', 'dati non più cifrati'); A.save(); if (window.Cartella) Cartella.risincronizza(); A.ridisegna(); A.toast('PIN tolto'); });
  };
  A.ACT.bloccaOra = function () { A.blocca(); };

  // ---------- AI ----------
  A.ACT.accendiAi = function () {
    if (!A.$('#aiCons').checked) { A.toast('Per attivarlo serve il tuo consenso (la casella qui sopra)', 4000); return; }
    var k = A.$('#aiKey').value.trim();
    if (!/^sk-ant-/.test(k)) { A.toast('La chiave di Anthropic inizia con sk-ant-', 4000); return; }
    D().imp.aiKey = k; D().consensi.ai = true; D().consensi.aiTs = Date.now();
    A.log('Consenso assistente AI dato', 'servizio: Anthropic'); A.save(); A.ridisegna(); A.toast('Assistente AI attivo');
  };
  A.ACT.spegniAi = function () {
    D().imp.aiKey = ''; D().consensi.ai = false;
    Object.keys(D().email).forEach(function (k) { delete D().email[k].ai; });
    D().documenti.forEach(function (d) { delete d.ai; });
    A.log('Consenso assistente AI revocato', 'chiave e risposte salvate cancellate'); A.save(); A.ridisegna(); A.toast('Assistente AI spento, chiave cancellata');
  };
  A.ACT.provaAi = function () { A.toast('Provo…'); A.aiProva().then(function () { A.toast('Collegamento riuscito'); }).catch(function (e) { A.toast('Errore: ' + e.message, 5000); }); };

  // =================== PRIVACY E DATI ===================
  A.VIEWS.privacy = function (v) {
    var reg = D().registro;
    var h = '<a class="back" href="#/impostazioni">' + IC.left + 'Impostazioni</a>' + A.pagina('Privacy e dati', 'I tuoi dati restano tuoi');
    h += '<section class="card"><h2>Dove sono i tuoi dati</h2><p>Tutto — email lette, appuntamenti, documenti, note — è salvato <b>solo su questo dispositivo</b>' + (Archivio.pinAttivo() ? ', cifrato con il tuo PIN (AES-256).' : '. <b>Non è cifrato</b>: <a href="#/impostazioni">attiva il PIN</a>.') + ' Cartellina non ha un server, non usa pubblicità, non traccia cosa fai e non condivide nulla automaticamente.</p></section>';
    h += (window.Cartella ? Cartella.card() : '');
    h += '<section class="card"><h2>Cosa esce dal dispositivo, e quando</h2><ul class="plain-list">' +
      '<li><b>Gmail</b>: lo script che crei sul tuo account Google legge le email e le passa solo a Cartellina, con la tua parola segreta. Non cancella e non sposta niente.</li>' +
      '<li><b>Glossario online</b>: solo la parola che cerchi, solo se premi "Cerca", a Wikipedia e alla National Library of Medicine (USA).</li>' +
      '<li><b>Trasporti</b>: solo il comune o la posizione, solo se premi "Cerca", a OpenStreetMap.</li>' +
      '<li><b>Assistente AI</b> (' + (A.aiPronta() ? 'attivo' : 'spento') + '): solo i dati della singola richiesta, solo quando premi il tasto, ad Anthropic.</li>' +
      '<li><b>Mappe, telefonate, WhatsApp</b>: si aprono solo quando tocchi i relativi pulsanti.</li>' +
      '<li><b>Altre app</b> (AgendApp, Smistino): solo se attivi "Collega le app".</li><li><b>Cartella sul telefono</b>: solo se la scegli tu; i file restano nella cartella che hai scelto.</li></ul></section>';
    h += '<section class="card"><h2>I tuoi dati</h2><div class="btns col"><button class="btn" data-act="esporta">' + IC.down + 'Esporta i dati di questo profilo (con i documenti)</button><button class="btn sec" data-act="importa">' + IC.up + 'Importa da un\'esportazione (sostituisce questo profilo)</button><button class="btn ghost" data-act="exportIcs">' + IC.cal + 'Esporta il calendario (.ics)</button></div>' +
      '<p class="muted small">L\'esportazione è un file in chiaro: conservalo in un posto sicuro.</p></section>';
    h += '<section class="card"><h2>Registro delle attività</h2><p class="muted">Le ultime operazioni sui tuoi dati: cosa è stato aggiunto, aperto, esportato o inviato fuori.</p>' +
      (reg.length ? '<ul class="log">' + reg.slice(0, 150).map(function (r) { return '<li><span class="muted small">' + A.fmtTs(r.ts) + '</span><b>' + esc(r.a) + '</b>' + (r.d ? '<span>' + esc(r.d) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="muted">Ancora nessuna attività.</p>') + '</section>';
    h += '<section class="card danger-zone"><h2>Cancella tutto</h2><p>Elimina definitivamente da questo telefono <b>tutti i profili</b>: dati, documenti, chiavi e impostazioni di Cartellina. Non si può annullare. (Per eliminare un solo profilo usa il nome in alto.) I file già copiati nella cartella sul telefono vanno cancellati a mano.</p><button class="btn danger" data-act="cancellaTutto">' + IC.trash + 'Cancella tutto, per sempre</button>' +
      '<p class="muted small">Per scollegare anche Gmail: su script.google.com apri il progetto di Cartellina ed eliminalo (cestino); poi da myaccount.google.com → Sicurezza → App di terze parti rimuovi l\'accesso.</p></section>';
    v.innerHTML = h;
  };
  A.ACT.esporta = function () {
    A.toast('Preparo l\'esportazione…');
    var dati = JSON.parse(JSON.stringify(A.D)); dati.imp.aiKey = '';
    var file = {};
    A.D.documenti.reduce(function (p, d) {
      return p.then(function () { return Archivio.leggiFile(d.fileId); }).then(function (b) {
        if (!b) return; return b.arrayBuffer().then(function (buf) { file[d.fileId] = { mime: d.mime, b64: Archivio.b64(buf) }; });
      });
    }, Promise.resolve()).then(function () {
      A.log('Dati esportati', A.D.documenti.length + ' documenti inclusi'); A.save();
      A.scarica('cartellina-esportazione-' + A.oggi() + '.json', JSON.stringify({ formato: 'cartellina', versione: 2, creato: new Date().toISOString(), dati: dati, file: file }), 'application/json');
    }).catch(function (e) { A.toast('Esportazione non riuscita: ' + e.message, 5000); });
  };
  A.ACT.importa = function () {
    var i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      f.text().then(function (t) {
        var x = JSON.parse(t), dati = x.formato === 'cartellina' ? x.dati : x;
        if (!dati || !dati.eventi || !dati.imp) throw new Error('file non valido');
        if (!confirm('Sostituire i dati attuali con quelli del file? (' + (dati.documenti || []).length + ' documenti, ' + dati.eventi.length + ' impegni)')) return;
        var files = x.file || {};
        return Object.keys(files).reduce(function (p, id) { return p.then(function () { return Archivio.salvaFile(id, new Blob([Archivio.unb64(files[id].b64)], { type: files[id].mime })); }); }, Promise.resolve())
          .then(function () {
            var key = A.D.imp.aiKey;
            A.D = A.normalizza(dati); A.D.imp.aiKey = A.D.imp.aiKey || key;
            A.log('Dati importati', f.name); A.save(); A.applicaAspetto(); A.route(); A.toast('Dati importati'); if (window.Cartella) Cartella.risincronizza();
          });
      }).catch(function (e) { A.toast('Importazione non riuscita: ' + (e.message || e), 5000); });
    };
    i.click();
  };
  A.ACT.cancellaTutto = function () {
    if (!confirm('Cancellare DEFINITIVAMENTE tutti i dati e i documenti di Cartellina da questo dispositivo?')) return;
    if (prompt('Per confermare scrivi CANCELLA') !== 'CANCELLA') { A.toast('Cancellazione annullata'); return; }
    if (window.Ponte && Ponte.attivo()) { try { ponteScollegaTutto(); } catch (e) { /* no */ } }
    A.pronto = false;
    Archivio.cancellaTutto().then(function () { location.replace(location.pathname); });
  };
  function ponteScollegaTutto() { try { localStorage.removeItem('ponte.v1.pkt.cartellina'); localStorage.removeItem('ponte.v1.imp.cartellina'); } catch (e) { /* no */ } }
})(CA);
