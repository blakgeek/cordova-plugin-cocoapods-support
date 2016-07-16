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
    <name>Plugin With Pods</name>
    <author>Carlos "blakgeek" Lawton</author>
    <description>
        A Cordova/PhoneGap demostrating the use of cocoapod dependencies.
    </description>
    <keywords>cordova, ios, cocoapods</keywords>
    <license>MIT</license>
    <engines>
        <engine name="cordova" version=">=3.0.0"/>
    </engines>

    <platform name="ios">
        <pod id="FBSDKCoreKit" version="1.0.0"/>
        <pod id="FBSDKShareKit"/>
        <pod id="FBSDKLoginKit"/>
    </platform>
</plugin>
```

or have a look at [the demo plugin](https://github.com/blakgeek/cordova-plugin-withpods).


##TODO:
# update with examples of all support pod attributes (git, podspec, path, subspec, configuration(s) )
# a




