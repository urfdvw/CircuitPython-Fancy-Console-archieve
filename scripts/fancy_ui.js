class SerialOut {
    constructor(dom_id) {
        this.serial_out = document.getElementById(dom_id);
        // create contents
        this.interrupt = document.createElement('button');
        this.enter_repl = document.createElement('button');
        this.exit_repl = document.createElement('button');
        this.reload = document.createElement('button');
        this.text_container = document.createElement('div');
        // append
        this.serial_out.appendChild(this.interrupt);
        this.serial_out.appendChild(this.enter_repl);
        this.serial_out.appendChild(this.exit_repl);
        this.serial_out.appendChild(this.reload);
        this.serial_out.appendChild(this.text_container);
        // button text
        this.interrupt.innerText = "Interrupt current run (Ctrl-C)";
        this.enter_repl.innerText = "Enter REPL mode";
        this.exit_repl.innerText = "Exit REPL mode and reload script (Ctrl-D)";
        this.reload.innerText = "Reload script (Ctrl-D)";
        // serial send editor
        this.text_container.id = 'command';
        this.text = ace.edit(this.text_container.id);
        this.text.setOptions({
            maxLines: Infinity,
            placeholder: "Serial to microcontroller",
        });
        this.text.container.style.lineHeight = 2
        this.text.renderer.updateFontSize()
        this.text.renderer.setShowGutter(false);
        this.text.session.setUseWrapMode(true);
        this.text.session.setTabSize(4);
        this.text.session.setUseSoftTabs(true);
        this.text.commands.addCommand({
            name: 'sendCTRLC',
            bindKey: { win: 'Shift-Ctrl-C', mac: 'Ctrl-C' },
            exec: function () {
                console.log('sendCTRLC')
                sendCTRLC();
            },
        });
        this.text.commands.addCommand({
            name: 'sendCTRLD',
            bindKey: { win: 'Shift-Ctrl-D', mac: 'Ctrl-D' },
            exec: function () {
                console.log('sendCTRLD')
                sendCTRLD();
            },
        });
        this.text.commands.addCommand({
            name: 'newlineAndIndent',
            bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' },
            exec: function () {
                console.log('newlineAndIndent')
                this.pyin.insert("\n");
            },
        });
        this.text.commands.addCommand({
            name: 'serialSend',
            bindKey: { win: 'Enter', mac: 'Enter' },
            exec: function (this_editor) {
                console.log('serial_send');
                send_cmd(this_editor.session.getValue() + '\x0D');
                this_editor.session.setValue("")
            },
        });
    }

    display_none () {
        this.interrupt.style.display = 'none';
        this.enter_repl.style.display = 'none';
        this.exit_repl.style.display = 'none';
        this.reload.style.display = 'none';
        this.text_container.style.display = 'none';
    }

    display_running () {
        this.interrupt.style.display = '';
        this.enter_repl.style.display = 'none';
        this.exit_repl.style.display = 'none';
        this.reload.style.display = 'none';
        this.text_container.style.display = '';
    }

    display_script_done () {
        this.interrupt.style.display = 'none';
        this.enter_repl.style.display = '';
        this.exit_repl.style.display = 'none';
        this.reload.style.display = '';
        this.text_container.style.display = 'none';
    }

    display_repl () {
        this.interrupt.style.display = 'none';
        this.enter_repl.style.display = 'none';
        this.exit_repl.style.display = '';
        this.reload.style.display = 'none';
        this.text_container.style.display = 'none';
    }
}

let serial_out = new SerialOut('serial_out');

class ExecutionBlock {
    constructor (index, console) {
        this.index = index
        // create contents
        this.block = document.createElement('div');
        this.title = document.createElement('p');
        this.pyin_container = document.createElement('div');
        this.pyout_container = document.createElement('div');
        this.edit = document.createElement('button');
        this.rerun = document.createElement('button');
        // append
        console.appendChild(this.block);
        this.block.appendChild(this.title);
        this.block.appendChild(this.pyin_container);
        this.block.appendChild(this.pyout_container);
        this.block.appendChild(this.edit);
        this.block.appendChild(this.rerun);
        // content
        this.block.id = "block" + this.index;
        this.title.innerText = "Execution";
        this.pyin_container.id = "pyin" + this.index;
        this.pyout_container.id = "pyout" + this.index;
        this.edit.innerText = "Edit ✎";
        this.rerun.innerText = "Rerun ↺";
        // pyin
        this.pyin = ace.edit(this.pyin_container.id);
        this.pyin.setOptions({
            maxLines: Infinity,
            placeholder: "Python code to microcontroller (REPL)",
        });
        this.pyin.container.style.lineHeight = 2
        this.pyin.renderer.updateFontSize()
        this.pyin.session.setMode("ace/mode/python")
        this.pyin.session.setUseWrapMode(true);
        this.pyin.session.setTabSize(4);
        this.pyin.session.setUseSoftTabs(true);
        this.pyin.focus();
        // pyout
        this.pyout = ace.edit(this.pyout_container.id);
        this.pyout.setReadOnly(true); //for debug
        this.pyout.session.setUseWrapMode(true);
        this.pyout.renderer.setShowGutter(false);
        this.pyout.setHighlightActiveLine(false)
        this.pyout.setOptions({
            maxLines: 10
        });
        this.pyout.session.on('change', () => {
            this.pyout.renderer.scrollToLine(Number.POSITIVE_INFINITY);
        })
    }
    set_editing () {
        this.pyin.setReadOnly(false);
        this.pyin_container.style.display = '';
        this.pyout_container.style.display = 'none';
        this.edit.style.display = 'none';
        this.rerun.style.display = 'none';
    }
    set_repl_running () {
        this.pyin.setReadOnly(true);
        this.pyin_container.style.display = '';
        this.pyout_container.style.display = '';
        this.edit.style.display = 'none';
        this.rerun.style.display = 'none';
    }
    set_script_running () {
        this.pyin_container.style.display = 'none';
        this.pyout_container.style.display = '';
        this.edit.style.display = 'none';
        this.rerun.style.display = 'none';
    }
    set_done () {
        this.pyin.setReadOnly(true);
        this.pyin_container.style.display = '';
        this.pyout_container.style.display = '';
        this.edit.style.display = '';
        this.rerun.style.display = '';
    }
}

class FancyConsole {
    constructor (dom_id) {
        this.console = document.getElementById(dom_id);

    }
}
let fancy_console = new FancyConsole('console');

class StateDetector {
    constructor () {
        this.now = null;
        this.last = null;
        setInterval(() => {
            this.check();
        }, 10);
    }

    check () {
        this.last = this.now;
        let title_bar = document.getElementById("title_bar").innerText;
        if (title_bar.includes('REPL')) {
            if (serial.session.getLine(serial.session.getLength() - 1) === '>>> ') {
                this.now = "repl waiting";
            } else {
                this.now = "repl running";
            }
        } else {
            if (title_bar.includes('code.py') && !title_bar.includes('@')) {
                this.now = "script running";
            } else {
                this.now = "script done";
            }
        }
        if (this.now !== null && this.last !== null) {
            if (this.now !== this.last) {
                if (this.last.startsWith('repl') && this.now.endsWith('done')) {
                    // ignore the "Done" after repl close
                    return;
                }
                console.log(this.now);
                console.log(title_bar);
            }
        }
    }
} 
let state = new StateDetector()

// let exec_block_1 = new ExecutionBlock(1, document.getElementById('console'));
// exec_block_1.set_done();
// let exec_block_2 = new ExecutionBlock(2, document.getElementById('console'));
// exec_block_2.set_editing();