# Morse.js
## A jQuery Plugin that annotates text with Morse Code

Samuel F. B. Morse created a code for the electric telegraph in the early 1840s that allowed alphanumeric characters to be encoded into a sequence of short and long tones. It is still widely used among radio operators as a means of identifying themselves, as well as communicating messages over a channel too narrow or noisy for speech transmission.[<sup>1</sup>](http://en.wikipedia.org/wiki/Morse_code)

This plugin will transcribe the morse code for text in the selected elements. In browsers that support the [`<ruby>` HTML element](http://www.w3.org/TR/1998/WD-ruby-19981221/), the transcription will appear above the text. By default, clicking on these elements will play the corresponding audio for the transcription.

## Usage

### Browser (script tags)

Load `src/audio-player.js` first, then jQuery, then the plugin:

``` html
<script src="src/audio-player.js"></script>
<script src="https://code.jquery.com/jquery-3.7.min.js"></script>
<script src="jquery.morse.js"></script>
```

Then apply the plugin to your text elements:

``` javascript
$("p").morseCode({wpm: 12});
```

### AMD (RequireJS)

``` javascript
require(['jquery', 'src/audio-player', 'jquery.morse'], function ($) {
  $("p").morseCode({wpm: 12});
});
```

### CommonJS / bundlers (webpack, rollup, …)

``` javascript
const $ = require('jquery');
require('./jquery.morse'); // registers $.fn.morseCode
$("p").morseCode({wpm: 12});
```

You can also use the audio module independently:

``` javascript
const { playMorseSymbols, stopPlayback } = require('./src/audio-player');
playMorseSymbols('._  _...  ._. | ...').then(() => console.log('done'));
```

## Options

- `wpm` – Rate at which the message is played (default: `12`, where 1 dit unit ≈ 100 ms)
- `mode` – For the standalone audio module, choose `'web-audio'` (default) or `'wav-blob'`
- `frequency` – Tone frequency in Hz for the standalone audio module (default: `440`)
- `volume` – Playback volume for the standalone audio module (default: `0.5`)
- `sampleRate` – Sample rate used by the WAV fallback (default: `8000`)

When a new Morse playback request starts, any existing playback is stopped first so the latest request is the only audible one.

## Events

In addition, there are two namespaced events that you can `trigger` and `bind` to:

- `morse.emit` – Generates and plays the tones for Morse code elements
- `morse.mute` – Stops any active Morse audio playback

Example:

``` javascript
// Manually trigger Morse code playback
$("p.morse-code").trigger("morse.emit");

// Stop playback
$("#morse-code-output").trigger("morse.mute");
```

## Audio API (`src/audio-player.js`)

The audio module can be used standalone, independent of jQuery. It exposes a shared controller that stops any current playback before starting the next request:

``` javascript
// Play a Morse symbol string
const promise = MorseAudioPlayer.playMorseSymbols('._  _...', {
  mode:       'web-audio', // 'web-audio' (default) | 'wav-blob'
  wpm:        12,          // words per minute
  frequency:  440,         // tone frequency in Hz
  volume:     0.5,         // 0–1
  sampleRate: 8000         // for 'wav-blob' mode only
});
promise.then(() => console.log('playback complete'));

// Stop immediately
MorseAudioPlayer.stopPlayback();
```

### Playback modes

| Mode | Description |
|---|---|
| `'web-audio'` | *(default)* Uses the Web Audio API. Zero memory overhead; precise scheduling. |
| `'wav-blob'` | Builds a 16-bit PCM WAV file with `ArrayBuffer`/`DataView` and plays it via a Blob URL. Useful as an explicit fallback. |

The library automatically selects `'web-audio'` when `AudioContext` is available, and falls back to `'wav-blob'` otherwise.

## Requirements

- jQuery 1.7+ (compatible with jQuery 4.0+)

## Credit

Thanks to [Justin Slepak](https://github.com/jrslepak) for adding support for punctuation characters.

[Mattt Thompson](https://github.com/mattt) for originally developing this library.

## License

Morse.js is available under the MIT license. See the LICENSE file for more info.
