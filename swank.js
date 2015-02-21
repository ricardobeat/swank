'use strict';

var path        = require('path');
var os          = require('os');
var url         = require('url');
var http        = require('http');
var connect     = require('connect');
var serveStatic = require('serve-static');
var morgan      = require('morgan');
var liveReload  = require('connect-livereload');
var tinylr      = require('tiny-lr');
var watch       = require('watch');
var nopt        = require('nopt');
var colors      = require('colors');


var serve = function(opts, callback){
/*
  Takes in an object like this (all optional, defaults shown):
    {
      path: '.',
      port: 8000,
      help: false,
      ngrok: false,
      watch: false,
      log: true,
      liveReload: {}
    }

  Returns a callback when the server is ready with two arguments
    function(error, warning, url)
*/

  opts = opts || {};
  if(typeof callback !== 'function'){
    callback = function(){}; // no-op
  }

  //start by returning usage info if requested
  if(opts.help && opts.console){
    console.log(
      'Usage: swank [[--ngrok | -n]] [[--watch | -w]] [[--no-log]] [[--port | -p PORT]] [[ [[--path | -d]] root_directory]]\n\n'+
      '--ngrok: pipe your server through [ngrok\'s](https://www.npmjs.org/package/ngrok) local tunnel\n'+
      '--watch: a watch+livereload server. Includes `livereload.js` in HTML files, starts the livereload server, and watches your'+
        'directory, causing a reload when files change\n'+
      '--no-log: disable logging of requests\n'+
      '--port: specify the local port to use. Defaults to $PORT or 8000\n'+
      '--path: the path to the root directory of the server. Defaults to the current working directory\n\n'
    );
    return;
  }

  //start server
  var app = connect();
  if(log){
    
  }
  if(opts.watch){

    if(ngrok){ //open another tunnel to that port
      ngrok.connect({port: liveReloadOpts.port}, function (err, server_url){
        liveReloadOpts.hostname = url.parse(server_url).hostname;
        liveReloadOpts.port     = url.parse(server_url).port;

        app.use(liveReload(liveReloadOpts));                    //inject script into pages
        tinylr().listen(liveReloadOpts.port, function (){        //start respond server
          watch.watchTree(dir, function (f, curr, prev) {      //when a file changes, cause a reload
            if (typeof f === 'object' && prev === null && curr === null) {
             // Finished walking the tree
            } else {
              var liveReloadURL = url.format({
                protocol: 'http',
                hostname: host,
                port: liveReloadOpts.port,
                pathname: '/changed',
                query: {files: f}
              });
              if(log){
                console.log(("File changed: "+f).blue);
              }
              http.get(liveReloadURL);
            }
          });
        });
      });
    }else{

    }

  }


  if(ngrok){
    ngrok.connect({port: port}, function (err, server_url){
      callback(err, warning, server_url);
    });
  }else{
    callback(null, warning, url.format({
      protocol: 'http',
      hostname: host,
      port: port
    }));
  }
};

serve.app = conect();

serve.setDefaults = function (opts, errs, callback){
  //defaults
  opts.path = opts.path || __dirname; //default to CWD
  opts.port = opts.port || process.env.PORT || 8000;
  opts.host = (os.hostname()||'localhost');
  opts.log  = (opts.log === undefined ? (opts.console ? true : false) : opts.log);

  opts.liveReload       = opts.liveReload || {};
  opts.liveReload.port  = opts.liveReload.port || 35729;

  if(opts.ngrok){
    try{
      opts.ngrok = require('ngrok');
    }catch(err){
      errs.push('ngrok is optional and not installed automatically. Run `npm install ngrok` to use this feature.');
    }
  }
  callback(opts, errs);
}

serve.watch = function (opts, errs, callback){
  app.use( liveReload(opts.liveReload) );                     //inject script into pages
  tinylr().listen(opts.liveReload.port, function (){          //start respond server
    watch.watchTree(dir, function (f, curr, prev) {           //when a file changes, cause a reload
      if (typeof f === 'object' && prev === null && curr === null) {
       callback(opts, errs);                                  // Finished walking the tree
      } else {
        var liveReloadURL = url.format({
          protocol: 'http',
          hostname: host,
          port: liveReloadOpts.port,
          pathname: '/changed',
          query: {files: f}
        });
        if(opts.log){
          console.log(("File changed: "+f).blue);
        }
        http.get(liveReloadURL);
      }
    });
  });
}

serve.tunnel = function (opts, errs, callback){
  if(!opts.ngrok){
    callback(opts, errs);
  }
  opts.ngrok.connect({port: opts.port}, function (err, server_url){
    if(err){
      errs.push(err);
      // otps.host = url
      callback(opts, errs);
    }
  });
}

serve.add_logger = function (opts, errs, callback){
  app.use(morgan('combined'));
  callback(opts, errs);
}

serve.start = function (opts, callback){
  serve.app.listen(opts.port);
  app.use(serveStatic(dir));
  http.createServer(app).listen(port);
  callback(opts, []);
}


// run with command line arguments
serve.process_args = function (){
  var knownOpts = {
    'port'  : Number,
    'path'  : path,
    'help'  : Boolean,
    'log'   : Boolean,
    'ngrok' : Boolean,
    'watch' : Boolean
  };

  var shortHands = {
    'p': '--port',
    'd': '--path',
    'h': '--help',
    'l': '--log',
    'n': '--ngrok',
    'w': '--watch',
    'usage': '--help'
  };

  var opts = nopt(knownOpts, shortHands);
  opts.console = true; // run from the command-line

  //take path if not given explicitly
  if(!opts.path && opts.argv.remain.length > 0){
    opts.path = path.resolve(opts.argv.remain.join(' '));
  }
  serve(opts, function(error, warning, url){
    if(error){
      console.log(('ERROR: '+error).red);
    }else if(warning){
      console.log(('WARNING: '+warning).yellow);
    }else{
      console.log(('\n>  '+url+'\n\n').green);
    }
  });
};

module.exports = serve; // You can use this as a module now, too