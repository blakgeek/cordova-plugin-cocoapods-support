# cordova-plugin-cocoapod-support
Are you tired of manually adding ios dependencies in Cordova apps?  Me too.  Android has Gradle support out of the box, but
Cocoapods get no love.  That is until now.  Add this plugin as a dependency in your plugin, define your Cocoapod dependencies 
and that's it.

 
## How does it work?
It adds a hook that create the Podfile, updates the necessary configs and then runs pod update for you.

## How do I install it?

If you're like me and using [Cordova CLI](http://cordova.apache.org/):
```
cordova plugin add cordova-plugin-cocoapod-support --save
```

or

```
phonegap local plugin add cordova-plugin-cocoapod-support
```

## How do I use it?  Checkout this sample plugin.xml 
```xml
<?xml version='1.0' encoding='UTF-8'?>
<plugin id="cordova-plugin-withpods" version="1.0.0" xmlns="http://apache.org/cordova/ns/plugins/1.0">
    <name>A Plugin With Cocoapod Dependencies</name>
    <description>
        A Cordova/PhoneGap demonstrating the use of Cocoapod dependencies.
    </description>
    
    <dependency id="cordova-plugin-cocoapod-support"/>

    <platform name="ios">
        <pod id="SomePod" version="1.0.0"/>
        <pod id="GitPod1" git="https://github.com/blakgeek/something" tag="v1.0.1" configuration="debug" />
        <pod id="GitPod2" git="https://github.com/blakgeek/something" branch="wood" configurations="release,debug" />
        <pod id="GitPod3" git="https://github.com/blakgeek/something" commit="1b33368" />
    </platform>
</plugin>
```

or have a look at [the demo plugin](https://github.com/blakgeek/cordova-plugin-withpods).


##TODO:
* Update with examples of all of the supported pod attributes (git, podspec, path, subspec, configuration(s) )




