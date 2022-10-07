const https = require('https');
const qs = require('querystring');
const Aria2 = require('aria2');
const fs = require('fs');

const aria2 = new Aria2({
    host: *FILL_THIS*,
    port: *FILL_THIS*,
    secret: *FILL_THIS*
});
const api = *FILL_THIS*;

function dlurl(m, f) {
    const options = {
        hostname: 'www.humblebundle.com',
        port: 443,
        path: '/api/v1/user/download/sign' + '?' + qs.stringify({ machine_name: m, filename: f }),
        method: 'POST',
        headers: { 'Cookie': '_simpleauth_sess=' + api + ';' }
    }
    return options;
}

function catalog(i) {
    const options = {
        hostname: 'www.humblebundle.com',
        port: 443,
        path: '/client/catalog' + '?' + qs.stringify({ index: i }),
        method: 'GET',
        headers: { 'Cookie': '_simpleauth_sess=' + api + ';' }
    }
    return options;
}

var idx = 0;

var strs = [];

function enter() {
    if (idx != -1) {
        console.log("checking index " + idx);
        var rcv = "";
        const cat = https.request(catalog(idx), (res) => {
            res.on('data', (d) => {
                rcv += d;
            });
            res.on('error', (e) => {
                console.log(e + 'On Index ' + idx);
            });
            res.on('end', () => {
                const dat = rcv.toString();
                if (dat === "[]")
                    idx = -1;
                const jdat = JSON.parse(dat);
                for (var i = 0; i < jdat.length; i++) {
                    strs.push({a: jdat[i].downloads.windows.machine_name, b: jdat[i].downloads.windows.url.web, c: jdat[i].downloads.windows.md5});
                }
                if (idx != -1)
                    idx = idx + 1;
                cat1();
            });
        });
        cat.end();
    }
    else {
        console.log("all " + strs.length + "items");
        for (var i = 0; i < strs.length; i++) {
            console.log(strs[i]);
        }
        dl1();
    }
}

const eventLoopQueue = () => {
    return new Promise(resolve => 
      setImmediate(() => {
        resolve();
      })
    );
  }

 async function dl(callback, idx) {
    if(idx == strs.length ) return mfile();
    var rcv = "";
    var failed = 0;
    while (dtk <= 0 ) {await eventLoopQueue();};
    const dlc = https.request(dlurl(strs[idx].a, strs[idx].b), (res) => {
        res.on('data', (d) => {
            rcv += d;
        });
        res.on('error', (e) => {
            console.log(e + " on file" + strs[idx].a);
            failed = 1;
        });
        res.on('end', () => {
            if (failed !== 1) {
                const dat = JSON.parse(rcv.toString());
                console.log(dat);
                if (dat.signed_url != undefined) {
                    console.log("received dl link " + dat.signed_url + " for " + strs[idx].a);
                    callback(dat.signed_url, strs[idx].c);
                    if (idx < strs.length) {
                        dl(callback, idx + 1);
                    }
                } else {
                    if (idx < strs.length) {
                        dl(callback, idx + 1);
                    }
                }
            } else {
                if (idx < strs.length) {
                    dl(callback, idx + 1);
                }
            }
        });
    });
    dlc.end();
}

var dtk = 4;

function dtku() {
    console.log("received done..");
    if (dtk !== 4) {dtk = dtk + 1};
}

function dl1() {
    aria2.open().then(() => console.log("open wb")).catch(err => console.log("error wb", err));;
    aria2.on('onDownloadComplete',([guid]) => {dtku();});
    aria2.on('onDownloadError', ([guid]) => {dtku();});
    aria2.on("onDownloadStart", ([guid]) => {
        console.log("started as" , guid);
      });
    const cb = (u, c) => {
        console.log("calling aria2...");
        aria2.call("addUri", [u], { checksum: "md5=" + c });
        dtk = dtk - 1;
    }
    dl(cb, 0);
}

function mfile() {
    var data = "";
    for(var i = 0;i < strs.length; i++){
        data += strs[i].a + "|" + strs[i].b + "|" + strs[i].c + "\n";
    }
    fs.writeFileSync("metas.txt",data);
    process.exit(0);
}

enter();
