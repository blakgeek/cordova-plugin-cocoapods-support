var fs = require('fs');
var libxml = require('libxmljs');
var version = process.env.npm_package_version;
var content = fs.readFileSync('plugin.xml');
var xml = libxml.parseXmlString(content);
xml.get('/p:plugin', {
    'p': 'http://apache.org/cordova/ns/plugins/1.0'
}).attr({
    'version': version
});

fs.writeFileSync('plugin.xml', xml.toString());
