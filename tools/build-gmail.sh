#!/bin/sh
# Rigenera gmail/Codice.gs dopo ogni modifica a js/classificatore.js
cd "$(dirname "$0")/.."
{ cat tools/gmail-template.gs; grep -v "^if (typeof module" js/classificatore.js; } > gmail/Codice.gs
