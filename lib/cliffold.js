var pap = require("posix-argv-parser");
var fs = require("fs");
var Log = require("log");

function formatOption(option) {
    var signature = option.signature;
    if (option.env) {
        signature += " ($" + option.env + ")";
    }

    return [signature, option.description || ""];
}

function formatDesc(description, indent) {
    var words = description.split(" ");
    var lines = [], line = "";

    words.forEach(function (word) {
        if (line.length + word.length > 80) {
            lines.push(line);
            line = "";
        }

        if (!line) { line = "        "; }
        line += word + " ";
    });

    lines.push(line);
    return lines.join("\n");
}

function formatHelp(options, name, synopsis) {
    var str = "";
    if (name) { str += name + "\n\n"; }
    if (synopsis) { str += synopsis + "\n\n"; }
    var formatted = [], used = [];

    for (var o in options) {
        if (used.indexOf(options[o]) < 0) {
            formatted.push(formatOption(options[o]));
            used.push(options[o]);
        }
    }

    return str + formatted.map(function (opt) {
        return "    " + opt[0] + "\n" + formatDesc(opt[1]) + "\n";
    }).join("\n");
}

function tryHelp(stdout, options, values) {
    if (!options.help || !values[options.help.options[0]].isSet) {
        return false;
    }

    stdout.write(formatHelp(options, options.help.name, options.help.synopsis));
    return true;
}

function CliProcess(options, values, env) {
    this.options = options;
    this.values = values;
    this.env = env;
}

CliProcess.prototype = {
    arg: function (key) {
        var envKey = this.options[key].env;
        if (this.env[envKey]) { return this.env[envKey]; }
        return this.values[key].value;
    }
};

function createPidFile(pidFile, process) {
    if (!pidFile) { return; }
    fs.writeFileSync(pidFile, process.pid);
    process.on("exit", function () { fs.unlinkSync(pidFile); });
}

function createLogger(logStream) {
    return new Log("info", logStream);
}

function createCliProcess(stdout, options, values, env) {
    var cliProcess = new CliProcess(options, values, env);

    if (options.log) {
        cliProcess.log = createLogger(cliProcess.arg(options.log.options[0]));
    }

    if (options.pidFile) {
        createPidFile(cliProcess.arg(options.pidFile.options[0]), options.pidFile.process);
    }

    if (tryHelp(stdout, options, values)) {
        cliProcess.isHandled = true;
    }

    cliProcess.formatHelp = function () {
        return formatHelp(options, options.help.name, options.help.synopsis);
    };

    return cliProcess;
}

function Cli(stdout) {
    this.args = pap.create();
    this.options = {};
    this.stdout = stdout;
}

Cli.prototype = {
    opt: function (shortOpt, longOpt, options) {
        options = options || {};
        if (options.env) { options.hasValue = true; }
        var o = this.args.createOption([shortOpt, longOpt], options);
        o.env = options.env;
        this.options[shortOpt] = o;
        this.options[longOpt] = o;
        return o;
    },

    opd: function (name, options) {
        var o = this.args.createOperand(name, options);
        o.env = options.env;
        this.options[name] = o;
        return o;
    },

    helpOpt: function (shortOpt, longOpt, options) {
        options = options || {};
        options.description = options.description || "Print this message";
        this.options.help = this.opt(shortOpt, longOpt, options);
        this.options.help.name = options.name;
        this.options.help.synopsis = options.synopsis;
        return this.options.help;
    },

    logOpt: function (shortOpt, longOpt, options) {
        options = options || {};
        options.description = options.description || "Log to this file instead of STDOUT";
        options.transform = function (value) {
            return typeof value === "string" ? fs.createWriteStream(value) : value;
        };
        this.options.log = this.opt(shortOpt, longOpt, options);
        return this.options.log;
    },

    pidFileOpt: function (shortOpt, longOpt, process) {
        this.options.pidFile = this.opt(shortOpt, longOpt, { hasValue: true });
        this.options.pidFile.process = process;
        return this.options.pidFile;
    },

    exec: function (argv, env, cb) {
        this.args.parse(argv, function (errors, values) {
            try {
                if (errors) { return cb(errors); }
                cb(null, createCliProcess(this.stdout, this.options, values, env));
            } catch (e) {
                cb(e);
            }
        }.bind(this));
    }
};

module.exports = {
    Cli: Cli,
    validators: pap.validators,
    types: pap.types
};
