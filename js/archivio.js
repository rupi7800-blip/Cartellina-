/* =========================================================
   Cartellina — archivio sicuro sul dispositivo
   - Dati e documenti in IndexedDB (niente limite dei 5 MB).
   - Con il PIN attivo tutto è cifrato con AES-GCM 256 bit;
     la chiave nasce dal PIN (PBKDF2-SHA256, 310.000 passaggi)
     e resta solo in memoria finché l'app è sbloccata.
   - Senza PIN i dati restano comunque solo su questo dispositivo.
   ========================================================= */
(function () {
  'use strict';
  var DB = 'cartellina', VER = 1, LOCK = 'cartellina.lock', OLD = 'cartellina.dati';
  var ITER = 310000;
  var db = null, chiave = null;
  var enc = new TextEncoder(), dec = new TextDecoder();

  function apri() {
    if (db) return Promise.resolve(db);
    return new Promise(function (ok, ko) {
      var r = indexedDB.open(DB, VER);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('stato')) d.createObjectStore('stato');
        if (!d.objectStoreNames.contains('file')) d.createObjectStore('file');
      };
      r.onsuccess = function () { db = r.result; ok(db); };
      r.onerror = function () { ko(r.error); };
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
  function infoLock() { try { return JSON.parse(localStorage.getItem(LOCK)); } catch (e) { return null; } }

  function pinAttivo() { return !!infoLock(); }
  function sbloccato() { return !pinAttivo() || !!chiave; }

  function sblocca(pin) {
    var L = infoLock(); if (!L) return Promise.resolve(true);
    return deriva(pin, unb64(L.salt)).then(function (k) {
      return decifra(k, { iv: unb64(L.v.iv), ct: unb64(L.v.ct) }).then(function (b) {
        if (dec.decode(b) !== 'cartellina-ok') return false;
        chiave = k; return true;
      });
    }).catch(function () { return false; });
  }

  // ---------- dati principali ----------
  function caricaDati() {
    return get('stato', 'dati').then(function (rec) {
      if (rec == null) {
        // primo avvio della nuova versione: porto qui i dati della 1.x (localStorage)
        var vecchi = null;
        try { vecchi = JSON.parse(localStorage.getItem(OLD)); } catch (e) { vecchi = null; }
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
  function scriviDati(obj) {
    if (chiave) return cifra(chiave, enc.encode(JSON.stringify(obj))).then(function (r) { return put('stato', 'dati', r); });
    return put('stato', 'dati', JSON.parse(JSON.stringify(obj)));
  }
  // salvataggio a raffica: scrive l'ultima versione, una alla volta
  var inAttesa = null, catena = Promise.resolve(), timer = null, errore = null;
  function salvaDati(obj) {
    inAttesa = obj;
    clearTimeout(timer);
    timer = setTimeout(flush, 120);
  }
  function flush() {
    clearTimeout(timer);
    if (!inAttesa) return catena;
    var o = inAttesa; inAttesa = null;
    catena = catena.then(function () { return scriviDati(o); }).then(function () { errore = null; }).catch(function (e) { errore = e; if (window.Archivio.onErrore) window.Archivio.onErrore(e); });
    return catena;
  }

  // ---------- documenti (file originali, mai modificati) ----------
  function salvaFile(id, blob) {
    if (!chiave) return put('file', id, blob);
    return blob.arrayBuffer().then(function (buf) { return cifra(chiave, buf); }).then(function (r) { r.mime = blob.type; return put('file', id, r); });
  }
  function leggiFile(id) {
    return get('file', id).then(function (r) {
      if (!r) return null;
      if (r.enc) { if (!chiave) throw new Error('bloccato'); return decifra(chiave, r).then(function (b) { return new Blob([b], { type: r.mime || '' }); }); }
      return r;
    });
  }
  function cancellaFile(id) { return del('file', id); }

  // ---------- PIN ----------
  function riscriviTutto(obj, nuovaChiave) {
    // decifra tutti i file con la chiave attuale e li riscrive con la nuova (o in chiaro)
    return chiavi('file').then(function (ids) {
      return ids.reduce(function (p, id) {
        return p.then(function () { return leggiFile(id); }).then(function (blob) {
          if (!blob) return;
          var vecchia = chiave; chiave = nuovaChiave;
          return salvaFile(id, blob).then(function () { chiave = vecchia; }, function (e) { chiave = vecchia; throw e; });
        });
      }, Promise.resolve());
    }).then(function () { chiave = nuovaChiave; return scriviDati(obj); });
  }
  function impostaPin(pin, obj) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    return deriva(pin, salt).then(function (k) {
      return cifra(k, enc.encode('cartellina-ok')).then(function (v) {
        return flush().then(function () { return riscriviTutto(obj, k); }).then(function () {
          localStorage.setItem(LOCK, JSON.stringify({ salt: b64(salt), v: { iv: b64(v.iv), ct: b64(v.ct) }, iter: ITER }));
        });
      });
    });
  }
  function togliPin(obj) {
    return flush().then(function () { return riscriviTutto(obj, null); }).then(function () { localStorage.removeItem(LOCK); });
  }
  function blocca() { chiave = null; }

  function cancellaTutto() {
    chiave = null;
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

  window.Archivio = {
    pinAttivo: pinAttivo, sbloccato: sbloccato, sblocca: sblocca, blocca: blocca,
    caricaDati: caricaDati, salvaDati: salvaDati, flush: flush, ultimoErrore: function () { return errore; },
    salvaFile: salvaFile, leggiFile: leggiFile, cancellaFile: cancellaFile, idFile: function () { return chiavi('file'); },
    impostaPin: impostaPin, togliPin: togliPin, cancellaTutto: cancellaTutto, impronta: impronta,
    b64: b64, unb64: unb64, onErrore: null
  };
})();
