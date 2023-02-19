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
        this.segment = '';
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
        exit_action = () => {},
        out_action = () => {},
    ) {
        this.matcher = matcher;
        this.in_action = in_action;
        this.enter_action = enter_action;
        this.exit_action = exit_action;
        this.out_action = out_action;

        this.through = false;
        this.segment = '';

        this.branch = [];
    }
    push (parts) {
        var outlet = [];
        this.branch = [];
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
                    if (this.through) {
                        outlet.push(text);
                    } else {
                        this.branch.push(text);
                    }
                }
                if (diff === -1) {
                    this.exit_action(text);
                }
                if (mood === 0) {
                    this.out_action(text);
                    outlet.push(text);
                }
            }
        }
        return outlet;
    }
}

let line_ending_matcher = new TargetMatcher('\r\n');
let line_ending_processor = new MatcherProcessor(
    line_ending_matcher
)
line_ending_processor.through = true;

let title_processor = new MatcherProcessor(
    new BracketMatcher(
        '\x1B]0;',
        '\x1B\\',
    ),
    (text) => {document.getElementById('title_bar').innerHTML += text},
    () => {document.getElementById('title_bar').innerHTML = ""}
);

let echo_matcher = new TargetMatcher();
let echo_processor = new MatcherProcessor(
    echo_matcher,
    () => {},
    () => {
        echo_matcher.clear_target(); // other wise will might be matched twice.
    }
);

let exec_processor = new MatcherProcessor(
    new BracketMatcher(
        'exec("""',
        '""")',
    ),
    (text) => {
        text = text.split('\\n').join('\n');
        add_block(text, true);
    },
    () => {},
    () => {},
    (text) => {
        add_block(text, true);
    },
);


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

    block.session.insert({row: Number.POSITIVE_INFINITY, col: Number.POSITIVE_INFINITY}, text);
}

function serial_processor(main_flow) {
    // console.log('DEBUG', 'main_flow', main_flow.length, main_flow.join('').length);

    main_flow = line_ending_processor.push(main_flow);
    // console.log('DEBUG', 'after line_ending_processor', main_flow);

    main_flow = title_processor.push(main_flow);
    // console.log('DEBUG', 'after title_processor', main_flow);

    // push everything execept title to plain terminal
    // this is like "stats for nerds"
    for (const part of main_flow) {
        serial.session.insert({row: Number.POSITIVE_INFINITY, col: Number.POSITIVE_INFINITY}, part); // this is the only thing that slows things down
    }

    main_flow = echo_processor.push(main_flow);
    var echo_branch = echo_processor.branch;
    // console.log('DEBUG', 'after echo_processor', main_flow, echo_branch);

    echo_branch = exec_processor.push(echo_branch);
    // console.log('DEBUG', 'after exec_processor', echo_branch);

}

console.log('serial_processor.js loaded')
