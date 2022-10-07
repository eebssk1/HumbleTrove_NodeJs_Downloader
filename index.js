const https = require('https');
const qs = require('querystring');
const Aria2 = require('aria2');
const fs = require('fs');

const aria2 = new Aria2({
    host: * FILL_THIS *,
    port: * FILL_THIS *,
    secret: * FILL_THIS *
});
const api = * FILL_THIS *;

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
                    strs.push({ a: jdat[i].downloads.windows.machine_name, b: jdat[i].downloads.windows.url.web, c: jdat[i].downloads.windows.md5, d: jdat[i].image, e: jdat[i]['human-name'] });
                }
                if (idx != -1)
                    idx = idx + 1;
                enter();
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
    if (idx == strs.length) return mfile();
    var rcv = "";
    var failed = 0;
    while (dtk <= 0) { await eventLoopQueue(); };
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
                    callback(dat.signed_url, idx);
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

var dtk = 6;

function dtku() {
    console.log("received done..");
    if (dtk !== 6) { dtk = dtk + 1 };
}

function dl1() {
    aria2.open().then(() => console.log("open wb")).catch(err => console.log("error wb", err));;
    aria2.on('onDownloadComplete', ([guid]) => { dtku(); });
    aria2.on('onDownloadError', ([guid]) => { dtku(); });
    aria2.on("onDownloadStart", ([guid]) => {
        console.log("started as", guid);
    });
    const cb = (u, i) => {
        console.log("calling aria2...");
        aria2.call("addUri", [u], { checksum: "md5=" + strs[i].c });
        aria2.call("addUri", [strs[i].d], { 'allow-overwrite': true, out: strs[i].a + '.png' });
        dtk = dtk - 2;
    }
    dl(cb, 0);
}

function mfile() {
    var data = "<!DOCTYPE html>" + '\n' + "<html>" + '\n' + "<body>" + '\n';
    for (var i = 0; i < strs.length; i++) {
        data += "<div align=\"center\">" + '\n';
        data += "<h1>" + strs[i].e + "</h1>" + '\n';
        data += "<h3> Machine Name </h3>" + '\n';
        data += "<p>" + strs[i].a + "</p>" + '\n';
        data += "<h3> Res Path </h3>" + '\n';
        data += "<p>" + strs[i].b + "</p>" + '\n';
        data += "<h3> Md5 Sum </h3>" + '\n';
        data += "<p>" + strs[i].c + "</p>" + '\n';
        data += "<h5> Picture </h5>" + '\n';
        data += "<image src=\"" + strs[i].a + '.png' + "\">" + '\n';
        data += "<h5> Description </h5>" + '\n';
        data += strs[i].f;
        data += "</div>" + '\n';
    }
    data += "</body>" + '\n' + "</html>";
    fs.writeFileSync("metas.html", data);
    process.exit(0);
}

enter();
