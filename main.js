(function (global) {

  var sc,
    location = global.location,
    handle_resize = global.handle_resize,
    resize_helper = global.resize_helper,
    SpiceMainConn = global.SpiceMainConn,
    auto = false;

  function spice_query_var(name, defvalue) {
    var match = RegExp('[?&]' + name + '=([^&]*)')
      .exec(location.search);
    return match ?
      decodeURIComponent(match[1].replace(/\+/g, ' ')) : defvalue;
  }

  //This allows having two ways for auto-connection:
  //first is using spice_auto.html file and the other is
  //adding a querystring to the url named "auto" with value "1" 
  auto = (-1 < location.pathname.indexOf('auto') ||
    spice_query_var('auto') === '1');

  function spice_set_cookie(name, value, days) {
    var date, expires;
    date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toGMTString();
    document.cookie = name + '=' + value + expires + '; path=/';
  }

  function disconnect() {
    console.log('>> disconnect');
    if (sc) {
      sc.stop();
    }
    document.getElementById('connectButton').innerHTML = 'Start';
    document.getElementById('connectButton').onclick = connect;
    console.log('<< disconnect');
  }

  function spice_error(e) {
    console.error('spice_error', e);
    disconnect();
  }

  function agent_connected(sc) {
    console.log('agent_connected', sc);

    global.addEventListener('resize', handle_resize);
    global.spice_connection = this;

    resize_helper(this);
  }

  function connect() {
    var host, port, password, scheme = 'ws://',
      uri,
      token,
      path;

    if (!auto) {

      host = document.getElementById('host').value;
      port = document.getElementById('port').value;
      password = document.getElementById('password').value;

    } else {

      // By default, use the host and port of server that served this file
      host = spice_query_var('host', location.hostname);

      // Note that using the web server port only makes sense
      //  if your web server has a reverse proxy to relay the WebSocket
      //  traffic to the correct destination port.
      var default_port = location.port;
      if (!default_port) {
        if (location.protocol === 'http:') {
          default_port = 80;
        } else if (location.protocol === 'https:') {
          default_port = 443;
        }
      }
      port = spice_query_var('port', default_port);
      if (location.protocol === 'https:') {
        scheme = 'wss://';
      }

      // If a token variable is passed in, set the parameter in a cookie.
      // This is used by nova-spiceproxy.
      token = spice_query_var('token', null);
      if (token) {
        spice_set_cookie('token', token, 1);
      }

      password = spice_query_var('password', '');
      path = spice_query_var('path', 'websockify');
    }

    if ((!host) || (!port)) {
      if (auto) {
        console.log('must specify host and port in URL');
      } else {
        console.log('must set host and port');
      }
      return;
    }

    if (sc) {
      sc.stop();
    }

    uri = scheme + host + ':' + port;

    if (!auto) {
      document.getElementById('connectButton').innerHTML = 'Stop';
      document.getElementById('connectButton').onclick = disconnect;
    }

    try {
      sc = new SpiceMainConn({
        uri: uri,
        screen_id: 'spice-screen',
        dump_id: 'debug-div',
        message_id: 'message-div',
        password: password,
        onerror: spice_error,
        onagent: agent_connected
      });
    } catch (e) {
      alert(e.toString());
      disconnect();
    }
  }

  if (auto) {
    connect();
  } else {
    global.addEventListener('load', function () {
      var connectButton = document.getElementById('connectButton');
      connectButton.onclick = function () {
        connect();
      };
    });
  }

}(this));
