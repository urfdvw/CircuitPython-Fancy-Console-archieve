/*
* Ace
*/

ace.require("ace/ext/language_tools");

// serial console prints
var serial = ace.edit("console_plain");
// serial.setOptions({
//     // https://stackoverflow.com/a/13579233/7037749
//     maxLines: 10
// });
serial.setTheme("ace/theme/monokai");
serial.setReadOnly(true); //for debug
serial.session.setUseWrapMode(true);
serial.renderer.setShowGutter(false);
serial.setHighlightActiveLine(false)
serial.container.style.height = '200px';
serial.resize();

function serial_fit_raw () {
    serial.renderer.scrollToLine(Number.POSITIVE_INFINITY)
}

function serial_fit(){
    setTimeout(serial_fit_raw, 100);
}

serial_fit();

serial.session.on('change', serial_fit)

console.log('console.js loaded')
