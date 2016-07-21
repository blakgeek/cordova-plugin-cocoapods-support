#!/usr/bin/env node

var _ = require('lodash');
var fs = require('fs');
var path = require("path");
var xml2js = require('xml2js');
var commandExists = require('command-exists');
var execSync = require('child_process').execSync;
var parser = new xml2js.Parser();

module.exports = function (context) {

    if (!fs.existsSync('platforms/ios')) {
        return;
    }

    console.log('Searching for new pods');
    var podfileContents = [];
    var appName = getConfigParser(context, 'config.xml').name();
    var newPods = {};
    var podConfigPath = 'platforms/ios/.pods.json';
    var pod, podId;
    var podified = fs.existsSync(podConfigPath);
    var currentPods = podified ? JSON.parse(fs.readFileSync(podConfigPath)) : {};
    var workspaceDir = 'platforms/ios/' + appName + '.xcworkspace';
    var sharedDataDir = workspaceDir + '/xcshareddata';
    var pluginDir = context.opts.plugin.pluginInfo.dir;
    var schemesSrcDir = pluginDir + '/schemes';
    var schemesTargetDir = sharedDataDir + '/xcschemes';



    context.opts.cordova.plugins.forEach(function (id) {
        parser.parseString(fs.readFileSync('plugins/' + id + '/plugin.xml'), function (err, data) {

            if (data.plugin.platform) {
                console.log('Checking %s for pods.', id);
                data.plugin.platform.forEach(function (platform) {

                    if (platform.$.name === 'ios') {
                        if (platform.$.name === 'ios') {

                            (platform.pod || []).forEach(function (pod) {
                                newPods[pod.$.id] = pod.$;
                                console.log('%s requires pod: %s', id, pod.$.id);
                            });
                        }
                    }
                });
            }
        });
    });

    parser.parseString(fs.readFileSync('config.xml'), function (err, data) {

        if (data.widget.platform) {
            console.log('Checking config.xml for pods.');
            data.widget.platform.forEach(function (platform) {
                if (platform.$.name === 'ios') {
                    (platform.pod || []).forEach(function (pod) {
                        newPods[pod.$.id] = pod.$;
                        console.log('config.xml requires pod: %s', pod.$.id);
                    });
                }
            });
        }
    });

    if (!podified || !_.isEqual(newPods, currentPods)) {

        podfileContents.push("platform :ios, '7.0'");
        podfileContents.push("target '" + appName + "' do");

        for (podId in newPods) {
            pod = newPods[podId];
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
        var includeRegex = new RegExp('#include "Pods/Target Support Files/Pods-' + appName + '/Pods-' + appName + '\\.\\w+\\.xcconfig"');
        if (!includeRegex.test(debugXcContents)) {
            fs.writeFileSync('platforms/ios/cordova/build-debug.xcconfig', debugXcContents + '\n' + '#include "Pods/Target Support Files/Pods-' + appName + '/Pods-' + appName + '.debug.xcconfig"');
        }
        var releaseXcContents = fs.readFileSync('platforms/ios/cordova/build-release.xcconfig', 'utf8');
        if (!includeRegex.test(releaseXcContents)) {
            fs.writeFileSync('platforms/ios/cordova/build-release.xcconfig', releaseXcContents + '\n' + '#include "Pods/Target Support Files/Pods-' + appName + '/Pods-' + appName + '.release.xcconfig"');
        }

        fs.writeFileSync(podConfigPath, JSON.stringify(newPods, null, '\t'));
    } else {
        console.log('No new pods detects');
    }

    commandExists('pod', function (err, exists) {

        if (exists) {

            if (!podified || !_.isEqual(newPods, currentPods)) {
                console.log('Installing pods');
                execSync('pod update', {
                    cwd: 'platforms/ios'
                }, function (err, stdout, stderr) {
                    console.log(stdout);
                    console.error(stderr);
                });
            }

            console.log('Updating ios build to use workspace.')
            var buildContent = fs.readFileSync('platforms/ios/cordova/lib/build.js', 'utf8');
            var targetRegex = new RegExp("'-target',\\s*projectName\\s*,", 'g');
            var targetFix = "'-scheme', projectName,";
            var projectRegex = new RegExp("'-project'\\s*,\\s*projectName\\s*\\+\\s*'\\.xcodeproj'\\s*,", 'g');
            var projectFix = "'-workspace', projectName + '.xcworkspace',";
            var xcodeprojRegex = /\.xcodeproj/g;
            var xcodeprojFix = '.xcworkspace';
            var fixedBuildContent = buildContent
                .replace(targetRegex, targetFix)
                .replace(projectRegex, projectFix)
                .replace(xcodeprojRegex, xcodeprojFix);

            fs.writeFileSync('platforms/ios/cordova/lib/build.js', fixedBuildContent);

            if(!podified) {
                console.log('Adding schemes');
                fs.mkdirSync(sharedDataDir);
                fs.mkdirSync(schemesTargetDir);
                copyTpl(schemesSrcDir + '/CordovaLib.xcscheme', schemesTargetDir + '/CordovaLib.xcscheme', {
                    appName: appName
                });
                copyTpl(schemesSrcDir + '/App.xcscheme', schemesTargetDir + '/' + appName + '.xcscheme', {
                    appName: appName,
                    appId: '1D6058900D05DD3D006BFB54'
                });
            }

        } else {
            console.log("\nAh man!. It doesn't look like you have CocoaPods installed.\n\nYou have two choices.\n\n1. Install Cocoapods:\n$ sudo gem install cocoapods\n2. Manually install the dependencies.");
        }
    });
};

function templify(str, data) {

    return str.replace(/{[^{}]+}/g, function (key) {
        var k = key.replace(/[{}]+/g, "");
        return data.hasOwnProperty(k) ? data[k] : "";
    });
}

function copy(src, dest) {
    fs.writeFileSync(dest, fs.readFileSync(src, 'utf8'));
}

function copyTpl(src, dest, data) {
    fs.writeFileSync(dest, templify(fs.readFileSync(src, 'utf8'), data));
}

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
