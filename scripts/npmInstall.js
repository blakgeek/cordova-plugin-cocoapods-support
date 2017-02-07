var exec = require('child_process').execSync;

module.exports = function(context) {

    exec('npm install', {
        cwd: context.opts.plugin.pluginInfo.dir
    });
};