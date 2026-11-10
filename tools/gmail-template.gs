/* =========================================================
   CARTELLINA — script per Gmail
   Legge le email in arrivo sul TUO account e le passa all'app.
   Gira su Google (il tuo account), nessun server esterno.

   ISTRUZIONI
   1. Scrivi qui sotto una parola segreta (la stessa da mettere nell'app).
   2. Salva, scegli la funzione "installa" e premi Esegui (accetta i permessi).
   3. Esegui il deployment → Nuovo deployment → App web
      Esegui come: Me · Chi può accedere: Chiunque → copia l'URL /exec.
   ========================================================= */
const CODICE_SEGRETO = 'scrivi-qui-la-tua-parola-segreta';

const ETICHETTA_OK = 'Cartellina/Sanitaria';
const ETICHETTA_DUBBIO = 'Cartellina/Da verificare';

/** Da eseguire una volta: attiva il controllo automatico ogni 5 minuti */
function installa() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('analizzaNuove').timeBased().everyMinutes(5).create();
  etichetta_(ETICHETTA_OK); etichetta_(ETICHETTA_DUBBIO); etichetta_('Cartellina');
  PropertiesService.getScriptProperties().setProperty('ultimo', String(Math.floor(Date.now() / 1000) - 3 * 86400));
  analizzaNuove();
  Logger.log('Cartellina installata: controllo ogni 5 minuti attivo.');
}

/** Gira da solo ogni 5 minuti: analizza le email appena arrivate e mette le etichette */
function analizzaNuove() {
  const props = PropertiesService.getScriptProperties();
  const ultimo = parseInt(props.getProperty('ultimo') || String(Math.floor(Date.now() / 1000) - 86400), 10);
  const adesso = Math.floor(Date.now() / 1000);
  const regole = regole_();
  const threads = GmailApp.search('after:' + ultimo + ' -in:spam -in:trash', 0, 100);
  const ok = etichetta_(ETICHETTA_OK), dubbio = etichetta_(ETICHETTA_DUBBIO);
  threads.forEach(t => {
    t.getMessages().forEach(m => {
      if (m.getDate().getTime() / 1000 < ultimo) return;
      const r = Classificatore.classifica(email_(m, t), regole);
      if (r.stato === 'sanitaria') { t.addLabel(ok); t.removeLabel(dubbio); }
      else if (r.stato === 'verifica') t.addLabel(dubbio);
    });
  });
  props.setProperty('ultimo', String(adesso - 60));
}

/** Indirizzo web chiamato dall'app */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.token || p.token !== CODICE_SEGRETO) return json_({ error: 'token' });
  const props = PropertiesService.getScriptProperties();

  if (p.azione === 'regole') {
    props.setProperty('fidati', p.fidati || '');
    props.setProperty('bloccati', p.bloccati || '');
    return json_({ ok: true });
  }
  if (p.azione === 'etichetta' && p.id) {
    try {
      const t = GmailApp.getMessageById(p.id).getThread();
      if (p.stato === 'sanitaria') { t.addLabel(etichetta_(ETICHETTA_OK)); t.removeLabel(etichetta_(ETICHETTA_DUBBIO)); }
      else { t.removeLabel(etichetta_(ETICHETTA_OK)); t.removeLabel(etichetta_(ETICHETTA_DUBBIO)); t.removeLabel(etichetta_('Cartellina')); }
      return json_({ ok: true });
    } catch (err) { return json_({ error: String(err) }); }
  }

  // elenco delle email recenti (tutte: la scelta finale la fa l'app con le tue regole)
  const giorni = Math.max(1, Math.min(30, parseInt(p.giorni || '7', 10)));
  const limite = Date.now() - giorni * 86400000;
  const out = [];
  const regole = regole_();
  GmailApp.search('newer_than:' + giorni + 'd -in:spam -in:trash', 0, 120).forEach(t => {
    t.getMessages().forEach(m => {
      if (m.getDate().getTime() < limite || out.length >= 200) return;
      const em = email_(m, t);
      em.statoServer = Classificatore.classifica(em, regole).stato;
      // le email chiaramente non sanitarie viaggiano leggere
      if (em.statoServer === 'scartata') em.body = em.body.slice(0, 1200);
      out.push(em);
    });
  });
  return json_({ ok: true, emails: out, ora: new Date().toISOString() });
}

// ---------- supporto ----------
function email_(m, t) {
  return {
    id: m.getId(),
    from: m.getFrom(),
    subject: m.getSubject(),
    date: m.getDate().toISOString(),
    body: (m.getPlainBody() || '').replace(/\n{3,}/g, '\n\n').slice(0, 6000),
    labels: t.getLabels().map(l => l.getName()),
    attachments: m.getAttachments({ includeInlineImages: false }).map(a => a.getName())
  };
}
function regole_() {
  const props = PropertiesService.getScriptProperties();
  const lista = k => (props.getProperty(k) || '').split(',').map(s => s.trim()).filter(Boolean);
  return { fidati: lista('fidati'), bloccati: lista('bloccati') };
}
function etichetta_(nome) { return GmailApp.getUserLabelByName(nome) || GmailApp.createLabel(nome); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ================= CLASSIFICATORE (identico a quello dell'app) =================
