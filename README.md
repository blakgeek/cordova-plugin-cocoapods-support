# cordova-plugin-cocoapod-support
Are you tired of manually adding ios dependencies in Cordova apps?  Me too.  Android has Gradle support out of the box, but
CocoaPods get no love.  That is until now.  

With this plugin you can define your plugin or project CocoaPods dependencies right in your xml. 

Note: dependencies defined in the config.xml take precedence of dependencies defined in plugin's.
 
## How does it work?
It looks for &lt;pod&gt; entries the config.xml and plugin.xml, creates the Podfile, updates the necessary configs and 
then runs pod update for you.

## How do I install it?

If you're like me and using [Cordova CLI](http://cordova.apache.org/):
```
cordova plugin add cordova-plugin-cocoapod-support --save
```

or

```
phonegap local plugin add cordova-plugin-cocoapod-support
```

## How do I use it?  
 
In a plugin's plugin.xml 
```xml
<?xml version='1.0' encoding='UTF-8'?>
<plugin id="cordova-plugin-withpods" version="1.0.0" xmlns="http://apache.org/cordova/ns/plugins/1.0">
    <name>A Plugin With CocoaPods Dependencies</name>
    <description>
        A plugin demonstrating the use of CocoaPods dependencies.
    </description>
    
    <dependency id="cordova-plugin-cocoapod-support"/>

    <platform name="ios">
        <pod id="LatestPod" />
        <pod id="VersionedPod" version="1.0.0" />
        <pod id="GitPod1" git="https://github.com/blakgeek/something" tag="v1.0.1" configuration="debug" />
        <pod id="GitPod2" git="https://github.com/blakgeek/something" branch="wood" configurations="release,debug" />
        <pod id="GitPod3" git="https://github.com/blakgeek/something" commit="1b33368" />
    </platform>
</plugin>
```

In a project's config.xml
```xml
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.blakgeek.cordova.superdopeness" version="0.0.1" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>CocoapodsDemo</name>
    <description>
        An app demonstrating the use of CocoaPods dependencies.
    </description>
    <content src="index.html" />
    <access origin="*" />
    <platform name="ios">
        <pod id="LatestPod" />
        <pod id="VersionedPod" version="1.0.0" />
        <pod id="GitPod1" git="https://github.com/blakgeek/something" tag="v1.0.1" configuration="debug" />
        <pod id="GitPod2" git="https://github.com/blakgeek/something" branch="wood" configurations="release,debug" />
        <pod id="GitPod3" git="https://github.com/blakgeek/something" commit="1b33368" />
    </platform>
```

or have a look at [the demo plugin](https://github.com/blakgeek/cordova-plugin-withpods).




##TODO:
* Update with examples of all of the supported pod attributes (git, podspec, path, subspec, configuration(s) )



[bad_resource]: ./bad_resource.png "Bad Resource"
[linker_error]: ./linker_error.png "Linker Error"





