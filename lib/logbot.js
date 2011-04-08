#!/usr/bin/env node

var irc = require('irc'),
    sys = require('sys'),
    fs = require('fs'),
    nomnom = require("nomnom"),
    daemon = require('daemon'),
    TOPICS = {},
    START = new Date(),
    opts = {
        nick: {
            string: "-n NICK, --nick=NICK",
            default: "logbot",
            help: "IRC nick for the bot."
        },
        host: {
            string: "-H HOST, --host=HOST",
            default: "localhost",
            help: "IRC host to connect to."
        },
        secure: {
            string: "-S, --secure",
            help: "Use IRC over SSL."
        },
        channels: {
            string: "--channels=CHANNELS",
            default: "",
            help: "Comma-separated list of channels to join."
        },
        log_url: {
            string: "--log-url=URL",
            help: "URL for log access.",
        },
        daemonize: {
            string: "-d, --daemon",
            help: "Run as a daemon."
        }
    },
    options;

options = nomnom.parseArgs(opts);

var CHANNELS = options.channels.split(','),
    NOMS = [
        'omnomnom',
        'nom nom nom',
        'yummy!',
        '\\o/',
        'yay!',
        'mMMmmmm',
        'oh yeah',
        ];

// From Django's jsi18n.
function format(fmt, obj, named) {
    if (named) {
        return fmt.replace(/%\(\w+\)s/g, function(match){return String(obj[match.slice(2,-2)])});
    } else {
        return fmt.replace(/%s/g, function(match){return String(obj.shift())});
    }
}

function log(channel, message) {
    var filename = 'logs/%s-%s-%s-%s.txt',
        now = new Date(),
        out;
    filename = format(filename, [channel.substring(1), now.getFullYear(),
                                 now.getMonth()+1, now.getDate()]);
    out = new fs.WriteStream(filename, {
        'flags': 'a+',
        'encoding': 'utf-8',
        'mode': 0666
    });
    out.write(format('%s: %s\n', [now.toTimeString(), message]));
}

function strip(str) {
    return str.replace(/^\s+|\s+$/, '');
}

for(var i=0; i < CHANNELS.length; i++) {
    CHANNELS[i] = strip(CHANNELS[i]);
    TOPICS[CHANNELS[i]] = [];
}

var client = new irc.Client(options.host, options.nick, {
    channels: CHANNELS,
    secure: options.secure,
});

client.addListener('error', function(message) {
    console.log(message);
});

client.addListener('message', function(from, to, message) {
    var target,
        isChannel = false,
        response = false;
    if (to.indexOf('#') == 0) {  // A channel.
        target = to;
        isChannel = true;
    } else {  // A user.
        target = from;
    }

    if (isChannel) {
        log(target, format('<%s> %s', [from, message]));

        if (message.indexOf(options.nick + ': ') == 0) {
            var content = strip(message.substring(options.nick.length+2));
            switch(content) {
                case 'logs':
                    response = format('%s: %s', [from, options.log_url]);
                    break;
                case 'topic':
                    var topic = TOPICS[target][TOPICS[target].length - 1];
                    response = format('%s: The topic is "%s" set by %s.',
                                      [from, topic.topic, topic.who]);
                    break;
                case 'poptopic':
                    response = format(
                        "%s: You don't have permission to do that!",
                        [from]);
                    break;
                case 'uptime':
                    var uptime = (new Date()) - START,
                        units = 'milliseconds';
                    if (uptime > 1000) {
                        uptime = uptime / 1000;
                        units = 'seconds';
                    }
                    if (uptime > 60) {
                        uptime = uptime / 60;
                        units = 'minutes';
                    }
                    if (uptime > 60) {
                        uptime = uptime / 60;
                        units = 'hours';
                    }
                    if (uptime > 24) {
                        uptime = uptime / 24;
                        units = 'days';
                    }
                    response = format(
                        "%s: I've been up for %s %s.",
                        [from, parseInt(uptime), units]);
                    break;
                case 'botsnack':
                    response = NOMS[Math.floor(Math.random() * NOMS.length)];
                    break;
            }
            if (response) {
                client.say(target, response);
                log(target, format('<%s> %s', [options.nick, response]));
            }
        }
    } else {
        if (to == options.log_url) {  // A message for me?!
            if (message.indexOf('logs') != -1) {
                client.say(target, format('Find the logs: %s', [options.log_url]));
            }
        }
    }
});

client.addListener('join', function(channel, who) {
    log(channel, format('%s joined.', [who]));
});

client.addListener('part', function(channel, who, why) {
    log(channel, format('%s left (%s).', [who, why]));
});

client.addListener('kick', function(channel, who, by, why) {
    log(channel, format('%s was kicked by %s (%s).', [who, by, why]));
});

client.addListener('topic', function(channel, topic, who) {
    log(channel, format('Topic is "%s" (set by %s)', [topic, who]));
    TOPICS[channel].push({'topic': topic, 'who': who});
});

if (options.daemonize) {
	daemon.daemonize('daemon.log', '/tmp/logbot.pid', function(err, pid) {
		// In daemon
		if (err) return sys.puts('Error starting daemon: ' + err);

		sys.puts('Daemon started with pid: ' + pid);
	});
}
