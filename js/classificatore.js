/* =========================================================
   Cartellina — classificatore email sanitarie
   Codice puro (senza pagina): lo usa l'app e lo stesso testo
   viene copiato nello script Gmail (gmail/Codice.gs).

   Principio "zero email perse":
   - SANITARIA  → riconosciuta con certezza (punteggio alto, mittente
                  fidato o etichetta "Cartellina" messa da te su Gmail)
   - VERIFICA   → dubbio: te la chiede, non decide da sola
   - SCARTATA   → nessun segnale sanitario (resta consultabile)
   Ogni tua conferma insegna il mittente: la volta dopo è certa.
   ========================================================= */
var Classificatore = (function () {
  'use strict';

  // ---------- segnali ----------
  // mittenti / domini tipici di strutture sanitarie italiane
  var DOMINI_FORTI = [
    'asl', 'ausl', 'usl', 'ats-', 'asst-', 'aulss', 'asp.', 'asp-', 'aou', 'ao-', 'azienda-ospedaliera', 'aziendaospedaliera',
    'ospedal', 'policlinic', 'irccs', 'clinica', 'casadicura', 'casa-di-cura', 'poliambulator', 'sanita', 'salute',
    'fse', 'fascicolo', 'cup', 'recup', 'prenotasalute', 'laborator', 'diagnostic', 'radiolog', 'centromedico', 'centro-medico',
    'humanitas', 'auxologico', 'multimedica', 'synlab', 'cerba', 'lifebrain', 'gvmnet', 'grupposandonato', 'sandonato',
    'ieo.it', 'istitutotumori', 'gemelli', 'niguarda', 'sacco', 'besta', 'galeazzi', 'maugeri', 'bambinogesu',
    'medicitalia', 'miodottore', 'mio-dottore', 'doctolib', 'paginemediche', 'ttc', 'ricettaelettronica', 'inps.it'
  ];

  // parole sanitarie forti (peso 3)
  var FORTI = [
    'prenotazione', 'prenotata', 'prenotato', 'appuntamento', 'visita specialistica', 'visita', 'referto', 'referti',
    'impegnativa', 'ricetta', 'ricovero', 'prericovero', 'pre-ricovero', 'day hospital', 'day surgery', 'intervento chirurgico',
    'intervento', 'ambulatorio', 'ambulatoriale', 'reparto', 'esame', 'esami', 'analisi del sangue', 'prelievo', 'prelievi',
    'ecografia', 'ecocardiogramma', 'ecocolordoppler', 'doppler', 'risonanza', 'tac', 'tc ', 'radiografia', 'rx ', 'mammografia',
    'scintigrafia', 'pet', 'moc', 'densitometria', 'endoscopia', 'gastroscopia', 'colonscopia', 'biopsia', 'agoaspirato',
    'elettrocardiogramma', 'ecg', 'holter', 'spirometria', 'elettromiografia', 'eeg', 'esame istologico', 'istologico',
    'chemioterapia', 'radioterapia', 'dialisi', 'fisioterapia', 'riabilitazione', 'terapia', 'farmaco', 'farmaci',
    'piano terapeutico', 'esenzione', 'ticket', 'fascicolo sanitario', 'cup', 'certificato di malattia', 'certificato medico',
    'medico curante', 'medico di base', 'specialista', 'oncologia', 'cardiologia', 'neurologia', 'ortopedia', 'urologia',
    'ginecologia', 'dermatologia', 'oculistica', 'otorino', 'gastroenterologia', 'pneumologia', 'endocrinologia', 'nefrologia',
    'ematologia', 'reumatologia', 'chirurgia', 'anestesia', 'pronto soccorso', 'dimissione', 'lettera di dimissione',
    'diagnosi', 'paziente', 'anamnesi', 'consenso informato', 'invalidità', 'legge 104', 'commissione medica'
  ];

  // parole di contorno (peso 1)
  var DEBOLI = [
    'medico', 'dottore', 'dott.', 'dott.ssa', 'dr.', 'infermier', 'sanitari', 'sanitaria', 'clinico', 'clinica', 'ospedale',
    'struttura', 'digiuno', 'tessera sanitaria', 'documento di identità', 'presentarsi', 'accettazione', 'sportello',
    'esito', 'risultati', 'controllo', 'follow-up', 'follow up', 'disdetta', 'annullamento', 'spostamento', 'conferma',
    'promemoria', 'codice prenotazione', 'numero prenotazione', 'nre', 'codice fiscale', 'salute', 'cura', 'cure'
  ];

  // segnali di pubblicità / newsletter (penalità)
  var NEGATIVI = [
    'newsletter', 'disiscriviti', 'cancella iscrizione', 'unsubscribe', 'annulla iscrizione', 'offerta', 'offerte', 'sconto',
    'sconti', 'promo', 'promozione', 'coupon', 'saldi', 'black friday', 'acquista ora', 'compra ora', 'spedizione gratuita',
    'webinar', 'sondaggio', 'concorso a premi', 'vinci', 'carrello', 'il tuo ordine', 'codice sconto', 'novità per te',
    'raccolta punti', 'lotteria', 'abbonati'
  ];

  // domini sicuramente non sanitari (social, shop, banche...)
  var DOMINI_NO = [
    'amazon', 'ebay', 'zalando', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'netflix', 'spotify', 'paypal',
    'aliexpress', 'temu', 'shein', 'booking', 'airbnb', 'ryanair', 'trenitalia', 'italotreno', 'decathlon', 'mediaworld',
    'unieuro', 'github', 'google.com', 'youtube', 'pinterest', 'groupon'
  ];

  var SOGLIA_CERTA = 9;    // da qui in su: sanitaria
  var SOGLIA_DUBBIO = 3;   // tra 3 e 8: da verificare

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[àá]/g, 'a').replace(/[èé]/g, 'e').replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u');
  }
  function contains(text, word) {
    var w = norm(word);
    // parola intera per le parole corte (tac, pet, ecg, cup...)
    if (w.trim().length <= 4) {
      var re = new RegExp('(^|[^a-z0-9])' + w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)');
      return re.test(text);
    }
    return text.indexOf(w) !== -1;
  }
  function indirizzo(from) {
    var m = String(from || '').match(/<([^>]+)>/);
    return norm(m ? m[1] : from).trim();
  }
  function dominio(addr) { var i = addr.indexOf('@'); return i >= 0 ? addr.slice(i + 1) : addr; }

  /**
   * email: { from, subject, body, labels:[] }
   * regole: { fidati:[indirizzi o domini], bloccati:[...] }
   * ritorna { stato:'sanitaria'|'verifica'|'scartata', punteggio, motivi:[] }
   */
  function classifica(email, regole) {
    regole = regole || {};
    var motivi = [];
    var addr = indirizzo(email.from);
    var dom = dominio(addr);
    var fidati = (regole.fidati || []).map(norm);
    var bloccati = (regole.bloccati || []).map(norm);
    var labels = (email.labels || []).map(norm);

    // 1) decisioni certe
    if (labels.some(function (l) { return l === 'cartellina' || l === 'cartellina/sanitaria'; })) {
      return { stato: 'sanitaria', punteggio: 100, motivi: ['Etichetta "Cartellina" su Gmail'] };
    }
    if (fidati.some(function (f) { return f && (addr === f || dom === f || dom.slice(-f.length - 1) === '.' + f); })) {
      return { stato: 'sanitaria', punteggio: 100, motivi: ['Mittente confermato da te'] };
    }
    if (bloccati.some(function (f) { return f && (addr === f || dom === f); })) {
      return { stato: 'scartata', punteggio: -100, motivi: ['Mittente che hai indicato come non sanitario'] };
    }

    // 2) punteggio
    var subj = norm(email.subject);
    var body = norm(String(email.body || '').slice(0, 8000));
    var p = 0;

    var domForte = DOMINI_FORTI.filter(function (d) { return addr.indexOf(d) !== -1; });
    if (domForte.length) { p += 6; motivi.push('Mittente sanitario (' + dom + ')'); }
    var pec = /pec\.|legalmail|postacert/.test(addr);
    if (pec && domForte.length) { p += 2; motivi.push('PEC di un ente'); }

    var trovateSubj = [], trovateBody = [];
    FORTI.forEach(function (w) {
      if (contains(subj, w)) trovateSubj.push(w.trim());
      else if (contains(body, w)) trovateBody.push(w.trim());
    });
    // oggetto pesa di più del testo; limiti per evitare gonfiature
    p += Math.min(trovateSubj.length * 4, 10);
    p += Math.min(trovateBody.length * 2, 8);
    if (trovateSubj.length) motivi.push('Oggetto: ' + trovateSubj.slice(0, 4).join(', '));
    if (trovateBody.length) motivi.push('Testo: ' + trovateBody.slice(0, 5).join(', '));

    var deboli = DEBOLI.filter(function (w) { return contains(subj + ' ' + body, w); });
    p += Math.min(deboli.length, 4);

    // data + orario nel testo = probabile appuntamento
    if (/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/.test(body) && /\b(ore|alle|h\.?)\s*\d{1,2}[:.]\d{2}/.test(body)) {
      p += 2; motivi.push('Contiene data e orario');
    }
    if ((email.attachments || []).some(function (a) { return /referto|esito|ricetta|impegnativa|prenotazion|promemoria/i.test(a); })) {
      p += 4; motivi.push('Allegato sanitario');
    }

    var neg = NEGATIVI.filter(function (w) { return contains(subj + ' ' + body, w); });
    if (neg.length) { p -= Math.min(neg.length * 3, 9); motivi.push('Segnali pubblicitari: ' + neg.slice(0, 3).join(', ')); }
    if (DOMINI_NO.some(function (d) { return dom.indexOf(d) !== -1; })) { p -= 8; motivi.push('Mittente commerciale/social'); }

    var stato = 'scartata';
    // certa solo se c'è un segnale forte vero (mittente sanitario o parole sanitarie nell'oggetto)
    if (p >= SOGLIA_CERTA && (domForte.length || trovateSubj.length) && !neg.length) stato = 'sanitaria';
    else if (p >= SOGLIA_DUBBIO) stato = 'verifica';
    if (!motivi.length) motivi.push('Nessun segnale sanitario');
    return { stato: stato, punteggio: p, motivi: motivi };
  }

  // ---------- estrazione dati dal testo ----------
  var MESI = { gennaio: 1, gen: 1, febbraio: 2, feb: 2, marzo: 3, mar: 3, aprile: 4, apr: 4, maggio: 5, mag: 5, giugno: 6, giu: 6,
    luglio: 7, lug: 7, agosto: 8, ago: 8, settembre: 9, set: 9, sett: 9, ottobre: 10, ott: 10, novembre: 11, nov: 11, dicembre: 12, dic: 12 };

  var TIPI = [
    { tipo: 'Intervento', re: /\b(intervento chirurgico|intervento|operazione|chirurgic\w*|sala operatoria)\b/i },
    { tipo: 'Ricovero', re: /\b(pre-?ricovero|ricovero|day hospital|day surgery|degenza)\b/i },
    { tipo: 'Diagnostica', re: /\b(tac|tc|risonanza( magnetica)?|rmn?|ecografia|eco|ecocardiogramma|ecocolordoppler|doppler|radiografia|rx|mammografia|scintigrafia|pet(-tc)?|moc|densitometria|endoscopia|gastroscopia|colonscopia|egds|biopsia|agoaspirato|holter|ecg|elettrocardiogramma|spirometria|elettromiografia|emg|eeg|angiografia)\b/i },
    { tipo: 'Esame', re: /\b(analisi|prelievo|prelievi|esami? del sangue|esami? ematochimici|esame urine|urinocoltura|laboratorio|esami?|tampone)\b/i },
    { tipo: 'Terapia', re: /\b(chemioterapia|radioterapia|infusione|dialisi|fisioterapia|riabilitazione|seduta|terapia)\b/i },
    { tipo: 'Visita', re: /\b(visita|controllo|consulto|consulenza|televisita|colloquio)\b/i }
  ];

  var STOP = /^(il|lo|la|i|gli|le|del|della|dello|dei|delle|per|presso|senza|con|alle|ore|in|a|di|da|e|ed|al|allo|alla|che|è|sarà|fissat\w*|programmat\w*|prenotat\w*|previst\w*|giorno|data)$/i;
  var SPEC = /^(cardiolog|neurolog|oculist|ortoped|dermatolog|urolog|ginecolog|specialist|oncolog|endocrinolog|gastroenterolog|pneumolog|nefrolog|reumatolog|ematolog|fisiatr|otorin|chirurg|angiolog|allergolog|diabetolog|geriatr|psichiatr|anestesiolog|di controllo)/i;

  // sceglie la parola-chiave che compare per prima nel testo (di solito è il "nome" dell'appuntamento)
  function tipoDa(testo) {
    var best = null;
    TIPI.forEach(function (t, i) {
      var m = testo.match(t.re);
      if (m && (!best || m.index < best.idx || (m.index === best.idx && i < best.pri))) best = { tipo: t.tipo, parola: m[0], idx: m.index, pri: i };
    });
    if (!best) return { tipo: 'Altro', parola: '' };
    // completa il titolo: "Visita cardiologica", "RMN ginocchio destro"
    var dopo = testo.slice(best.idx + best.parola.length).split(/[\s,]+/).filter(Boolean);
    var extra = [];
    for (var k = 0; k < Math.min(3, dopo.length); k++) {
      var w = dopo[k].replace(/[.;:()]+$/, '');
      if (!w || STOP.test(w) || /\d/.test(w)) break;
      if (best.tipo === 'Visita' && !SPEC.test(w)) break;
      if (best.tipo === 'Esame' && k > 0) break;
      extra.push(w.toLowerCase());
      if (/[.;:]$/.test(dopo[k])) break;
    }
    return { tipo: best.tipo, parola: best.parola + (extra.length ? ' ' + extra.join(' ') : '') };
  }

  // frase che contiene la data (dall'ultimo punto o a capo fino alla data)
  function frasePrima(testo, pos) {
    var inizio = Math.max(testo.lastIndexOf('\n', pos - 1), testo.lastIndexOf('. ', pos - 1), pos - 200, 0);
    return testo.slice(inizio, pos);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function estraiDate(testo, rif) {
    rif = rif ? new Date(rif) : new Date();
    var out = [];
    var t = String(testo || '');
    var re1 = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g, m;
    while ((m = re1.exec(t))) {
      var y = +m[3]; if (y < 100) y += 2000;
      out.push({ g: +m[1], m: +m[2], a: y, pos: m.index, len: m[0].length });
    }
    var re2 = /\b(\d{1,2})\s*(?:°\s*)?(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|gen|feb|mar|apr|mag|giu|lug|ago|sett?|ott|nov|dic)\.?(?:\s+(\d{4}))?\b/gi;
    while ((m = re2.exec(t))) {
      var mese = MESI[m[2].toLowerCase()];
      var anno = m[3] ? +m[3] : rif.getFullYear();
      if (!m[3] && new Date(anno, mese - 1, +m[1]) < new Date(rif.getFullYear(), rif.getMonth(), rif.getDate())) anno++;
      out.push({ g: +m[1], m: mese, a: anno, pos: m.index, len: m[0].length });
    }
    return out.filter(function (d) {
      return d.g >= 1 && d.g <= 31 && d.m >= 1 && d.m <= 12 && d.a >= 2000 && d.a <= 2100;
    }).sort(function (a, b) { return a.pos - b.pos; });
  }

  function orarioVicino(testo, pos) {
    var finestra = testo.slice(pos, pos + 90);
    var m = finestra.match(/\b(?:ore|alle|alle ore|h\.?|dalle)\s*(\d{1,2})(?:[:.](\d{2}))?\b/i) || finestra.match(/\b(\d{1,2})[:.](\d{2})\b(?![\/.\-]\d)/);
    if (!m) {
      var prima = testo.slice(Math.max(0, pos - 50), pos);
      m = prima.match(/\b(?:ore|alle|h\.?)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:del|di|il)?\s*$/i);
    }
    if (!m) return '';
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (h > 23 || mi > 59) return '';
    return pad(h) + ':' + pad(mi);
  }

  function luogo(testo) {
    var m = testo.match(/\bpresso\s+(?:il|la|lo|l'|i|gli|le)?\s*([^\n.;]{3,90})/i);
    var addr = testo.match(/\b(via|viale|piazza|p\.zza|piazzale|corso|c\.so|largo|strada|vicolo|località|loc\.)\s+[A-Za-zÀ-ù'.\s]{2,50}\s*,?\s*(n\.?\s*)?\d{1,4}[A-Za-z]?(?:\s*[,-]?\s*\d{5})?(?:\s*[,-]?\s*[A-Z][A-Za-zÀ-ù'\s]{2,30})?/i);
    return { presso: m ? m[1].trim() : '', indirizzo: addr ? addr[0].replace(/\s+/g, ' ').trim() : '' };
  }

  function telefoni(testo) {
    var out = [], m;
    var re = /(?:\+39[\s.]?)?\b(0\d{1,4}[\s./-]?\d{3,4}[\s./-]?\d{2,5}|3\d{2}[\s./-]?\d{3}[\s./-]?\d{3,4}|800[\s.]?\d{3}[\s.]?\d{3}|80[0-3][\s.]?\d{6})\b/g;
    while ((m = re.exec(testo))) {
      var n = m[0].replace(/[^\d+]/g, '');
      var digits = n.replace(/^\+39/, '');
      if (digits.length >= 6 && digits.length <= 11 && out.indexOf(n) === -1) out.push(n);
    }
    return out;
  }
  function emails(testo) {
    var out = [], m, re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    while ((m = re.exec(testo))) { var e = m[0].toLowerCase(); if (out.indexOf(e) === -1 && !/noreply|no-reply|donotreply/.test(e)) out.push(e); }
    return out;
  }

  /** estrae appuntamenti futuri, contatti e promemoria utili */
  function estrai(email, oggi) {
    var testo = (email.subject || '') + '\n' + (email.body || '');
    oggi = oggi ? new Date(oggi) : new Date();
    var inizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    var dt = estraiDate(testo, oggi);
    var eventi = [];
    var visti = {};
    dt.forEach(function (d) {
      var data = new Date(d.a, d.m - 1, d.g);
      if (data < inizioOggi) return; // solo date future (le passate di solito sono data di emissione)
      var prima = testo.slice(Math.max(0, d.pos - 60), d.pos).toLowerCase();
      if (/(emess|emission|nat[oa] il|nascita|inviat|stampat|scadenza della ricetta|valid)/.test(prima)) return;
      var ora = orarioVicino(testo, d.pos + d.len);
      var contesto = testo.slice(Math.max(0, d.pos - 220), d.pos + 220);
      var tp = tipoDa(frasePrima(testo, d.pos));
      if (tp.tipo === 'Altro') tp = tipoDa(testo.slice(d.pos, d.pos + 160).split(/\.\s|\n/)[0]);
      if (tp.tipo === 'Altro') tp = tipoDa(email.subject || '');
      if (tp.tipo === 'Altro') tp = tipoDa(testo);
      var chiave = d.a + '-' + d.m + '-' + d.g + ' ' + ora;
      if (visti[chiave]) return; visti[chiave] = 1;
      var l = luogo(contesto);
      if (!l.presso && !l.indirizzo) l = luogo(testo);
      eventi.push({
        data: d.a + '-' + pad(d.m) + '-' + pad(d.g),
        ora: ora,
        tipo: tp.tipo,
        titolo: (tp.parola ? tp.parola.charAt(0).toUpperCase() + tp.parola.slice(1) : tp.tipo),
        luogo: l.presso,
        indirizzo: l.indirizzo,
        // affidabile se ha orario e un tipo riconosciuto
        certo: !!ora && tp.tipo !== 'Altro'
      });
    });
    var low = testo.toLowerCase();
    var portare = [];
    if (/impegnativ|ricetta/.test(low)) portare.push('Impegnativa / ricetta');
    if (/tessera sanitaria|ts-cns|tessera/.test(low)) portare.push('Tessera sanitaria');
    if (/document[oi] (di )?identit|carta d.identit/.test(low)) portare.push('Documento d\'identità');
    if (/digiuno/.test(low)) portare.push('Presentarsi a digiuno');
    if (/esami precedenti|documentazione|referti precedenti|cartella clinica/.test(low)) portare.push('Esami e referti precedenti');
    if (/esenzion/.test(low)) portare.push('Attestato di esenzione');
    if (/ticket|pagamento/.test(low)) portare.push('Ricevuta del ticket');
    if (/consenso informato/.test(low)) portare.push('Consenso informato firmato');
    if (/elenco dei farmaci|terapia in corso|farmaci assunti/.test(low)) portare.push('Elenco farmaci che prendi');

    var nomeMitt = String(email.from || '').replace(/<[^>]+>/, '').replace(/"/g, '').trim();
    var addr = indirizzo(email.from);
    return {
      eventi: eventi,
      telefoni: telefoni(testo),
      emails: emails(testo).filter(function (e) { return e !== addr; }),
      mittente: { nome: nomeMitt || addr, email: /noreply|no-reply|donotreply/.test(addr) ? '' : addr },
      luogo: luogo(testo),
      portare: portare,
      prenotazione: (testo.match(/(?:codice|numero|n\.)\s*(?:di\s*)?prenotazione\s*[:n°.\s]*([A-Z0-9\-\/]{4,})/i) || [])[1] || '',
      nre: (testo.match(/\bNRE\s*[:n°.]?\s*([0-9A-Z]{10,15})/i) || [])[1] || ''
    };
  }

  return { classifica: classifica, estrai: estrai, tipoDa: tipoDa, estraiDate: estraiDate, telefoni: telefoni, norm: norm };
})();
if (typeof module !== 'undefined') module.exports = Classificatore;
