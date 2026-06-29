/*!
 * audio-player.js – Morse code audio playback module
 * Part of Morse.js (https://github.com/phieri/Morse.js)
 *
 * Provides two playback modes:
 *   'web-audio' (default) – schedules tones directly via the Web Audio API.
 *   'wav-blob'  (fallback) – builds a PCM WAV file with ArrayBuffer/DataView
 *                            and plays it through a Blob URL; avoids the
 *                            deprecated escape() + btoa binary-string approach.
 *
 * Public API:
 *   playMorseSymbols(symbolString, options) → Promise<void>
 *   stopPlayback()
 *
 * Symbol-string format (same as the original emit() encoding):
 *   '.'  → dit  (1 unit tone + 1 unit silence)
 *   '_'  → dah  (3 unit tone + 1 unit silence)
 *   ' '  → inter-character gap (3 units silence)
 *   '|'  → inter-word gap      (7 units silence)
 *   any other character → treated as inter-character gap (3 units silence)
 *
 * Copyright (c) 2010–2012 Mattt Thompson
 *               2024–     Philip Eriksson
 * Licensed under the MIT license.
 */

/* global define, module */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MorseAudioPlayer = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis
  : typeof window    !== 'undefined' ? window : this,
function () {
  'use strict';

  // Detect Web Audio API (including webkit prefix for older Safari)
  const _AudioContext =
    typeof window !== 'undefined' &&
    (window.AudioContext || window.webkitAudioContext);

  // Module-level singletons – ensures a single audio controller per page
  let _context    = null;  // AudioContext instance
  let _currentGain = null; // active GainNode (web-audio mode)
  let _audioEl    = null;  // <audio> element (wav-blob mode)
  let _blobUrl    = null;  // active Blob URL (wav-blob mode)

  // ─── Web Audio API helpers ──────────────────────────────────────────────────

  function getAudioContext() {
    if (!_context && _AudioContext) {
      _context = new _AudioContext();
    }
    return _context;
  }

  function resolvePlaybackMode(modeOption) {
    if (modeOption === 'wav-blob') {
      return 'wav-blob';
    }
    if (modeOption === 'web-audio') {
      return 'web-audio';
    }
    return _AudioContext ? 'web-audio' : 'wav-blob';
  }

  function normalizeOptions(options) {
    const opts = options || {};
    const wpm = typeof opts.wpm === 'number' ? opts.wpm : 12;
    const unit = typeof opts.unit === 'number' ? opts.unit : (1.2 / wpm);
    const frequency = typeof opts.frequency === 'number' ? opts.frequency : 440;
    const volume = typeof opts.volume === 'number' ? opts.volume : 0.5;
    const sampleRate = typeof opts.sampleRate === 'number' ? opts.sampleRate : 8000;
    const mode = resolvePlaybackMode(opts.mode);

    return { wpm, unit, frequency, volume, sampleRate, mode };
  }

  function clampVolume(volume) {
    return Math.max(0, Math.min(1, volume));
  }

  /**
   * Schedule a sine-wave oscillator burst on the given destination node.
   *
   * @param {AudioContext} ctx
   * @param {AudioNode}    destination
   * @param {number}       frequency   Hz
   * @param {number}       startTime   AudioContext time (seconds)
   * @param {number}       duration    seconds
   */
  function scheduleOscillator(ctx, destination, frequency, startTime, duration) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Play a Morse symbol string using the Web Audio API.
   * Timing mirrors the original WAV-based generator exactly:
   *   dit  → tone(1u) + silence(1u)
   *   dah  → tone(3u) + silence(1u)
   *   ' '  → silence(3u)
   *   '|'  → silence(7u)
   *
   * @param {string} symbolString
   * @param {{ unit: number, frequency: number, volume: number }} opts
   * @returns {Promise<void>}
   */
  function playWithWebAudio(symbolString, opts) {
    const ctx       = getAudioContext();
    const { unit, frequency, volume } = opts;

    return new Promise((resolve) => {
      const gainNode = ctx.createGain();
      gainNode.gain.value = volume;
      gainNode.connect(ctx.destination);
      _currentGain = gainNode;

      // Add a small startup offset so the first oscillator isn't clipped
      let t = ctx.currentTime + 0.05;

      for (const ch of symbolString) {
        if (ch === '.') {
          scheduleOscillator(ctx, gainNode, frequency, t, unit);
          t += unit * 2;        // dit tone + inter-element silence
        } else if (ch === '_') {
          scheduleOscillator(ctx, gainNode, frequency, t, unit * 3);
          t += unit * 4;        // dah tone + inter-element silence
        } else if (ch === '|') {
          t += unit * 7;        // inter-word gap
        } else {
          t += unit * 3;        // inter-character gap (space / nbsp / other)
        }
      }

      const remaining = Math.max((t - ctx.currentTime) * 1000, 0);
      setTimeout(resolve, remaining);
    });
  }

  // ─── WAV Blob fallback helpers ──────────────────────────────────────────────

  /**
   * Build a 16-bit mono PCM WAV ArrayBuffer for the given symbol string.
   * Uses ArrayBuffer + DataView – no binary strings, no escape(), no btoa().
   *
   * @param {string} symbolString
   * @param {{ unit: number, frequency: number, volume: number, sampleRate: number }} opts
   * @returns {ArrayBuffer}
   */
  function buildWavBuffer(symbolString, opts) {
    const { unit, frequency, volume, sampleRate } = opts;
    const channels     = 1;
    const bitsPerSample = 16;
    const clampedVolume = clampVolume(volume);
    const maxAmp       = Math.round(clampedVolume * 32767);

    // Collect Int16Array PCM sections to avoid a large up-front allocation
    const sections = [];
    let totalSamples = 0;

    function makeTone(lengthUnits) {
      const n          = Math.round(sampleRate * unit * lengthUnits);
      const buf        = new Int16Array(n);
      const phaseStep  = 2 * Math.PI * frequency / sampleRate;
      for (let i = 0; i < n; i++) {
        buf[i] = Math.round(maxAmp * Math.sin(phaseStep * i));
      }
      sections.push(buf);
      totalSamples += n;
    }

    function makeSilence(lengthUnits) {
      const n = Math.round(sampleRate * unit * lengthUnits);
      sections.push(new Int16Array(n)); // zero-filled by default
      totalSamples += n;
    }

    for (const ch of symbolString) {
      if (ch === '|') {
        makeSilence(7);
      } else if (ch === '.') {
        makeTone(1);
        makeSilence(1);
      } else if (ch === '_') {
        makeTone(3);
        makeSilence(1);
      } else {
        makeSilence(3); // space / nbsp / any other character
      }
    }

    const byteRate   = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const dataBytes  = totalSamples * blockAlign;

    const ab   = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(ab);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    // RIFF header
    writeStr(0,  'RIFF');
    view.setUint32(4,  36 + dataBytes, true);
    writeStr(8,  'WAVE');
    // fmt sub-chunk
    writeStr(12, 'fmt ');
    view.setUint32(16, 16,            true); // sub-chunk size
    view.setUint16(20, 1,             true); // PCM format
    view.setUint16(22, channels,      true);
    view.setUint32(24, sampleRate,    true);
    view.setUint32(28, byteRate,      true);
    view.setUint16(32, blockAlign,    true);
    view.setUint16(34, bitsPerSample, true);
    // data sub-chunk
    writeStr(36, 'data');
    view.setUint32(40, dataBytes,     true);

    let offset = 44;
    for (const sec of sections) {
      for (let j = 0; j < sec.length; j++) {
        view.setInt16(offset, sec[j], true);
        offset += 2;
      }
    }

    return ab;
  }

  /**
   * Play a Morse symbol string via a WAV Blob URL and an <audio> element.
   *
   * @param {string} symbolString
   * @param {{ unit: number, frequency: number, volume: number, sampleRate: number }} opts
   * @returns {Promise<void>}
   */
  function playWithWavBlob(symbolString, opts) {
    return new Promise((resolve, reject) => {
      const ab   = buildWavBuffer(symbolString, opts);
      const blob = new Blob([ab], { type: 'audio/wav' });

      if (_blobUrl) {
        URL.revokeObjectURL(_blobUrl);
      }
      _blobUrl = URL.createObjectURL(blob);

      if (!_audioEl) {
        _audioEl = new Audio();
      }
      _audioEl.pause();
      _audioEl.src    = _blobUrl;
      _audioEl.onended = () => {
        if (_blobUrl) {
          URL.revokeObjectURL(_blobUrl);
          _blobUrl = null;
        }
        resolve();
      };
      _audioEl.onerror = reject;

      const p = _audioEl.play();
      if (p && typeof p.catch === 'function') {
        p.catch(reject);
      }
    });
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Play a Morse symbol string.
   * Uses the Web Audio API by default; falls back to a WAV Blob when
   * AudioContext is unavailable or `options.mode` is set to 'wav-blob'.
   *
   * @param {string}  symbolString          – Raw Morse symbol string
   * @param {Object}  [options]
   * @param {string}  [options.mode]        – 'web-audio' (default) | 'wav-blob'
   * @param {number}  [options.wpm=12]      – Words per minute
   * @param {number}  [options.frequency=440] – Tone frequency in Hz
   * @param {number}  [options.volume=0.5]  – Playback volume (0–1)
   * @param {number}  [options.sampleRate=8000] – Sample rate for WAV fallback
   * @returns {Promise<void>}               – Resolves when playback completes
   */
  function playMorseSymbols(symbolString, options) {
    stopPlayback();

    const opts = normalizeOptions(options);
    const { unit, frequency, volume, sampleRate, mode } = opts;
    const resolvedOpts = { unit, frequency, volume, sampleRate };

    if (mode === 'web-audio' && _AudioContext) {
      return playWithWebAudio(symbolString, resolvedOpts);
    }
    return playWithWavBlob(symbolString, resolvedOpts);
  }

  /**
   * Immediately stop any active Morse playback.
   */
  function stopPlayback() {
    if (_currentGain) {
      try { _currentGain.disconnect(); } catch (_e) { /* disconnect throws if already detached */ }
      _currentGain = null;
    }
    if (_audioEl) {
      _audioEl.pause();
      _audioEl.src = '';
    }
    if (_blobUrl) {
      URL.revokeObjectURL(_blobUrl);
      _blobUrl = null;
    }
  }

  return { playMorseSymbols, stopPlayback };
}));
