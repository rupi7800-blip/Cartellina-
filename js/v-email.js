/* =========================================================
   Cartellina — Email sanitarie
   - smistamento: Salute · Da verificare · Altre email
   - nessuna email viene cancellata, spostata o archiviata
   - le date trovate diventano PROPOSTE: entrano in calendario
     solo quando le confermi tu
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; }, C = Classificatore;
  var ST = { sanitaria: 'Salute', verifica: 'Da verificare', scartata: 'Altre email' };

  A.listaEmail = function (stato) {
    return Object.keys(D().email).map(function (k) { return D().email[k]; }).filter(function (m) { return !stato || m.stato === stato; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  };
  A.contaEmailNuove = function () {
    return A.listaEmail().filter(function (m) { return m.stato === 'verifica' || (m.stato === 'sanitaria' && !m.letta); }).length;
  };
  function mittente(m) { return C.indirizzo(m.from); }
  function nomeMitt(m) { return String(m.from || '').replace(/<.*>/, '').replace(/"/g, '').trim() || m.from || 'Mittente sconosciuto'; }
  A.nomeMitt = nomeMitt;

  // ---------- analisi (una volta per email, poi resta memorizzata) ----------
  A.analizzaEmail = function (rec) {
    var prima = rec.analisi;
    var x = C.analizza(rec, new Date(), D().regole, rec.stato);
    // conserva le scelte già fatte sulle proposte
    (x.eventi || []).forEach(function (ev) {
      var old = prima && (prima.eventi || []).filter(function (o) { return o.data === ev.data && (o.ora || '') === (ev.ora || ''); })[0];
      if (old) { ev.stato = old.stato; ev.aggiunto = old.aggiunto; }
      var gia = D().eventi.filter(function (e) { return e.data === ev.data && (e.ora || '') === (ev.ora || '') && (e.emailId === rec.id || e.tipo === ev.tipo); })[0];
      if (gia) { ev.stato = 'aggiunto'; ev.aggiunto = gia.id; }
    });
    if (prima && prima.catManuale) { x.categoria = prima.categoria; x.categoriaNome = C.NOMI_CAT[prima.categoria] || prima.categoriaNome; x.categoriaCerta = true; x.catManuale = true; }
    rec.analisi = x;
    return x;
  };

  function tipoContattoDa(s) {
    s = A.norm(s);
    if (/laborator|analisi|prelievi/.test(s)) return 'Centro esami';
    if (/diagnostic|radiolog|imaging|risonanza/.test(s)) return 'Diagnostica';
    if (/ospedal|asst|asl|ats|aulss|usl|policlinic|irccs|clinica|aou|azienda/.test(s)) return 'Ospedale';
    if (/farmac/.test(s)) return 'Farmacia';
    if (/dott|dr\.|medico|studio/.test(s)) return 'Medico';
    return 'Altro';
  }
  // medici e strutture finiscono in rubrica (solo per le email sanitarie)
  function acquisisciContatto(rec) {
    var x = rec.analisi; if (!x) return 0;
    var c = A.trovaContatto(x.mittente.email, x.telefoni), nuovi = 0;
    if (!c && (x.mittente.email || x.telefoni.length)) {
      c = { id: A.uid(), nome: x.struttura || x.mittente.nome || x.mittente.email, tipo: tipoContattoDa(rec.from + ' ' + (x.luogo.presso || '')), specialita: '',
        tel: x.telefoni[0] || '', tel2: x.telefoni[1] || '', whatsapp: '', email: x.mittente.email || x.emails[0] || '', indirizzo: x.luogo.indirizzo || '', web: '', note: 'Aggiunto dall\'email: ' + rec.subject, fonte: 'email', demo: rec.demo };
      D().contatti.push(c); nuovi = 1;
    } else if (c) {
      if (!c.tel && x.telefoni[0]) c.tel = x.telefoni[0];
      if (!c.indirizzo && x.luogo.indirizzo) c.indirizzo = x.luogo.indirizzo;
    }
    rec.contattoId = c ? c.id : '';
    return nuovi;
  }

  // elabora le email arrivate (Gmail, incollate, Smistino, prova). Elaborazione incrementale: le già viste si saltano.
  A.elaboraEmail = function (lista, fonte) {
    var stat = { sanitarie: 0, verifica: 0, proposte: 0, nuove: 0 };
    lista.forEach(function (e) {
      if (!e || !e.id || D().email[e.id]) return;
      var c = C.classifica(e, D().regole);
      var rec = { id: e.id, from: e.from || '', subject: e.subject || '', date: e.date || new Date().toISOString(), body: String(e.body || '').slice(0, 8000), labels: e.labels || [],
        attachments: e.attachments || [], allegati: e.allegati || null, stato: c.stato, punteggio: c.punteggio, motivi: c.motivi, fonte: fonte, arrivata: Date.now(), letta: false, demo: /^demo-/.test(e.id) };
      D().email[rec.id] = rec; stat.nuove++;
      if (rec.stato !== 'scartata') {
        A.analizzaEmail(rec);
        stat.proposte += rec.analisi.eventi.filter(function (ev) { return !ev.stato; }).length;
      }
      if (rec.stato === 'sanitaria') { stat.sanitarie++; acquisisciContatto(rec); }
      else if (rec.stato === 'verifica') stat.verifica++;
    });
    A.save();
    return stat;
  };

  // ---------- vista ----------
  var tab = '', catF = '', mailQ = '';
  A.VIEWS.email = function (v) {
    var n = { sanitaria: A.listaEmail('sanitaria').length, verifica: A.listaEmail('verifica').length, scartata: A.listaEmail('scartata').length };
    if (!tab) tab = n.verifica ? 'verifica' : 'sanitaria';
    var I = D().imp, coll = !!I.gmailUrl;
    var h = A.pagina('Email', 'Le comunicazioni sanitarie, lette e ordinate per te', coll ? '<button class="btn sec sm" data-act="controllaEmail">' + IC.refresh + 'Controlla</button>' : '');
    if (coll) h += '<p class="status' + (I.erroreGmail ? ' err' : ' ok') + '"><i></i>' + (I.erroreGmail ? 'Problema con Gmail: ' + esc(I.erroreGmail) + ' <a href="#/impostazioni">Risolvi</a>' : 'Gmail collegata · ultimo controllo ' + (I.ultimoControllo ? A.fmtTs(I.ultimoControllo) : 'mai')) + '</p>';
    else h += '<section class="card"><h2>Collega la tua casella Gmail</h2><p>Cartellina riconosce da sola le email di ospedali, medici e laboratori, ne fa un riassunto e ti propone le date da segnare. Le email non vengono mai cancellate né spostate.</p>' +
      '<div class="btns"><a class="btn" href="#/impostazioni">' + IC.link + 'Collega Gmail</a><button class="btn sec" data-act="incollaEmail">' + IC.plus + 'Incolla un\'email</button>' + (!Object.keys(D().email).length ? '<button class="btn ghost" data-act="demo">' + IC.spark + 'Prova con esempi</button>' : '') + '</div></section>';
    h += '<div class="seg big" role="tablist">' + ['sanitaria', 'verifica', 'scartata'].map(function (k) { return '<button role="tab" aria-selected="' + (tab === k) + '" class="' + (tab === k ? 'on' : '') + '" data-act="mailTab" data-t="' + k + '">' + ST[k] + ' <span class="n">' + n[k] + '</span></button>'; }).join('') + '</div>';
    h += '<label class="search"><span class="sr">Cerca nelle email</span>' + IC.search + '<input class="inp" id="mailQ" type="search" placeholder="Cerca mittente, oggetto, testo…" value="' + esc(mailQ) + '"></label>';
    if (tab === 'sanitaria') {
      var cats = {};
      A.listaEmail('sanitaria').forEach(function (m) { var k = (m.analisi && m.analisi.categoria) || ''; cats[k] = (cats[k] || 0) + 1; });
      var ks = Object.keys(cats).filter(Boolean);
      if (ks.length > 1) h += '<div class="chips"><button class="chip' + (!catF ? ' on' : '') + '" data-act="mailCat" data-c="">Tutte</button>' + C.CATEGORIE.filter(function (c) { return cats[c.k]; }).map(function (c) { return '<button class="chip' + (catF === c.k ? ' on' : '') + '" data-act="mailCat" data-c="' + c.k + '">' + c.n + ' <span class="n">' + cats[c.k] + '</span></button>'; }).join('') + '</div>';
    }
    if (tab === 'verifica') h += '<p class="notice">Non sono sicura che queste email riguardino la salute: dimmelo tu. Ricordo la tua scelta per lo stesso mittente.</p>';
    if (tab === 'scartata') h += '<p class="notice">Email senza segnali sanitari. Restano consultabili: se una riguarda la salute, aprila e segnalalo.</p>';
    h += '<div id="mailList" class="list"></div>';
    if (coll || Object.keys(D().email).length) h += '<div class="btns"><button class="btn ghost" data-act="incollaEmail">' + IC.plus + 'Analizza un\'email incollata</button></div>';
    v.innerHTML = h;
    var q = A.$('#mailQ');
    q.addEventListener('input', function () { mailQ = q.value; lista(); });
    lista();
    D().imp.emailViste = Date.now(); A.save();
  };
  function lista() {
    var q = A.norm(mailQ.trim());
    var lst = A.listaEmail(tab).filter(function (m) {
      if (tab === 'sanitaria' && catF && (!m.analisi || m.analisi.categoria !== catF)) return false;
      return !q || A.norm([m.from, m.subject, m.body].join(' ')).indexOf(q) >= 0;
    });
    A.$('#mailList').innerHTML = lst.length ? lst.map(A.mailCard).join('') : '<p class="muted pad">' + (q ? 'Nessuna email trovata.' : tab === 'verifica' ? 'Nessuna email in dubbio.' : 'Nessuna email qui.') + '</p>';
  }
  A.mailCard = function (m) {
    var d = new Date(m.date), x = m.analisi || {};
    var nuova = m.stato === 'sanitaria' && !m.letta;
    return '<div class="mailcard' + (nuova ? ' new' : '') + '"><button class="plain" data-act="apriEmail" data-id="' + esc(m.id) + '"><span class="row"><span class="from grow">' + (nuova ? '<i class="dot" aria-label="Da leggere"></i>' : '') + esc(nomeMitt(m)) + '</span><span class="muted small">' + d.getDate() + ' ' + A.MM[d.getMonth()] + '</span></span>' +
      '<span class="subj">' + esc(m.subject || '(senza oggetto)') + '</span>' +
      (m.stato !== 'scartata' && x.categoriaNome ? '<span class="tag' + (x.categoria ? '' : ' warn') + '">' + esc(x.categoriaNome) + '</span>' : '') +
      (x.riassunto ? '<span class="sum">' + esc(A.taglia(x.riassunto, 140)) + '</span>' : '') + '</button>' +
      (m.stato === 'verifica' ? '<div class="btns"><button class="btn sm" data-act="confermaEmail" data-id="' + esc(m.id) + '">' + IC.check + 'Sì, riguarda la salute</button><button class="btn sm ghost" data-act="rifiutaEmail" data-id="' + esc(m.id) + '">No</button></div>' : '') + '</div>';
  };
  A.ACT.mailTab = function (el) { tab = el.dataset.t; catF = ''; A.ridisegna(); };
  A.ACT.mailCat = function (el) { catF = el.dataset.c; A.ridisegna(); };
  A.ACT.controllaEmail = function () { A.controllaEmail(true); };

  // ---------- dettaglio ----------
  A.ACT.apriEmail = function (el) { A.apriEmail(el.dataset.id); };
  A.apriEmail = function (id) {
    var m = D().email[id]; if (!m) { A.toast('Email non più presente'); return; }
    if (!m.letta) { m.letta = true; A.save(); A.aggiornaBadge(); }
    if (m.stato !== 'scartata' && (!m.analisi || m.analisi.versione !== 2)) { A.analizzaEmail(m); A.save(); }
    var d = new Date(m.date), x = m.analisi || {};
    var h = '<p><b>' + esc(nomeMitt(m)) + '</b><br><span class="muted small">' + esc(mittente(m)) + ' · ' + d.getDate() + ' ' + A.MML[d.getMonth()] + ' ' + d.getFullYear() + ', ' + A.hm(d) + '</span></p>' +
      '<p><span class="tag ' + (m.stato === 'sanitaria' ? 'ok' : m.stato === 'verifica' ? 'warn' : '') + '">' + ST[m.stato] + '</span> ' + (x.categoriaNome && m.stato !== 'scartata' ? '<span class="tag">' + esc(x.categoriaNome) + '</span>' : '') + '</p>';
    if (m.stato === 'verifica') h += '<div class="notice warn"><b>Riguarda la tua salute?</b> Non ne sono sicura (' + esc((m.motivi || []).slice(0, 2).join('; ')) + ').<div class="btns"><button class="btn" data-act="confermaEmail" data-id="' + esc(m.id) + '">' + IC.check + 'Sì</button><button class="btn ghost" data-act="rifiutaEmail" data-id="' + esc(m.id) + '">No</button></div></div>';
    if (m.stato !== 'scartata') {
      h += '<section class="box"><h3>In breve</h3><p>' + esc(x.riassunto || 'Non ho trovato date, richieste o scadenze in questa email.') + '</p><p class="src">Riassunto automatico ricavato dal testo dell\'email, sul tuo dispositivo. Controlla sempre l\'originale qui sotto.</p></section>';
      if (m.ai) h += '<section class="box ai"><h3>' + IC.chat + 'Spiegazione dell\'assistente AI</h3><p class="prewrap">' + esc(m.ai.testo) + '</p><p class="src">Interpretazione generata da un servizio esterno (Anthropic) il ' + A.fmtTs(m.ai.ts) + ': può contenere errori. Fa fede l\'email originale.</p></section>';
      else if (A.aiPronta && A.aiPronta()) h += '<button class="btn sec block" data-act="aiEmail" data-id="' + esc(m.id) + '">' + IC.chat + 'Fatti spiegare dall\'assistente AI</button>';
      h += '<h3>Cosa ho trovato nel testo</h3>';
      h += A.fatto('Da', esc(x.struttura || nomeMitt(m)));
      h += A.fatto('Argomento', esc(x.categoriaNome || '—') + (x.categoria ? '' : ' <span class="muted">— sceglilo qui sotto</span>'));
      (x.eventi || []).forEach(function (ev, i) {
        var stato = ev.stato === 'aggiunto' && ev.aggiunto && A.evento(ev.aggiunto) ? '<button class="btn sm sec" data-act="apriEvento" data-id="' + ev.aggiunto + '">' + IC.check + 'Nel calendario</button>'
          : ev.stato === 'ignorato' ? '<span class="tag">Non aggiunto</span> <button class="linkbtn" data-act="propEmail" data-id="' + esc(m.id) + '" data-i="' + i + '">Aggiungi</button>'
          : '<button class="btn sm" data-act="propEmail" data-id="' + esc(m.id) + '" data-i="' + i + '">' + IC.plus + 'Aggiungi al calendario</button> <button class="linkbtn" data-act="ignoraProp" data-id="' + esc(m.id) + '" data-i="' + i + '">No</button>';
        h += '<div class="found static"><span class="row"><span class="ticon sm ' + (A.COL[ev.tipo] || 'c7') + '">' + A.ico(ev.tipo) + '</span><span class="grow"><b>' + esc(ev.titolo) + '</b><br>' + A.cap(A.fmtLunga(ev.data)) + (ev.ora ? ' · ore ' + ev.ora : ' · <i>orario non trovato</i>') + (ev.luogo || ev.indirizzo ? '<br><span class="muted">' + esc(ev.luogo || ev.indirizzo) + '</span>' : '') + '</span></span><span class="btns">' + stato + '</span></div>';
      });
      (x.scadenze || []).forEach(function (s, i) {
        h += '<div class="found static"><span><b>Scadenza: ' + A.fmtLunga(s.data) + '</b><br><span class="muted">' + esc(s.testo) + '</span></span><span class="btns"><button class="btn sm sec" data-act="scadEmail" data-id="' + esc(m.id) + '" data-i="' + i + '">' + IC.plus + 'Nel calendario</button></span></div>';
      });
      if (x.luogo && x.luogo.indirizzo) h += A.fatto('Indirizzo', esc(x.luogo.indirizzo) + ' <a class="linkbtn" target="_blank" rel="noopener" href="' + esc(A.mapsDir(x.luogo.indirizzo)) + '">Percorso</a>');
      if ((x.azioni || []).length) h += A.fatto('Ti chiedono di', x.azioni.map(function (a) { return '<b>' + esc(a.nome) + '</b><br><span class="muted">«' + esc(a.testo) + '»</span>'; }).join('<br>'));
      if ((x.richieste || []).length) h += A.fatto('Documenti richiesti', x.richieste.map(function (r) { return '«' + esc(r) + '»'; }).join('<br>'));
      if ((x.preparazione || []).length) h += A.fatto('Preparazione', x.preparazione.map(function (r) { return '«' + esc(r) + '»'; }).join('<br>'));
      if ((x.portare || []).length) h += A.fatto('Da portare', esc(x.portare.join(', ')));
      if (x.prenotazione) h += A.fatto('Codice prenotazione', '<b>' + esc(x.prenotazione) + '</b> <button class="linkbtn" data-act="copia" data-t="' + esc(x.prenotazione) + '">Copia</button>');
      if (x.nre) h += A.fatto('Codice ricetta (NRE)', '<b>' + esc(x.nre) + '</b> <button class="linkbtn" data-act="copia" data-t="' + esc(x.nre) + '">Copia</button>');
      if ((x.telefoni || []).length) h += '<div class="quick">' + x.telefoni.map(function (t) { return '<a class="qa" href="tel:' + esc(t) + '">' + IC.phone + esc(t) + '</a>'; }).join('') + '</div>';
      var c = A.contatto(m.contattoId);
      if (c) h += '<button class="found" data-act="apriContatto" data-id="' + c.id + '"><span class="muted">In rubrica</span><b>' + esc(c.nome) + '</b></button>';
    }
    // allegati
    var all = (x.allegati && x.allegati.length) ? x.allegati : (m.allegati || (m.attachments || []).map(function (n, i) { return { nome: n, i: i }; }));
    if (all.length) {
      var puo = m.fonte === 'gmail' && !m.demo && D().imp.versioneScript >= 2;
      h += '<h3>Allegati</h3>' + all.map(function (a) {
        var salvato = D().documenti.filter(function (dd) { return dd.emailId === m.id && dd.nome === a.nome; })[0];
        return '<div class="found static"><span class="row">' + IC.clip + '<span class="grow">' + esc(a.nome) + (a.kb ? ' <span class="muted">· ' + a.kb + ' KB</span>' : '') + '</span></span>' +
          (salvato ? '<button class="btn sm sec" data-act="apriDoc" data-id="' + salvato.id + '">' + IC.check + 'In Documenti</button>' : puo ? '<button class="btn sm" data-act="salvaAllegato" data-id="' + esc(m.id) + '" data-i="' + a.i + '" data-n="' + esc(a.nome) + '">' + IC.down + 'Salva in Documenti</button>' : '') + '</div>';
      }).join('') + (m.fonte === 'gmail' && !m.demo && D().imp.versioneScript < 2 ? '<p class="muted small">Per salvare gli allegati in Documenti aggiorna lo script Gmail (Impostazioni → Email). Puoi anche scaricarli da Gmail e caricarli in Documenti.</p>' : m.fonte !== 'gmail' ? '<p class="muted small">Scarica l\'allegato dalla tua casella e caricalo in Documenti.</p>' : '');
    }
    // classificazione
    h += '<h3>Classificazione</h3><div class="row wrap">';
    if (m.stato === 'sanitaria') h += '<button class="btn ghost sm" data-act="rifiutaEmail" data-id="' + esc(m.id) + '">Non riguarda la salute</button>';
    if (m.stato === 'scartata') h += '<button class="btn sm" data-act="recuperaEmail" data-id="' + esc(m.id) + '">' + IC.check + 'In realtà riguarda la salute</button>';
    h += '</div>';
    if (m.stato !== 'scartata') h += '<label class="f"><span>Argomento (correggilo se è sbagliato)</span><select class="inp" data-chg-cat="' + esc(m.id) + '"><option value="">— non so —</option>' + C.CATEGORIE.map(function (c) { return '<option value="' + c.k + '"' + (x.categoria === c.k ? ' selected' : '') + '>' + c.n + '</option>'; }).join('') + '</select></label>';
    if (m.stato !== 'sanitaria') h += '<button class="linkbtn danger-t" data-act="bloccaMittente" data-id="' + esc(m.id) + '">Considera sempre "non sanitarie" le email di ' + esc(mittente(m)) + '</button>';
    // originale, sempre consultabile
    h += '<h3>Email originale <span class="muted small">— tocca le parole sottolineate per la spiegazione</span></h3><div class="mailbody">' + A.evidenzia(m.body || '') + '</div>';
    A.sheet(esc(m.subject || '(senza oggetto)'), h, function (s) {
      var sel = A.$('[data-chg-cat]', s);
      if (sel) sel.addEventListener('change', function () { cambiaCategoria(m, sel.value); });
    }, { largo: true });
  };
  function cambiaCategoria(m, k) {
    var x = m.analisi || A.analizzaEmail(m);
    x.categoria = k; x.categoriaNome = k ? C.NOMI_CAT[k] : 'Argomento non riconosciuto'; x.catManuale = true; x.categoriaCerta = !!k;
    var a = mittente(m);
    if (k && D().imp.impara && a) D().regole.categorie[a] = k;
    A.log('Argomento email corretto', (m.subject || '') + ' → ' + (x.categoriaNome || ''));
    A.save(); A.toast(k ? 'Argomento aggiornato. Lo ricordo per questo mittente.' : 'Argomento tolto');
    if (location.hash.indexOf('email') >= 0) A.ridisegna();
  }

  // proposte → calendario (solo con la tua conferma)
  A.ACT.propEmail = function (el) { A.aggiungiProposta(el.dataset.id, +el.dataset.i); };
  A.aggiungiProposta = function (id, i, subito) {
    var m = D().email[id], ev = m.analisi.eventi[i], x = m.analisi, c = A.contatto(m.contattoId);
    var bozza = { tipo: ev.tipo === 'Altro' ? 'Visita' : ev.tipo, titolo: ev.titolo, data: ev.data, ora: ev.ora, luogo: ev.luogo || (c ? c.nome : x.struttura || ''), indirizzo: ev.indirizzo || (c ? c.indirizzo : ''), contattoId: m.contattoId,
      portare: (x.portare || []).map(function (p) { return { t: p, ok: false }; }), preparazione: (x.preparazione || []).join('\n'),
      note: [x.prenotazione ? 'Codice prenotazione: ' + x.prenotazione : '', 'Da email: ' + m.subject].filter(Boolean).join('\n'), fonte: 'email', emailId: m.id, demo: m.demo };
    A.formEvento(bozza, function (rec) { ev.stato = 'aggiunto'; ev.aggiunto = rec.id; A.save(); A.chiudiSheet(true); });
  };
  A.ACT.ignoraProp = function (el) {
    var m = D().email[el.dataset.id]; m.analisi.eventi[+el.dataset.i].stato = 'ignorato'; A.save(); A.chiudiSheet(true); A.apriEmail(m.id); A.ridisegnaDopo();
  };
  A.ACT.scadEmail = function (el) {
    var m = D().email[el.dataset.id], s = m.analisi.scadenze[+el.dataset.i];
    A.formEvento({ tipo: /rinnov|ricett|piano terapeutico|esenzion/i.test(s.testo) ? 'Rinnovo' : 'Scadenza', titolo: A.taglia(s.testo, 60), data: s.data, note: 'Da email: ' + m.subject, fonte: 'email', emailId: m.id, demo: m.demo });
  };
  A.ridisegnaDopo = function () { if (!A.$('#sheetRoot .sheet-bg')) A.ridisegna(); else if (/home/.test(location.hash) || !location.hash) A.ridisegna(); };

  // ---------- conferme e correzioni ----------
  A.ACT.confermaEmail = function (el) { confermaEmail(el.dataset.id); };
  function confermaEmail(id) {
    var m = D().email[id]; if (!m) return;
    m.stato = 'sanitaria'; m.motivi = ['Confermata da te'].concat(m.motivi || []); m.letta = true;
    var a = mittente(m), extra = 0;
    if (D().imp.impara && a && D().regole.fidati.indexOf(a) < 0) {
      D().regole.fidati.push(a);
      D().regole.bloccati = D().regole.bloccati.filter(function (b) { return b !== a; });
      A.listaEmail('verifica').forEach(function (o) { if (mittente(o) === a) { o.stato = 'sanitaria'; o.motivi = ['Mittente confermato da te']; A.analizzaEmail(o); acquisisciContatto(o); extra++; } });
      syncRegole();
    }
    A.analizzaEmail(m); acquisisciContatto(m);
    if (!m.demo) avvisaScript({ azione: 'etichetta', id: m.id, stato: 'sanitaria' });
    A.log('Email confermata come sanitaria', m.subject);
    A.save(); A.chiudiSheet(true); A.ridisegna();
    var prop = (m.analisi.eventi || []).filter(function (e) { return !e.stato; }).length;
    A.toast('Segnata come sanitaria' + (prop ? ' · ' + prop + ' date da confermare in "Da fare"' : '') + (extra ? ' · altre ' + extra + ' dallo stesso mittente' : ''), 4000);
  }
  A.ACT.rifiutaEmail = function (el) { rifiutaEmail(el.dataset.id, false); };
  A.ACT.bloccaMittente = function (el) { rifiutaEmail(el.dataset.id, true); };
  function rifiutaEmail(id, sempre) {
    var m = D().email[id]; if (!m) return;
    var auto = D().eventi.filter(function (e) { return e.emailId === id && e.fonte === 'email'; });
    var togli = auto.length && confirm('Vuoi togliere anche ' + (auto.length > 1 ? 'i ' + auto.length + ' appuntamenti aggiunti' : 'l\'appuntamento aggiunto') + ' da questa email?');
    if (togli) D().eventi = D().eventi.filter(function (e) { return !(e.emailId === id && e.fonte === 'email'); });
    m.stato = 'scartata'; m.motivi = ['Indicata da te come non sanitaria'];
    var a = mittente(m);
    D().regole.fidati = D().regole.fidati.filter(function (f) { return f !== a; });
    if (sempre && a && D().regole.bloccati.indexOf(a) < 0) D().regole.bloccati.push(a);
    syncRegole();
    if (!m.demo) avvisaScript({ azione: 'etichetta', id: m.id, stato: 'scartata' });
    A.log('Email indicata come non sanitaria', m.subject);
    A.save(); A.chiudiSheet(true); A.ridisegna(); A.toast(sempre ? 'Le email di ' + a + ' andranno in "Altre email"' : 'Spostata in "Altre email" (solo in Cartellina)');
  }
  A.ACT.recuperaEmail = function (el) {
    var m = D().email[el.dataset.id]; if (!m) return;
    D().regole.bloccati = D().regole.bloccati.filter(function (b) { return b !== mittente(m); });
    m.stato = 'verifica'; confermaEmail(m.id);
  };

  // ---------- collegamento Gmail ----------
  var inControllo = false;
  A.urlScript = function (extra) {
    var u = new URL(D().imp.gmailUrl);
    u.searchParams.set('token', D().imp.token || '');
    Object.keys(extra || {}).forEach(function (k) { u.searchParams.set(k, extra[k]); });
    return u.toString();
  };
  A.controllaEmail = function (manuale) {
    if (!D().imp.gmailUrl) { if (manuale) A.toast('Collega prima la tua email in Impostazioni'); return Promise.resolve(); }
    if (inControllo) return Promise.resolve();
    if (!navigator.onLine) { if (manuale) A.toast('Sei senza connessione: riprovo quando torna'); return Promise.resolve(); }
    inControllo = true;
    if (manuale) A.toast('Controllo le email…');
    return fetch(A.urlScript({ giorni: D().imp.giorni || 7 }))
      .then(function (r) { if (!r.ok) throw new Error('Gmail ha risposto con un errore (' + r.status + ')'); return r.json(); })
      .then(function (j) {
        if (j.error) throw new Error(j.error === 'token' ? 'la parola segreta non corrisponde a quella dello script' : j.error);
        D().imp.versioneScript = j.versione || 1;
        var s = A.elaboraEmail(j.emails || [], 'gmail');
        D().imp.ultimoControllo = Date.now(); D().imp.erroreGmail = '';
        if (s.nuove) A.log('Email lette da Gmail', s.nuove + ' nuove (' + s.sanitarie + ' sanitarie, ' + s.verifica + ' da verificare)');
        A.save();
        avvisaNuove(s, manuale);
        if (!A.$('#sheetRoot .sheet-bg') && /email|home/.test(location.hash || '#/home')) A.ridisegna(); else A.aggiornaBadge();
      })
      .catch(function (e) {
        var msg = String(e.message || e);
        D().imp.erroreGmail = /Failed to fetch|NetworkError|Load failed/.test(msg) ? 'indirizzo dello script non raggiungibile' : msg; A.save();
        if (manuale) A.toast('Errore: ' + D().imp.erroreGmail, 5000);
        if (/email/.test(location.hash)) A.ridisegna();
      })
      .then(function () { inControllo = false; });
  };
  function avvisaNuove(s, manuale) {
    if (!s.nuove) { if (manuale) A.toast('Nessuna email nuova'); return; }
    var parti = [];
    if (s.sanitarie) parti.push(s.sanitarie + ' sanitari' + (s.sanitarie > 1 ? 'e' : 'a'));
    if (s.verifica) parti.push(s.verifica + ' da verificare');
    if (!parti.length) { if (manuale) A.toast('Nessuna email sanitaria nuova'); return; }
    var extra = s.proposte ? ' · ' + s.proposte + (s.proposte > 1 ? ' date' : ' data') + ' da confermare' : '';
    A.toast('Nuove email: ' + parti.join(', ') + extra, 4500);
    A.notificaSistema('Cartellina: ' + parti.join(', '), s.proposte ? 'Ci sono date da confermare nel calendario.' : 'Tocca per vederle', { tipo: 'email' });
  }
  function avvisaScript(params) { if (D().imp.gmailUrl) fetch(A.urlScript(params)).catch(function () {}); }
  function syncRegole() { avvisaScript({ azione: 'regole', fidati: D().regole.fidati.join(','), bloccati: D().regole.bloccati.join(',') }); }
  A.syncRegole = syncRegole;

  // allegato → Documenti (il file originale arriva intatto dalla tua casella)
  A.ACT.salvaAllegato = function (el) {
    var m = D().email[el.dataset.id]; if (!m) return;
    el.disabled = true; el.innerHTML = '<span class="spinner"></span> Scarico…';
    fetch(A.urlScript({ azione: 'allegato', id: m.id, i: el.dataset.i }))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) throw new Error(j.error);
        var bytes = Archivio.unb64(j.dati);
        var blob = new Blob([bytes], { type: j.tipo || 'application/octet-stream' });
        A.log('Allegato scaricato da Gmail', j.nome);
        return A.aggiungiFile(blob, j.nome, { emailId: m.id, struttura: m.analisi && m.analisi.struttura, data: A.ymd(new Date(m.date)) });
      })
      .catch(function (e) { A.toast('Non riesco a scaricare l\'allegato: ' + (e.message || e), 5000); el.disabled = false; el.textContent = 'Riprova'; });
  };

  // ---------- email incollata e di prova ----------
  A.ACT.incollaEmail = function () {
    A.sheet('Analizza un\'email', '<p class="muted">Hai un\'email su un altro servizio (Libero, Outlook, PEC…)? Copia e incolla qui il testo: lo analizzo sul tuo dispositivo.</p>' +
      '<form id="fIn"><label class="f"><span>Mittente (facoltativo)</span><input class="inp" name="from" placeholder="es. cup@asst-…it"></label><label class="f"><span>Oggetto</span><input class="inp" name="subject"></label>' +
      '<label class="f"><span>Testo dell\'email</span><textarea class="inp tall" name="body" required></textarea></label><button class="btn block" type="submit">' + IC.search + 'Analizza</button></form>', function (s) {
      A.$('#fIn', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target), id = 'man-' + A.uid();
        if (!String(f.get('body')).trim()) { A.toast('Incolla il testo dell\'email'); return; }
        A.elaboraEmail([{ id: id, from: f.get('from'), subject: f.get('subject'), body: f.get('body'), date: new Date().toISOString(), labels: [] }], 'incollata');
        A.chiudiSheet(); tab = D().email[id].stato; if (location.hash !== '#/email') location.hash = '#/email'; else A.ridisegna();
        setTimeout(function () { A.apriEmail(id); }, 80);
      });
    });
  };
  A.ACT.demo = function () {
    if (D().email['demo-1']) { A.toast('Le email di prova sono già caricate'); location.hash = '#/email'; return; }
    var s = A.elaboraEmail(EMAIL_ESEMPIO, 'prova');
    tab = 'sanitaria';
    A.toast('Ho letto 8 email di prova: ' + s.sanitarie + ' sanitarie, ' + s.verifica + ' da verificare, ' + s.proposte + ' date da confermare', 5000);
    if (location.hash === '#/email') A.ridisegna(); else location.hash = '#/email';
  };
  A.ACT.togliDemo = function () {
    Object.keys(D().email).forEach(function (k) { if (D().email[k].demo) delete D().email[k]; });
    D().eventi = D().eventi.filter(function (e) { return !e.demo; });
    D().contatti = D().contatti.filter(function (c) { return !c.demo; });
    A.save(); A.ridisegna(); A.toast('Dati di prova rimossi');
  };

  // archivio leggero: email non sanitarie vecchie (solo la copia in Cartellina, mai in Gmail)
  A.pulisci = function () {
    var lim = Date.now() - 120 * 864e5;
    Object.keys(D().assunzioni).forEach(function (k) { if ((D().assunzioni[k].at || 0) < lim) delete D().assunzioni[k]; });
    Object.keys(D().rinvii).forEach(function (k) { if (D().rinvii[k] < Date.now() - 864e5) delete D().rinvii[k]; });
    Object.keys(D().notificati).forEach(function (k) { if (D().notificati[k] < lim) delete D().notificati[k]; });
    var limMail = Date.now() - 60 * 864e5;
    Object.keys(D().email).forEach(function (k) {
      var m = D().email[k];
      if (m.stato === 'scartata' && (m.arrivata || 0) < limMail && !m.demo) delete D().email[k];
    });
  };
  // email della versione 1.x: aggiungo l'analisi una sola volta
  A.migraEmail = function () {
    var n = 0;
    Object.keys(D().email).forEach(function (k) {
      var m = D().email[k];
      if (m.letta == null) m.letta = (m.arrivata || 0) <= (D().imp.emailViste || 0);
      if (m.stato !== 'scartata' && (!m.analisi || m.analisi.versione !== 2)) {
        var vecchi = (m.estratto && m.estratto.eventi) || [];
        A.analizzaEmail(m);
        m.analisi.eventi.forEach(function (ev) { var o = vecchi.filter(function (v) { return v.data === ev.data && v.ora === ev.ora && v.aggiunto; })[0]; if (o && A.evento(o.aggiunto)) { ev.stato = 'aggiunto'; ev.aggiunto = o.aggiunto; } });
        delete m.estratto; n++;
      }
    });
    return n;
  };
})(CA);
