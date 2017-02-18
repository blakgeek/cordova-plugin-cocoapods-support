#!/usr/bin/env node

var _ = require('lodash');
var fs = require('fs');
var path = require("path");
var xml2js = require('xml2js');
var spawn = require('child_process').spawn;
var parser = new xml2js.Parser();
require('shelljs/global');

module.exports = function (context) {

    if (context.opts.platforms.indexOf('ios') === -1) {
        return;
    }

    var Q = context.requireCordovaModule('q');
    var podfileContents = [];
    var rootPath = context.opts.projectRoot;
    var configXmlPath = path.join(rootPath, 'config.xml');
    var configParser = getConfigParser(context, configXmlPath);
    var appName = configParser.name();
    var oldMinVersion = configParser.getPreference('pods_ios_min_version', 'ios') ||
        configParser.getPreference('pods_ios_min_version');
    var iosMinVersion = configParser.getPreference('deployment-target', 'ios') ||
        configParser.getPreference('deployment-target') ||
        oldMinVersion || '7.0';
    var useFrameworks = configParser.getPreference('pods_use_frameworks', 'ios') || configParser.getPreference('pods_use_frameworks') || 'false';
    var podConfigPath = path.join(rootPath, 'platforms', 'ios', '.pods.json');
    var pod, podName;
    var podified = fs.existsSync(podConfigPath);
    var currentPods = podified ? JSON.parse(fs.readFileSync(podConfigPath)) : {};
    var workspaceDir = path.join(rootPath, 'platforms', 'ios', '' + appName + '.xcworkspace');
    var sharedDataDir = path.join(workspaceDir, 'xcshareddata');
    var pluginDir = context.opts.plugin.pluginInfo.dir;
    var schemesSrcDir = path.join(pluginDir, 'schemes');
    var schemesTargetDir = path.join(sharedDataDir, 'xcschemes');
    var bundlePathsToFix = [];
    var newPods = {
        pods: {},
        sources: {}
    };

    if (oldMinVersion) {
        console.warn('The preference "pods_ios_min_version" has been deprecated. Please use "deployment-target" instead.');
    }

    console.log('Searching for new pods');

    return Q.all(parsePluginXmls())
        .then(parseConfigXml)
        .then(createFiles)
        .then(installPods)
        .then(fixBundlePaths)
        .then(updateBuild);

    function parseConfigXml() {

        parser.parseString(fs.readFileSync('config.xml'), function (err, data) {

            if (data.widget.platform) {
                console.log('Checking config.xml for pods.');
                data.widget.platform.forEach(function (platform) {
                    if (platform.$.name === 'ios') {
                        (platform.pod || []).forEach(function (pod) {
                            var name = pod.$.name || pod.$.id;
                            newPods.pods[name] = pod.$;
                            console.log('config.xml requires pod: %s', name);
                        });
                    }
                });
            }
        });
    }

    function parsePluginXmls() {

        var promises = [];
        context.opts.cordova.plugins.forEach(function (id) {

            var deferred = Q.defer();

            parser.parseString(fs.readFileSync('plugins/' + id + '/plugin.xml'), function (err, data) {

                if (err) {
                    deferred.reject(err);
                } else {
                    if (data.plugin.platform) {
                        console.log('Checking %s for pods.', id);
                        data.plugin.platform.forEach(function (platform) {

                            if (platform.$.name === 'ios') {
                                if (platform.$.name === 'ios') {
                                    var podsConfig = (platform['pods-config'] || [])[0];
                                    if (podsConfig) {
                                        iosMinVersion = maxVer(iosMinVersion, podsConfig.$ ? podsConfig.$['ios-min-version'] : iosMinVersion);
                                        useFrameworks = podsConfig.$ && podsConfig.$['use-frameworks'] === 'true' ? 'true' : useFrameworks;

                                        (podsConfig.source || []).forEach(function (podSource) {
                                            console.log('%s requires pod source: %s', id, podSource.$.url);
                                            newPods.sources[podSource.$.url] = true;
                                        });
                                    }

                                    (platform.pod || []).forEach(function (pod) {
                                        var name = pod.$.name || pod.$.id;
                                        newPods.pods[name] = pod.$;
                                        console.log('%s requires pod: %s', id, name);
                                    });
                                }
                            }
                        });
                    }

                    deferred.resolve();
                }
            });

            promises.push(deferred.promise);
        });
        return promises;
    }

    function createFiles() {

        newPods.iosMinVersion = iosMinVersion;
        newPods.useFrameworks = useFrameworks === 'true';

        if (!podified || !_.isEqual(newPods, currentPods)) {

            podfileContents.push("platform :ios, '" + iosMinVersion + "'");
            if (useFrameworks === 'true') {
                podfileContents.push("use_frameworks!");
            }

            Object.keys(newPods.sources).forEach(function (podSource) {
                console.log("Adding pod source " + podSource);
                podfileContents.push("source '" + podSource + "'");
            });

            podfileContents.push("target '" + appName + "' do");

            for (podName in newPods.pods) {
                pod = newPods.pods[podName];

                var entry = "\tpod '" + podName + "'";
                if (pod['fix-bundle-path']) {
                    bundlePathsToFix.push(pod['fix-bundle-path']);
                }
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
                } else if (pod.podspec) {
                    entry += ", :podspec => '" + pod.podspec + "'";
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

            var buildConfigContext = fs.readFileSync('platforms/ios/cordova/build.xcconfig', 'utf8');
            var bridgedHeaderRegex;
            if (useFrameworks) {
                bridgedHeaderRegex = /SWIFT_OBJC_BRIDGING_HEADER/g;
                fs.writeFileSync('platforms/ios/cordova/build.xcconfig', buildConfigContext.replace(bridgedHeaderRegex, '//SWIFT_OBJC_BRIDGING_HEADER'));
            } else {
                bridgedHeaderRegex = /\/\/SWIFT_OBJC_BRIDGING_HEADER/g;
                fs.writeFileSync('platforms/ios/cordova/build.xcconfig', buildConfigContext.replace(bridgedHeaderRegex, 'SWIFT_OBJC_BRIDGING_HEADER'));

            }

            fs.writeFileSync(podConfigPath, JSON.stringify(newPods, null, '\t'));
        } else {
            console.log('No new pods detects');
        }
    }

    function installPods() {

        var deferred = Q.defer();

        if (which('pod')) {

            if (!podified || !_.isEqual(newPods, currentPods)) {
                console.log("Installing pods");
                console.log("Sit back and relax this could take a while.");
                var podInstall = spawn('pod', ['install'], {
                    cwd: 'platforms/ios'
                });
                podInstall.stdout.on('data', function (data) {
                    console.log(data.toString('utf8'));
                });
                podInstall.stderr.on('data', function (data) {
                    console.error(data.toString('utf8'));
                });
                podInstall.on('close', function (exitCode) {
                    deferred.resolve(exitCode === 0);
                });
            } else {
                deferred.resolve(false);
            }

        } else {
            console.log("\nAh man!. It doesn't look like you have CocoaPods installed.\n\nYou have two choices.\n\n1. Install Cocoapods:\n$ sudo gem install cocoapods\n2. Manually install the dependencies.");
            deferred.resolve(false);
        }

        return deferred.promise;
    }

    function fixBundlePaths(shouldRun) {

        if (bundlePathsToFix.length) {
            var podsResourcesSh = 'platforms/ios/Pods/Target Support Files/Pods-' + appName + '/Pods-' + appName + '-resources.sh';
            var content = fs.readFileSync(podsResourcesSh, 'utf8');

            bundlePathsToFix.forEach(function (path) {
                var fixedPath = appName + '.app/' + path.split('/').slice(1).join('/');
                var regex = new RegExp('(install_resource.*)' + path, 'gi');
                content = content.replace(regex, "$1" + fixedPath);

            });
            fs.writeFileSync(podsResourcesSh, content);
        }


        return shouldRun;
    }

    function updateBuild(shouldRun) {

        if (shouldRun) {
            console.log('Updating ios build to use workspace.');
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

            if (!podified) {
                console.log('Adding schemes');
                if (!test('-e', sharedDataDir)) {
                    mkdir(sharedDataDir);
                }

                if (!test('-e', schemesTargetDir)) {
                    mkdir(schemesTargetDir);
                }

                copyTpl(schemesSrcDir + '/CordovaLib.xcscheme', schemesTargetDir + '/CordovaLib.xcscheme', {
                    appName: appName
                });
                copyTpl(schemesSrcDir + '/App.xcscheme', schemesTargetDir + '/' + appName + '.xcscheme', {
                    appName: appName,
                    appId: '1D6058900D05DD3D006BFB54'
                });
            }
        }
    }

    function fixSwiftLegacy(shouldRun) {
        var directories = getDirectories(path.join(__dirname + '/../../../platforms/ios/Pods/Target Support Files')),
            podXcContents,
            SWIFT_VERSION_REGX = /SWIFT_VERSION=(?:\d*\.)\d/g;
        if (useLegacy) {
            for (var i = 0; i < directories.length; i++) {
                if (directories[i].indexOf(appName) === -1) {
                    podXcContents = fs.readFileSync('platforms/ios/Pods/Target Support Files/' + directories[i] + '/' + directories[i] + '.xcconfig', 'utf8');
                    if (podXcContents.indexOf('SWIFT_VERSION') === -1) {
                        fs.writeFileSync('platforms/ios/Pods/Target Support Files/' + directories[i] + '/' + directories[i] + '.xcconfig', podXcContents + '\n' + 'SWIFT_VERSION=' + useLegacy)
                    } else {
                        fs.writeFileSync('platforms/ios/Pods/Target Support Files/' + directories[i] + '/' + directories[i] + '.xcconfig', podXcContents.replace(SWIFT_VERSION_REGX, 'SWIFT_VERSION=' + useLegacy))
                    }
                }
            }

            console.log('Using Swift Version ' + useLegacy);
        }

        return shouldRun;
    }

    function templify(str, data) {

        return str.replace(/{[^{}]+}/g, function (key) {
            var k = key.replace(/[{}]+/g, "");
            return data.hasOwnProperty(k) ? data[k] : "";
        });
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

    function maxVer(v1, v2) {

        if (!v2) {
            return v1;
        }

        var v1Parts = v1.split('.');
        var v2Parts = v2.split('.');

        if (+v1Parts[0] > +v2Parts[0]) {
            return v1;
        } else if (+v1Parts[0] < +v2Parts[0]) {
            return v2;
        } else if (+v1Parts[1] > +v2Parts[1]) {
            return v1;
        } else {
            return v2;
        }
    }
};

