# Cartellina 📁

La burocrazia della salute, semplice. Web app (PWA) per chi convive con una malattia e per chi lo assiste:
aprendola si capisce subito **cosa è successo, cosa è arrivato, quali documenti ci sono, quali appuntamenti e cosa resta da fare**.

## Le cinque sezioni
- **Home** — "Da fare" (generato da solo: email da verificare, date da confermare, scadenze, richieste di documenti, referti da ritirare, ricette da rinnovare, cose da portare, promemoria personali), prossimi appuntamenti, farmaci di oggi, comunicazioni, documenti recenti.
- **Email** — smistate in *Salute*, *Da verificare*, *Altre email*. Per ogni email sanitaria: struttura, argomento (11 categorie), date e orari, indirizzi, scadenze, documenti richiesti, preparazioni, allegati, riassunto semplice. L'originale resta sempre consultabile. Nei casi dubbi chiede conferma; ogni correzione (sanitaria sì/no, argomento) insegna il mittente. Nessuna email viene cancellata, spostata o archiviata.
- **Documenti** — archivio di PDF e foto (anche dalla fotocamera). Riconosce il tipo (referti, analisi del sangue, esami diagnostici, prescrizioni, ricette, certificati, cartelle cliniche, lettere di dimissione, documentazione assicurativa, altri), legge data e struttura dai PDF, ricerca per parola/data/categoria/struttura, ordine cronologico, note personali, collegamenti e "percorsi di cura". Il file originale non viene mai modificato; i duplicati sono riconosciuti (impronta SHA-256).
- **Calendario** — visite, esami, controlli periodici, terapie, scadenze, rinnovi di prescrizioni, appuntamenti amministrativi. Ripetizioni, promemoria personalizzabili, luogo, preparazione, cose da portare, documenti collegati, esportazione .ics nel calendario del telefono. Le date trovate nelle email entrano **solo dopo la tua conferma**. Da qui si raggiungono anche i **Farmaci** (allarmi a schermo intero, scorte).
- **Assistente** — ricerca unica in linguaggio naturale su email, documenti, calendario e rubrica ("Trova l'ultima analisi del sangue", "Qual è la data del prossimo controllo?"…): la risposta dice da quale dato viene. Strumenti: cosa devo fare, riassunti, cosa portare a un appuntamento, documenti mancanti, cronologia, domande per il medico, spiegazione di parole e richieste. Più glossario e trasporti.

Impostazioni (ingranaggio in alto): aspetto (chiaro/scuro, 3 grandezze di testo), PIN, Gmail, promemoria, assistente AI, collegamento con AgendApp e Smistino, **Privacy e dati** (dove sono i dati, cosa esce e quando, registro delle attività, esportazione/importazione, cancellazione definitiva).

## Privacy e sicurezza
- Nessun server: dati e documenti stanno **solo sul dispositivo** (IndexedDB). Nessuna pubblicità, nessun tracciamento, nessuna condivisione automatica.
- **PIN facoltativo**: con il PIN tutto (dati, documenti, chiave AI) è cifrato con AES-GCM 256; la chiave deriva dal PIN (PBKDF2-SHA256, 310.000 iterazioni) e non viene salvata. Blocco automatico configurabile.
- Content Security Policy restrittiva: solo script dell'app, collegamenti consentiti solo verso i servizi elencati sotto. Niente font o risorse esterne.
- Cosa esce, e solo su tua azione: Gmail (tuo script Google), parola cercata nel glossario (Wikipedia, NIH), comune o posizione per i trasporti (OpenStreetMap), richieste all'assistente AI (Anthropic) se attivato.
- **Registro delle attività**: documenti aggiunti/aperti/eliminati, email lette da Gmail, esportazioni, invii all'assistente AI, PIN e consensi.

## Assistente AI (facoltativo, spento di default)
Ricerca, riassunti e strumenti funzionano senza AI, con regole sul dispositivo. L'assistente AI (Claude di Anthropic) si attiva solo con **consenso esplicito** e **chiave API personale**; ogni invio parte solo premendo un tasto, contiene il minimo necessario ed è registrato. Le risposte sono marcate come interpretazione; il prompt vieta diagnosi, prescrizioni e modifiche di terapia. Prima di usarlo con dati sanitari valuta tu le condizioni del fornitore (trasferimento extra-UE, conservazione dei dati).

## Collegare Gmail
Impostazioni → Email: si copia `gmail/Codice.gs` su script.google.com, si incolla una parola segreta (il tasto "Crea una parola segreta" ne genera una robusta), si esegue `installa` e si pubblica come App web. Lo script **non cancella, non sposta e non invia** email; può solo mettere le etichette `Cartellina/…` (disattivabili con `METTI_ETICHETTE = false`). La versione 2 dello script permette di salvare gli allegati in Documenti: chi ha la versione 1 vede l'avviso per aggiornarla.

Se modifichi `js/classificatore.js`, rigenera lo script con `tools/build-gmail.sh`.

## Pubblicazione e aggiornamenti
GitHub Pages: Settings → Pages → branch `main`, cartella `/root`. A ogni rilascio aumenta la versione in `version.json` e in `data-version` di `index.html`: compare da solo il tasto **Aggiorna**. I dati della versione 1.x vengono trasferiti automaticamente al primo avvio.

## Struttura del codice
`js/core.js` (utilità, dati, navigazione) · `js/archivio.js` (IndexedDB, cifratura) · `js/classificatore.js` (classificazione e analisi email, condiviso con lo script Gmail) · `js/v-*.js` (una per sezione) · `js/ai.js` (assistente facoltativo) · `js/avvio.js` (sblocco, avvio, ponte con le altre app) · `vendor/pdfjs` (pdf.js 4.10, Apache 2.0, caricato solo quando serve).

## Collega le app (AgendApp · Smistino · Cartellina)
Invariato rispetto alla 1.1 (`js/ponte.js`, identico nelle tre app). Nota: i dati condivisi con le altre app non sono protetti dal PIN di Cartellina.
