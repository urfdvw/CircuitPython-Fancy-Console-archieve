class TargetMatcher {
    constructor (target) {
        if (target === undefined){
            this.clear_target();
        } else {
            this.target = target;
        }
        this.segment = "";
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
            if (tail == this.target.slice(0, tail.length)) {
                this.segment = tail;
                segment = segment.slice(0, segment.length - tail.length);
                break;
            } else {
                this.segment = "";
            }
        }
        let parts = segment.split(this.target);
        // first output
        let first_part = parts.shift();
        if (first_part.length > 0) {
            result.push([first_part, false]);
        }
        // the rest
        for (const p of parts) {
            result.push([this.target, true]);
            result.push([p, false]);
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
        this.mood = false;
        this.matcher = this.begin_matcher;
    }
    push (segment) {
        let result = [];
        let parts = this.matcher.push(segment);
        while (parts.length > 0) {
            const p = parts.shift();
            if (!p[1]) {
                result.push([p[0], this.mood])
            } else {
                this.mood = !this.mood;
                if (this.mood) {
                    this.matcher = this.end_matcher;
                } else {
                    this.matcher = this.begin_matcher;
                }
                var rest = [];
                for (const p of parts) {
                    rest.push(p[0]);
                }
                parts = this.matcher.push(rest.join(''));
            }
        }
        return result
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
        this.last_mood = false;
    }
    push (parts) {
        var outlet = [];
        for (const part_in of parts) {
            for (const part_out of this.matcher.push(part_in)) {
                const mood = part_out[1];
                if (mood) {
                    if (this.last_mood) {
                        this.in_action(part_out[0]);
                    } else { // if just into this mood
                        this.enter_action();
                        this.in_action(part_out[0]);
                    }
                    if (this.through){
                        outlet.push(part_out[0]);
                    }
                } else {
                    if (this.last_mood) { // if just quit
                        this.exit_action();
                    }
                    outlet.push(part_out[0]);
                }
                this.last_mood = mood;
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
        console.log('DEBUG', 'echo_processor', [text]);
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