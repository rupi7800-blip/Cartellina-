/* =========================================================
   Cartellina — Archivio dei documenti sanitari
   - il file originale viene salvato intatto (mai modificato)
   - testo dei PDF letto sul dispositivo con pdf.js
   - nessun duplicato: ogni file ha la sua impronta SHA-256
   ========================================================= */
(function (A) {
  'use strict';
  var esc = A.esc, IC = A.IC, D = function () { return A.D; };

  A.CAT_DOC = ['Referti', 'Analisi del sangue', 'Esami diagnostici', 'Prescrizioni', 'Ricette', 'Certificati', 'Cartelle cliniche', 'Lettere di dimissione', 'Documentazione assicurativa', 'Altri documenti'];
  var REGOLE = [
    ['Lettere di dimissione', /lettera di dimission|dimissione ospedalier|alla dimissione|dimess[oa] il/],
    ['Cartelle cliniche', /cartella clinica|diario clinico|copia conforme della cartella/],
    ['Documentazione assicurativa', /assicurazion|polizza|sinistro|fondo sanitario|cassa sanitaria|richiesta di rimborso|liquidazione/],
    ['Certificati', /\bcertificat|attestat|si certifica|si attesta|invalidit/],
    ['Analisi del sangue', /emocromo|emoglobina|ematocrito|glicemia|colesterolo|creatinin|esami ematochimici|analisi del sangue|leucocit|piastrin|trigliceridi|\btsh\b|\bpcr\b|\bves\b|transaminasi/],
    ['Esami diagnostici', /ecografi|risonanza|\brmn?\b|\btac\b|\btc\b|radiografi|\brx\b|mammografi|\becg\b|elettrocardiogramma|holter|ecocardio|endoscopi|colonscopi|gastroscopi|scintigrafi|densitometri|\bpet\b|elettromiografi|spirometri/],
    ['Ricette', /\bnre\b|ricetta (elettronica|dematerializzata)|promemoria per l.assistito|farmaci prescritti|confezioni/],
    ['Prescrizioni', /impegnativ|prescrizion|si prescrive|quesito diagnostico|classe di priorit|\bpriorita\b/],
    ['Referti', /\breferto\b|refertazione|\besito\b|conclusioni|giudizio diagnostico|si conclude/]
  ];
  A.indovinaCategoria = function (testo) {
    var t = A.norm(testo).slice(0, 8000);
    for (var i = 0; i < REGOLE.length; i++) {
      if (REGOLE[i][0] === 'Analisi del sangue') { var n = (t.match(new RegExp(REGOLE[i][1].source, 'g')) || []).length; if (n >= 2 || /analisi del sangue|esami ematochimici|emocromo/.test(t)) return REGOLE[i][0]; continue; }
      if (REGOLE[i][1].test(t)) return REGOLE[i][0];
    }
    return 'Altri documenti';
  };
  function indovinaData(testo) {
    var m = String(testo).match(/(data\s*(del|dell[a'])?\s*(referto|prelievo|esame|emissione|accettazione|visita|stampa|refertazione|ricovero|dimissione)?|emess[oa] il|eseguit[oa] il|redatt[oa] il|del giorno)\s*[:\-]?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i);
    var oggi = A.oggi();
    var mk = function (g, mm, a) { a = +a; if (a < 100) a += 2000; var s = a + '-' + A.pad(+mm) + '-' + A.pad(+g); return a >= 1990 && +mm >= 1 && +mm <= 12 && +g >= 1 && +g <= 31 && s <= oggi ? s : ''; };
    if (m) { var s = mk(m[4], m[5], m[6]); if (s) return s; }
    var tutte = Classificatore.estraiDate(testo, new Date()).map(function (d) { return d.a + '-' + A.pad(d.m) + '-' + A.pad(d.g); }).filter(function (s) { return s <= oggi; });
    return tutte[0] || '';
  }
  function indovinaStruttura(testo) {
    var righe = String(testo).split(/\n+/).slice(0, 30);
    for (var i = 0; i < righe.length; i++) {
      var r = righe[i].replace(/\s+/g, ' ').trim();
      if (r.length > 4 && r.length < 110 && /(ospedal|azienda|\basst\b|\basl\b|\bats\b|ausl|policlinic|irccs|clinica|laborator|centro (medico|diagnostico|analisi)|poliambulatori|casa di cura|istituto|fondazione|studio medico|dott\.|dr\.)/i.test(r)) return A.taglia(r, 80);
    }
    return '';
  }
  function indovinaTitolo(cat, testo, nome) {
    if (cat === 'Analisi del sangue') return 'Analisi del sangue';
    var tp = Classificatore.tipoDa(String(testo).slice(0, 800));
    if (tp.tipo !== 'Altro' && tp.parola && tp.parola.length > 3) return A.cap(tp.parola);
    var base = String(nome || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_\-]+/g, ' ').trim();
    if (base && !/^(img|scan|image|doc|documento|photo|foto)?\s*\d*$/i.test(base)) return A.cap(base);
    return { 'Referti': 'Referto', 'Prescrizioni': 'Prescrizione', 'Ricette': 'Ricetta', 'Certificati': 'Certificato', 'Esami diagnostici': 'Esame diagnostico', 'Cartelle cliniche': 'Cartella clinica', 'Lettere di dimissione': 'Lettera di dimissione', 'Altri documenti': 'Documento' }[cat] || cat;
  }

  // ---------- testo dei PDF (sul dispositivo) ----------
  var pdfjs = null;
  function caricaPdfjs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    return import(new URL('vendor/pdfjs/pdf.min.js', location.href).href).then(function (m) {
      m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.js', location.href).href;
      pdfjs = m; return m;
    });
  }
  function apriPdf(blob) {
    return caricaPdfjs().then(function (m) { return blob.arrayBuffer().then(function (b) { return m.getDocument({ data: new Uint8Array(b), isEvalSupported: false }).promise; }); });
  }
  A.testoPdf = function (blob) {
    return apriPdf(blob).then(function (pdf) {
      var n = Math.min(pdf.numPages, 15), parti = [];
      var p = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (i) {
        p = p.then(function () { return pdf.getPage(i); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
          var riga = '', ultimaY = null;
          tc.items.forEach(function (it) { var y = it.transform ? it.transform[5] : 0; if (ultimaY !== null && Math.abs(y - ultimaY) > 2) riga += '\n'; riga += it.str + (it.hasEOL ? '\n' : ' '); ultimaY = y; });
          parti.push(riga);
        });
      })(i);
      return p.then(function () { return { testo: parti.join('\n').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').slice(0, 30000), pagine: pdf.numPages }; });
    });
  };
  function anteprimaPdf(blob, canvas) {
    return apriPdf(blob).then(function (pdf) { return pdf.getPage(1); }).then(function (pg) {
      var vp0 = pg.getViewport({ scale: 1 }), w = Math.min(canvas.parentNode.clientWidth || 600, 900);
      var vp = pg.getViewport({ scale: (w / vp0.width) * (window.devicePixelRatio || 1) });
      canvas.width = vp.width; canvas.height = vp.height; canvas.style.width = '100%';
      return pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    });
  }

  A.documento = function (id) { return D().documenti.filter(function (d) { return d.id === id; })[0]; };
  function icona(d) { return /pdf/.test(d.mime) ? 'doc' : /image/.test(d.mime) ? 'camera' : 'doc'; }
  A.docItem = function (d) {
    return '<button class="item" data-act="apriDoc" data-id="' + d.id + '"><span class="ticon c3">' + A.ico(icona(d)) + '</span><span class="grow"><span class="t1">' + esc(d.titolo) + '</span><span class="t2">' + esc([d.categoria, d.data ? A.fmtBreve(d.data) : '', d.struttura].filter(Boolean).join(' · ')) + '</span></span>' + (d.note ? '<span class="tag" title="Ha note">' + A.ico('edit', 14) + '</span>' : '') + '</button>';
  };

  // ---------- aggiunta ----------
  A.aggiungiFile = function (blob, nome, meta, silenzioso) {
    meta = meta || {};
    if (blob.size > 40 * 1024 * 1024) { A.toast('File troppo grande (oltre 40 MB)'); return Promise.resolve(null); }
    return Archivio.impronta(blob).then(function (hash) {
      var gia = D().documenti.filter(function (d) { return d.hash === hash; })[0];
      if (gia) { A.toast('Questo file è già in archivio: "' + gia.titolo + '"', 4000); if (!silenzioso) A.apriDoc(gia.id); return null; }
      var lettura = /pdf/.test(blob.type) || /\.pdf$/i.test(nome) ? A.testoPdf(blob).catch(function (e) { console.warn(e); return { testo: '', errore: true }; }) : Promise.resolve({ testo: '' });
      if (!silenzioso) A.toast('Leggo il documento…', 1500);
      return lettura.then(function (r) {
        var testo = r.testo || '';
        var base = testo + '\n' + nome;
        var cat = meta.categoria || A.indovinaCategoria(base);
        var doc = {
          id: A.uid(), fileId: 'f-' + A.uid(), nome: nome || 'documento', mime: blob.type || (/\.pdf$/i.test(nome) ? 'application/pdf' : ''), size: blob.size, hash: hash,
          categoria: cat, titolo: meta.titolo || indovinaTitolo(cat, testo, nome), data: indovinaData(testo) || meta.data || A.oggi(),
          struttura: indovinaStruttura(testo) || meta.struttura || '', percorso: meta.percorso || '', note: '', testo: testo, pagine: r.pagine || 0,
          letto: testo.trim().length > 30 ? 'pdf' : '', collegati: [], emailId: meta.emailId || '', creato: Date.now()
        };
        doc.dateTrovate = Classificatore.estraiDate(testo, new Date()).slice(0, 8).map(function (d) { return d.a + '-' + A.pad(d.m) + '-' + A.pad(d.g); }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        return Archivio.salvaFile(doc.fileId, blob).then(function () {
          D().documenti.push(doc);
          A.log('Documento aggiunto', doc.titolo + ' (' + doc.nome + ')');
          A.save();
          if (window.Cartella) Cartella.scriviDoc(doc, blob);
          if (!silenzioso) { A.chiudiSheet(true); formDoc(doc, true); }
          return doc;
        });
      });
    }).catch(function (e) { console.error(e); A.toast('Non riesco a salvare il file: ' + (e.message || e), 5000); return null; });
  };
  function scegliFile(camera) {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = 'application/pdf,image/*'; i.multiple = !camera;
    if (camera) i.setAttribute('capture', 'environment');
    i.onchange = function () {
      var files = Array.prototype.slice.call(i.files || []);
      if (!files.length) return;
      if (files.length === 1) { A.aggiungiFile(files[0], files[0].name || (camera ? 'foto-' + A.oggi() + '.jpg' : 'documento')); return; }
      A.toast('Carico ' + files.length + ' documenti…');
      files.reduce(function (p, f) { return p.then(function (n) { return A.aggiungiFile(f, f.name, {}, true).then(function (d) { return n + (d ? 1 : 0); }); }); }, Promise.resolve(0))
        .then(function (n) { A.toast(n + ' documenti aggiunti. Controlla titolo e categoria.', 4000); A.ridisegna(); });
    };
    i.click();
  }
  A.ACT.caricaDoc = function () { scegliFile(false); };
  A.ACT.fotoDoc = function () { scegliFile(true); };

  // ---------- modifica dati del documento ----------
  function percorsi() { var p = {}; D().documenti.concat(D().eventi).forEach(function (x) { if (x.percorso) p[x.percorso] = (p[x.percorso] || 0) + 1; }); return Object.keys(p).sort(); }
  function formDoc(doc, appena) {
    var h = (appena ? '<p class="notice ok">' + IC.check + ' File salvato, originale intatto. ' + (doc.letto ? 'Ho letto il testo e compilato i campi: controllali.' : /image/.test(doc.mime) ? 'Dalle foto non leggo il testo da sola: completa tu i campi.' : 'Non trovo testo leggibile (forse è una scansione): completa tu i campi.') + '</p>' : '') +
      '<form id="fDoc"><label class="f"><span>Titolo</span><input class="inp" name="titolo" value="' + esc(doc.titolo) + '" required></label>' +
      '<fieldset class="f"><legend>Categoria</legend><div class="chips wrap" id="catDoc">' + A.CAT_DOC.map(function (c) { return '<button type="button" class="chip' + (c === doc.categoria ? ' on' : '') + '" aria-pressed="' + (c === doc.categoria) + '" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div></fieldset>' +
      '<div class="two"><label class="f"><span>Data del documento</span><input class="inp" type="date" name="data" value="' + esc(doc.data) + '"></label>' +
      '<label class="f"><span>Struttura o medico</span><input class="inp" name="struttura" value="' + esc(doc.struttura) + '" placeholder="Es. Ospedale di Circolo"></label></div>' +
      (doc.dateTrovate && doc.dateTrovate.length > 1 ? '<p class="muted small">Date trovate nel documento: ' + doc.dateTrovate.map(function (d) { return '<button type="button" class="linkbtn" data-data="' + d + '">' + A.fmtBreve(d) + '</button>'; }).join(' · ') + '</p>' : '') +
      '<label class="f"><span>Percorso di cura (per tenere insieme documenti dello stesso problema)</span><input class="inp" name="percorso" list="percorsiL" value="' + esc(doc.percorso) + '" placeholder="Es. Controlli cardiologici"><datalist id="percorsiL">' + percorsi().map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('') + '</datalist></label>' +
      '<label class="f"><span>Note personali</span><textarea class="inp" name="note" placeholder="Es. da portare alla prossima visita">' + esc(doc.note) + '</textarea></label>' +
      '<button class="btn block" type="submit">' + IC.check + 'Salva</button></form>';
    var cat = doc.categoria;
    A.sheet(appena ? 'Nuovo documento' : 'Modifica dati', h, function (s) {
      A.$('#catDoc', s).addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; A.$$('#catDoc .chip', s).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
      A.$$('[data-data]', s).forEach(function (b) { b.addEventListener('click', function () { A.$('[name=data]', s).value = b.dataset.data; }); });
      A.$('#fDoc', s).addEventListener('submit', function (ev) {
        ev.preventDefault();
        var f = new FormData(ev.target);
        doc.titolo = String(f.get('titolo')).trim() || doc.nome; doc.categoria = cat; doc.data = f.get('data') || doc.data;
        doc.struttura = String(f.get('struttura')).trim(); doc.percorso = String(f.get('percorso')).trim(); doc.note = String(f.get('note')).trim();
        A.log('Documento modificato', doc.titolo); A.save(); A.chiudiSheet(); A.toast('Salvato'); A.ridisegna();
      });
    });
  }

  // ---------- vista archivio ----------
  var docQ = '', docCat = '', docPerc = '', docOrd = 'recenti';
  A.cercaDocumenti = function (q) {
    var parole = A.norm(q).split(/\s+/).filter(function (w) { return w.length > 1; });
    return D().documenti.filter(function (d) {
      if (!parole.length) return true;
      var t = A.norm([d.titolo, d.categoria, d.struttura, d.note, d.percorso, d.nome, d.data, d.data ? A.fmtLunga(d.data) : '', d.testo].join(' '));
      return parole.every(function (w) { return t.indexOf(w) >= 0; });
    });
  };
  A.VIEWS.documenti = function (v) {
    var tot = D().documenti.length;
    var h = A.pagina('Documenti', 'Il tuo archivio sanitario, sempre a portata di mano');
    h += '<div class="bigbtns"><button class="btn" data-act="caricaDoc">' + IC.upload + 'Carica PDF o immagini</button><button class="btn sec" data-act="fotoDoc">' + IC.camera + 'Fotografa un documento</button></div>';
    if (!tot) {
      h += A.vuoto('doc', 'L\'archivio è vuoto', 'Carica referti, analisi, ricette e certificati. Restano solo su questo dispositivo' + (Archivio.pinAttivo() ? ', cifrati con il tuo PIN.' : '. Per proteggerli attiva il PIN nelle Impostazioni.'));
      v.innerHTML = h; return;
    }
    h += '<label class="search"><span class="sr">Cerca nei documenti</span>' + IC.search + '<input class="inp" id="docQ" type="search" placeholder="Cerca per parola, struttura, data…" value="' + esc(docQ) + '"></label>';
    var conta = {}; D().documenti.forEach(function (d) { conta[d.categoria] = (conta[d.categoria] || 0) + 1; });
    h += '<div class="chips"><button class="chip' + (!docCat ? ' on' : '') + '" data-act="docCat" data-c="">Tutti <span class="n">' + tot + '</span></button>' + A.CAT_DOC.filter(function (c) { return conta[c]; }).map(function (c) { return '<button class="chip' + (docCat === c ? ' on' : '') + '" data-act="docCat" data-c="' + esc(c) + '">' + c + ' <span class="n">' + conta[c] + '</span></button>'; }).join('') + '</div>';
    var ps = percorsi();
    if (ps.length) h += '<div class="chips"><span class="muted small lab">Percorsi:</span>' + ps.map(function (p) { return '<button class="chip' + (docPerc === p ? ' on' : '') + '" data-act="docPerc" data-p="' + esc(p) + '">' + IC.link + esc(p) + '</button>'; }).join('') + '</div>';
    h += '<div class="row between"><span class="muted" id="docN"></span><label class="inline"><span class="sr">Ordine</span><select class="inp sm" id="docOrd"><option value="recenti">Più recenti prima</option><option value="vecchi"' + (docOrd === 'vecchi' ? ' selected' : '') + '>Più vecchi prima</option></select></label></div><div id="docList"></div>';
    v.innerHTML = h;
    A.$('#docQ').addEventListener('input', function () { docQ = this.value; lista(); });
    A.$('#docOrd').addEventListener('change', function () { docOrd = this.value; lista(); });
    lista();
  };
  function lista() {
    var l = A.cercaDocumenti(docQ).filter(function (d) { return (!docCat || d.categoria === docCat) && (!docPerc || d.percorso === docPerc); });
    l.sort(function (a, b) { var x = (a.data || '').localeCompare(b.data || ''); return docOrd === 'vecchi' ? x : -x; });
    A.$('#docN').textContent = l.length + (l.length === 1 ? ' documento' : ' documenti');
    var h = '', anno = null;
    l.forEach(function (d) {
      var y = (d.data || '').slice(0, 4);
      if (y !== anno) { if (anno !== null) h += '</div>'; h += '<h3 class="year">' + (y || 'Senza data') + '</h3><div class="list">'; anno = y; }
      h += A.docItem(d);
    });
    if (anno !== null) h += '</div>';
    A.$('#docList').innerHTML = h || '<p class="muted pad">Nessun documento trovato.</p>';
  }
  A.ACT.docCat = function (el) { docCat = el.dataset.c; A.ridisegna(); };
  A.ACT.docPerc = function (el) { docPerc = docPerc === el.dataset.p ? '' : el.dataset.p; A.ridisegna(); };

  // ---------- dettaglio ----------
  A.ACT.apriDoc = function (el) { A.apriDoc(el.dataset.id); };
  A.apriDoc = function (id) {
    var d = A.documento(id); if (!d) { A.toast('Documento non trovato'); return; }
    var coll = (d.collegati || []).map(A.documento).filter(Boolean);
    var stessoPerc = d.percorso ? D().documenti.filter(function (x) { return x.percorso === d.percorso && x.id !== d.id && coll.indexOf(x) < 0; }) : [];
    var evs = D().eventi.filter(function (e) { return (e.docIds || []).indexOf(d.id) >= 0; });
    var h = '<div class="preview" id="prev"><p class="muted"><span class="spinner"></span> Apro il file…</p></div>' +
      '<div class="btns"><button class="btn" data-act="apriOriginale" data-id="' + d.id + '">' + IC.eye + 'Apri l\'originale</button><button class="btn sec" data-act="scaricaDoc" data-id="' + d.id + '">' + IC.down + 'Scarica</button></div>' +
      A.fatto('Categoria', esc(d.categoria)) + A.fatto('Data', d.data ? A.cap(A.fmtLunga(d.data)) : '') + A.fatto('Struttura', esc(d.struttura)) + A.fatto('Percorso di cura', esc(d.percorso)) +
      A.fatto('File', esc(d.nome) + ' · ' + A.kb(d.size) + (d.pagine ? ' · ' + d.pagine + ' pagine' : '')) +
      (d.note ? '<h3>Le tue note</h3><p class="prewrap">' + esc(d.note) + '</p>' : '');
    if (d.ai) h += '<section class="box ai"><h3>' + IC.chat + 'Letto dall\'assistente AI</h3><p class="prewrap">' + esc(d.ai.testo) + '</p><p class="src">Interpretazione di un servizio esterno (Anthropic), ' + A.fmtTs(d.ai.ts) + '. Fa fede il documento originale.</p></section>';
    else if (A.aiPronta && A.aiPronta()) h += '<button class="btn sec block" data-act="aiDoc" data-id="' + d.id + '">' + IC.chat + 'Fatti riassumere il documento dall\'assistente AI</button>';
    if (d.testo) h += '<details class="box"><summary>Testo letto nel documento</summary><div class="mailbody">' + A.evidenzia(d.testo.slice(0, 12000)) + '</div><p class="src">Testo estratto automaticamente dal PDF: può contenere imprecisioni di impaginazione.</p></details>';
    if (coll.length || stessoPerc.length) h += '<h3>Documenti collegati</h3><div class="list">' + coll.concat(stessoPerc).map(A.docItem).join('') + '</div>';
    if (evs.length) h += '<h3>Appuntamenti collegati</h3><div class="list">' + evs.map(A.eventoItem).join('') + '</div>';
    if (d.emailId && D().email[d.emailId]) h += '<button class="btn ghost block" data-act="apriEmail" data-id="' + esc(d.emailId) + '">' + IC.mail + 'Vedi l\'email da cui arriva</button>';
    h += '<div class="btns"><button class="btn sec" data-act="modDoc" data-id="' + d.id + '">' + IC.edit + 'Modifica dati e note</button><button class="btn ghost" data-act="collegaDoc" data-id="' + d.id + '">' + IC.link + 'Collega</button><button class="btn danger" data-act="delDoc" data-id="' + d.id + '" aria-label="Elimina">' + IC.trash + '</button></div>';
    A.log('Documento aperto', d.titolo); A.save();
    A.sheet(esc(d.titolo), h, function (s) {
      var box = A.$('#prev', s);
      Archivio.leggiFile(d.fileId).then(function (blob) {
        if (!blob) { box.innerHTML = '<p class="notice warn">Il file non è più nell\'archivio di questo dispositivo.</p>'; return; }
        if (/image/.test(d.mime)) { var u = URL.createObjectURL(blob); box.innerHTML = '<img alt="Anteprima di ' + esc(d.titolo) + '" src="' + u + '">'; }
        else if (/pdf/.test(d.mime)) { box.innerHTML = '<canvas aria-label="Prima pagina del documento"></canvas>'; anteprimaPdf(blob, A.$('canvas', box)).catch(function () { box.innerHTML = '<p class="muted">Anteprima non disponibile: usa "Apri l\'originale".</p>'; }); }
        else box.innerHTML = '<p class="muted">Anteprima non disponibile per questo tipo di file.</p>';
      }).catch(function () { box.innerHTML = '<p class="notice warn">Non riesco ad aprire il file.</p>'; });
    }, { largo: true });
  };
  function conFile(id, fn) {
    var d = A.documento(id); if (!d) return;
    Archivio.leggiFile(d.fileId).then(function (b) { if (!b) { A.toast('File non trovato'); return; } fn(d, b); }).catch(function () { A.toast('Non riesco ad aprire il file'); });
  }
  A.ACT.apriOriginale = function (el) {
    if (A.nativo()) { conFile(el.dataset.id, function (d, b) { A.scarica(d.nome, b); }); return; }   // nell'app Android si apre dal foglio "Condividi / Apri con"
    var w = window.open('', '_blank');
    conFile(el.dataset.id, function (d, b) {
      var u = URL.createObjectURL(b.type ? b : new Blob([b], { type: d.mime }));
      if (w) w.location.href = u; else A.scarica(d.nome, b);
      setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    });
  };
  A.ACT.scaricaDoc = function (el) { conFile(el.dataset.id, function (d, b) { A.scarica(d.nome, b); A.log('Documento scaricato', d.titolo); A.save(); }); };
  A.ACT.modDoc = function (el) { A.chiudiSheet(); formDoc(A.documento(el.dataset.id), false); };
  A.ACT.delDoc = function (el) {
    var d = A.documento(el.dataset.id); if (!d) return;
    if (!confirm('Eliminare definitivamente "' + d.titolo + '" da questo dispositivo?')) return;
    if (window.Cartella) Cartella.togliDoc(d);
    Archivio.cancellaFile(d.fileId).then(function () {
      A.D.documenti = A.D.documenti.filter(function (x) { return x.id !== d.id; });
      A.D.documenti.forEach(function (x) { x.collegati = (x.collegati || []).filter(function (c) { return c !== d.id; }); });
      A.D.eventi.forEach(function (e) { e.docIds = (e.docIds || []).filter(function (c) { return c !== d.id; }); });
      A.log('Documento eliminato', d.titolo); A.save(); A.chiudiSheet(true); A.ridisegna(); A.toast('Documento eliminato');
    });
  };
  A.ACT.collegaDoc = function (el) {
    var d = A.documento(el.dataset.id), altri = D().documenti.filter(function (x) { return x.id !== d.id; }).sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
    if (!altri.length) { A.toast('Non ci sono altri documenti da collegare'); return; }
    A.sheet('Collega a "' + esc(A.taglia(d.titolo, 30)) + '"', '<p class="muted">Scegli i documenti dello stesso percorso di cura.</p>' + altri.map(function (x) {
      return '<label class="check"><input type="checkbox" value="' + x.id + '"' + ((d.collegati || []).indexOf(x.id) >= 0 ? ' checked' : '') + '><span>' + esc(x.titolo) + ' <span class="muted">· ' + esc(x.categoria) + (x.data ? ' · ' + A.fmtBreve(x.data) : '') + '</span></span></label>';
    }).join('') + '<button class="btn block" id="okColl">' + IC.check + 'Salva collegamenti</button>', function (s) {
      A.$('#okColl', s).addEventListener('click', function () {
        var sel = A.$$('input:checked', s).map(function (i) { return i.value; });
        D().documenti.forEach(function (x) {
          if (x.id === d.id) return;
          x.collegati = (x.collegati || []).filter(function (c) { return c !== d.id; });
          if (sel.indexOf(x.id) >= 0) x.collegati.push(d.id);
        });
        d.collegati = sel; A.save(); A.chiudiSheet(true); A.apriDoc(d.id); A.toast('Collegamenti salvati');
      });
    });
  };
})(CA);
