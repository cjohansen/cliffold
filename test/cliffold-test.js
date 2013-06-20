var buster = require("buster");
var assert = buster.assert;
var refute = buster.refute;
var cliffold = require("../lib/cliffold");
var pap = require("posix-argv-parser");
var EventEmitter = require("events").EventEmitter;
var fs = require("fs");

buster.testCase("Cliffold", {
    setUp: function () {
        var out = "";
        this.cli = new cliffold.Cli({ write: function (chunk) { out += chunk; } });
        this.cli.logOpt("-l", "--log-file", { defaultValue: this });
        this.out = function () { return out; };
    },

    "prints help": function (done) {
        this.cli.helpOpt("-h", "--help");

        this.cli.exec(["-h"], {}, done(function (error, cp) {
            assert.match(this.out(), "-h");
            assert.match(this.out(), "--help");
            assert.match(this.out(), "Print this message");
        }.bind(this)));
    },

    "prints help with name and synopsis": function (done) {
        this.cli.helpOpt("-h", "--help", {
            name: "My thing",
            synopsis: "My synopsis"
        });

        this.cli.exec(["-h"], {}, done(function (error, cp) {
            assert.match(this.out(), "My thing");
            assert.match(this.out(), "My synopsis");
        }.bind(this)));
    },

    "prints option help": function (done) {
        this.cli.helpOpt("-h", "--help");
        this.cli.opt("-s", "--shh", { description: "Be quiet" });

        this.cli.exec(["-h"], {}, done(function (error, cp) {
            assert.match(this.out(), "Be quiet");
        }.bind(this)));
    },

    "writes pid file": function (done) {
        var proc = new EventEmitter();
        proc.pid = 666;
        this.cli.pidFileOpt("-p", "--pid-file", proc);

        this.cli.exec(["-p", "/tmp/cliffold.pid"], {}, done(function (err) {
            assert(fs.existsSync("/tmp/cliffold.pid"));
            proc.emit("exit");
            refute(fs.existsSync("/tmp/cliffold.pid"));
        }.bind(this)));
    },

    "prefers env variable": function (done) {
        this.cli.opt("-s", "--shh", { env: "SHH" });

        this.cli.exec(["-s", "42"], { "SHH": 21 }, done(function (err, cp) {
            assert.equals(cp.arg("-s"), 21);
        }));
    },

    "exposes validators and types": function () {
        assert.equals(cliffold.validators, pap.validators);
        assert.equals(cliffold.types, pap.types);
    }
});
