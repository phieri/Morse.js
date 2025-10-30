/*
 * Morse.js
 * A jQuery Plugin that annotates text with Morse Code
 * http://github.com/mattt/Morse.js
 *
 * Copyright (c) 2010-2012 Mattt Thompson
 *               2024- Philip Eriksson
 * Licensed under the MIT license.
 */

(function($){
  'use strict';
  window.Morse = {
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
      const $el = $(el);
      const tokens = $el.text().split(/\s+/);

      $el.text('');

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const letters = token.split('');
        const symbols = [];

        for (let j = 0; j < letters.length; j++) {
          const letter = letters[j];
          const symbol = Morse.code[letter.toLowerCase()];
          if (symbol) {
            symbols.push(symbol);
          }
        }

        $el.append(`<ruby class="morse-code"><rb>${token}</rb><rt>${symbols.join(' ')}&nbsp;</rt></ruby>`);
      }

      $el.each(function() {
        if ($("#morse-code-output")[0] === undefined) {
          const audio = $('<audio id="morse-code-output"></audio>').bind("morse.mute", function(){this.pause();});
          $(this).after(audio);
        }

        $(this).bind('morse.emit', Morse.emit).bind('click', function(){ $(this).trigger("morse.emit"); });
      });
    },

    emit() {
      const symbols = [];
      
      $("#morse-code-output").trigger("morse.mute").attr('src', "");
      
      $(this).find("rt").each(function() {
        symbols.push($(this).text());
      });

      /**
       * Javascript WAV generation based on code by sk89q (http://sk89q.therisenrealm.com/)
       */
      const generate = (symbols, opts) => {
        const defaults = {
          channels: 1,
          sampleRate: 1012,
          bitDepth: 16,
          unit: 0.100,
          frequency: 440.0,
          volume: 32767
        };

        const options = $.extend(defaults, opts);

        const channels      = options.channels;
        const sampleRate    = options.sampleRate;
        const bitsPerSample = options.bitDepth;
        const unit          = options.unit;
        const frequency     = options.frequency;
        const volume        = options.volume;

        const data = [];
        let samples = 0;

        const tone = (length) => {
          for (let i = 0; i < sampleRate * unit * length; i++) {
            for (let c = 0; c < channels; c++) {
              const v = volume * Math.sin((2 * Math.PI) * (i / sampleRate) * frequency);
              data.push(pack("v", v)); 
              samples++;
            }
          }
        };

        const silence = (length) => {
          for (let i = 0; i < sampleRate * unit * length; i++) {
            for (let c = 0; c < channels; c++) {
              data.push(pack("v", 0)); 
              samples++;
            }
          }
        };

        for (let i = 0; i < symbols.length; i++) {
          const symbol = symbols[i];
          if (symbol === '|') {
            silence(7);
          } else {
            if (symbol === '.') {
              tone(1);
              silence(1);
            } else if (symbol === '_') {
              tone(3);
              silence(1);
            } else {
              silence(3);
            }
          }
        }

        const dataStr = data.join('');

        // Format sub-chunk
        const chunk1 = [
            "fmt ", // Sub-chunk identifier
            pack("V", 16), // Chunk length
            pack("v", 1), // Audio format (1 is linear quantization)
            pack("v", channels),
            pack("V", sampleRate),
            pack("V", sampleRate * channels * bitsPerSample / 8), // Byte rate
            pack("v", channels * bitsPerSample / 8),
            pack("v", bitsPerSample)
        ].join('');

        // Data sub-chunk (contains the sound)
        const chunk2 = [
            "data", // Sub-chunk identifier
            pack("V", samples * channels * bitsPerSample / 8), // Chunk length
            dataStr
        ].join('');

        // Header
        const header = [
            "RIFF",
            pack("V", 4 + (8 + chunk1.length) + (8 + chunk2.length)), // Length
            "WAVE"
        ].join('');

        return "data:audio/wav;base64," + escape(btoa([header, chunk1, chunk2].join('')));
      };

      // pack() emulation (from the PHP version), for binary crunching
      const pack = function(e) {
        let b = "";
        let c = 1;
        for (let d = 0; d < e.length; d++) {
          const f = e.charAt(d);
          const a = arguments[c];
          c++;
          switch(f) {
            case "a":
              b += a[0] + "\u0000";
              break;
            case "A":
              b += a[0] + " ";
              break;
            case "C":
            case "c":
              b += String.fromCharCode(a);
              break;
            case "n":
              b += String.fromCharCode(a >> 8 & 255, a & 255);
              break;
            case "v":
              b += String.fromCharCode(a & 255, a >> 8 & 255);
              break;
            case "N":
              b += String.fromCharCode(a >> 24 & 255, a >> 16 & 255, a >> 8 & 255, a & 255);
              break;
            case "V":
              b += String.fromCharCode(a & 255, a >> 8 & 255, a >> 16 & 255, a >> 24 & 255);
              break;
            case "x":
              c--;
              b += "\u0000";
              break;
            default:
              throw new Error(`Unknown pack format character '${f}'`);
          }
        }
        return b;
      };

      $("#morse-code-output").attr('src', generate(symbols.join('|'), {unit: 1.200 / Morse.wpm}))[0].play();
    }
  };

  $.fn.extend({
    morseCode(options = {}) {
      if (options.wpm) {
        Morse.wpm = options.wpm;
      }
      return this.each(function(){
        Morse.annotate(this);
      });
    }
  });
})(jQuery);
