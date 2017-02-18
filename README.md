# cordova-plugin-cocoapod-support
Are you tired of manually adding ios dependencies in Cordova apps?  Me too.  Android has Gradle support out of the box, but
CocoaPods get no love.  That is until now.  

With this plugin you can define plugin or project CocoaPods dependencies right in the xml.
 
After adding this plugin be sure to open the .xcworkspace in XCode instead of the .xcodeproj.

*Note*: Dependencies defined in the config.xml take precedence of dependencies defined in plugin's.

*Note*: The highest value of minimum ios version will be used and use_frameworks! will be enabled if the flag is set anywhere.
 
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
 
Plugin developers, here's a sample plugin.xml.  
```xml
<?xml version='1.0' encoding='UTF-8'?>
<plugin id="cordova-plugin-withpods" version="1.0.0" xmlns="http://apache.org/cordova/ns/plugins/1.0">
    <name>A Plugin With CocoaPods Dependencies</name>
    <description>
        A plugin demonstrating the use of CocoaPods dependencies.
    </description>
    
    <dependency id="cordova-plugin-cocoapod-support"/>

    <platform name="ios">
        <!-- optionally set minimum ios version and enable use_frameworks! -->
        <pods-config ios-min-version="9.0" use-frameworks="true">
             <!-- optionally add private spec sources -->
            <source url="git@github.com:foo/foo-specs.git"/>
            <source url="git@github.com:bar/bar-specs.git"/>
        </pods-config>
        <!-- use the latest version of a pod -->
        <pod name="LatestPod" />
        <!-- use a specific version of a pod -->
        <pod name="VersionedPod" version="1.0.0" />
        <!-- use a custom repo -->
        <pod name="GitPod1" git="https://github.com/blakgeek/something" tag="v1.0.1" />
        <pod name="GitPod2" git="https://github.com/blakgeek/something" branch="wood" />
        <pod name="GitPod3" git="https://github.com/blakgeek/something" commit="1b33368" />
        <!-- target specific configurations, this can be combined with all other options -->
        <pod name="Foobar" configuration="debug" />
        <pod name="Foobar" configurations="release,debug" />
        <!-- add a pod dependency using a custom podspec -->
        <pod name="JSONKit" podspec="https://example.com/JSONKit.podspec" />
    </platform>
</plugin>
```

App developers, here's a sample config.xml.  Entries in the config.xml will override the in the plugin.xml(s).  
This is useful if you need to resolve conflicts between plugins or if a plugin doesn't include it's iOS pod dependencies. 
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
        <!-- set platform :ios, defaults to 7.0 -->
        <preference name="pods_ios_min_version" value="8.0"/>
        <!-- add use_frameworks! to Podfile, this also disabled bridging headers -->
        <preference name="pods_use_frameworks" value="true"/>
        <!-- use the latest version of a pod -->
        <pod name="LatestPod" />
        <!-- use a specific version of a pod -->
        <pod name="VersionedPod" version="1.0.0" />
        <!-- use a custom repo -->
        <pod name="GitPod1" git="https://github.com/blakgeek/something" tag="v1.0.1" />
        <pod name="GitPod2" git="https://github.com/blakgeek/something" branch="wood" />
        <pod name="GitPod3" git="https://github.com/blakgeek/something" commit="1b33368" />
        <!-- target specific configurations, this can be combined with all other options -->
        <pod name="Foobar" configuration="debug" />
        <pod name="Foobar" configurations="release,debug" />
        <!-- add a pod dependency using a custom podspec -->
        <pod name="JSONKit" podspec="https://example.com/JSONKit.podspec" />
        <!-- if pod uses a bundle that isn't compatible with Cocoapods 1.x -->
        <pod name="BadBundle" fix-bundle-path="Bad/Path.bundle"/>
    </platform>
</widget>
```

## Troubleshooting
* If you get errors like the following.
```
error: Resource ".../Build/Products/Debug-iphonesimulator/Lock/Auth0.bundle" not found. Run 'pod install' to update the copy resources script
```
Add the fix-bundle-path attribute to the pod tag with the path after the device.  In this case:
```xml
<pod name="Lock" fix-bundle-path="Lock/Auth0.bundle"/>
```
This is caused by a bug in the later versions of CocoaPods.

or have a look at [the example plugin](https://github.com/blakgeek/cordova-plugin-cocoapods-support-example).

## Notes
* Pod "id" was deprecated in version 1.3.0.  You should use "name" instead.  But don't worry "id" will continue to work. 
I made this change to better align with the podspec.
* Enabling the pods_use_frameworks preference disables the bridged headers property added by 
[CB-10072](https://issues.apache.org/jira/browse/CB-10072).  This might cause odd behavior in some projects.  


##TODO:
* Update with examples of all of the supported pod attributes (git, podspec, path, subspec, configuration(s) )



[bad_resource]: ./bad_resource.png "Bad Resource"
[linker_error]: ./linker_error.png "Linker Error"





