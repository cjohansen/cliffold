# Cliffold - Node CLI scaffolding

Cliffold provides some utilities that are useful when writing CLIs. It uses
[posix-argv-parser](http://github.com/busterjs/posix-argv-parser) for POSIX
compliant ARGV parsing and provides utilities for managing loggers (to either
STDOUT or a file), pid files and more.

```js
var cliffold = require("cliffold");
var cli = new cliffold.Cli(process.stdout);

cli.opt("-f", "--file", {
    env: "FILE",
    description: "A file to write stuff to"
});

cli.opd("rootPath", {
    signature: "Root directory",
    description: "The root directory to find files in"
});

// Adding a help option will cause cliffold to automatically present help output
// when -h or --help is encountered.
cli.helpOpt("-h", "--help");

// Adding a log option will cause cliffold to create a logger. It will default
// to STDOUT.
cli.logOpt("-l", "--log-file");

// Adding a pid file option will cause cliffold to maintain a pid file for the
// duration of the process. cliffold sets up an exit listener on the process
// that deletes the file.
cli.pidFileOpt("-p", "--pid-file", process);

// To make sure the pid file is also cleared when the process is forcefully
// killed, add these listeners as well
process.on("SIGINT", function () { process.exit(); });
process.on("SIGTERM", function () { process.exit(); });

cli.exec(process.argv, process.env, function (error, cliProcess) {
    cliProcess.options; // The posix-argv-parser parse result

    cliProcess.get("-f"); // Gets the value

    cliProcess.log.info("Log some stuff");

    cliProcess.isHandled; // True if help was printed
});
```

# API

## `new cliffold.Cli(stdout)`

Creates a `cli` object. Pass it STDOUT, typically `process.stdout`.

## `cli.opt(short, long[, options])`

Creates an option. In addition to the various options supported by
`posix-argv-parser`, the `options` object supports:

* `description` -- Used to print help
* `env` -- The (optional) name of the environment variable to prefer over the
  command line option (if set)

See [posix-argv-parser](https://github.com/busterjs/posix-argv-parser) for
further details about options.

## `cli.opd(name[, options])`

Creates an operand. In addition to the various options supported by
`posix-argv-parser`, the `options` object supports:

* `description` -- Used to print help
* `env` -- The (optional) name of the environment variable to prefer over the
  command line operand (if set)

See [posix-argv-parser](https://github.com/busterjs/posix-argv-parser) for
further details about operands.

## `cli.helpOpt(short, long[, options])`

Add a help option. If cliffold encounters the short or long option for help, it
will print help and the object passed to the `exec` callback will have
`isHandled` set to `true`. The `options` object may optionally specify `name`,
which is the name of the program and synopsis, which will both be printed in the
help output.

See `cli.opt` for what you can do with the `options` object.

## `cli.logOpt(short, long[, options])`

Add an option to specify a log file. Creates a logger that is exposed through
`cliProcess.log`, which defaults to logging to STDOUT.

See `cli.opt` for what you can do with the `options` object.

## `cli.pidFileOpt(short, long, process)`

If this argument is specified when running the CLI, Write `process.pid` to the
specified file. Attempt to remove the file when the process shuts down. You will
want to help out by adding these two listeners yourself:

```
process.on("SIGINT", function () { process.exit(); });
process.on("SIGTERM", function () { process.exit(); });
```

## `cli.exec(args, environment, function (error, cp) {});`

Parse arguments, and run your program. If any error is encountered, it will be
available in the `error` object. Typical usage:

```js
cli.exec(process.argv.slice(2), process.env, function (err, cp) {
    console.log("File is", cp.arg("--file"));
});
```

# The CLI process API

## `cp.isHandled`

Boolean. `true` if cliffold printed help.

## `cp.arg(arg)`

Get command line argument `arg`, or it's associated environment variable if
provided.

## `cp.log`

The logger object. An instance of [`Log`](https://npmjs.org/package/log).
