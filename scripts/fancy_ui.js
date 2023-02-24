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
    constructor (index, fancy_console) {
        this.index = index
        // create contents
        this.block = document.createElement('div');
        this.title = document.createElement('p');
        this.pyin_container = document.createElement('div');
        this.pyout_container = document.createElement('div');
        this.edit = document.createElement('button');
        this.rerun = document.createElement('button');
        // append
        fancy_console.appendChild(this.block);
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
        this.pyin.commands.addCommand({
            name: 'newlineAndIndent',
            bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' },
            exec: function (this_editor) {
                console.log('newlineAndIndent')
                this_editor.insert("\n");
            },
        });
        this.pyin.commands.addCommand({
            name: 'run_command',
            bindKey: { win: 'Enter', mac: 'Enter' },
            exec: function (this_editor) {
                console.log('run_command')
                send_code(this_editor);
            },
        });
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
    disp_repl_waiting () {
        this.title.innerText = 'REPL block [' + this.index + ']';
        this.pyin.setReadOnly(false);
        this.pyin.focus();
        this.pyin_container.style.display = '';
        this.pyout_container.style.display = 'none';
        this.edit.style.display = 'none';
        this.rerun.style.display = 'none';
    }
    disp_repl_running () {
        this.pyin.setReadOnly(true);
        this.pyin_container.style.display = '';
        this.pyout_container.style.display = '';
        this.edit.style.display = 'none';
        this.rerun.style.display = 'none';
    }
    disp_script_running () {
        this.title.innerText = 'Script block [' + this.index + ']';
        this.pyin_container.style.display = 'none';
        this.pyout_container.style.display = '';
        this.edit.style.display = 'none';
        this.rerun.style.display = 'none';
    }
    disp_script_done () {
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
        this.block_list = [];
    }

    start () {
        let start_action = setInterval(() => {
            if (repl_state) {
                clearInterval(start_action);
            }
            sendCTRLC();
        }, 200);
    }

    add_block () {
        let block_index = this.block_list.length;
        let current_blcok = new ExecutionBlock(block_index, this.console);
        this.block_list.push(current_blcok);
    }

    get current_blcok () {
        return this.block_list.at(-1);
    }

    append_pyout (parts) {
        if (this.block_list.length === 0) {
            return;
        }
        for (const text of parts) {
            this.current_blcok.pyout.session.insert(
                {row: Number.POSITIVE_INFINITY, col: Number.POSITIVE_INFINITY}, text
            );
        }
    }
} 

let fancy_console = new FancyConsole('console');