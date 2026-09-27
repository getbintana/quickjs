# bintana

A fork of [quickjs-ng](https://github.com/quickjs-ng/quickjs) carrying the seven
patches the [Bintana](https://github.com/getbintana/bintana) runtime needs.
**Seven patch commits plus this file, on top of `v0.17.0`.** Every patch is marked
in the source with `Bintana patch`, and Bintana's test suite asserts that each
one still works -- a patch an upstream change drops does not fail to build, so
those assertions are the only thing that would say so.

| # | Commit | What it adds |
|---|---|---|
| 1 | `Add an arithmetic hook for embedder classes` | `JS_SetArithHandler`, consulted by the four arithmetic slow paths before they reach `ToPrimitive` -- what gives Bintana's `Decimal` its operators. |
| 2 | `Parse JSON numbers with js_atod, not strtod` | `json_parse_number` reads the number itself rather than the C locale's decimal separator, which `setlocale` made a decimal comma. |
| 3 | `Name the property a non-extensible refusal was about` | `JS_ThrowTypeErrorNotExtensible`, so a refused assignment says which name. |
| 4 | `Add a per-opcode debugger hook and frame readers` | `JS_SetDebugHandler`, the `JS_Debug*` readers, and `this_obj`/`debug_line` on `JSStackFrame`. |
| 5 | `Refuse async where it is written` | Two parser guards: the runtime installs no `Promise`, and an async closure's object would never be released. |
| 6 | `Report a compile's declarations to the embedder` | `JS_SetSymbolHandler`: classes, methods and top-level functions with their line, for an editor's outline. |
| 7 | `Report a class's base class to the embedder` | A `supertype` on every reported class: the name in an `extends` clause. Without it a class declared in a file the host never runs cannot say what it inherits, and an inherited surface is most of what a control has. A bare identifier only -- an `extends` that is a call or a member expression reports none, checked against the opcode the heritage compiled to. |
| 8 | `Report a member's parameters and its kind to the embedder` | `JS_SYMBOL_STATIC` / `_GETTER` / `_SETTER` beside `JS_SYMBOL_METHOD`, and a `params` on every method: the list in the spelling a declaration uses. The three kinds all reach `js_parse_class` as a method of the same name, and the parameters are the one place they exist -- the function object keeps the count and discards the names. `Function.length` is a lower bound the moment a parameter has a default, so a host that never ran the file has a weaker answer and a host that did has no answer at all. |

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

Patches 2 and 3 are ordinary bug fixes and are candidates to send upstream; the
rest are Bintana's own and are not.
