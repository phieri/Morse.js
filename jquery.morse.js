/*!
 * Morse.js
 * A jQuery Plugin that annotates text with Morse Code
 * https://github.com/phieri/Morse.js
 *
 * Copyright (c) 2010–2012 Mattt Thompson
 *               2024–     Philip Eriksson
 * Licensed under the MIT license.
 *
 * Supports UMD (AMD, CommonJS, browser global).
 * In a browser, load src/audio-player.js before this file, then jQuery.
 */

/* global define, module */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD – e.g. RequireJS
    define(['jquery', './src/audio-player'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS / Node.js bundler
    module.exports = factory(require('jquery'), require('./src/audio-player'));
  } else {
    // Browser global – expose as window.Morse for backwards compatibility
    root.Morse = factory(root.jQuery || root.$, root.MorseAudioPlayer);
  }
}(typeof globalThis !== 'undefined' ? globalThis
  : typeof window    !== 'undefined' ? window : this,
function ($, MorseAudioPlayer) {
  'use strict';

  const Morse = {
    wpm: 12,
    code: {
      "a": "._",    "b": "_...",  "c": "_._.",  "d": "_..",
      "e": ".",     "f": ".._.",  "g": "__.",   "h": "....",
      "i": "..",    "j": ".___",  "k": "_._",   "l": "._..",
      "m": "__",    "n": "_.",    "o": "___",   "p": ".__.",
      "q": "__._",  "r": "._.",   "s": "...",   "t": "_",
      "u": ".._",   "v": "..._",  "w": ".__",   "x": "_.._",
      "y": "_.__",  "z": "__..",  "å": ".__._", "ä": "._._",
      "ö": "___.",  " ": " ",

      "1": ".____", "2": "..___", "3": "...__", "4": "...._", "5": ".....",
      "6": "_....", "7": "__...", "8": "___..", "9": "____.", "0": "_____",

      /*
       * Note: Some operators prefer "!" as "___." and others as "_._.__"
       * ARRL message format has most punctuation spelled out, as many symbols'
       * encodings conflict with procedural signals (e.g. "=" and "BT").
       */
      ".": "._._._", ",": "__..__", "?": "..__..",  "'": ".____.",
      "/": "_.._.",  "(": "_.__.",  ")": "_.__._",  "&": "._...",
      ":": "___...", ";": "_._._.", "=": "_..._",   "+": "._._.",
      "-": "_...._", "_": "..__._", "\"": "._.._.", "$": "..._.._",
      "!": "_._.__", "@": ".__._."
    },

    annotate(el) {
      const $el     = $(el);
      // Filter out empty strings that result from leading/trailing whitespace
      const tokens  = $el.text().split(/\s+/).filter(Boolean);

      $el.text('');

      for (const token of tokens) {
        const symbols = [];

        for (const letter of token) {
          const symbol = Morse.code[letter.toLowerCase()];
          if (symbol) {
            symbols.push(symbol);
          }
        }

        // Create ruby element with proper text escaping
        const ruby = $('<ruby class="morse-code"></ruby>');
        ruby.append($('<rb></rb>').text(token));
        ruby.append($('<rt></rt>').text(symbols.join(' ') + '\u00A0'));
        $el.append(ruby);
      }

      // Ensure a single audio-controller placeholder exists per page
      $el.each(function () {
        if ($('#morse-code-output').length === 0) {
          // Keep a lightweight element with the well-known id so that existing
          // code triggering "morse.mute" on "#morse-code-output" keeps working.
          $('<span id="morse-code-output"></span>')
            .on('morse.mute', () => {
              if (MorseAudioPlayer) {
                MorseAudioPlayer.stopPlayback();
              }
            })
            .insertAfter($(this));
        }

        $(this)
          .on('morse.emit', Morse.emit)
          .on('click', function () { $(this).trigger('morse.emit'); });
      });
    },

    emit() {
      if (!MorseAudioPlayer) {
        console.warn('Morse.js: audio-player.js not loaded - audio playback unavailable.');
        return;
      }

      // Stop any in-progress playback and notify legacy listeners
      $('#morse-code-output').trigger('morse.mute');

      const symbols = [];
      $(this).find('rt').each(function () {
        symbols.push($(this).text());
      });

      // Delegate audio generation and playback entirely to MorseAudioPlayer.
      // Returns a Promise that resolves when playback finishes.
      return MorseAudioPlayer.playMorseSymbols(symbols.join('|'), { wpm: Morse.wpm });
    }
  };

  $.fn.extend({
    morseCode(options = {}) {
      if (options.wpm) {
        Morse.wpm = options.wpm;
      }
      return this.each(function () {
        Morse.annotate(this);
      });
    }
  });

  return Morse;
}));

