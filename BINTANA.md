# bintana

A fork of [quickjs-ng](https://github.com/quickjs-ng/quickjs) carrying the fourteen
patches the [Bintana](https://github.com/getbintana/bintana) runtime needs.
**Thirteen patch commits plus this file, on top of `v0.17.0`, and one upstream fix
taken early (below).** Every patch is marked
in the source with `Bintana patch`, and Bintana's test suite asserts that each
one still works -- a patch an upstream change drops does not fail to build, so
those assertions are the only thing that would say so.

| # | Commit | What it adds |
|---|---|---|
| 1 | `Add an arithmetic hook for embedder classes` | `JS_SetArithHandler`, consulted by the four arithmetic slow paths before they reach `ToPrimitive` -- what gives Bintana's `Decimal` its operators. |
| 2 | `Parse JSON numbers with js_atod, not strtod` | `json_parse_number` reads the number itself rather than the C locale's decimal separator, which `setlocale` made a decimal comma. |
| 3 | `Name the property a non-extensible refusal was about` | `JS_ThrowTypeErrorNotExtensible`, so a refused assignment says which name. |
| 4 | `Add a per-opcode debugger hook and frame readers` | `JS_SetDebugHandler`, the `JS_Debug*` readers, and `this_obj`/`debug_line` on `JSStackFrame`. **A second commit** (`Show a module's lines and a frame's closure variables to the debugger`) teaches the readers modules: `JS_DebugLines` reads a module record as its body, and `JS_DebugLocals`/`JS_DebugEval` read a function's closure variables through `var_refs` after its own names -- which is what a module's private top-level names are to the function using them. |
| 5 | `Refuse async where it is written` | Two parser guards: the runtime installs no `Promise`, and an async closure's object would never be released. |
| 6 | `Report a compile's declarations to the embedder` | `JS_SetSymbolHandler`: classes, methods and top-level functions with their line, for an editor's outline. |
| 7 | `Report a class's base class to the embedder` | A `supertype` on every reported class: the name in an `extends` clause. Without it a class declared in a file the host never runs cannot say what it inherits, and an inherited surface is most of what a control has. A bare identifier only -- an `extends` that is a call or a member expression reports none, checked against the opcode the heritage compiled to. |
| 8 | `Report a member's parameters and its kind to the embedder` | `JS_SYMBOL_STATIC` / `_GETTER` / `_SETTER` beside `JS_SYMBOL_METHOD`, and a `params` on every method: the list in the spelling a declaration uses. The three kinds all reach `js_parse_class` as a method of the same name, and the parameters are the one place they exist -- the function object keeps the count and discards the names. `Function.length` is a lower bound the moment a parameter has a default, so a host that never ran the file has a weaker answer and a host that did has no answer at all. **The list is kept on each `JSFunctionDef`, not on the parse state**: a method is reported after its body, and a shared buffer handed over the last nested function's parameters (`Ask(message, options)` with an arrow inside came out `(x,y,z)`), while a top-level function was reported before its own list was read. A `static` accessor is `JS_SYMBOL_STATIC_GETTER`/`_SETTER`. |
| 9 | `Report every scope and every declared variable to the embedder` | `JS_SYMBOL_VARIABLE` (each `let`/`const`/`var`, `catch` binding, destructured name and `for...of` variable, at its line -- reported in `js_define_var`, which all four declaration paths go through) and `JS_SYMBOL_SCOPE` (every function, anonymous ones included, with its parameters and the lines it spans: the handler gained an `end_line`). A function that fails to parse is a scope up to where it broke, which is where somebody is typing. It is what lets an editor offer the parameters and locals in scope at the cursor. |
| 10 | `Report each declaration's JSDoc comment to the embedder` | The lexer keeps the last comment that opens with two stars (and where it ended); a class, a member and a top-level function take it when it ends on the line before them or on their own, **with nothing but words, dots, `=` and space in between** -- the line alone let a comment at the end of one method's body document the next. Taken where the declaration's name is read, since a member is reported after its body. The handler gains a `doc`: the text between the delimiters, nothing else done to it. **And `JS_SYMBOL_ASSIGNED`**: a function assigned at the top level (`File.LoadJson = function (path) {}`, `Widget.prototype.Dump = ...`), named by its target as written, with its parameters and its doc -- which is how a runtime adds to a class it did not declare, and the shape most of `rad.js` and `forms.js` are written in. The doc is looked at where the target starts and not taken: a class on the right takes it itself, and by the time a function on the right is read the last comment is one inside its body. **An object literal on the right reports each function it holds** as assigned to `<target>.<name>` (`GLOBAL.Settings.Get`), through `literal_owner`, which the literal takes so a literal nested in it owns nothing; a getter is reported with no parameters and a setter not at all. |
| 11 | `Close a full rope leaf like a binary counter, not under a new root` | `js_rope_push`, called from `JS_ConcatString` when the open leaf of a rope is full: the closed leaf joins the subtree on its left while the two are the same depth, so repeated `s += x` keeps the rope near 2 log2(leaves) deep and never reaches the rebalance at `JS_STRING_ROPE_MAX_DEPTH`. Before, every closed leaf went under a new root and the rope was rebalanced -- every leaf walked -- every few dozen leaves, which made a long append quadratic: Gambas's `string2` (26 million appends, 104 MB) went 34.8 s -> 3.9 s. `tests/test_rope_append.js` holds both the text and the linearity. |
| 12 | `Search a narrow string with memchr and memcmp` | `string_cmp` compares two narrow strings with `memcmp`, `string_indexof_char` finds a byte with `memchr`, and `String.prototype.indexOf` (forwards) and `includes` go through `string_indexof` instead of comparing the needle at every position. A search that finds nothing over 4 MB went 1343 -> 16 ms; Gambas's `string1` 10.3 -> 5.5 s. Wide strings keep the loops. `tests/test_string_search.js` holds seven searches to a reference written in JavaScript over 4000 random cases. |
| 13 | `Refuse await and import() where they are written` | `js_refuse_await`, asked wherever the parser accepts an `await` (the expression, `for await`, and `await using` in a statement, a `for` head and a `for...of` head), and a guard that refuses `import(` at the word. Patch 5's other half: with every async function refused, a module's body is the only function still of kind `JS_FUNC_ASYNC`, so this meets a module's top-level `await` and nothing else -- `await` stays a name in a script. `import()` built a promise of an unregistered class and the process aborted at exit; with the async classes registered (a module is evaluated through a promise) it would hand the program one instead. `make test` stays 0/118, and the nine tests it now refuses all use top-level `await` or `import()`. |
| 14 | `Free a module that was compiled and never linked` | `JS_FreeUnevaluatedModule`: `js_free_module_def` for a record still `UNLINKED`, a no-op for one the context has linked or evaluated, and `JS_FreeValue` for anything that is not a module. `JS_FreeValue` never frees a module -- a record lives until the context goes -- so an editor compiling a module's text to check it kept every compile: measured, 923 KB per check of a 136 KB module, 0.3 KB with it. |

## Taken from upstream before a release

| Upstream | Why it could not wait |
|---|---|
| `2f0aa72` *Port bellard/quickjs@10c81b1 to fix GCC 14+ performance regression* | `JS_MKVAL` wrote half of a 16-byte `JSValue`, and GCC 14 and later turn every `js_int32`/`js_bool` inlined into `JS_CallInternal` into a read-modify-write through the stack. Measured on GCC 16, Release, against the tree without it: a tight integer loop **1650 -> 580 ms**, property reads **1092 -> 570 ms**. It touches `quickjs.h` only and none of the patches above. |

A cherry-pick (`-x`, so it names its upstream commit) and not a patch: the
release that contains it makes it disappear from this branch at the next
rebase, which is the whole of what to do about it.

## Rebasing on a new upstream release

    git remote add upstream https://github.com/quickjs-ng/quickjs.git   # once
    git fetch upstream --tags
    git rebase v0.18.0 bintana

The series is small -- about 950 lines across `quickjs.c` and `quickjs.h` --
and between v0.16.1 and v0.17.0 it applied with offsets only. When a conflict
does happen, these are the places to read first:

- `JSRuntime`'s field block and `JSStackFrame`'s: several patches add members
  beside the same neighbors.
- `build_backtrace` and the reader block written under it -- the patch inserts
  before the function's original closing brace and that brace ends up closing
  the last new function.
- `JS_CallInternal`: the `this_obj` writes and the `SWITCH` /
  `BTA_DEBUG_STEP` dispatch macros.
- the parser: `js_parse_function_decl2` (patches 5 and 6), `js_parse_class`,
  `set_object_name`, `json_parse_number` (patch 2).

After a rebase, compile Bintana against the tip and run it rather than trusting
the build:

    ./tests/run.sh widgets

Patches 2, 3, 11 and 12 are ordinary fixes and are candidates to send upstream; the
rest are Bintana's own and are not.
