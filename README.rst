==========
Logbot 0.1
==========

Logbot is a very simple `node.js <http://github.com/ry/node>`_ IRC bot that
just logs what it sees.


Installation
============

Installation is very easy. Just clone ``https://github.com/jsocol/logbot.git``,
install the requirements (see below), edit a little text, and run!


Requirements
------------

Besides *node.js* itself, Logbot has two additional requirements:

* `node-irc <http://github.com/martynsmith/node-irc>`_
* `node-fork <https://github.com/ryantenney/node-fork>`_

Both can be installed via `npm <http://github.com/isaacs/npm>`_ very
easily::

    npm install irc
    npm install fork

The exact details of how you choose to install these requirements is up to
you.

If you want to make the logs available on the web, see "Logs on the Web,"
below.


Configuration
-------------

Once you've installed the requirements and cloned this repo, copy ``settings.js``
to ``local.settings.js`` and change whatever values you need to change.


Using Logbot
============

Normally, you don't have to do anything to use Logbot. Just let it run::

    $ ./logbot.js
    $

There are a few commands Logbot understands, if you start a message with its
IRC nick and a colon, like ``logbot: <command>``. They are:

* ``logs``: Return where to find the logs on the internet.
* ``topic``: What is the channel topic and who set it?
* ``poptopic``: Undo the last known topic change. (See below.)
* ``uptime``: How long has this logbot instance been up?
* ``botsnack``: Yum!


``poptopic``
------------

The ``poptopic`` command lets you use Logbot to undo a recent topic change,
provided:

* You're in Logbot's ``ADMINS`` list.

* Logbot is a channel op (or halfop, as long it has permission to change the
  topic).

* Logbot has seen the topic change at least once since it entered the channel.

Logbot keeps a stack of topics for each channel it's in, so you can keep
using ``poptopic`` to undo any change it's seen. Logbot only stores the topics
in memory, so if you have to restart, it won't remember old topics.


Logs on the Web
===============

Logbot dumps plain text logs into its ``/logs`` directory. The recommended
method for getting them online is to use an ``Alias`` or symlink to the
directory. For example, if I was running logbot from ``/home/james/logbot`` I
might do something like::

    Alias /irclogs /home/james/logbot/logs

in my Apache configs, somewhere.

Soon I might make the log directory configurable or add some nice-looking
output.


Known Issues
============

* Some IRC servers, at least, don't seem to send the nick along with topic
  changes, so ``logbot: topic`` results in something like: "The topic is "foo"
  set by undefined." I've noticed this with hybrid-ircd.

* For some reason, the node process seems to die after around 24 hours. I
  haven't chased this down yet.