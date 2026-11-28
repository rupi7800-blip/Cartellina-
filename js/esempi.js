/* Email di prova: servono a vedere Cartellina al lavoro prima di collegare Gmail */
var EMAIL_ESEMPIO = (function () {
  function tra(giorni) {
    var d = new Date(); d.setDate(d.getDate() + giorni);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }
  var oggi = new Date().toISOString();
  return [
    {
      id: 'demo-1', from: 'CUP ASST Valle Olona <noreply.cup@asst-valleolona.it>', date: oggi, labels: [], attachments: ['promemoria_prenotazione.pdf'],
      subject: 'Conferma prenotazione visita cardiologica',
      body: 'Gentile paziente,\nle confermiamo la prenotazione della Visita cardiologica con ECG per il giorno ' + tra(9) + ' alle ore 10:30 presso Ambulatorio di Cardiologia - Ospedale di Gallarate, Via Eusebio Pastori 4, 21013 Gallarate.\nCodice prenotazione: GA2026-77812\nSi presenti 15 minuti prima allo sportello accettazione con impegnativa, tessera sanitaria e documento di identità. Porti con sé gli esami precedenti e l\'elenco dei farmaci assunti.\nPer disdette chiamare il numero 0331 751111 almeno 3 giorni prima.\nCordiali saluti'
    },
    {
      id: 'demo-2', from: 'Centro Diagnostico Insubria <prenotazioni@diagnostica-insubria.it>', date: oggi, labels: [], attachments: [],
      subject: 'Promemoria: Risonanza magnetica',
      body: 'Buongiorno, le ricordiamo l\'appuntamento per RMN ginocchio destro senza mezzo di contrasto il ' + tra(4) + ' ore 15.45.\nIndirizzo: Viale Borri 120, Varese.\nPer informazioni: tel. 0332 123456 - segreteria@diagnostica-insubria.it\nNon è richiesto il digiuno.'
    },
    {
      id: 'demo-3', from: 'Laboratorio Analisi San Luca <info@lab-sanluca.it>', date: oggi, labels: [], attachments: ['referto_esami.pdf'],
      subject: 'I tuoi referti sono disponibili',
      body: 'Gentile utente, gli esiti degli esami del sangue (emocromo, PCR, VES, TSH) eseguiti il 03/11/2026 sono disponibili sul Fascicolo Sanitario Elettronico o scaricabili dal nostro sito con il codice ritiro. Laboratorio aperto dal lunedì al sabato.'
    },
    {
      id: 'demo-4', from: 'Dott.ssa Elena Rinaldi <elena.rinaldi.medico@gmail.com>', date: oggi, labels: [], attachments: [],
      subject: 'Re: ricetta',
      body: 'Buongiorno, le ho inviato la ricetta per il farmaco. NRE 030A01234567890. Il controllo lo facciamo tra un mese, mi chiami al 338 1234567 per fissare.'
    },
    {
      id: 'demo-5', from: 'Ospedale di Circolo - Chirurgia <chirurgia.varese@asst-settelaghi.it>', date: oggi, labels: [], attachments: [],
      subject: 'Convocazione pre-ricovero e intervento',
      body: 'Si comunica che il pre-ricovero è fissato per il ' + tra(14) + ' alle 8:00 presso Padiglione Michelangelo, piano 2. Presentarsi a digiuno con tutta la documentazione clinica. L\'intervento chirurgico è programmato per il ' + tra(21) + ' ore 7:30. Consenso informato da firmare in reparto.'
    },
    {
      id: 'demo-6', from: 'FarmaShop <news@farmashop-online.it>', date: oggi, labels: [], attachments: [],
      subject: 'Sconto del 30% su integratori e vitamine!',
      body: 'Solo per questa settimana offerta speciale su tutti gli integratori. Spedizione gratuita sopra 29€. Acquista ora! Se non vuoi più ricevere la newsletter clicca qui per disiscriviti.'
    },
    {
      id: 'demo-7', from: 'Amazon.it <conferma-spedizione@amazon.it>', date: oggi, labels: [], attachments: [],
      subject: 'Il tuo ordine è stato spedito',
      body: 'Il tuo ordine #402-1234 è in viaggio. Consegna prevista il ' + tra(2) + '.'
    },
    {
      id: 'demo-8', from: 'Marco <marco.b@gmail.com>', date: oggi, labels: [], attachments: [],
      subject: 'Come stai?',
      body: 'Ciao! Ho saputo della visita, come è andata? Se ti serve un passaggio per l\'ospedale dimmelo pure.'
    }
  ];
})();
if (typeof module !== 'undefined') module.exports = EMAIL_ESEMPIO;
