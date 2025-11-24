# Morse.js
## A jQuery Plugin that annotates text with Morse Code

Samuel F. B. Morse created a code for the electric telegraph in the early 1840s that allowed alphanumeric characters to be encoded into a sequence of short and long tones. It is still widely used among radio operators as a means of identifying themselves, as well as communicating messages over a channel too narrow or noisy for speech transmission.[<sup>1</sup>](http://en.wikipedia.org/wiki/Morse_code)

This plugin will transcribe the morse code for text in the selected elements. In browsers that support the [`<ruby>` HTML element](http://www.w3.org/TR/1998/WD-ruby-19981221/), the transcription will appear above the text. By default, clicking on these elements will play the corresponding audio for the transcription.

## Usage

Include jQuery and the Morse.js plugin in your HTML:

``` html
<script src="https://code.jquery.com/jquery-1.4.min.js"></script>
<script src="jquery.morse.js"></script>
```

Then apply the plugin to your text elements:

``` javascript
$("p").morseCode({wpm: 12});
```

### Options

- `wpm` - Rate at which the message is played (default: 12, where 1 unit = 100 ms)

### Events

In addition, there are two namespaced events that you can `trigger` and `bind` to:

- `morse.emit` - Generates and plays the tones for morse code elements
- `morse.mute` - Stops morse code tone sounds from `<audio>` elements

Example:

``` javascript
// Manually trigger morse code playback
$("p.morse-code").trigger("morse.emit");

// Stop playback
$("#morse-code-output").trigger("morse.mute");
```

## Requirements

- jQuery 1.7+ (compatible with jQuery 4.0+)

## Credit

JavaScript client-side WAV generation based on code by sk89q.

Thanks to [Justin Slepak](https://github.com/jrslepak) for adding support for punctuation characters.

[Mattt Thompson](https://github.com/mattt) for originally developing this library.

## License

Morse.js is available under the MIT license. See the LICENSE file for more info.
