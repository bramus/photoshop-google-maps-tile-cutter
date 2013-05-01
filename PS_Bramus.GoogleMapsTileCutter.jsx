﻿/*
 * Photoshop Google Maps Tile Cutter
 * By Bramus Van Damme - http://www.bram.us/
 *
 * Based upon work by Will James (http://onNYTurf.com), Curtis Wyatt (http://gocalipso.com/), and Nate Bundy (http://www.lemonrage.com/)
 *
 * UI by Nick Springer, http://www.springercartographics.com
 */

// **** Options UI

var res =
"dialog { text:'Google Maps Tile Cutter', alignChildren: 'fill', \
	exportDirs: Panel { orientation:'column', alignChildren:['left','top'], \
		grpExport: Group {orientation:'row',alignment:'left', \
			btnExportPath: Button {text:'Tiles Export Folder...'}, \
			stExportPath: EditText {text:'',characters:50,enabled:false} }\
		grpText: Group {orientation:'row',alignment:'left', \
			lblWarning: StaticText {text:'You must select an export directory to begin',visible:false}}\
		}\
	exportOptions: Panel { orientation:'column', alignChildren:['left','top'], \
		grpFiletype: Group {orientation:'row',alignment:'left', \
			optJPEG: RadioButton {text:'JPEG tiles',value:true}, \
			optPNG: RadioButton {text:'PNG tiles'},\
			optGIF: RadioButton {text:'GIF tiles'}}\
		grpSize: Group {orientation:'row',alignment:'left', \
               lblSize: StaticText {text:'Tile Size:'},\
               strSize: EditText {text:'256',characters:4,enabled:true},\
               lblBg: StaticText {text:'Background Color:'},\
               strBg: EditText {text:'"+ app.backgroundColor.rgb.hexValue + "',characters:6,enabled:true}}\
		}\
	buttons: Group { orientation: 'row', alignment: 'right', \
		txtCancel: StaticText { text:'Press ESC to cancel' }, \
		okBtn: Button { text:'Make Tiles', properties:{name:'ok'}} \
	} \
}"
var win = new Window (res, 'Google Maps Tile Cutter',undefined,{closeButton: false}); 
win.center(); 

win.exportDirs.grpExport.btnExportPath.onClick = function() {
		tempFolder = Folder.selectDialog();
		if(tempFolder != null) {
			win.exportDirs.grpExport.stExportPath.text = tempFolder.fsName;
			enableUI();
			}
	}

function enableUI() {
		win.buttons.okBtn.enabled = true;
		win.exportDirs.grpText.lblWarning.visible = false;
	}

function disableUI () {
		win.buttons.okBtn.enabled = false;
		win.exportDirs.grpText.lblWarning.visible = true;
	}

win.onShow = function() {
    if (win.exportDirs.grpExport.stExportPath.text=="") {
		disableUI ();
	}
}

win.buttons.okBtn.onClick = function ()  {
// **** CONFIG - FEEL FREE TO ADJUST

    // path where to save the tiles
    var targetPath = win.exportDirs.grpExport.stExportPath.text + "\\"; // be sure to include the trailing slash!

    // size of the tiles - default Google Maps size: 256
    var TILE_SIZE = +win.exportOptions.grpSize.strSize.text;

    // In which format(s) should be save the tiles? - default: jpg only
    var saveJPEG = win.exportOptions.grpFiletype.optJPEG.value;
    var savePNG = win.exportOptions.grpFiletype.optPNG.value;
    var saveGIF = win.exportOptions.grpFiletype.optGIF.value;

    // wanted backgroundcolor to fill in the blanks when resizing the image
    var bgColor = win.exportOptions.grpSize.strBg.text;

// **** HELPER FUNCTIONS - DON'T TOUCH!

    // Takes a snapshot
    function takeSnapshot() {
       var desc153 = new ActionDescriptor();
       var ref119 = new ActionReference();
       ref119.putClass(charIDToTypeID("SnpS")); // Snapshot
       desc153.putReference(charIDToTypeID("null"), ref119 );
       var ref120 = new ActionReference();
       ref120.putProperty(charIDToTypeID("HstS"), charIDToTypeID("CrnH") ); // Historystate, CurrentHistorystate
       desc153.putReference(charIDToTypeID("From"), ref120 ); // From Current Historystate
       executeAction(charIDToTypeID("Mk  "), desc153, DialogModes.NO );
    }

    // deletes the current active snapshot
    function deleteCurrentSnapshot() {
        var ref = new ActionReference();
        ref.putProperty(charIDToTypeID("HstS"), charIDToTypeID("CrnH"));
        var desc = new ActionDescriptor();
        desc.putReference(charIDToTypeID("null"), ref );
        executeAction(charIDToTypeID("Dlt "), desc, DialogModes.NO );
    }

    // reversts to a given snapshot
    function revertToSnapshot(doc, snapshotID) {
      doc.activeHistoryState = doc.historyStates[snapshotID];
    }

    // get id of the last snapshot
    function getLastSnapshotID(doc) {
       var hsObj = doc.historyStates;
       var hsLength = hsObj.length;
       for (var i = hsLength-1; i > -1; i--) {
           if(hsObj[i].snapshot) {
               return i;
               break;
           }
       }
    }

    // get all visible layers
    function getVisibleLayers(doc) {
        var tempArray = new Array();
        for (var i = 0; i < doc.layers.length; i++)
        {
            if (doc.layers[i].visible)
                tempArray.push(i);
        }
        return tempArray;
    }

    // check if a layer is empty
    function isLayerEmpty(doc, layer) {
      if (!doc) {
        doc = app.activeDocument;
      }
      if (!layer) {
        layer = doc.activeLayer;
      }
      return parseInt(layer.bounds.toString().replace(/\D/g,"")) == 0;
    }

    // check if visibile layers are empty
    function visibleLayersEmpty(doc) {
        var bool = true;
        if (!doc) {
            doc = app.activeDocument;
        }
        for (var i = 0; i < visibleLayers.length; i++)
        {
            bool = isLayerEmpty(doc, doc.layers[visibleLayers[i]]);
            if (!bool)
                return bool;
        }
        return bool;
    }



// **** MAIN CORE - DON'T TOUCH!

    // No active document, stop here
    if (app.documents.length === 0) {
        alert("Please open a file", "TileCutter Error", true);
        app.beep();
    }

    // Active document and folder exists, process it
    else {

        // Make sure targetPath exists
        var targetFolder = new Folder(targetPath);
        if (!targetFolder.exists) targetFolder.create();

        // Make sure we're using pixels
        var startRulerUnits = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // Active document shorthand
        var curDoc = app.activeDocument;

        // Define max tile dimensions
        var maxTileDim = Math.ceil(Math.max(curDoc.width.value, curDoc.height.value) / TILE_SIZE);

        // Define max and min zoom level
        var minZoomLevel = 0,
            maxZoomLevel = 0;
        do {
            maxZoomLevel++;
        } while (Math.pow(2, maxZoomLevel) < maxTileDim);

        // Store initial state
        var InitialSnapshotID = getLastSnapshotID(curDoc);

        // keep track of all other snapshots
        var snapshots = [];

        // Resize to a square version & center image - this way we get an image size that's easily tileable (512, 1028, 2048, 4096, ...)
        var bgColorHex = new SolidColor();
        bgColorHex.rgb.hexValue = bgColor;
        app.backgroundColor = bgColorHex;
        curDoc.resizeCanvas(TILE_SIZE * Math.pow(2, maxZoomLevel), TILE_SIZE * Math.pow(2, maxZoomLevel), AnchorPosition.MIDDLECENTER);

        // Find the visible layers
        var visibleLayers = getVisibleLayers(curDoc);

        // Store current zoom level
        var ZoomLevel = maxZoomLevel;

        // Do the following for each zoom level the user wants
        while (ZoomLevel >= minZoomLevel)
        {

            // Resize the canvas to fit the zoom level (50% per zoom level step)
            if (ZoomLevel < maxZoomLevel) {
                curDoc.resizeImage(curDoc.width.value * 0.5, curDoc.height.value * 0.5);
            }

            // Take a snapshot for this zoom level and store it
            takeSnapshot();
            snapshots.push(getLastSnapshotID(curDoc));

            // Calculate the number of tiles we'll need
            var numTilesX = parseInt(curDoc.width.value, 10) / TILE_SIZE; // num tiles on the x axis
            var numTilesY = parseInt(curDoc.height.value, 10) / TILE_SIZE; // num tiles on the y axis
            var numTilesTotal = numTilesX * numTilesY; // total tiles (numTilesX * numTilesY)

            // Counters to track which x value and which y value we are on in our image tile grid
            var curTileX = 0;
            var curTileY = 0;

            // Cut 'em up
            // For each tile we need to make, we repeat each step in this loop
            for (n = 1; n < numTilesTotal + 1; n++)
            {
                // We cut up tiles column by column
                // I.E. we cut up all the tiles for a given x value before moving on to the next x value.
                // We do this by checking if the y value we are on is the last tile in a column
                // We compare our y counter to our total y number of Tiles, if they are the same is we do the following
                if (parseInt(curTileY, 10) == parseInt(numTilesY, 10))
                {
                    curTileX += 1; // move to next column
                    curTileY = 0; // start back at the top
                }

                // Crop out needed square tile
                curDoc.crop(Array(curTileX * TILE_SIZE, curTileY * TILE_SIZE, curTileX * TILE_SIZE + TILE_SIZE, curTileY * TILE_SIZE + TILE_SIZE));

                if (!visibleLayersEmpty(curDoc))
                {

                    //Save the file
                    if (saveGIF)
                    {
                        //Set path to file and file name
                        saveFile = new File(targetPath + ZoomLevel + "_" + curTileX + "_" + curTileY + ".gif");
                        //Set save options
                        gifSaveOptions = new GIFSaveOptions();
                        gifSaveOptions.colors = 64;
                        gifSaveOptions.dither = Dither.NONE;
                        gifSaveOptions.matte = MatteType.NONE;
                        gifSaveOptions.preserveExactColors = 0;
                        gifSaveOptions.transparency = 1;
                        gifSaveOptions.interlaced = 0;
                        curDoc.saveAs(saveFile, gifSaveOptions, true, Extension.LOWERCASE);
                    }

                    if (savePNG)
                    {
                        //Set path to file and file name
                        saveFile = new File(targetPath + ZoomLevel + "_" + curTileX + "_" + curTileY + ".png");
                        pngSaveOptions = new PNGSaveOptions();
                        pngSaveOptions.interlaced = 0;
                        curDoc.saveAs(saveFile, pngSaveOptions, true, Extension.LOWERCASE);
                    }

                    if (saveJPEG)
                    {
                        //Set path to file and file name
                        saveFile = new File(targetPath + ZoomLevel + "_" + curTileX + "_" + curTileY + ".jpg");
                        jpegSaveOptions = new JPEGSaveOptions();
                        jpegSaveOptions.formatOptions = FormatOptions.STANDARDBASELINE;
                        jpegSaveOptions.matte = MatteType.NONE;
                        jpegSaveOptions.quality = 5;
                        curDoc.saveAs(saveFile, jpegSaveOptions, true, Extension.LOWERCASE);
                    }

                }

                // Revert to zoom snapshot
                revertToSnapshot(curDoc, snapshots[snapshots.length-1]);

                // Move to next tile in column
                curTileY += 1;

            }

            // move to next zoom level
            ZoomLevel--;

        }

        // Loop all snapshots we took and delete them
        do {
            revertToSnapshot(curDoc, snapshots[snapshots.length-1]);
            deleteCurrentSnapshot();
            snapshots.pop();
        } while (snapshots.length > 0);

        // Revert to initial state (before we started cutting tiles)
        revertToSnapshot(curDoc, InitialSnapshotID);

        // Delete all other states
        app.purge(PurgeTarget.HISTORYCACHES);

        // Restore application preferences
        app.preferences.rulerUnits = startRulerUnits;
        win.close();
    }
}

win.show();
// EOF