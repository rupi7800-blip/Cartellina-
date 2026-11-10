# Cartellina 📁🩹

La burocrazia della malattia, semplice. Web app (PWA) per chi è malato e per chi lo assiste.

## Cosa fa
- **Email sanitarie automatiche** — uno script sul tuo Gmail controlla le email ogni 5 minuti; Cartellina le smista in *Sanitarie*, *Da verificare*, *Non sanitarie*. Nessuna email viene persa: quelle in dubbio te le chiede, e ogni tua conferma insegna il mittente.
- **Agenda** — visite, esami, diagnostica, interventi, ricoveri: segnati da soli dalle email (giorno, ora, luogo, cosa portare) o inseriti a mano. Promemoria il giorno prima e 2 ore prima. Esportazione nel calendario del telefono (.ics).
- **Rubrica** — medici, ospedali, centri esami: aggiunti dalle email o a mano, con tasti Chiama, WhatsApp, Mail, Percorso.
- **Farmaci** — come, quando, quanto; allarme a **schermo intero** (predefinito), notifica o banner; "Presa / Rimanda / Salta"; scorte con avviso.
- **Cosa significa?** — glossario integrato (~130 voci di medicina e burocrazia) + Wikipedia e codici ICD-10 (NIH) + link a MSD, ISSalute, AIFA. "Spiegami un referto": evidenzia le parole difficili.
- **Trasporto e aiuto** — 112, 118, 116117; ricerca di ambulanze e associazioni di trasporto vicino a te (OpenStreetMap); indicazioni su ASL e servizi sociali.

## Pubblicazione su GitHub Pages
Carica tutti i file nel repository mantenendo le cartelle (`css/`, `js/`, `icons/`, `gmail/`). Settings → Pages → branch `main`, cartella `/root`.

## Aggiornamenti
Ad ogni modifica aumenta la versione in **due punti**: `version.json` e `data-version` in `index.html`. Il tasto **Aggiorna** compare da solo.

Se modifichi `js/classificatore.js`, rigenera lo script Gmail con `tools/build-gmail.sh`.

## Privacy
I dati restano sul telefono (localStorage). Le email sono lette dal tuo account Google tramite uno script tuo: nessun server esterno.

## Collega le app (AgendApp · Smistino · Cartellina)

Dal tasto con i tre pallini collegati in alto (o da "Collega le app") le tre app lavorano insieme:

- **Smistino → AgendApp**: scadenze, pagamenti e appuntamenti trovati nei messaggi vanno in agenda; se li segni fatti in AgendApp, risultano fatti anche in Smistino.
- **Cartellina → AgendApp**: visite, esami e interventi vanno in agenda. **AgendApp → Cartellina**: gli impegni dell'area Salute arrivano in Cartellina.
- **Smistino → Cartellina**: le email e i messaggi della sezione Salute (e quelli mandati col tasto "Manda a Cartellina") vengono letti da Cartellina. **Cartellina → Smistino**: medici e ospedali della rubrica finiscono sempre in Salute.

Modalità **automatica** (a ogni modifica e all'apertura) o **manuale** (tasto "Condividi e ricevi ora").
Le app stanno sullo stesso indirizzo `utente.github.io`, quindi sullo stesso telefono si scambiano i dati senza server (file `js/ponte.js`, identico nelle tre app).
Su un altro dispositivo, o su iPhone (dove ogni app sulla Home ha il suo salvataggio separato), si usa **Esporta / Importa pacchetto**.
