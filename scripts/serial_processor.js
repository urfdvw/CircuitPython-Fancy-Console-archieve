class State {
    constructor (val=0) {
        this._val = val;
        this._last = val;
    }

    set now(val) {
        this._last = this._val;
        this._val = val;
    }

    get now () {
        return this._val;
    }

    get diff () {
        return this._val - this._last;
    }
}

class TargetMatcher {
    constructor (target) {
        if (target === undefined){
            this.clear_target();
        } else {
            this.target = target;
        }
        this.segment = "";
        this.mood = new State()
    }
    push (segment) {
        let result = [];
        segment = this.segment + segment;
        // see if the tail contains partial target
        for (let i = segment.length - this.target.length; i < segment.length; i++) {
            if (i < 0) {
                continue;
            }
            let tail = segment.slice(i);
            if (tail === this.target) {
                break
            }
            if (tail === this.target.slice(0, tail.length)) {
                this.segment = tail;
                segment = segment.slice(0, segment.length - tail.length);
                break;
            } else {
                this.segment = "";
            }
        }
        let parts = segment.split(this.target);

        for (let i = 0; i < parts.length; i++) {
            if (i != 0) {
                this.mood.now = 1;
                result.push([this.target, this.mood.now, this.mood.diff]);
            }
            if (parts[i].length > 0) {
                this.mood.now = 0;
                result.push([parts[i], this.mood.now, this.mood.diff]);
            }
        }
        return result;
    }
    clear_target () {
        this.target = 'You shall not pass! (∩๏‿‿๏)⊃━☆ﾟ.*';
    }
}

class BracketMatcher {
    constructor (begin_str, end_str) {
        this.begin_matcher = new TargetMatcher(begin_str);
        this.end_matcher = new TargetMatcher(end_str);
        this.mood = new State();
        this.matcher = this.begin_matcher;
    }
    push (segment) {
        let outlet = [];
        let parts = this.matcher.push(segment);
        while (parts.length > 0) {
            // get current part
            const current = parts.shift();
            // skip if empty
            if (current[0].length === 0) {
                continue;
            }
            if (current[1] === 0) {
                // if not matching, append to outlet
                outlet.push([current[0], this.mood.now, this.mood.diff])
                this.mood.now = this.mood.now; // update mood because it is used
            } else {
                this.mood.now = 1 - this.mood.now;
                if (this.mood.now === 1) {
                    this.matcher = this.end_matcher;
                } else {
                    this.matcher = this.begin_matcher;
                }
                var rest = [];
                for (const p of parts) {
                    rest.push(p[0]);
                }
                const text = rest.join('');
                parts = this.matcher.push(text);
            }
        }
        return outlet
    }
}

class MatcherProcessor {
    constructor (
        matcher,
        in_action = () => {},
        enter_action = () => {},
        exit_action = () => {}
    ) {
        this.matcher = matcher;
        this.in_action = in_action;
        this.enter_action = enter_action;
        this.exit_action = exit_action;

        this.through = false;
        this.segment = '';
    }
    push (parts) {
        var outlet = [];
        var branch = [];
        for (const part_in of parts) {
            for (const part_out of this.matcher.push(part_in)) {
                const text = part_out[0];
                const mood = part_out[1];
                const diff = part_out[2];
                if (diff === 1) {
                    this.enter_action(text);
                }
                if (mood === 1) {
                    this.in_action(text);
                    branch.push(text);
                }
                if (diff === -1) {
                    this.exit_action(text);
                }
                if (mood === 0) {
                    outlet.push(text);
                }
            }
        }
        return outlet;
    }
}

let line_ending_matcher = new TargetMatcher('\r\n');

let title_processor = new MatcherProcessor(
    new BracketMatcher(
        '\x1B]0;',
        '\x1B\\',
    ),
    (text) => {document.getElementById('title_bar').innerHTML += text},
    () => {document.getElementById('title_bar').innerHTML = ""}
);

let exec_processor = new MatcherProcessor(
    new BracketMatcher(
        'exec("""',
        '""")',
    ),
    (text) => {
        serial.session.insert(
            {row: 1000000, col: 1000000},
            text.split('\\n').join('\n')
        )
    },
    () => {serial.session.insert({row: 1000000, col: 1000000}, '\n')}
);

let echo_matcher = new TargetMatcher();
let echo_processor = new MatcherProcessor(
    echo_matcher,
    (text) => {
        add_block(text, true);
        echo_matcher.clear_target(); // other wise will might be matched twice.
    }
);
echo_processor.through = true;

blocks = [];
function add_block(text, python){
    let dom = document.createElement("div");
    document.getElementById('console_fancy').appendChild(dom);

    let name = 'block' + blocks.length;
    dom.id = name;
    let block = ace.edit(name);
    blocks.push(block);

    block.setOptions({
        // https://stackoverflow.com/a/13579233/7037749
        maxLines: 10
    });
    if (python) {
        block.session.setMode("ace/mode/python")
    }
    block.setTheme("ace/theme/monokai");
    block.setReadOnly(true); //for debug
    block.session.setUseWrapMode(true);
    block.renderer.setShowGutter(false);
    block.setHighlightActiveLine(false);
    block.session.on('change', () => {
        block.renderer.scrollToLine(Number.POSITIVE_INFINITY);
    })

    block.session.insert({row: 1000000, col: 1000000}, text);
}

function serial_processor(value) {
    console.log('DEBUG', 'serial in', [value])
    var parts = [];
    for (const part of line_ending_matcher.push(value)) {
        parts.push(part[0]);
    }

    console.log('DEBUG', 'parts', parts);

    for (let processor of [
        title_processor,
        echo_processor,
        exec_processor,
    ]){
        parts = processor.push(parts);
        console.log('DEBUG', 'parts', parts);
    }


    for (const part of parts) {
        serial.session.insert({row: 1000000, col: 1000000}, part);
    }

    /* Weird issue with weird solution
    if the following line is removed.
    some competing issues happems
    like if start from REPL
    and run a cell
    >>> will appear in the middle of the code block
    */
    serial.session.getValue();
}

console.log('serial_processor.js loaded')
