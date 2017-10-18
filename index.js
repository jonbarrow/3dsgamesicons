let http = require("http"),
    https = require("https"),
    path = require("path"),
    fs = require('fs-extra'),
    request = require('request'),
    async = require('async'),
    xml = require('pixl-xml'),
    types = ['names', 'product_codes', 'title_ids', 'eshop_ids'],
    samurai_url = 'samurai.wup.shop.nintendo.net',
    ninja_url = 'ninja.ctr.shop.nintendo.net',
    ctrCommonCert = {
        key: fs.readFileSync(__dirname + "/ctr-common.key"),
        cert: fs.readFileSync(__dirname + "/ctr-common.crt")
    };

for (let type of types) {
    fs.ensureDirSync(path.join('icons', type));
}

apiRequest(samurai_url, '/samurai/ws/US/titles?limit=9999999', (error, body) => {
    let head_xml = xml.parse(body),
        threeDS_titles = head_xml.contents.content.filter(item => {return item.title.product_code.substring(0, 3) == 'CTR' && item.title.icon_url});
    
    let queue = async.queue((title, callback) => {
        apiRequest(ninja_url, '/ninja/ws/US/title/' + title.title.id + '/ec_info', (error, body) => {
            let ec_xml = xml.parse(body),
                tid = ec_xml.title_ec_info.title_id,
                product_code = title.title.product_code,
                eshop_id = title.title.id,
                name_path = path.join('icons', 'names', title.title.name.replace(/[^\w\s]/gi, '').replace(/\n/gi, ' ').replace(/\r/gi, ' ') + '.png'),
                pc_path = path.join('icons', 'product_codes', product_code + '.png'),
                tid_path = path.join('icons', 'title_ids', tid + '.png'),
                eshop_path = path.join('icons', 'eshop_ids', eshop_id + '.png');

                request({
                    method: "GET", 
                    rejectUnauthorized: false, 
                    url: title.title.icon_url
                })
                .pipe(fs.createWriteStream(name_path))
                .on('close', () => {
                    fs.copySync(name_path, pc_path);
                    fs.copySync(name_path, tid_path);
                    fs.copySync(name_path, eshop_path);
                    console.log(title.title.icon_url);
                    callback();
                });
        });
    });

    queue.drain = () => {
        console.log('Done');
    }

    queue.push(threeDS_titles)
});

function apiRequest(uri, path, cb) {
    https.request({
        key: ctrCommonCert.key,
        cert: ctrCommonCert.cert,
        rejectUnauthorized: false,
        host: uri,
        path: path,
        port: 443
    }, (res) => {
        var data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            cb(null, data);
        });
    }).on('error', (error) => {
        cb(error, null);
    }).end();
}