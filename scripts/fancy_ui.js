class SerialOut {
    constructor() {
        this.serial_out = document.getElementById('serial_out');
        // create contents
        this.interrupt = document.createElement('button');
        this.enter_repl = document.createElement('button');
        this.exit_repl = document.createElement('button');
        this.reload = document.createElement('button');
        this.command_container = document.createElement('div');
        // append
        this.serial_out.appendChild(this.interrupt);
        this.serial_out.appendChild(this.enter_repl);
        this.serial_out.appendChild(this.exit_repl);
        this.serial_out.appendChild(this.reload);
        this.serial_out.appendChild(this.command_container);
        // button text
        this.interrupt.innerText = "Interrupt current run (Ctrl-C)";
        this.enter_repl.innerText = "Enter REPL mode";
        this.exit_repl.innerText = "Exit REPL mode and reload script (Ctrl-D)";
        this.reload.innerText = "Reload script (Ctrl-D)";
        // serial send editor
        this.command_container.id = 'command';
        this.command = ace.edit("command");
        this.command.setOptions({
            maxLines: Infinity
        });
        this.command.container.style.lineHeight = 2
        this.command.renderer.updateFontSize()
        this.command.renderer.setShowGutter(false);
        this.command.session.setUseWrapMode(true);
        this.command.session.setTabSize(4);
        this.command.session.setUseSoftTabs(true);
        this.command.commands.addCommand({
            name: 'sendCTRLC',
            bindKey: { win: 'Shift-Ctrl-C', mac: 'Ctrl-C' },
            exec: function () {
                console.log('sendCTRLC')
                sendCTRLC();
            },
        });
        this.command.commands.addCommand({
            name: 'sendCTRLD',
            bindKey: { win: 'Shift-Ctrl-D', mac: 'Ctrl-D' },
            exec: function () {
                console.log('sendCTRLD')
                sendCTRLD();
            },
        });
        this.command.commands.addCommand({
            name: 'newlineAndIndent',
            bindKey: { win: 'Shift-Enter', mac: 'Shift-Enter' },
            exec: function () {
                console.log('newlineAndIndent')
                command.insert("\n");
            },
        });
        this.command.commands.addCommand({
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
        this.command_container.style.display = 'none';
    }

    display_running () {
        this.interrupt.style.display = '';
        this.enter_repl.style.display = 'none';
        this.exit_repl.style.display = 'none';
        this.reload.style.display = 'none';
        this.command_container.style.display = '';
    }

    display_script_done () {
        this.interrupt.style.display = 'none';
        this.enter_repl.style.display = '';
        this.exit_repl.style.display = 'none';
        this.reload.style.display = '';
        this.command_container.style.display = 'none';
    }

    display_repl () {
        this.interrupt.style.display = 'none';
        this.enter_repl.style.display = 'none';
        this.exit_repl.style.display = '';
        this.reload.style.display = 'none';
        this.command_container.style.display = 'none';
    }
}

let serial_out = new SerialOut();