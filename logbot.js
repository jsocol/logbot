#!/usr/bin/env node

var irc = require('irc'),
    fs = require('fs'),
    daemonize = require('fork').daemonize,
    TOPICS = {},
    START = new Date(),
    settings = require('./local.settings');

var NICK = settings.NICK || 'logbot',
    SERVER = settings.SERVER || 'localhost',
    SECURE = settings.SECURE || false,
    CHANNELS = settings.CHANNELS || [],
    ADMINS = settings.ADMINS || [],
    LOG_URL = settings.LOG_URL || 'http://localhost/logs/',
    DAEMONIZE = settings.DAEMONIZE || false,
    NOMS = settings.NOMS || [
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
    var filename = 'logs/%s-%s-%s-%s',
        now = new Date(),
        out;
    filename = format(filename, [channel.substring(1), now.getFullYear(),
                                 now.getMonth(), now.getDate()]);
    out = new fs.WriteStream(filename, {
        'flags': 'a+',
        'encoding': 'utf-8',
        'mode': 0666
    });
    out.write(format('%s: %s\n', [now.toTimeString(), message]));
}

for(var i=0; i < CHANNELS.length; i++) {
    TOPICS[CHANNELS[i]] = [];
}

var client = new irc.Client(SERVER, NICK, {
    channels: CHANNELS,
    secure: SECURE,
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

        if (message.indexOf(NICK + ': ') == 0) {
            var content = message.substring(NICK.length+2).replace(/^\s+|\s+$/, '');
            switch(content) {
                case 'logs':
                    response = format('%s: %s', [from, LOG_URL]);
                    break;
                case 'topic':
                    var topic = TOPICS[target][TOPICS[target].length - 1];
                    response = format('%s: The topic is "%s" set by %s.',
                                      [from, topic.topic, topic.who]);
                    break;
                case 'poptopic':
                    if (ADMINS.indexOf(from) != -1) {
                        if (TOPICS[target].length > 1) {
                            TOPICS[target].pop();
                            var topic = TOPICS[target][TOPICS[target].length - 1];
                            client.send('TOPIC', target, topic.topic);
                        } else {
                            response = format(
                                "%s: I haven't seen the topic change since I've been up.",
                                [from]);
                        }
                    } else {
                        response = format(
                            "%s: You don't have permission to do that!",
                            [from]);
                    }
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
                log(target, format('<%s> %s', [NICK, response]));
            }
        }
    } else {
        if (to == NICK) {  // A message for me?!
            if (message.indexOf('logs') != -1) {
                client.say(target, format('Find the logs: %s', [LOG_URL]));
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

if (DAEMONIZE) {
    daemonize();
}
