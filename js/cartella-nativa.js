/* =========================================================
   Cartellina — cartella automatica nell'app Android
   Nel browser è l'utente a dover scegliere la cartella. Nell'app
   Android invece Cartellina crea da sola "Documenti/Cartellina"
   usando il plugin Filesystem di Capacitor.
   Questo file espone una piccola finestra con la stessa forma delle
   cartelle del browser (FileSystemDirectoryHandle), così js/cartella.js
   usa la stessa logica (cifratura col PIN, ripristino, stato visibile).
   Il percorso è sempre relativo a Documenti: nessuna scelta dell'utente.
   ========================================================= */
(function () {
  'use strict';
  var BASE = 'Cartellina', DIR = 'DOCUMENTS';
  var TAGLIO = 3 * 512 * 1024;   // 1,5 MB: multiplo di 3 byte, così i pezzi base64 si concatenano

  function FS() {
    try { return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem; }
    catch (e) { return null; }
  }
  function disponibile() { return !!FS(); }

  // errori del plugin → errori con i nomi usati nel browser (NotFoundError, NotAllowedError…)
  var CODICI = { 'OS-PLUG-FILE-0008': 'NotFoundError', 'OS-PLUG-FILE-0007': 'NotAllowedError', 'OS-PLUG-FILE-0010': 'AlreadyExists', 'OS-PLUG-FILE-0011': 'InvalidStateError' };
  function errore(e) {
    if (e && e.__cn) return e;
    var m = String((e && (e.message || e.errorMessage)) || e || 'errore');
    // il plugin dà un codice (es. OS-PLUG-FILE-0008): è più affidabile del testo, che contiene il percorso
    var n = (e && e.code && CODICI[e.code]) || (/not exist|no such|not found|doesn.?t exist|does not exist|ENOENT/i.test(m) ? 'NotFoundError'
      : /permission|denied|EACCES|EPERM|not allowed|read-only/i.test(m) ? 'NotAllowedError' : 'InvalidStateError');
    var x = new Error(m); x.name = n; x.__cn = true; return x;
  }
  function esisteGia(e) {
    if (!e) return false;
    if (e.name === 'AlreadyExists') return true;
    if (e.name === 'NotFoundError') return false;                 // "does not exist" non è "già esiste"
    return /already exists?/i.test(e.message);
  }
  var permessoChiesto = false;
  function chiama(metodo, opz) {
    var p = FS();
    if (!p || typeof p[metodo] !== 'function') return Promise.reject(errore(new Error('Filesystem non disponibile')));
    opz = Object.assign({ directory: DIR }, opz);
    return Promise.resolve().then(function () { return p[metodo](opz); }).catch(function (e) {
      var er = errore(e);
      // su alcune versioni di Android serve il permesso di scrittura: si chiede una sola volta e si riprova
      if (er.name === 'NotAllowedError' && !permessoChiesto && typeof p.requestPermissions === 'function') {
        permessoChiesto = true;
        return Promise.resolve(p.requestPermissions()).then(function () { return p[metodo](opz); }).catch(function (e2) { throw errore(e2); });
      }
      throw er;
    });
  }
  function join(a, b) { return a ? a + '/' + b : b; }
  function nomeDi(path) { return path.split('/').pop(); }

  function base64Di(blob) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () { var s = String(r.result); ok(s.slice(s.indexOf(',') + 1)); };
      r.onerror = function () { ko(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function byteDa64(b64) { var b = atob(b64), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

  // crea la cartella; se mkdir rifiuta ma la cartella c'è già (o non è "visibile" a mkdir) si controlla con stat
  function creaCartella(p) {
    return chiama('mkdir', { path: p, recursive: true }).catch(function (e) {
      if (esisteGia(e)) return;
      return chiama('stat', { path: p }).then(function (s) { if (!s || s.type !== 'directory') throw e; }, function () { throw e; });
    });
  }
  // scrive un file a pezzi (il ponte nativo non regge stringhe enormi)
  function scriviDiretto(path, blob) {
    if (!blob.size) return chiama('writeFile', { path: path, data: '', encoding: 'utf8' });
    var i = 0;
    function passo() {
      var fine = Math.min(i + TAGLIO, blob.size);
      return base64Di(blob.slice(i, fine)).then(function (b64) {
        var op = i === 0 ? chiama('writeFile', { path: path, data: b64 }) : chiama('appendFile', { path: path, data: b64 });
        return op.then(function () { i = fine; if (i < blob.size) return passo(); });
      });
    }
    return passo();
  }
  // scrittura "atomica": prima in un file provvisorio, poi lo si rinomina sull'originale; se l'app si chiude a metà
  // l'originale resta intatto. Se la rinomina non è possibile si scrive direttamente.
  function scriviBlob(path, blob) {
    var tmp = path + '.tmp';
    return scriviDiretto(tmp, blob).then(function () {
      return chiama('rename', { from: tmp, to: path }).catch(function () {
        return chiama('deleteFile', { path: tmp }).catch(function () {}).then(function () { return scriviDiretto(path, blob); });
      });
    }, function (e) {
      return chiama('deleteFile', { path: tmp }).catch(function () {}).then(function () { throw e; });
    });
  }
  // lettura: i file grandi si leggono a pezzi (un'unica stringa base64 sul ponte nativo può esaurire la memoria)
  var ATTESA_PEZZI = 30000;   // se per 30 secondi non arriva niente si lascia perdere e si legge il file intero
  function leggiAPezzi(path) {
    return new Promise(function (ok, ko) {
      var parti = [], fatto = false, t = null;
      function fine(f) { if (!fatto) { fatto = true; clearTimeout(t); f(); } }
      function riarma() { clearTimeout(t); t = setTimeout(function () { fine(function () { ko(errore(new Error('lettura a pezzi senza risposta'))); }); }, ATTESA_PEZZI); }
      riarma();
      try {
        var r = FS().readFileInChunks({ path: path, directory: DIR, chunkSize: TAGLIO }, function (chunk, err) {
          try {
            if (err) { fine(function () { ko(errore(err)); }); return; }
            var d = chunk && chunk.data;
            if (!d) { fine(function () { ok(parti); }); return; }          // pezzo vuoto = fine del file
            parti.push(byteDa64(String(d)));
            riarma();
          } catch (e) { fine(function () { ko(errore(e)); }); }
        });
        if (r && typeof r.catch === 'function') r.catch(function (e) { fine(function () { ko(errore(e)); }); });
      } catch (e) { fine(function () { ko(errore(e)); }); }
    });
  }
  function leggiIntero(path, nome) {
    return chiama('readFile', { path: path }).then(function (r) {
      var d = r && r.data;
      if (d && typeof d === 'object' && typeof d.arrayBuffer === 'function') return new File([d], nome);   // alcune versioni restituiscono un Blob
      return new File([byteDa64(String(d || ''))], nome);
    });
  }

  function Dir(path) { this.kind = 'directory'; this.path = path; this.name = nomeDi(path); }
  function Fil(path) { this.kind = 'file'; this.path = path; this.name = nomeDi(path); }
  function nonTrovato(p) { var x = new Error('non trovato: ' + p); x.name = 'NotFoundError'; x.__cn = true; return x; }
  function tipoSbagliato(p) { var x = new Error('tipo diverso da quello atteso: ' + p); x.name = 'TypeMismatchError'; x.__cn = true; return x; }

  Dir.prototype.getDirectoryHandle = function (nome, opz) {
    var p = join(this.path, nome);
    return chiama('stat', { path: p }).then(function (s) {
      if (s && s.type === 'directory') return new Dir(p);
      throw tipoSbagliato(p);
    }, function (e) {
      if (opz && opz.create) return creaCartella(p).then(function () { return new Dir(p); });
      throw e;
    });
  };
  Dir.prototype.getFileHandle = function (nome, opz) {
    var p = join(this.path, nome);
    return chiama('stat', { path: p }).then(function (s) {
      if (s && s.type === 'file') return new Fil(p);
      throw tipoSbagliato(p);
    }, function (e) {
      if (opz && opz.create && e.name === 'NotFoundError') return new Fil(p);   // il file nasce alla prima scrittura
      throw e;
    });
  };
  Dir.prototype.removeEntry = function (nome, opz) {
    var p = join(this.path, nome);
    return chiama('stat', { path: p }).then(function (s) {
      if (s && s.type === 'directory') return chiama('rmdir', { path: p, recursive: !!(opz && opz.recursive) });
      return chiama('deleteFile', { path: p });
    });
  };
  Dir.prototype.entries = async function* () {
    var r = await chiama('readdir', { path: this.path }), lista = (r && r.files) || [];
    for (var i = 0; i < lista.length; i++) {
      var f = lista[i], nome = typeof f === 'string' ? f : f.name, tipo = typeof f === 'string' ? null : f.type;
      if (!tipo) { try { tipo = (await chiama('stat', { path: join(this.path, nome) })).type; } catch (e) { continue; } }
      yield [nome, tipo === 'directory' ? new Dir(join(this.path, nome)) : new Fil(join(this.path, nome))];
    }
  };
  Dir.prototype.isSameEntry = function (altro) { return Promise.resolve(!!altro && altro.path === this.path); };
  Dir.prototype.queryPermission = function () { return Promise.resolve('granted'); };
  Dir.prototype.requestPermission = function () { return Promise.resolve('granted'); };

  Fil.prototype.getFile = function () {
    var path = this.path, nome = this.name, p = FS();
    return chiama('stat', { path: path }).then(function (s) { return (s && +s.size) || 0; }, function () { return 0; }).then(function (size) {
      if (size > TAGLIO * 4 && p && typeof p.readFileInChunks === 'function') {
        return leggiAPezzi(path).then(function (parti) { return new File(parti, nome); }, function () { return leggiIntero(path, nome); });
      }
      return leggiIntero(path, nome);
    });
  };
  Fil.prototype.createWritable = function () {
    var path = this.path, parti = [];
    return Promise.resolve({
      write: function (d) { parti.push(d instanceof Blob ? d : new Blob([d])); return Promise.resolve(); },
      close: function () { return scriviBlob(path, new Blob(parti)); },
      abort: function () { parti = []; return Promise.resolve(); }
    });
  };

  // crea (se manca) Documenti/Cartellina e restituisce la cartella
  function radice() { return creaCartella(BASE).then(function () { return new Dir(BASE); }); }

  window.CartellaNativa = { disponibile: disponibile, radice: radice, percorso: 'Documenti/' + BASE };
})();
