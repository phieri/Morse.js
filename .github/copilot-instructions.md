# Copilot Instructions for Morse.js

## Repository Summary

Morse.js is a jQuery plugin that annotates text with Morse Code. It transcribes text to Morse code notation and can play audio representations of the code. The plugin uses HTML5 `<ruby>` elements for displaying Morse code annotations above text and generates WAV audio files client-side for playback.

**Repository Characteristics:**
- **Type:** jQuery plugin library (single-file JavaScript)
- **Size:** ~200KB total, 3 source files
- **Language:** JavaScript (ES5)
- **Dependencies:** jQuery 1.4+ (external dependency, not bundled)
- **Target Runtime:** Web browsers with HTML5 audio support

## Repository Structure

### File Layout
```
/
├── LICENSE                  # MIT License
├── README.markdown          # Documentation and usage examples
└── jquery.morse.js          # Main plugin file (183 lines)
```

**Key Source File:** `jquery.morse.js` - The single, complete implementation of the plugin containing:
- Morse code character mappings (lines 14-37)
- `Morse.annotate()` - DOM manipulation to add Morse annotations (lines 38-68)
- `Morse.emit()` - Audio generation and playback (lines 70-173)
- jQuery plugin extension (lines 176-182)

### Architecture Overview

The plugin is structured as an immediately-invoked function expression (IIFE) that extends jQuery:

1. **Morse Object** - Global namespace containing:
   - `wpm`: Words per minute setting (default: 12)
   - `code`: Character-to-Morse mapping object (supports alphanumeric + punctuation)
   - `annotate(el)`: Wraps text in `<ruby>` elements with Morse code
   - `emit()`: Generates WAV audio from Morse symbols

2. **jQuery Extension** - `$.fn.morseCode()` method that applies annotations to selected elements

3. **Audio Generation** - Client-side WAV generation based on sk89q's code, using:
   - `generate()` function: Creates base64-encoded WAV data URIs
   - `pack()` function: Emulates PHP's pack() for binary encoding
   - Parameters: 1012 Hz sample rate, 440 Hz tone frequency, 16-bit depth

## Build and Validation

### Important: No Build System

This repository has **no build system, test suite, package.json, or CI/CD pipelines**. It is a standalone jQuery plugin distributed as a single source file.

### Validation Steps

**JavaScript Syntax Validation:**
```bash
node -c jquery.morse.js
```
This command validates JavaScript syntax. It should complete silently with exit code 0.

**Manual Testing:**
To test changes, create an HTML file that includes jQuery and the plugin:
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="jquery.morse.js"></script>
</head>
<body>
    <p id="test">Hello World</p>
    <script>
        $(document).ready(function() {
            $("#test").morseCode({wpm: 12});
        });
    </script>
</body>
</html>
```
Open the file in a browser and verify:
1. Text is wrapped with Morse code annotations above it
2. Clicking the text plays the Morse code audio

### Environment Requirements

- **Node.js:** Available for syntax checking (current: v20.19.5)
- **Browser:** Modern browser with HTML5 audio support for testing
- **jQuery:** v1.4+ must be loaded before the plugin (external dependency)

### No Linting or Formatting

There are no linting configurations (no .eslintrc, .jshintrc, or .prettierrc files). The code uses ES5 syntax with jQuery conventions. When making changes:
- Follow existing code style (2-space indentation, semicolons)
- Use `var` declarations (not `let`/`const`)
- Use jQuery methods consistently with existing patterns

## Making Changes

### Key Guidelines

1. **Syntax Validation:** Always run `node -c jquery.morse.js` after changes
2. **No Build Step:** Changes to `jquery.morse.js` are immediately usable
3. **Browser Testing Required:** Create test HTML files to verify functionality
4. **Dependencies:** The plugin has no bundled dependencies; jQuery must be loaded externally
5. **Compatibility:** Maintain ES5 JavaScript compatibility for broad browser support

### Character Mappings

The `Morse.code` object (lines 14-37) maps characters to Morse patterns:
- `.` represents a short signal (dit)
- `_` represents a long signal (dah)
- Space represents word boundaries

To add new character support, add entries to this object following the existing pattern.

### Audio Parameters

Audio generation defaults (defined in `generate()` function):
- Sample rate: 1012 Hz
- Bit depth: 16-bit
- Frequency: 440 Hz
- Unit duration: 100ms (at 12 WPM)
- Volume: 32767 (max for 16-bit signed)

### Common Change Scenarios

**Adding a character:** Add to `Morse.code` object
**Changing audio:** Modify parameters in `generate()` function's defaults
**Changing default WPM:** Modify `Morse.wpm` property (line 13)
**Modifying UI:** Change HTML generation in `annotate()` (line 57)

## Git Workflow

- Default branch: The repository uses feature branches
- No pre-commit hooks or required checks
- Changes are tracked in git; commit and push normally

## Trust These Instructions

These instructions are based on a comprehensive examination of the repository as of October 2024. The repository structure is simple and stable. Only search for additional information if:
- You need to understand a specific code implementation detail not covered here
- You encounter unexpected behavior that contradicts these instructions
- You need to verify browser compatibility or jQuery version requirements

For all standard development tasks (syntax validation, testing approach, file structure), trust these instructions to save exploration time.
