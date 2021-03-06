
var express = require('express'),
	crypto = require('crypto'),
	solr = require('solr-client'),
	url = require ('url'),
	solr_url = url.parse(process.env.WEBSOLR_URL);


var client_opts = {
        path: solr_url.pathname,
        host: solr_url.hostname,
        port: 80
   };
if (solr_url.port) client_opts.port = parseInt(solr_url.port);
console.log ('client_opts :' + JSON.stringify(client_opts));
client = solr.createClient(client_opts);


var app = express();

/*
@param{ String | Object }[host='127.0.0.1']- IP address or host address of the Solr server
@param{ Number | String }[port='8983']- port of the Solr server
@param{ String }[core='']- name of the Solr core requested
@param{ String }[path='/solr']- root path of all requests

*/
/* var client = solr.createClient({host:'index.websolr.com', port: '80', path:'/solr/2f7092f7f1d'});  */

client.autoCommit = true;

app.set('views', __dirname + '/views'); 
app.set('view engine', 'mustache');
app.engine('mustache', require('hogan-middleware').__express);

app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

var CONSUMER_KEY = '3MVG9WtWSKUDG.x6WMNJldcfvliE8Ao0hpskU1Y6yOENaG2dtR0T95DNf95zzgDK5co4qPZukkp0O2IhftVHU';
var CONSUMER_SECRET = '1855091661054026942';

// Commit your changes with `waitFlush` and `waitSearcher` options.
var commitoptions = {
   waitFlush: false ,
   waitSearcher: false
};
			
app.post('/', function(req, res){
	
  console.log ('got the post from salesforce');

  var sreq = req.body.signed_request;
	// console.log (sreq);

  var sreq_split = sreq.split('.');
  var encodedSig = sreq_split[0];
  var encodedEnvelope = sreq_split[1];

  var json_envelope = new Buffer(encodedEnvelope, 'base64').toString();
  console.log ('json envelope : ' + json_envelope);

  /* TODO --verify signiture

  var decode_sig = new Buffer(encodedSig, 'base64').toString('utf-8')

  var decipher = crypto.createDecipher('aes-128-ecb', CONSUMER_SECRET);
  chunks = []
	chunks.push( decipher.update( new Buffer(encodedEnvelope, "base64").toString("binary")) );
	chunks.push( decipher.final('binary') );
	var txt = chunks.join("");
	txt = new Buffer(txt, "binary").toString("utf-8");

	console.log ('txt : ' + txt);
	console.log ('decode_sig : ' + decode_sig);
  */

  res.render('index', {title: 'hello', signedreq : json_envelope});
});

app.get('/go', function(req, res){
	res.render ('index');
});

app.get('/account', function(req, res){
	var sstr = req.query.txt,
	    rows = req.query.rows,
	    filters = req.query.filters;
	    
	console.log ('searching for  : ' + sstr + ', rows : ' + rows + ', filters : ' + JSON.stringify(filters));
	
	if (sstr == null || sstr == '') sstr = '*'; 
	else if (sstr.indexOf('*', sstr.length - 1) === -1) sstr = sstr + '*'; 
	
	var query = client.createQuery()
		.q(sstr)
		.edismax()
		//.qf({Name_s:1,Codes__ss:1,Title_s:1,CV_Details_s:0.5,Phone_s:0.5,Email_s:0.5})
		.qf({Name_s:1,Title_s:1})
		.fl('*')
		.facet({field: ['Codes_ss', 'MailingState_s']})
		.rows(rows)
		.set('lowercaseOperators=true');
		

	if (filters != null) {
		var filts = JSON.parse(filters);
		for (var idx =0; idx < filts.length; idx++) {
			console.log ('adding filter ' + filts[idx].field + ' : ' +  filts[idx].val);
			query.matchFilter(filts[idx].field, '"'+filts[idx].val+'"');
		}
	}
	
	client.search(query,function(err,obj){
		if(err){
		   	res.send(500, { error: 'something blew up' + err});
		}else{
			console.log ('searching got  : ' + JSON.stringify(obj));
		   	res.json(obj);
		}
	});
});
app.post('/account/:id', function(req, res){
	var acc = req.body;
	console.log ('Saving Document : ' + JSON.stringify(acc));
	client.add(acc, function(err,obj) {
		if(err){
			res.send(500, { error: 'something blew up' + err});
		}else{

			client.commit(commitoptions);
			console.log ('Saving Document Success : ' + JSON.stringify(obj));
			res.send(200);
		}
	});
	
});

app.post('/account', function(req, res){
	var accs = req.body;
	console.log ('Saving Documents : ' + JSON.stringify(accs));
	client.add(accs, function(err,obj) {
		if(err){
			res.send(500, { error: 'something blew up' + err});
		}else{
			console.log ('Saving Documents Success : ' + JSON.stringify(obj));
			res.send(200);
		}
	});
	
});

app.listen(process.env.PORT);
console.log('Listening on port ' + process.env.PORT);
