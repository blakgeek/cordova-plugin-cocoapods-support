#!/usr/bin/env node

var fs = require('fs');
var path = require("path");
var xml2js = require('xml2js');
var commandExists = require('command-exists');
var exec = require('child_process').exec
var parser = new xml2js.Parser();

module.exports = function (context) {

    console.log('Searching for new pods');
    var podfileContents = [];
    var appName = getConfigParser(context, 'config.xml').name();
    var pods = {};
    var pod, podId;

    context.opts.cordova.plugins.forEach(function (id) {
        parser.parseString(fs.readFileSync(context.opts.projectRoot + '/plugins/' + id + '/plugin.xml'), function (err, data) {

            if (data.plugin.platform) {
                data.plugin.platform.forEach(function (platform) {

                    console.log('Checking %s for pods.', id);
                    if (platform.$.name === 'ios') {
                        if (platform.$.name === 'ios') {

                            (platform.pod || []).forEach(function (pod) {
                                pods[pod.$.id] = pod.$;
                                console.log('%s requires pod: %s', id, pod.$.id);
                            });
                        }
                    }
                });
            }
        });
    });

    parser.parseString(fs.readFileSync(context.opts.projectRoot + '/config.xml'), function (err, data) {

        if (data.widget.platform) {
            data.widget.platform.forEach(function (platform) {

                if (platform.$.name === 'ios') {

                    console.log('Checking config.xml for pods.');
                    (platform.pod || []).forEach(function (pod) {
                        pods[pod.$.id] = pod.$;
                        console.log('config.xml requires pod: %s', pod.$.id);
                    });
                }
            });
        }
    });

    podfileContents.push("platform :ios, '7.0'");
    podfileContents.push("target '" + appName + "' do");

    for(podId in pods) {
        pod = pods[podId];
        var entry = "\tpod '" + pod.id + "'";
        if (pod.version) {
            entry += ", '" + pod.version + "'";
        } else if (pod.git) {
            entry += ", :git => '" + pod.git + "'";
            if (pod.tag) {
                entry += ", :tag => '" + pod.tag + "'";
            } else if (pod.branch) {
                entry += ", :branch => '" + pod.branch + "'";
            } else if (pod.commit) {
                entry += ", :commit => '" + pod.commit + "'";
            }

        } else if (pod.path) {
            entry += ", :path => '" + pod.path + "'";
        } else if (pod.subspecs) {
            var specs = pod.subspec.split(',').map(function (spec) {
                return "'" + spec.trim() + "'";
            });
            entry += ", :subspecs => [" + specs.join() + "]";
        } else if (pod.configuration) {
            entry += ", :configuration => '" + pod.configuration + "'";
        } else if (pod.configurations) {
            var configs = pod.configurations.split(',').map(function (config) {
                return "'" + config.trim() + "'";
            });
            entry += ", :subspecs => [" + configs.join() + "]";
        }
        podfileContents.push(entry);
    }
    podfileContents.push('end');
    fs.writeFileSync('platforms/ios/Podfile', podfileContents.join('\n'));

    var debugXcContents = fs.readFileSync('platforms/ios/cordova/build-debug.xcconfig', 'utf8');
    var includeRegex = /#include "Pods\/Target Support Files\/Pods-Demo\/Pods-Demo\.\w+\.xcconfig"/;
    if (!includeRegex.test(debugXcContents)) {
        fs.writeFileSync('platforms/ios/cordova/build-debug.xcconfig', debugXcContents + '\n' + '#include "Pods/Target Support Files/Pods-Demo/Pods-Demo.debug.xcconfig"');
    }
    var releaseXcContents = fs.readFileSync('platforms/ios/cordova/build-release.xcconfig', 'utf8');
    if (!includeRegex.test(releaseXcContents)) {
        fs.writeFileSync('platforms/ios/cordova/build-release.xcconfig', releaseXcContents + '\n' + '#include "Pods/Target Support Files/Pods-Demo/Pods-Demo.release.xcconfig"');
    }

    commandExists('pod', function (err, exists) {

        if (exists) {
            exec('pod update', {
                cwd: 'platforms/ios'
            }, function (err, stdout, stderr) {
                console.log(stdout);
                console.error(stderr);
            });
        } else {

            console.log("\nAh man!. It doesn't look like you have Cocoapods installed.\n\nYou have two choices.\n\n1. Install Cocoapods:\n$ sudo gem install cocoapods\n2. Manually install the dependencies.");
        }
    });
};

function getConfigParser(context, config) {
    var semver = context.requireCordovaModule('semver');
    var ConfigParser;

    if (semver.lt(context.opts.cordova.version, '5.4.0')) {
        ConfigParser = context.requireCordovaModule('cordova-lib/src/ConfigParser/ConfigParser');
    } else {
        ConfigParser = context.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser');
    }

    return new ConfigParser(config);
}
