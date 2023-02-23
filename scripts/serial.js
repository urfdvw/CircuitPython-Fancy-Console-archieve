
/*
* Serial driver *******************************************************
*/

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

async function connect() {
    // connect to serial

    // - Request a port and open a connection.
    port = await navigator.serial.requestPort();

    // - Wait for the port to open.
    await port.open({ baudRate: 115200 });

    // setup the output stream.
    const encoder = new TextEncoderStream();
    outputDone = encoder.readable.pipeTo(port.writable);
    outputStream = encoder.writable;

    // read the stream.
    let decoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(decoder.writable);
    inputStream = decoder.readable;

    reader = inputStream.getReader();
    readLoop();
    start_readLoop();
    let fancy_console = new FancyConsole('console');
}

// not used
async function disconnect() {
    // Close the input stream (reader).
    if (reader) {
        await reader.cancel();
        await inputDone.catch(() => { });
        reader = null;
        inputDone = null;
    }

    // Close the output stream.
    if (outputStream) {
        await outputStream.getWriter().close();
        await outputDone;
        outputStream = null;
        outputDone = null;
    }

    // Close the port.
    await port.close();
    port = null;
}

// not used
async function clickConnect() {
    // if connected, ignore the button action
    if (port) {
        await disconnect();
        // if connected, change the button name
        document.getElementById("connect").innerHTML = "Connect Serial";
    } else {
        await connect();
        // if connected, change the button name
        document.getElementById("connect").innerHTML = "Disconnect Serial";
    }
}


let serial_parts = []
async function readLoop() {
    while (true) {
        const { value, done } = await reader.read();
        // console.log('DEBUG', 'seial in', [value]);
        serial_parts.push(value); 

        if (done) {
            console.log('[readLoop] DONE', done);
            reader.releaseLock();
        }
    }

}

function start_readLoop() {
    setInterval(() => {
        let len = serial_parts.length;
        let parts = serial_parts.slice(0, len);
        serial_parts = serial_parts.slice(len);
        serial_processor(parts);
    }, 10);
}

/*
* Serial Send
*/

function send_cmd(s) {
    // send single byte command
    // s: str
    // console.log('DEBUG', 'serial out', [s]);
    let target = s.slice(0, -1);
    if (target.length > 0){
        echo_matcher.target = target;
    }
    if (outputStream != null) {
        const writer = outputStream.getWriter();
        writer.write(s);
        writer.releaseLock();
    }
    else {
        console.log("send_cmd() failed, no connection.");
    }
}

function sendCTRLD() {
    send_cmd("\x04");
}

function sendCTRLC() {
    send_cmd("\x03");
}

function send_multiple_lines(lines) {
    // send multiple lines of code to device
    // lines: str (str can contain line breaks)

    // push to history
    push_to_cmd_hist(lines);
    cmd_ind = -1;

    // dealing with linebreaks and '\n' in text
    lines = lines.split('\\').join('\\\\').split('\n').join('\\n')

    // remove comments by """
    lines = lines.split('"""')
    for (var i = 0; i < lines.length; i++) {
        lines.splice(i + 1, 1);
    }
    lines = lines.join("")

    // send commands to device
    if (serial.getValue().slice(-4, -1) !== ">>>") {
        sendCTRLC();
    }

    send_cmd('exec("""' + lines + '""")' + '\x0D')
    // https://stackoverflow.com/a/60111488/7037749
}

function send_single_line(line) {
    // send one line of code to device

    // if command not empty, push the command to history
    push_to_cmd_hist(line);
    cmd_ind = -1;

    // send the command to device
    send_cmd(line.trim() + '\x0D');
}
