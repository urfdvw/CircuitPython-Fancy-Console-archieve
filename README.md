This work is transferred to a new repo:

https://github.com/urfdvw/CircuitPython-Fancy-Console

# CircuitPython-Fancy-Console
A serial console for CircuitPython with Readability and Usability tools

# UI design

- execution block
    - this section is a repeated block that each block represents
        - one script run
        - one loop body in the REPL
    - contains
        - title
            - what is running, repl or script
                - this is to replace plain text system info
            - index in the repl 
            - time
                - for current block, show time now
                - for past block, show block closing time
        - input block
            - only the active block's input is editable
        - output block
            - have a max line constrains so not infinitely expanding in height
        - buttons
            - re run
            - edit
    - in different mode
        - title is always visible, for other things
        - in script run
            - show output block only
        - in current repl 
            - show input block only
        - in running and past blocks
            - lock input
            - show output, show button
            
- Serial out
    - this section is always visiable at the bottom of the console
    - contains
        - Ctrl-C to break button
        - Ctrl-C to Enter REPL button
        - Ctrl-D to rerun
        - Ctrl-D to Exit REPL button
        - Text serial out
            - only for serial conmmunication during running (`input()`)
            - not syntax highlighted
        - Save and run button (IDE function)
    - components will appear only when applicable.

# States
> S: State
> C: Conditions

- S: REPL waiting
- S: REPL running
- S: Script running
- S: Script done
