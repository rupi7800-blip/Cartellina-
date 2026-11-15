/* =========================================================
   Cartellina — Assistente: ricerca unica e strumenti
   La ricerca e gli strumenti lavorano SOLO sui tuoi dati,
   sul dispositivo. Le risposte riportano ciò che c'è scritto
   e da dove viene. L'assistente AI (facoltativo) è separato
   e ogni sua risposta è indicata come interpretazione.
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };

  // ---------- ricerca ----------
  var STOP = ('trova trovami cerca cercami mostra mostrami fammi vedere dammi dimmi quando quanto quale qual quali chi come dove cosa che per con del dello della dei degli delle dell nel nella nei negli nelle sul sulla ' +
    'il lo la i gli le un uno una di da a al allo alla ai agli alle in su e ed o ho hai ha ho fatto fatta fatti fatte fare sono stato stata era è e\' mio mia miei mie ultimo ultima ultimi ultime prossimo prossima prossimi prossime ' +
    'anno anni scorso scorsa quest questo questa mese mesi email mail messaggi messaggio comunicazioni comunicazione data giorno documento documenti calendario appuntamento appuntamenti tutte tutti tutto mi ci si').split(' ');
  var SIN = {
    sangue: ['sangue', 'emocromo', 'ematochim', 'prelie', 'glicemi', 'colesterol'],
    analisi: ['analisi', 'esam', 'emocromo', 'prelie', 'laborator'],
    ospedal: ['ospedal', 'asst', 'asl', 'ats', 'ausl', 'policlinic', 'irccs', 'clinica', 'azienda'],
    cardiolog: ['cardiolog', 'cardio', 'ecg', 'elettrocardiogramma'],
    referto: ['referto', 'referti', 'esito', 'esiti', 'risultat'],
    visit: ['visit', 'controll', 'consulto'],
    controll: ['controll', 'visit', 'follow'],
    ricett: ['ricett', 'nre', 'prescrizion', 'impegnativ'],
    dentist: ['dentist', 'odontoiatr'],
    occhi: ['occhi', 'oculist', 'oftalmolog'],
    esam: ['esam', 'analisi', 'ecografi', 'risonanz', 'tac', 'radiografi']
  };
  function radice(w) { return w.length > 6 ? w.slice(0, w.length - 2) : w.length > 4 ? w.slice(0, w.length - 1) : w; }
  function alternative(w) {
    var r = radice(w);
    var k = Object.keys(SIN).filter(function (s) { return r.indexOf(s) === 0 || s.indexOf(r) === 0; })[0];
    return k ? SIN[k].concat([r]) : [r];
  }
  function analizzaDomanda(q) {
    var n = A.norm(q).replace(/[?!.,;:"«»()]/g, ' ').replace(/\b(l|dell|nell|all|dall|sull|un)'/g, '$1 ').replace(/'/g, ' ');
    var y = new Date().getFullYear(), anno = null, m;
    if (/anno scorso|l anno passato/.test(n)) anno = y - 1;
    else if (/quest\s?anno/.test(n)) anno = y;
    else if ((m = n.match(/\b(19|20)\d\d\b/))) anno = +m[0];
    var fonte = '';
    if (/\b(email|mail|messagg|comunicazion|scritto|scrive)/.test(n)) fonte = 'email';
    else if (/\b(calendario|appuntament|agenda)/.test(n)) fonte = 'evento';
    else if (/\b(document|archivio|pdf)/.test(n)) fonte = 'doc';
    var tipoPref = /\b(referto|referti|analisi|esam|document|ricett|certificat|lettera|prescrizion|cartella)/.test(n) ? 'doc' : /\b(visit|controll|appuntament|ricover|intervent|terapi)/.test(n) ? 'evento' : '';
    var parole = n.split(/\s+/).filter(function (w) { return w.length > 1 && STOP.indexOf(w) < 0 && !/^\d{4}$/.test(w); });
    return { n: n, anno: anno, fonte: fonte, tipoPref: tipoPref, ultimo: /\bultim/.test(n) || /^quando ho/.test(n.trim()), prossimo: /\bprossim|quando (e|sara|devo|ho) (il|la|l)? ?(prossim|visita|controllo|appuntamento)/.test(n) && !/\bultim/.test(n), quando: /\bquando\b|\bdata\b/.test(n), parole: parole };
  }
  function elementi() {
    var out = [], oggi = A.oggi();
    D().documenti.forEach(function (d) {
      var sinonimi = /Referti|Analisi|Esami|Lettere|Cartelle/.test(d.categoria) ? ' referto esame' : /Ricette|Prescrizioni/.test(d.categoria) ? ' ricetta prescrizione impegnativa' : '';
      out.push({ tipo: 'doc', id: d.id, data: d.data, titolo: d.titolo, sub: [d.categoria, d.struttura].filter(Boolean).join(' · '), forte: A.norm([d.titolo, d.categoria, d.struttura, d.percorso, d.note].join(' ') + sinonimi), testo: A.norm(d.testo || '').slice(0, 20000) });
    });
    A.listaEmail().forEach(function (m) {
      var x = m.analisi || {};
      out.push({ tipo: 'email', id: m.id, data: A.ymd(new Date(m.date)), titolo: m.subject || '(senza oggetto)', sub: A.nomeMitt(m) + (x.categoriaNome && m.stato !== 'scartata' ? ' · ' + x.categoriaNome : ''), forte: A.norm([m.subject, m.from, x.struttura, x.categoriaNome].join(' ')), testo: A.norm(m.body || ''), scartata: m.stato === 'scartata' });
    });
    var visti = {};
    A.istanze(A.addGiorni(oggi, -3650), A.addGiorni(oggi, 730)).forEach(function (x) {
      var e = x.e, rip = e.ripeti && e.ripeti.f !== 'no';
      if (rip) { var k = e.id + (x.data < oggi ? 'p' : 'f'); if (x.data < oggi) { visti[k] = x; return; } if (visti[k]) return; visti[k] = x; }
      out.push({ tipo: 'evento', id: e.id, g: x.data, data: x.data, ora: e.ora, titolo: e.titolo || A.nomeTipo(e.tipo), sub: A.nomeTipo(e.tipo) + (e.luogo ? ' · ' + e.luogo : ''), luogo: e.luogo, forte: A.norm([e.titolo, A.nomeTipo(e.tipo), e.luogo, e.indirizzo, e.percorso].join(' ')), testo: A.norm([e.note, e.preparazione].join(' ')) });
    });
    Object.keys(visti).forEach(function (k) { if (/p$/.test(k)) { var x = visti[k], e = x.e; out.push({ tipo: 'evento', id: e.id, g: x.data, data: x.data, ora: e.ora, titolo: e.titolo || A.nomeTipo(e.tipo), sub: A.nomeTipo(e.tipo) + (e.luogo ? ' · ' + e.luogo : ''), luogo: e.luogo, forte: A.norm([e.titolo, e.tipo, e.luogo].join(' ')), testo: '' }); } });
    D().contatti.forEach(function (c) { out.push({ tipo: 'contatto', id: c.id, data: '', titolo: c.nome, sub: [c.specialita || c.tipo, c.tel].filter(Boolean).join(' · '), forte: A.norm([c.nome, c.tipo, c.specialita, c.indirizzo, c.note].join(' ')), testo: '' }); });
    return out;
  }
  A.cerca = function (q) {
    var a = analizzaDomanda(q), oggi = A.oggi();
    var tokens = a.parole.map(alternative);
    var ris = [];
    elementi().forEach(function (it) {
      if (a.fonte && it.tipo !== a.fonte) return;
      if (a.anno && (!it.data || +it.data.slice(0, 4) !== a.anno)) return;
      if (a.prossimo && (it.tipo !== 'evento' || it.data < oggi)) return;
      if (a.ultimo && it.data && it.data > oggi) return;
      var p = 0, ok = 0;
      tokens.forEach(function (alts) {
        var f = alts.some(function (w) { return it.forte.indexOf(w) >= 0; }), t = !f && alts.some(function (w) { return it.testo.indexOf(w) >= 0; });
        if (f) { p += 3; ok++; } else if (t) { p += 1; ok++; }
      });
      if (tokens.length && ok < tokens.length && !(tokens.length >= 3 && ok >= tokens.length - 1)) return;
      if (!tokens.length && !a.fonte && !a.anno && !a.prossimo) return;
      if (it.scartata) p -= 2;
      it.pref = (a.tipoPref === it.tipo ? 2 : 0) + ((it.tipo === 'email' || it.tipo === 'contatto') && !a.fonte ? -1 : 0);
      it.p = p + it.pref; ris.push(it);
    });
    ris.sort(function (x, y) {
      if (a.prossimo) return (x.data + (x.ora || '')).localeCompare(y.data + (y.ora || ''));
      if (a.ultimo || a.quando) return y.pref - x.pref || (y.data || '').localeCompare(x.data || '') || y.p - x.p;
      return y.p - x.p || (y.data || '').localeCompare(x.data || '');
    });
    return { a: a, ris: ris.slice(0, 40) };
  };
  var NOME_T = { doc: 'Documento', email: 'Email', evento: 'Calendario', contatto: 'Rubrica' };
  function risposta(r) {
    var x = r.ris[0], a = r.a;
    if (!x) return '<section class="box"><p>Non ho trovato niente nei tuoi dati che corrisponda a «' + esc(r.q) + '».</p><p class="src">Prova con meno parole, ad esempio solo «cardiologica» o «sangue».</p></section>';
    var premessa = '';
    if (a.tipoPref === 'evento' && x.tipo !== 'evento' && !a.fonte) premessa = (a.prossimo ? 'Nel calendario non trovo un impegno futuro che corrisponda. ' : 'Nel calendario non trovo un impegno passato che corrisponda. ') + 'Ecco cosa c\'è negli altri dati: ';
    if (a.tipoPref === 'doc' && x.tipo !== 'doc' && !a.fonte) premessa = 'In archivio non trovo un documento che corrisponda. Ecco cosa c\'è negli altri dati: ';
    var quandoTxt = x.data ? A.fmtLunga(x.data) + (x.ora ? ' alle ' + x.ora : '') : '';
    var frase;
    if (a.prossimo) frase = 'Il prossimo in calendario è <b>' + esc(x.titolo) + '</b>, ' + quandoTxt + (x.luogo ? ', presso ' + esc(x.luogo) : '') + '.';
    else if ((a.ultimo || a.quando) && x.data) frase = (x.tipo === 'evento' ? 'L\'ultimo in calendario è ' : x.tipo === 'doc' ? 'Il documento più recente è ' : 'L\'email più recente è ') + '<b>' + esc(x.titolo) + '</b>, del ' + quandoTxt + '.';
    else frase = 'Ho trovato <b>' + r.ris.length + '</b> risultat' + (r.ris.length === 1 ? 'o' : 'i') + '. Il più pertinente: <b>' + esc(x.titolo) + '</b>' + (quandoTxt ? ' (' + quandoTxt + ')' : '') + '.';
    return '<section class="box answer"><p>' + premessa + frase + '</p><p class="src">' + IC.shield + ' Risposta presa dai tuoi dati (' + NOME_T[x.tipo] + '), non è un\'interpretazione. Tocca il risultato per vedere l\'originale.</p></section>';
  }
  A.risItem = function (x) {
    var act = { doc: 'apriDoc', email: 'apriEmail', evento: 'apriEvento', contatto: 'apriContatto' }[x.tipo];
    var ic = { doc: 'doc', email: 'mail', evento: 'cal', contatto: 'user' }[x.tipo];
    return '<button class="item" data-act="' + act + '" data-id="' + esc(x.id) + '"' + (x.g ? ' data-g="' + x.g + '"' : '') + '><span class="ticon c' + { doc: 3, email: 1, evento: 2, contatto: 7 }[x.tipo] + '">' + A.ico(ic) + '</span><span class="grow"><span class="t1">' + esc(x.titolo) + '</span><span class="t2">' + NOME_T[x.tipo] + (x.data ? ' · ' + A.fmtBreve(x.data) : '') + (x.sub ? ' · ' + esc(x.sub) : '') + '</span></span></button>';
  };

  var ultimaQ = '';
  A.VIEWS.assistente = function (v, parti) {
    if (parti && parti[0]) ultimaQ = decodeURIComponent(parti[0]);
    var h = A.pagina('Assistente', 'Cerca nei tuoi dati e fatti aiutare con le pratiche');
    h += '<form id="fQ" class="ask"><label class="sr" for="q">Domanda o parola da cercare</label><input class="inp" id="q" type="search" enterkeyhint="search" placeholder="Es. Quando ho fatto l\'ultima visita cardiologica?" value="' + esc(ultimaQ) + '"><button class="btn" type="submit">' + IC.search + 'Cerca</button></form>';
    h += '<div class="chips wrap esempi">' + ['Trova l\'ultima analisi del sangue', 'Quando ho fatto l\'ultima visita cardiologica?', 'Mostrami le email dell\'ospedale', 'Qual è la data del prossimo controllo?', 'Trova il referto dell\'anno scorso'].map(function (e) { return '<button class="chip" data-act="esempio" data-q="' + esc(e) + '">' + esc(e) + '</button>'; }).join('') + '</div>';
    h += '<div id="risQ"></div>';
    h += A.titolo('Come posso aiutarti') + '<div class="tools">' +
      tool('cosaFare', 'list', 'Cosa devo fare?', 'Le attività che richiedono attenzione') +
      tool('toolRiassunti', 'mail', 'Riassumi le comunicazioni', 'Le email sanitarie in poche righe') +
      tool('toolPortare', 'clip', 'Cosa portare a un appuntamento', 'Elenco di documenti e cose da avere') +
      tool('toolMancanti', 'alert', 'Documenti mancanti', 'Cosa manca per i prossimi impegni') +
      tool('toolCronologia', 'clock', 'Cronologia delle visite', 'Visite, esami e documenti nel tempo') +
      tool('toolDomande', 'help', 'Domande per il medico', 'Prepara cosa chiedere alla visita') +
      tool('spiegaTesto', 'book', 'Cosa vuol dire questa richiesta?', 'Spiega parole di referti e lettere') +
      '<a class="tool" href="#/glossario">' + A.ico('book') + '<span><b>Glossario</b><small>Termini medici e burocratici</small></span></a>' +
      '<a class="tool" href="#/trasporti">' + A.ico('van') + '<span><b>Trasporto e aiuto</b><small>Emergenze, ambulanze, associazioni</small></span></a></div>';
    if (A.aiPronta()) h += A.titolo('Assistente AI') + '<section class="card"><p>Fai una domanda libera. Per rispondere invio ad Anthropic la domanda e <b>solo</b> i risultati trovati nei tuoi dati (al massimo 8).</p><form id="fAi"><label class="f"><span class="sr">Domanda per l\'assistente AI</span><textarea class="inp" id="qAi" placeholder="Es. Cosa mi chiede l\'ospedale nell\'ultima email?"></textarea></label><button class="btn sec block" type="submit">' + IC.chat + 'Chiedi all\'assistente AI</button></form><div id="risAi"></div><p class="src">L\'assistente non fa diagnosi, non prescrive e non modifica terapie: per questo c\'è il tuo medico.</p></section>';
    else h += '<p class="notice">' + IC.chat + ' L\'assistente AI per riassunti e domande libere è <b>spento</b>: la ricerca e gli strumenti qui sopra funzionano senza. Puoi attivarlo in <a href="#/impostazioni">Impostazioni</a>, dopo aver letto cosa comporta.</p>';
    h += '<p class="disclaimer">Le informazioni servono a orientarti tra carte e appuntamenti: non sono pareri medici.</p>';
    v.innerHTML = h;
    A.$('#fQ').addEventListener('submit', function (e) { e.preventDefault(); ultimaQ = A.$('#q').value.trim(); mostra(); });
    if (A.$('#fAi')) A.$('#fAi').addEventListener('submit', function (e) { e.preventDefault(); var q = A.$('#qAi').value.trim(); if (q) A.aiDomandaLibera(q, A.$('#risAi')); });
    if (ultimaQ) mostra();
  };
  function tool(act, ic, t, s) { return '<button class="tool" data-act="' + act + '">' + A.ico(ic) + '<span><b>' + t + '</b><small>' + s + '</small></span></button>'; }
  function mostra() {
    var box = A.$('#risQ'); if (!box) return;
    if (!ultimaQ) { box.innerHTML = ''; return; }
    var r = A.cerca(ultimaQ); r.q = ultimaQ;
    var gruppi = { evento: [], doc: [], email: [], contatto: [] };
    r.ris.forEach(function (x) { gruppi[x.tipo].push(x); });
    var h = risposta(r);
    [['evento', 'Calendario'], ['doc', 'Documenti'], ['email', 'Email'], ['contatto', 'Rubrica']].forEach(function (g) {
      if (gruppi[g[0]].length) h += '<h3>' + g[1] + ' <span class="muted">' + gruppi[g[0]].length + '</span></h3><div class="list">' + gruppi[g[0]].slice(0, 8).map(A.risItem).join('') + '</div>';
    });
    box.innerHTML = h;
    box.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  A.ACT.esempio = function (el) { ultimaQ = el.dataset.q; A.$('#q').value = ultimaQ; mostra(); };
  A.ACT.cosaFare = function () { location.hash = '#/fare'; };

  // ---------- strumenti ----------
  function sceltaEvento(titolo, act) {
    var l = A.prossimi(15);
    if (!l.length) { A.toast('Non ci sono appuntamenti in arrivo nel calendario'); return; }
    A.sheet(titolo, '<p class="muted">Scegli l\'appuntamento:</p><div class="list">' + l.map(function (x) { return A.eventoItem(x).replace('data-act="apriEvento"', 'data-act="' + act + '"'); }).join('') + '</div>');
  }
  A.ACT.toolPortare = function () { sceltaEvento('Cosa portare', 'portareEvento'); };
  A.ACT.toolDomande = function () { sceltaEvento('Domande per il medico', 'domandeEvento'); };
  A.ACT.toolRiassunti = function () {
    var l = A.listaEmail('sanitaria').slice(0, 15);
    if (!l.length) { A.toast('Nessuna email sanitaria da riassumere'); return; }
    A.sheet('Le comunicazioni in breve', l.map(function (m) {
      var x = m.analisi || {};
      return '<button class="found" data-act="apriEmail" data-id="' + esc(m.id) + '"><span class="muted small">' + A.fmtBreve(A.ymd(new Date(m.date))) + ' · ' + esc(x.struttura || A.nomeMitt(m)) + '</span><b>' + esc(m.subject || '') + '</b><span>' + esc(x.riassunto || '—') + '</span></button>';
    }).join('') + '<p class="src">Riassunti automatici ricavati dal testo, sul dispositivo. Tocca per l\'email originale.</p>', null, { largo: true });
  };

  var BASE_PORTARE = {
    Visita: ['Impegnativa / ricetta', 'Tessera sanitaria', 'Documento d\'identità', 'Esami e referti precedenti', 'Elenco farmaci che prendi'],
    Controllo: ['Impegnativa / ricetta', 'Tessera sanitaria', 'Esami e referti precedenti', 'Elenco farmaci che prendi'],
    Esame: ['Impegnativa / ricetta', 'Tessera sanitaria', 'Documento d\'identità'],
    Diagnostica: ['Impegnativa / ricetta', 'Tessera sanitaria', 'Documento d\'identità', 'Esami e referti precedenti'],
    Intervento: ['Documento d\'identità', 'Tessera sanitaria', 'Esami e referti precedenti', 'Elenco farmaci che prendi', 'Consenso informato firmato', 'Accompagnatore'],
    Ricovero: ['Documento d\'identità', 'Tessera sanitaria', 'Esami e referti precedenti', 'Elenco farmaci che prendi', 'Effetti personali'],
    Terapia: ['Tessera sanitaria', 'Piano terapeutico'],
    Amministrativo: ['Documento d\'identità', 'Tessera sanitaria', 'Documentazione richiesta']
  };
  function correlati(e) {
    var parole = A.norm(e.titolo || '').split(/\s+/).filter(function (w) { return w.length > 4 && ['visita', 'esame', 'controllo'].indexOf(w) < 0; }).map(radice);
    return D().documenti.filter(function (d) {
      if ((e.docIds || []).indexOf(d.id) >= 0) return false;
      if (e.percorso && d.percorso === e.percorso) return true;
      var t = A.norm([d.titolo, d.categoria, d.struttura, d.percorso, (d.testo || '').slice(0, 3000)].join(' '));
      return parole.some(function (w) { return t.indexOf(w) >= 0; });
    }).sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); }).slice(0, 5);
  }
  A.ACT.portareEvento = function (el) {
    var e = A.evento(el.dataset.id); if (!e) return;
    A.chiudiSheet(true);
    var gia = (e.portare || []).map(function (p) { return p.t; });
    var sugg = (BASE_PORTARE[e.tipo] || BASE_PORTARE.Visita).filter(function (p) { return gia.indexOf(p) < 0; });
    var docs = (e.docIds || []).map(A.documento).filter(Boolean), corr = correlati(e);
    var h = '<p class="big">' + esc(e.titolo || e.tipo) + '<br><span class="muted">' + A.cap(A.fmtLunga(e.data)) + (e.ora ? ' · ore ' + e.ora : '') + '</span></p>';
    if (e.preparazione) h += '<section class="box"><h3>Preparazione</h3><p class="prewrap">' + esc(e.preparazione) + '</p></section>';
    h += '<h3>Da portare</h3>' + (gia.length ? e.portare.map(function (p, i) { return '<label class="check' + (p.ok ? ' done' : '') + '"><input type="checkbox" data-chg="portare" data-id="' + e.id + '" data-i="' + i + '"' + (p.ok ? ' checked' : '') + '><span>' + esc(p.t) + '</span></label>'; }).join('') : '<p class="muted">Nessuna voce ancora.</p>');
    if (sugg.length) h += '<p class="muted small">Di solito servono anche (suggerimenti generali, verifica con la struttura):</p><div class="chips wrap">' + sugg.map(function (p) { return '<button class="chip" data-act="addPortare" data-id="' + e.id + '" data-t="' + esc(p) + '">' + IC.plus + esc(p) + '</button>'; }).join('') + '</div>';
    h += '<h3>Documenti dall\'archivio</h3>' + (docs.length ? '<div class="list">' + docs.map(A.docItem).join('') + '</div>' : '<p class="muted">Nessun documento collegato.</p>');
    if (corr.length) h += '<p class="muted small">Potrebbero servirti (trovati in archivio per parole simili):</p>' + corr.map(function (d) { return '<div class="found static"><span><b>' + esc(d.titolo) + '</b><br><span class="muted">' + esc(d.categoria) + (d.data ? ' · ' + A.fmtBreve(d.data) : '') + '</span></span><button class="btn sm sec" data-act="collegaAEvento" data-id="' + e.id + '" data-d="' + d.id + '">' + IC.link + 'Collega</button></div>'; }).join('');
    h += '<div class="btns"><button class="btn sec" data-act="copiaPortare" data-id="' + e.id + '">' + IC.copy + 'Copia l\'elenco</button></div>';
    A.sheet('Cosa portare', h);
  };
  A.ACT.addPortare = function (el) { var e = A.evento(el.dataset.id); e.portare = e.portare || []; e.portare.push({ t: el.dataset.t, ok: false }); A.save(); A.ACT.portareEvento(el); };
  A.ACT.collegaAEvento = function (el) { var e = A.evento(el.dataset.id); e.docIds = (e.docIds || []).concat([el.dataset.d]); A.save(); A.ACT.portareEvento(el); A.toast('Documento collegato'); };
  A.ACT.copiaPortare = function (el) {
    var e = A.evento(el.dataset.id);
    var t = (e.titolo || e.tipo) + ' — ' + A.fmtLunga(e.data) + (e.ora ? ' ore ' + e.ora : '') + '\n' + (e.preparazione ? 'Preparazione: ' + e.preparazione + '\n' : '') + 'Da portare:\n' + (e.portare || []).map(function (p) { return '- ' + p.t; }).join('\n') +
      ((e.docIds || []).length ? '\nDocumenti:\n' + e.docIds.map(A.documento).filter(Boolean).map(function (d) { return '- ' + d.titolo + (d.data ? ' (' + A.fmtBreve(d.data) + ')' : ''); }).join('\n') : '');
    A.ACT.copia({ dataset: { t: t } });
  };

  var MAPPA_DOC = { 'Impegnativa / ricetta': ['Prescrizioni', 'Ricette'], 'Esami e referti precedenti': ['Referti', 'Analisi del sangue', 'Esami diagnostici', 'Lettere di dimissione'], 'Attestato di esenzione': ['Certificati'], 'Consenso informato firmato': ['Certificati', 'Altri documenti'], 'Piano terapeutico': ['Prescrizioni'] };
  A.ACT.toolMancanti = function () {
    var l = A.prossimi(30).filter(function (x) { return x.data <= A.addGiorni(A.oggi(), 90); }), h = '', n = 0;
    l.forEach(function (x) {
      var e = x.e, righe = [];
      var collegati = (e.docIds || []).map(A.documento).filter(Boolean);
      (e.portare || []).filter(function (p) { return !p.ok; }).forEach(function (p) {
        var cats = MAPPA_DOC[p.t];
        if (!cats) { righe.push('<li><b>' + esc(p.t) + '</b> <span class="muted">— da avere con te (non è in archivio)</span></li>'); return; }
        if (collegati.some(function (d) { return cats.indexOf(d.categoria) >= 0; })) return;
        var c = D().documenti.filter(function (d) { return cats.indexOf(d.categoria) >= 0; }).sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); })[0];
        righe.push('<li><b>' + esc(p.t) + '</b> — ' + (c ? 'non collegato all\'appuntamento. In archivio c\'è «' + esc(c.titolo) + '» del ' + A.fmtBreve(c.data) + ' <button class="linkbtn" data-act="collegaAEvento2" data-id="' + e.id + '" data-d="' + c.id + '">Collegalo</button>' : '<span class="warn-t">non trovo nulla di simile in archivio</span>') + '</li>');
      });
      if (righe.length) { n += righe.length; h += '<section class="box"><h3>' + esc(e.titolo || e.tipo) + ' <span class="muted">· ' + A.quando(x.data) + '</span></h3><ul class="plain-list">' + righe.join('') + '</ul><button class="linkbtn" data-act="portareEvento" data-id="' + e.id + '">Apri la lista</button></section>'; }
    });
    A.listaEmail('sanitaria').forEach(function (m) {
      var x = m.analisi || {};
      if ((x.richieste || []).length && !D().fatti['doc:' + m.id]) { n++; h += '<section class="box"><h3>Richiesta in un\'email</h3><p>«' + esc(x.richieste[0]) + '»</p><p class="muted small">' + esc(A.nomeMitt(m)) + ' · ' + A.fmtBreve(A.ymd(new Date(m.date))) + '</p><button class="linkbtn" data-act="apriEmail" data-id="' + esc(m.id) + '">Vedi email</button></section>'; }
    });
    A.sheet('Documenti mancanti', (n ? '<p>Ho controllato i prossimi appuntamenti e le email: ecco cosa potrebbe mancare.</p>' + h : '<p class="allok">' + IC.check + ' Non trovo documenti mancanti per i prossimi 90 giorni.</p>') +
      '<p class="src">Il controllo confronta le voci "da portare" con l\'archivio di Cartellina: non può sapere cosa hai in un cassetto.</p>', null, { largo: true });
  };
  A.ACT.collegaAEvento2 = function (el) { var e = A.evento(el.dataset.id); e.docIds = (e.docIds || []).concat([el.dataset.d]); A.save(); A.toast('Documento collegato'); A.chiudiSheet(true); A.ACT.toolMancanti(); };

  A.ACT.toolCronologia = function () {
    var pass = A.passati(), docs = D().documenti.slice();
    var voci = pass.map(function (x) { return { data: x.data, html: A.eventoItem(x), tipo: x.e.tipo }; })
      .concat(docs.map(function (d) { return { data: d.data || '', html: A.docItem(d), tipo: 'doc' }; }))
      .sort(function (a, b) { return b.data.localeCompare(a.data); });
    var anno1 = A.addGiorni(A.oggi(), -365), conta = {};
    pass.forEach(function (x) { if (x.data >= anno1) conta[x.e.tipo] = (conta[x.e.tipo] || 0) + 1; });
    var riepilogo = Object.keys(conta).map(function (t) { return conta[t] + ' ' + A.nomeTipo(t).toLowerCase(); }).join(', ');
    var h = '<section class="box"><p>' + (riepilogo ? 'Negli ultimi 12 mesi il calendario contiene: <b>' + esc(riepilogo) + '</b>.' : 'Nel calendario non ci sono impegni passati negli ultimi 12 mesi.') + ' In archivio ci sono <b>' + docs.length + '</b> documenti.</p><p class="src">Conteggio dei dati presenti in Cartellina.</p></section>' +
      '<label class="search"><span class="sr">Filtra la cronologia</span>' + IC.search + '<input class="inp" id="crQ" type="search" placeholder="Filtra, es. cardiolog"></label><div id="crL"></div>';
    A.sheet('Cronologia', h, function (s) {
      function disegna() {
        var q = A.norm(A.$('#crQ', s).value.trim()), anno = null, out = '';
        voci.filter(function (v) { return !q || A.norm(v.html.replace(/<[^>]+>/g, ' ')).indexOf(q) >= 0; }).forEach(function (v) {
          var y = v.data.slice(0, 4) || 'Senza data';
          if (y !== anno) { if (anno) out += '</div>'; out += '<h3 class="year">' + y + '</h3><div class="list">'; anno = y; }
          out += v.html;
        });
        A.$('#crL', s).innerHTML = out ? out + '</div>' : '<p class="muted">Niente da mostrare.</p>';
      }
      A.$('#crQ', s).addEventListener('input', disegna); disegna();
    }, { largo: true });
  };

  var DOMANDE = {
    _: ['Qual è il risultato principale di oggi, detto in parole semplici?', 'Devo fare altri esami o controlli? Entro quando?', 'Ci sono cambiamenti nella terapia? Fino a quando?', 'Quali segnali devo tenere d\'occhio e a chi mi rivolgo se compaiono?', 'Mi serve un\'impegnativa, una ricetta o un certificato?', 'Quando e come riceverò il referto?'],
    Esame: ['Come devo prepararmi (digiuno, farmaci, abbigliamento)?', 'Quanto dura l\'esame?', 'Quando e dove ritiro il referto?'],
    Diagnostica: ['Serve il mezzo di contrasto? Devo fare esami prima?', 'Posso guidare dopo l\'esame?', 'Quando e dove ritiro il referto?'],
    Intervento: ['Quanto durerà il ricovero?', 'Quali farmaci devo sospendere prima e quando?', 'Quanto dura la convalescenza e quando posso riprendere le attività?', 'Mi serve un accompagnatore?'],
    Ricovero: ['Cosa devo portare per il ricovero?', 'Quali sono gli orari di visita?', 'Chi mi darà informazioni durante il ricovero?'],
    Terapia: ['Quante sedute sono previste e ogni quanto?', 'Ci sono effetti collaterali a cui fare attenzione?', 'Posso continuare a prendere gli altri farmaci?']
  };
  A.ACT.domandeEvento = function (el) {
    var e = A.evento(el.dataset.id); if (!e) return;
    A.chiudiSheet(true);
    var sugg = (DOMANDE[e.tipo] || []).concat(DOMANDE._);
    var h = '<p class="muted">' + esc(e.titolo || e.tipo) + ' · ' + A.fmtLunga(e.data) + '</p><p>Scrivi le tue domande: le ritrovi nell\'appuntamento. Tocca un suggerimento per aggiungerlo.</p>' +
      '<label class="f"><span>Le mie domande</span><textarea class="inp tall" id="dmT">' + esc(e.domande || '') + '</textarea></label>' +
      '<div class="chips wrap">' + sugg.map(function (q) { return '<button class="chip" data-q="' + esc(q) + '">' + IC.plus + esc(q) + '</button>'; }).join('') + '</div>' +
      '<p class="src">Suggerimenti generici per organizzarti, uguali per tutti: non sono consigli medici.</p>' +
      (A.aiPronta() ? '<button class="btn ghost block" id="dmAi">' + IC.chat + 'Suggerisci altre domande con l\'AI (invia solo tipo e titolo)</button><div id="dmAiOut"></div>' : '') +
      '<div class="btns"><button class="btn" id="dmOk">' + IC.check + 'Salva</button><button class="btn sec" id="dmCp">' + IC.copy + 'Copia</button></div>';
    A.sheet('Domande per il medico', h, function (s) {
      var ta = A.$('#dmT', s);
      s.addEventListener('click', function (ev) { var b = ev.target.closest('[data-q]'); if (!b) return; ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + '- ' + b.dataset.q; b.remove(); });
      A.$('#dmOk', s).addEventListener('click', function () { e.domande = ta.value.trim(); A.save(); A.chiudiSheet(); A.toast('Domande salvate nell\'appuntamento'); });
      A.$('#dmCp', s).addEventListener('click', function () { A.ACT.copia({ dataset: { t: ta.value } }); });
      if (A.$('#dmAi', s)) A.$('#dmAi', s).addEventListener('click', function () { A.aiDomande(e, A.$('#dmAiOut', s), ta); });
    });
  };
})(CA);
