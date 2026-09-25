# bintana

A fork of [quickjs-ng](https://github.com/quickjs-ng/quickjs) carrying the six
patches the [Bintana](https://github.com/getbintana/bintana) runtime needs.
**Six patch commits plus this file, on top of `v0.17.0`.** Every patch is marked
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
