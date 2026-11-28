/* =========================================================
   Cartellina — archivio sicuro sul dispositivo, a profili
   - Più profili sullo stesso telefono: ognuno ha dati, documenti,
     PIN e chiavi proprie (chiavi IndexedDB con prefisso del profilo).
   - Dati e documenti in IndexedDB (niente limite dei 5 MB).
   - Con il PIN attivo tutto è cifrato con AES-GCM 256 bit;
     la chiave nasce dal PIN (PBKDF2-SHA256, 310.000 passaggi)
     e resta solo in memoria finché il profilo è sbloccato.
   - L'elenco dei profili (solo nomi) sta in localStorage, in chiaro.
   ========================================================= */
(function () {
  'use strict';
  var DB = 'cartellina', VER = 2, LOCK = 'cartellina.lock', META = 'cartellina.profili', OLD = 'cartellina.dati';
  var ITER = 310000;
  var db = null, chiave = null, pid = null, M = null;
  var enc = new TextEncoder(), dec = new TextDecoder();

  function apri() {
    if (db) return Promise.resolve(db);
    return new Promise(function (ok, ko) {
      var r = indexedDB.open(DB, VER);
      r.onupgradeneeded = function () {
        var d = r.result;
        ['stato', 'file', 'cartella'].forEach(function (s) { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); });
      };
      r.onsuccess = function () { db = r.result; db.onversionchange = function () { db.close(); db = null; }; ok(db); };
      r.onerror = function () { ko(r.error); };
      r.onblocked = function () { if (window.CA && CA.toast) CA.toast('Chiudi le altre schede di Cartellina rimaste aperte per completare l\'aggiornamento.', 8000); };
    });
  }
  function tx(store, modo, fn) {
    return apri().then(function (d) {
      return new Promise(function (ok, ko) {
        var t = d.transaction(store, modo), s = t.objectStore(store), out;
        var req = fn(s);
        if (req) req.onsuccess = function () { out = req.result; };
        t.oncomplete = function () { ok(out); };
        t.onerror = t.onabort = function () { ko(t.error || new Error('Errore archivio')); };
      });
    });
  }
  var get = function (store, k) { return tx(store, 'readonly', function (s) { return s.get(k); }); };
  var put = function (store, k, v) { return tx(store, 'readwrite', function (s) { s.put(v, k); }); };
  var del = function (store, k) { return tx(store, 'readwrite', function (s) { s.delete(k); }); };
  var chiavi = function (store) { return tx(store, 'readonly', function (s) { return s.getAllKeys(); }); };

  // ---------- crittografia ----------
  function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function deriva(pin, salt) {
    return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function cifra(k, dati) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, dati).then(function (ct) { return { enc: 1, iv: iv, ct: ct }; });
  }
  function decifra(k, rec) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: rec.iv }, k, rec.ct); }

  // ---------- elenco dei profili ----------
  function leggiMeta() { try { var m = JSON.parse(localStorage.getItem(META)); return m && m.lista ? m : null; } catch (e) { return null; } }
  function scriviMeta() { localStorage.setItem(META, JSON.stringify(M)); }

  // Migrazione dalla versione con un solo profilo: si COPIA, si verifica, si segna come fatta
  // e solo dopo si cancella il vecchio. Se si interrompe, riparte da sola senza perdere nulla.
  function migraLegacy() {
    var lk = localStorage.getItem(LOCK);
    if (lk) localStorage.setItem(LOCK + '.p1', lk);
    return get('stato', 'dati').then(function (rec) {
      if (rec == null) return;
      return put('stato', 'dati:p1', rec);
    }).then(function () { return chiavi('file'); }).then(function (ks) {
      var vecchi = ks.filter(function (k) { return String(k).indexOf('/') < 0; });
      return vecchi.reduce(function (p, k) {
        return p.then(function () { return get('file', k); }).then(function (v) { if (v != null) return put('file', 'p1/' + k, v); });
      }, Promise.resolve()).then(function () { return vecchi; });
    }).then(function (vecchi) {
      return chiavi('file').then(function (ks) {
        var set = {}; ks.forEach(function (k) { set[k] = 1; });
        var mancano = vecchi.filter(function (k) { return !set['p1/' + k]; });
        if (mancano.length) throw new Error('migrazione incompleta: ' + mancano.length + ' file non copiati');
      });
    });
  }
  // dopo la migrazione: tolgo i vecchi (solo se i nuovi esistono davvero)
  function pulisciLegacy() {
    return get('stato', 'dati').then(function (vecchio) {
      if (vecchio == null) return null;
      return get('stato', 'dati:p1').then(function (nuovo) { if (nuovo != null) return del('stato', 'dati'); });
    }).then(function () { return chiavi('file'); }).then(function (ks) {
      var set = {}; ks.forEach(function (k) { set[k] = 1; });
      return ks.filter(function (k) { return String(k).indexOf('/') < 0 && set['p1/' + k]; }).reduce(function (p, k) { return p.then(function () { return del('file', k); }); }, Promise.resolve());
    }).then(function () { if (localStorage.getItem(LOCK + '.p1')) localStorage.removeItem(LOCK); });
  }
  // Le informazioni del PIN stanno anche in IndexedDB ('lock:<profilo>'), scritte nella stessa transazione dei dati.
  // Se il telefono ha chiuso l'app a metà di un cambio PIN, all'avvio vale la versione di IndexedDB.
  function riconciliaLock() {
    return M.lista.reduce(function (p, pr) {
      return p.then(function () { return get('stato', 'lock:' + pr.id); }).then(function (r) {
        if (r == null) return;
        if (r.none) localStorage.removeItem(lockKey(pr.id)); else localStorage.setItem(lockKey(pr.id), JSON.stringify(r.info));
      });
    }, Promise.resolve());
  }
  function inizializza() {
    M = leggiMeta();
    if (M) return pulisciLegacy().catch(function () { /* resta, non è grave */ }).then(riconciliaLock).then(function () { return M; });
    return get('stato', 'dati').then(function (rec) {
      var legacy = rec != null || !!localStorage.getItem(LOCK) || !!localStorage.getItem(OLD);
      M = { v: 1, lista: [{ id: 'p1', nome: 'Io', dir: '', creato: Date.now() }], ponte: 'p1' };
      if (!legacy) { scriviMeta(); return M; }
      return migraLegacy().then(function () { scriviMeta(); return pulisciLegacy().catch(function () {}); }).then(function () { return M; });
    });
  }
  function chiediPersistenza() { try { if (navigator.storage && navigator.storage.persist) return navigator.storage.persist().catch(function () { return false; }); } catch (e) { /* no */ } return Promise.resolve(false); }

  function lista() { return M ? M.lista.map(function (p) { return Object.assign({}, p); }) : []; }
  function profilo(id) { return M.lista.filter(function (p) { return p.id === (id || pid); })[0]; }
  function lockKey(id) { return LOCK + '.' + (id || pid); }
  function infoLock(id) { try { return JSON.parse(localStorage.getItem(lockKey(id))); } catch (e) { return null; } }
  function pinAttivo(id) { return !!infoLock(id); }
  function sbloccato() { return !pinAttivo() || !!chiave; }
  function apriProfilo(id) { pid = id; chiave = null; inAttesa = null; }
  function nuovoProfilo(nome) {
    var id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
    M.lista.push({ id: id, nome: String(nome || '').trim().slice(0, 30) || 'Profilo', dir: '', creato: Date.now() }); scriviMeta(); return id;
  }
  function campoProfilo(id, k, v) { var p = profilo(id); if (!p) return; if (k === 'nome') v = String(v || '').trim().slice(0, 30) || p.nome; p[k] = v; scriviMeta(); }
  function ponteProfilo(v) { if (v === undefined) return M.ponte || ''; M.ponte = v; scriviMeta(); }

  // ---------- dati principali del profilo aperto ----------
  function caricaDati() {
    var id = pid;
    return get('stato', 'dati:' + id).then(function (rec) {
      if (rec == null) {
        // dati della versione 1.x (localStorage): solo per il primo profilo
        var vecchi = null;
        if (id === 'p1') { try { vecchi = JSON.parse(localStorage.getItem(OLD)); } catch (e) { vecchi = null; } }
        if (vecchi) return scriviDati(vecchi).then(function () { localStorage.removeItem(OLD); return vecchi; });
        return null;
      }
      if (rec.enc) {
        if (!chiave) throw new Error('bloccato');
        return decifra(chiave, rec).then(function (b) { return JSON.parse(dec.decode(b)); });
      }
      return rec;
    });
  }
  function scriviDati(obj, id) {
    id = id || pid;
    // un profilo con il PIN che nel frattempo si è bloccato non deve mai ricevere scritture in chiaro
    if (!chiave && infoLock(id)) return Promise.reject(new Error('profilo bloccato: salvataggio annullato'));
    if (chiave) return cifra(chiave, enc.encode(JSON.stringify(obj))).then(function (r) { return put('stato', 'dati:' + id, r); });
    return put('stato', 'dati:' + id, JSON.parse(JSON.stringify(obj)));
  }
  // salvataggio a raffica: scrive l'ultima versione, una alla volta
  var inAttesa = null, catena = Promise.resolve(), timer = null, errore = null;
  function salvaDati(obj) { inAttesa = { p: pid, o: obj }; clearTimeout(timer); timer = setTimeout(flush, 120); }
  function flush() {
    clearTimeout(timer);
    if (!inAttesa) return catena;
    var x = inAttesa; inAttesa = null;
    catena = catena.then(function () { return scriviDati(x.o, x.p); }).then(function () { errore = null; }).catch(function (e) { errore = e; if (window.Archivio.onErrore) window.Archivio.onErrore(e); });
    return catena;
  }

  // ---------- documenti (file originali, mai modificati) ----------
  // Coda unica: scritture dei dati, operazioni sui file e cambio del PIN si eseguono una dopo l'altra,
  // così nessuna scrittura può usare la chiave vecchia mentre il PIN sta cambiando.
  function accoda(fn) { var p = catena.then(fn); catena = p.then(function () {}, function () {}); return p; }
  function kf(id) { return pid + '/' + id; }
  function salvaFile(id, blob) { return accoda(function () { return salvaFileRaw(id, blob); }); }
  function leggiFile(id) { return accoda(function () { return leggiFileRaw(id); }); }
  function cancellaFile(id) { return accoda(function () { return del('file', kf(id)); }); }
  function salvaFileRaw(id, blob) {
    if (!chiave && infoLock()) return Promise.reject(new Error('profilo bloccato: file non salvato'));
    if (!chiave) return put('file', kf(id), blob);
    return blob.arrayBuffer().then(function (buf) { return cifra(chiave, buf); }).then(function (r) { r.mime = blob.type; return put('file', kf(id), r); });
  }
  function leggiFileRaw(id) {
    return get('file', kf(id)).then(function (r) {
      if (!r) return null;
      if (r.enc) { if (!chiave) throw new Error('bloccato'); return decifra(chiave, r).then(function (b) { return new Blob([b], { type: r.mime || '' }); }); }
      return r;
    });
  }
  function idFile() { return chiavi('file').then(function (ks) { return ks.filter(function (k) { return String(k).indexOf(pid + '/') === 0 && !/~n$/.test(k); }).map(function (k) { return String(k).slice(pid.length + 1); }); }); }

  // ---------- PIN ----------
  // Cambio di chiave in due tempi: prima si preparano TUTTI i file nuovi in chiavi provvisorie ('~n'),
  // poi si sostituiscono. Se qualcosa va storto nella prima fase, i file vecchi sono intatti.
  function registra(blob, k) {
    if (!k) return Promise.resolve(blob);
    return blob.arrayBuffer().then(function (b) { return cifra(k, b); }).then(function (r) { r.mime = blob.type; return r; });
  }
  function riscriviTutto(obj, nuovaChiave, lockInfo) { return accoda(function () { return riscriviInterno(obj, nuovaChiave, lockInfo); }); }
  function riscriviInterno(obj, nuovaChiave, lockInfo) {
    var temp = [], pidX = pid, kfx = function (id) { return pidX + '/' + id; };
    return chiavi('file').then(function (ks) {
      return ks.filter(function (k) { return String(k).indexOf(pidX + '/') === 0 && /~n$/.test(k); }).reduce(function (p, k) { return p.then(function () { return del('file', k); }); }, Promise.resolve());
    }).then(function () { return chiavi('file'); }).then(function (ks) {
      var ids = ks.filter(function (k) { return String(k).indexOf(pidX + '/') === 0 && !/~n$/.test(k); }).map(function (k) { return String(k).slice(pidX.length + 1); });
      return ids.reduce(function (p, id) {
        return p.then(function () { return get('file', kfx(id)); }).then(function (r) {
          if (!r) return null;
          if (r.enc) { if (!chiave) throw new Error('bloccato'); return decifra(chiave, r).then(function (b) { return new Blob([b], { type: r.mime || '' }); }); }
          return r;
        }).then(function (blob) {
          if (!blob) return;
          return registra(blob, nuovaChiave).then(function (rec) { temp.push(id); return put('file', kfx(id) + '~n', rec); });
        });
      }, Promise.resolve());
    }).then(function () {
      // dati nuovi preparati prima della transazione (la cifratura è asincrona e non può stare dentro)
      var json = JSON.stringify(obj);
      return nuovaChiave ? cifra(nuovaChiave, enc.encode(json)) : JSON.parse(json);
    }).then(function (datiRec) {
      // UNA sola transazione: file nuovi + dati + informazioni del PIN. O tutto o niente, anche se l'app viene chiusa a metà.
      return apri().then(function (d) {
        return new Promise(function (ok, ko) {
          var t = d.transaction(['file', 'stato'], 'readwrite'), f = t.objectStore('file'), s = t.objectStore('stato');
          temp.forEach(function (id) {
            var rq = f.get(kfx(id) + '~n');
            rq.onsuccess = function () { if (rq.result != null) { f.put(rq.result, kfx(id)); f.delete(kfx(id) + '~n'); } };
          });
          s.put(datiRec, 'dati:' + pidX);
          s.put(lockInfo ? { info: lockInfo } : { none: true }, 'lock:' + pidX);
          t.oncomplete = function () { ok(); };
          t.onerror = t.onabort = function () { ko(t.error || new Error('Errore archivio')); };
        });
      });
    }).then(function () {
      chiave = nuovaChiave;
      if (lockInfo) localStorage.setItem(lockKey(pidX), JSON.stringify(lockInfo)); else localStorage.removeItem(lockKey(pidX));
    });
  }
  function impostaPin(pin, obj) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    return deriva(pin, salt).then(function (k) {
      return cifra(k, enc.encode('cartellina-ok')).then(function (v) {
        return flush().then(function () { return riscriviTutto(obj, k, { salt: b64(salt), v: { iv: b64(v.iv), ct: b64(v.ct) }, iter: ITER }); });
      });
    });
  }
  function sblocca(pin) {
    var L = infoLock(); if (!L) return Promise.resolve(true);
    return deriva(pin, unb64(L.salt)).then(function (k) {
      return decifra(k, { iv: unb64(L.v.iv), ct: unb64(L.v.ct) }).then(function (b) {
        if (dec.decode(b) !== 'cartellina-ok') return false;
        chiave = k; return true;
      });
    }).catch(function () { return false; });
  }
  function togliPin(obj) { return flush().then(function () { return riscriviTutto(obj, null, null); }); }
  function blocca() { chiave = null; }

  // ---------- eliminazione ----------
  function eliminaProfilo(id) {
    if (inAttesa && inAttesa.p === id) inAttesa = null;
    return catena.then(function () { return chiavi('file'); }).then(function (ks) {
      return ks.filter(function (k) { return String(k).indexOf(id + '/') === 0; }).reduce(function (p, k) { return p.then(function () { return del('file', k); }); }, Promise.resolve());
    }).then(function () { return del('stato', 'dati:' + id); }).then(function () { return del('stato', 'lock:' + id); }).then(function () {
      localStorage.removeItem(lockKey(id));
      M.lista = M.lista.filter(function (p) { return p.id !== id; });
      if (M.ponte === id) M.ponte = '';
      scriviMeta();
      if (pid === id) { pid = null; chiave = null; inAttesa = null; }
    });
  }
  function cancellaTutto() {
    chiave = null; inAttesa = null;
    if (db) { db.close(); db = null; }
    return new Promise(function (ok) {
      var r = indexedDB.deleteDatabase(DB);
      r.onsuccess = r.onerror = r.onblocked = function () { ok(); };
    }).then(function () {
      Object.keys(localStorage).forEach(function (k) {
        if (/^cartellina\./.test(k) || /^ponte\.v1\.(imp|pkt)\.cartellina$/.test(k)) localStorage.removeItem(k);
      });
      return window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^cartellina/.test(k); }).map(function (k) { return caches.delete(k); })); }) : null;
    });
  }
  function impronta(blob) {
    return blob.arrayBuffer().then(function (b) { return crypto.subtle.digest('SHA-256', b); }).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }

  // ---------- supporto per la cartella sul telefono ----------
  function cifraBytes(buf) {
    if (!chiave) return Promise.resolve(null);
    return cifra(chiave, buf).then(function (r) { var o = new Uint8Array(12 + r.ct.byteLength); o.set(r.iv, 0); o.set(new Uint8Array(r.ct), 12); return o; });
  }
  // ripristino di un profilo da una cartella (i dati cifrati restano cifrati: servirà il PIN)
  var grezzo = {
    putDati: function (id, rec) { return put('stato', 'dati:' + id, rec); },
    putFile: function (id, fid, rec) { return put('file', id + '/' + fid, rec); },
    setLock: function (id, info) {
      var o = typeof info === 'string' ? JSON.parse(info) : info;
      localStorage.setItem(lockKey(id), JSON.stringify(o));
      return put('stato', 'lock:' + id, { info: o });
    }
  };

  window.Archivio = {
    inizializza: inizializza, chiediPersistenza: chiediPersistenza,
    lista: lista, profilo: profilo, apriProfilo: apriProfilo, corrente: function () { return pid; }, nuovoProfilo: nuovoProfilo,
    campoProfilo: campoProfilo, ponteProfilo: ponteProfilo, eliminaProfilo: eliminaProfilo,
    pinAttivo: pinAttivo, infoLock: infoLock, sbloccato: sbloccato, sblocca: sblocca, blocca: blocca,
    caricaDati: caricaDati, salvaDati: salvaDati, flush: flush, ultimoErrore: function () { return errore; },
    salvaFile: salvaFile, leggiFile: leggiFile, cancellaFile: cancellaFile, idFile: idFile,
    impostaPin: impostaPin, togliPin: togliPin, cancellaTutto: cancellaTutto, impronta: impronta,
    cifraBytes: cifraBytes, grezzo: grezzo,
    impGet: function (k) { return get('cartella', k); }, impPut: function (k, v) { return put('cartella', k, v); }, impDel: function (k) { return del('cartella', k); },
    b64: b64, unb64: unb64, onErrore: null
  };
})();
