# PS_Bramus.GoogleMapsTileCutter

Photoshop Google Maps Tile Cutter
Built by Bramus! - [http://www.bram.us/](http://www.bram.us/)


## About

`PS_Bramus.GoogleMapsTileCutter` is a Photoshop script that cuts image tiles from any image for direct use with Google Maps.


![Photoshop Google Maps Tile Cutter](http://bramus.github.io/photoshop-google-maps-tile-cutter/screenshots/tilecutter-main.png)

## Installation

* Download and extract `PS_Bramus.GoogleMapsTileCutter`
* Move `PS_Bramus.GoogleMapsTileCutter.jsx` to your Photoshop scripts directory
	* For Photoshop CS6 on Mac OS X this is `/Applications/Adobe Photoshop CS6/Presets/Scripts`
	* For Photoshop CS6 on Windows this is `C:\Program Files\Adobe\Adobe Photoshop CS6\Presets\Scripts`
* Restart Photoshop if it was already running


## How to use

### Cutting tiles

* Open Photoshop and open the image you want to process.
* Access the script from the scripts menu in Photoshop: `File` > `Scripts` > `PS_Bramus.GoogleMapsTileCutter`.
* Set the export path and cutter settings, and press `Make tiles` to start the cutting process.
* The script will start carving the tiles for as many zoom levels as possible.
	* During this phase it will look like Photoshop is going berzerk, this is normal, as it is.
	* Depending on the size of the image it might be a good idea to take that coffee break.
* When the script has finished carving, you will find the tiles in the folder you've selected before.

### Implementing the tiles

The resulting tiles can be used directly in Google Maps by setting up [a custom map type](https://developers.google.com/maps/documentation/javascript/maptypes#CustomMapTypes), using [a `google.maps.ImageMapType` instance](https://developers.google.com/maps/documentation/javascript/maptypes#ImageMapTypes)

A fully working example is included in the `examples` directory that came with the download of `PS_Bramus.GoogleMapsTileCutter`.

A live example is available at [http://bramus.github.io/photoshop-google-maps-tile-cutter/example/](http://bramus.github.io/photoshop-google-maps-tile-cutter/example/)


## Notes

* The included example and Google Maps documentation referenced is for Google Maps Version 3.
* `PS_Bramus.GoogleMapsTileCutter` will resize the canvas to being a square one, as this is easier to process and implement
 * A result is that extra (empty) tiles would be generated. By default this is prevented, yet you can change this setings in the UI window.


## Credits

`PS_Bramus.GoogleMapsTileCutter` is based upon the [Automatic Tile Cutter](http://mapki.com/mediawiki/index.php?title=Automatic_Tile_Cutter#Updated_Script) by [Will James](http://onNYTurf.com), [Curtis Wyatt](http://gocalipso.com/), and [Nate Bundy](http://www.lemonrage.com/).

Basically `PS_Bramus.GoogleMapsTileCutter` is an improved, cleaned up version of their work.

The UI Additions were initially provided by [Nick Springer](http://www.springercartographics.com/).