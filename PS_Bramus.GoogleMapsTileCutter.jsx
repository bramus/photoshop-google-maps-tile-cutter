/*
 * Photoshop Google Maps Tile Cutter
 * By Bramus Van Damme - http://www.bram.us/
 *
 * Based upon work by Will James (http://onNYTurf.com), Curtis Wyatt (http://gocalipso.com/), and Nate Bundy (http://www.lemonrage.com/)
 * UI Additions intially provided by Nick Springer (http://www.springercartographics.com/)
 *
 */

// **** HELPER FUNCTIONS

// Take a snapshot
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

// Delete the current active snapshot
function deleteCurrentSnapshot() {
	var ref = new ActionReference();
	ref.putProperty(charIDToTypeID("HstS"), charIDToTypeID("CrnH"));
	var desc = new ActionDescriptor();
	desc.putReference(charIDToTypeID("null"), ref );
	executeAction(charIDToTypeID("Dlt "), desc, DialogModes.NO );
}

// Revert to a given snapshot
function revertToSnapshot(doc, snapshotID) {
	doc.activeHistoryState = doc.historyStates[snapshotID];
}

// Get id of the last snapshot
function getLastSnapshotID(doc) {
	var hsObj = doc.historyStates;
	var hsLength = hsObj.length;
	for (var i = hsLength-1; i > -1; i--) {
		if(hsObj[i].snapshot) {
			return i;
		}
	}
}

// Check if a layer is empty
function isLayerEmpty(doc, layer) {
	if (!doc) {
		doc = app.activeDocument;
	}
	if (!layer) {
		layer = doc.activeLayer;
	}
	return parseInt(layer.bounds.toString().replace(/\D/g,""), 10) === 0;
}

// Save doc as jpeg file
function saveDocAsJpeg(doc, fileLocation) {

	//Set path to file and file name
	var saveFile = new File(fileLocation);
	var jpegSaveOptions = new JPEGSaveOptions();
	jpegSaveOptions.formatOptions = FormatOptions.STANDARDBASELINE;
	jpegSaveOptions.matte = MatteType.NONE;
	jpegSaveOptions.quality = 5;
	doc.saveAs(saveFile, jpegSaveOptions, true, Extension.LOWERCASE);

}

// Save doc as gif file
function saveDocAsGif(doc, fileLocation) {

	//Set path to file and file name
	var saveFile = new File(fileLocation);
	//Set save options
	var gifSaveOptions = new GIFSaveOptions();
	gifSaveOptions.colors = 64;
	gifSaveOptions.dither = Dither.NONE;
	gifSaveOptions.matte = MatteType.NONE;
	gifSaveOptions.preserveExactColors = 0;
	gifSaveOptions.transparency = 1;
	gifSaveOptions.interlaced = 0;
	doc.saveAs(saveFile, gifSaveOptions, true, Extension.LOWERCASE);

}

// Save doc as png file
function saveDocAsPng(doc, fileLocation) {

	//Set path to file and file name
	var saveFile = new File(fileLocation);
	var pngSaveOptions = new PNGSaveOptions();
	pngSaveOptions.interlaced = 0;
	doc.saveAs(saveFile, pngSaveOptions, true, Extension.LOWERCASE);

}

// Cut the active document into tiles using the passed in settings
function cutTiles(options, tickCallback) {

	// Make sure targetPath exists
	var targetFolder = new Folder(options.targetPath);
	if (!targetFolder.exists) targetFolder.create();

	// Define pathDivider
	var pathDivider = ((File.fs == 'Windows') ? '\\' : '/');

	// Add trailing / to targetPath
	options.targetPath += pathDivider;

	// Make sure we're using pixels
	var startRulerUnits = app.preferences.rulerUnits;
	app.preferences.rulerUnits = Units.PIXELS;

	// Active document shorthand
	var curDoc = app.activeDocument;

	// Define max tile dimensions
	var maxTileDim = Math.ceil(Math.max(curDoc.width.value, curDoc.height.value) / options.tileSize);

	// Define max and min zoom level + define the total number of tiles that will be generated
	var minZoomLevel = 0,
		maxZoomLevel = 0,
		numTilesTotalForAllLevels = 1;
	do {
		maxZoomLevel++;
		numTilesTotalForAllLevels += Math.pow(2, 2 * maxZoomLevel);
	} while (Math.pow(2, maxZoomLevel) < maxTileDim);

	// Store initial state
	var InitialSnapshotID = getLastSnapshotID(curDoc);

	// Flatten the image (speeds up processing if it were a non-flattened one yet)
	curDoc.flatten();

	// Unlock the one layer of the flattened image
	curDoc.activeLayer.isBackgroundLayer = false;
	curDoc.activeLayer.allLocked = false;

	// keep track of all other snapshots
	var snapshots = [];

	// Resize to a square version & center image - this way we get an image size that's easily tileable (512, 1028, 2048, 4096, ...)
	var bgColorHex = new SolidColor();
	bgColorHex.rgb.hexValue = options.bgColor;
	app.backgroundColor = bgColorHex;
	curDoc.resizeCanvas(options.tileSize * Math.pow(2, maxZoomLevel), options.tileSize * Math.pow(2, maxZoomLevel), AnchorPosition.MIDDLECENTER);

	// Store current zoom level
	var zoomLevel = maxZoomLevel;

	var curTileNum = 0;

	// Do the following for each zoom level the user wants
	while (zoomLevel >= minZoomLevel) {

		// Make sure zoomLevel folder exists if exporting with useSubFolders enabled
		if (options.useSubFolders) {

			var targetFolderZ = new Folder(options.targetPath + zoomLevel + pathDivider);
			if (!targetFolderZ.exists) targetFolderZ.create();

			var targetFolderZX = new Folder(options.targetPath + zoomLevel + pathDivider + "0" + pathDivider);
			if (!targetFolderZX.exists) targetFolderZX.create();

		}

		// Resize the canvas to fit the zoom level (50% per zoom level step)
		if (zoomLevel < maxZoomLevel) {
			curDoc.resizeImage(curDoc.width.value * 0.5, curDoc.height.value * 0.5);
		}

		// Take a snapshot for this zoom level and store it
		takeSnapshot();
		snapshots.push(getLastSnapshotID(curDoc));

		// Calculate the number of tiles we'll need
		var numTilesX = parseInt(curDoc.width.value, 10) / options.tileSize; // num tiles on the x axis
		var numTilesY = parseInt(curDoc.height.value, 10) / options.tileSize; // num tiles on the y axis
		var numTilesTotal = numTilesX * numTilesY; // total tiles (numTilesX * numTilesY)

		// Counters to track which x value and which y value we are on in our image tile grid
		var curTileX = 0;
		var curTileY = 0;

		// Cut 'em up
		// For each tile we need to make, we repeat each step in this loop
		for (n = 1; n < numTilesTotal + 1; n++) {

			// Increment curTileNum
			curTileNum++;

			// We cut up tiles column by column
			// I.E. we cut up all the tiles for a given x value before moving on to the next x value.
			// We do this by checking if the y value we are on is the last tile in a column
			// We compare our y counter to our total y number of Tiles, if they are the same is we do the following
			if (parseInt(curTileY, 10) == parseInt(numTilesY, 10)) {
				curTileX += 1; // move to next column
				curTileY = 0; // start back at the top

				// Create subfolder if needed
				if (options.useSubFolders) {
					var targetFolderZX = new Folder(options.targetPath + zoomLevel + pathDivider + curTileX + pathDivider);
					if (!targetFolderZX.exists) targetFolderZX.create();
				}
			}

			// Crop out needed square tile
			curDoc.crop([
				curTileX * options.tileSize,
				curTileY * options.tileSize,
				(curTileX * options.tileSize) + options.tileSize,
				(curTileY * options.tileSize) + options.tileSize
			]);

			// alert('Cropped from ' + (curTileX * options.tileSize) + ',' + (curTileY * options.tileSize) + ' to ' + ((curTileX * options.tileSize) + options.tileSize) + ',' + ((curTileY * options.tileSize) + options.tileSize) + '.');

			if (options.saveTransparentTiles || !isLayerEmpty(curDoc, curDoc.activeLayer)) {

				// Set the active layer to a background layer so that our bgColor is used as background color
				curDoc.activeLayer.isBackgroundLayer = true;

				// Define the filename based on the zoomLevel and x/y pair.
				var baseFileName = options.targetPath;
				if (options.useSubFolders)
					baseFileName += zoomLevel + pathDivider + curTileX + pathDivider + curTileY;
				else {
					baseFileName += zoomLevel + "_" + curTileX + "_" + curTileY;
				}

				//Save the file
				if (options.saveGIF) saveDocAsGif(curDoc, baseFileName + ".gif");
				if (options.savePNG) saveDocAsPng(curDoc, baseFileName + ".png");
				if (options.saveJPEG) saveDocAsJpeg(curDoc, baseFileName + ".jpg");

			}

			// Revert to zoom snapshot
			revertToSnapshot(curDoc, snapshots[snapshots.length-1]);

			// Move to next tile in column
			curTileY += 1;

			// call tickCallback
			tickCallback(curTileNum, numTilesTotalForAllLevels);

		}

		// move to next zoom level
		zoomLevel--;

	}

	// ALWAYS Create empty.jpg
	if (true || !options.saveTransparentTiles) {

		// Crop canvas to tilesize
		curDoc.crop([ 0, 0, options.tileSize, options.tileSize ]);

		// Select entire canvas
		curDoc.selection.selectAll();

		// Fill selection with selected background color
		curDoc.selection.fill(bgColorHex);

		// Save image
		var baseFileName = options.targetPath + "empty";
		if (options.saveGIF) saveDocAsGif(curDoc, baseFileName + ".gif");
		if (options.savePNG) saveDocAsPng(curDoc, baseFileName + ".png");
		if (options.saveJPEG) saveDocAsJpeg(curDoc, baseFileName + ".jpg");

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

	return {
		numTilesTotalForAllLevels: numTilesTotalForAllLevels,
		useSubFolders: options.useSubFolders,
		maxZoomLevel: maxZoomLevel,
		tileSize: options.tileSize,
		targetPath: options.targetPath
	};

}

function createExampleGoogleMapsHtml(options, extension) {

	// create file reference
	var fileOut	= new File(options.targetPath + 'index.html');
	fileOut.lineFeed = 'windows'; // We always want \r\n

	// open for write
	fileOut.open("w", "TEXT", "????");

	// Inject Content
	fileOut.writeln('<!DOCTYPE html>');
	fileOut.writeln('<html lang="en">');
	fileOut.writeln('	<head>');
	fileOut.writeln('		<title>PS_Bramus.GoogleMapsTileCutter</title>');
	fileOut.writeln('		<meta charset="utf-8" />');
	fileOut.writeln('		<style>');
	fileOut.writeln('			html, body {');
	fileOut.writeln('				height: 100%;');
	fileOut.writeln('				margin: 0;');
	fileOut.writeln('				padding: 0;');
	fileOut.writeln('			}');
	fileOut.writeln('			#map {');
	fileOut.writeln('				width:100%;');
	fileOut.writeln('				height:100%;');
	fileOut.writeln('				color: #CCC;');
	fileOut.writeln('				background: #EFEFEF;');
	fileOut.writeln('			}');
	fileOut.writeln('			span.loading {');
	fileOut.writeln('				display: block;');
	fileOut.writeln('				text-align: center;');
	fileOut.writeln('				font: 300 italic 72px/400px "HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", sans-serif;');
	fileOut.writeln('			}');
	fileOut.writeln('		</style>');
	fileOut.writeln('	</head>');
	fileOut.writeln('	<body>');
	fileOut.writeln('		<div id="map"><span class="loading">loading tiles...</span></div>');
	fileOut.writeln('		<script type="text/javascript" src="http://maps.googleapis.com/maps/api/js?sensor=false"></script>');
	fileOut.writeln('		<script>');
	fileOut.writeln('');
	fileOut.writeln('');
	fileOut.writeln('			/*');
	fileOut.writeln('			 * = PS_Bramus.GoogleMapsTileCutter Config');
	fileOut.writeln('			 * ----------------');
	fileOut.writeln('			 */');
	fileOut.writeln('');
	fileOut.writeln('				var repeatOnXAxis = false; // Do we need to repeat the image on the X-axis? Most likely you\'ll want to set this to false');
	fileOut.writeln('');
	fileOut.writeln('');
	fileOut.writeln('');
	fileOut.writeln('			/*');
	fileOut.writeln('			 * Helper function which normalizes the coords so that tiles can repeat across the X-axis (horizontally) like the standard Google map tiles.');
	fileOut.writeln('			 * ----------------');
	fileOut.writeln('			 */');
	fileOut.writeln('');
	fileOut.writeln('				function getNormalizedCoord(coord, zoom) {');
	fileOut.writeln('					if (!repeatOnXAxis) return coord;');
	fileOut.writeln('');
	fileOut.writeln('					var y = coord.y;');
	fileOut.writeln('					var x = coord.x;');
	fileOut.writeln('');
	fileOut.writeln('					// tile range in one direction range is dependent on zoom level');
	fileOut.writeln('					// 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc');
	fileOut.writeln('					var tileRange = 1 << zoom;');
	fileOut.writeln('');
	fileOut.writeln('					// don\'t repeat across Y-axis (vertically)');
	fileOut.writeln('					if (y < 0 || y >= tileRange) {');
	fileOut.writeln('						return null;');
	fileOut.writeln('					}');
	fileOut.writeln('');
	fileOut.writeln('					// repeat across X-axis');
	fileOut.writeln('					if (x < 0 || x >= tileRange) {');
	fileOut.writeln('						x = (x % tileRange + tileRange) % tileRange;');
	fileOut.writeln('					}');
	fileOut.writeln('');
	fileOut.writeln('					return {');
	fileOut.writeln('						x: x,');
	fileOut.writeln('						y: y');
	fileOut.writeln('					};');
	fileOut.writeln('');
	fileOut.writeln('				}');
	fileOut.writeln('');
	fileOut.writeln('');
	fileOut.writeln('			/*');
	fileOut.writeln('			 * Main Core');
	fileOut.writeln('			 * ----------------');
	fileOut.writeln('			 */');
	fileOut.writeln('');
	fileOut.writeln('				window.onload = function() {');
	fileOut.writeln('');
	fileOut.writeln('					// Define our custom map type');
	fileOut.writeln('					var customMapType = new google.maps.ImageMapType({');
	fileOut.writeln('						getTileUrl: function(coord, zoom) {');
	fileOut.writeln('							var normalizedCoord = getNormalizedCoord(coord, zoom);');
	fileOut.writeln('							if(normalizedCoord && (normalizedCoord.x < Math.pow(2, zoom)) && (normalizedCoord.x > -1) && (normalizedCoord.y < Math.pow(2, zoom)) && (normalizedCoord.y > -1)) {');
	fileOut.writeln('								return zoom + \'' + (options.useSubFolders ? '/' : '_' ) + '\' + normalizedCoord.x + \'' + (options.useSubFolders ? '/' : '_' ) + '\' + normalizedCoord.y + \'.' + extension + '\';');
	fileOut.writeln('							} else {');
	fileOut.writeln('								return \'empty.' + extension + '\';');
	fileOut.writeln('							}');
	fileOut.writeln('						},');
	fileOut.writeln('						tileSize: new google.maps.Size(' + options.tileSize + ', ' + options.tileSize + '),');
	fileOut.writeln('						maxZoom: ' + options.maxZoomLevel + ',');
	fileOut.writeln('						name: \'PS_Bramus.GoogleMapsTileCutter\'');
	fileOut.writeln('					});');
	fileOut.writeln('');
	fileOut.writeln('					// Basic options for our map');
	fileOut.writeln('					var myOptions = {');
	fileOut.writeln('						center: new google.maps.LatLng(0, 0),');
	fileOut.writeln('						zoom: 2,');
	fileOut.writeln('						minZoom: 0,');
	fileOut.writeln('						streetViewControl: false,');
	fileOut.writeln('						mapTypeControl: false,');
	fileOut.writeln('						mapTypeControlOptions: {');
	fileOut.writeln('							mapTypeIds: ["custom"]');
	fileOut.writeln('						}');
	fileOut.writeln('					};');
	fileOut.writeln('');
	fileOut.writeln('					// Init the map and hook our custom map type to it');
	fileOut.writeln('					var map = new google.maps.Map(document.getElementById(\'map\'), myOptions);');
	fileOut.writeln('					map.mapTypes.set(\'custom\', customMapType);');
	fileOut.writeln('					map.setMapTypeId(\'custom\');');
	fileOut.writeln('');
	fileOut.writeln('				}');
	fileOut.writeln('		</script>');
	fileOut.writeln('');
	fileOut.writeln('	</body>');
	fileOut.writeln('</html>');

	// close the file
	fileOut.close();


}


// **** UI Windows and Logic

var windowLoading = new Window(
	'palette {' +
	'	text: "Google Maps Tile Cutter (Cutting Tiles, Please Wait)",' +
	'	alignChildren: "center",' +
	'	bounds: [0, 0, 300, 50]' +
//	'	bar: Progressbar{ bounds: [20,20,280,31] , value: 0, maxvalue: 100 }' +
	'	txtStatus: StaticText{ bounds: [20, 18, 280, 31] , text: "Preprocessing Image ...", alignment: "center" }' +
	'}',
	'Google Maps Tile Cutter (Cutting Tiles, Please Wait)',
	undefined,
	{
		closeButton: false
	}
);

var windowMain = new Window(
	'dialog {' +
	'	text:"Google Maps Tile Cutter", alignChildren: "fill",' +
	'	pnlExportDir: Panel {' +
	'		text: "EXPORT OPTIONS",' +
	'		orientation: "column", alignChildren: ["left", "top"],' +
	'		grpExport: Group {' +
	'			orientation: "row", alignment: "left",' +
	'			lblExportPath: StaticText { text: "Export Path" },' +
	'			txtExportPath: EditText { text: "", characters: 50, enabled: false },' +
	'			btnExportPath: Button { text:"Choose" }' +
	'		}' +
	'		grpSubfolders: Group {' +
	'			orientation: "row", alignment: "left",' +
	'			lblExportPath: StaticText { text: "File Structure" },' +
	'			optNoSubfolders: RadioButton { text: "Don\'t use subfolders (e.g. z_x_y.jpg)", value: true },' +
	'			optSubfolders: RadioButton { text: "Use subfolders (e.g. z/x/y.jpg)" }' +
	'		}' +
	'		grpExportHtml: Group { orientation: "row", alignment: "left",' +
	'			cbCreateHTML: Checkbox { text: "Create HTML file with example Google Maps implementation", value: true},' +
	'		}' +
	'	}' +
	'	pnlExportOptions: Panel { orientation: "column", alignChildren: ["left", "top"],' +
	'		text: "CUTTING OPTIONS",' +
	'		grpFiletype: Group { orientation: "row", alignment: "left",' +
	'			lblExportAs: StaticText { text: "Export as" },' +
	'			optJPEG: RadioButton { text: "JPEG", value: true },' +
	'			optPNG: RadioButton { text: "PNG" },' +
	'			optGIF: RadioButton { text: "GIF" }' +
	'		}' +
	'		grpSizeColor: Group { orientation: "row", alignment: "left",' +
	'			lblSize: StaticText { text: "Tile Size:" },' +
	'			txtSize: EditText { text: "256", characters: 4, enabled: true },' +
	'			lblBg: StaticText { text: "Background Color:" },' +
	'			txtBgColor: EditText { text:"' + app.backgroundColor.rgb.hexValue + '", characters: 6, enabled: true }' +
	'		}' +
//	'		grpExportBlanks: Group { orientation: "row", alignment: "left",' +
//	'			cbDontExport: Checkbox { text: "Don\'t export transparent tiles", value: true},' +
//	'		}' +
	'	}' +
	'	grpButtons: Group {' +
	'		orientation: "row", alignment: "right",' +
	'		txtHowto: StaticText { text: "Please select an export directory to begin" },' +
	'		btnMakeTiles: Button { text: "Make Tiles", enabled: false, properties: { name: "ok" } }' +
	'	}' +
	'}',
	'Google Maps Tile Cutter (Press ESC to cancel)',
	undefined,
	{
		closeButton: false
	}
);

// When clicking the 'Choose' button, show a select dialog and store the value into the textfield
windowMain.pnlExportDir.grpExport.btnExportPath.onClick = function() {
	folder = Folder.selectDialog();
	if (folder !== null) {
		windowMain.pnlExportDir.grpExport.txtExportPath.text = folder.fsName;
		windowMain.grpButtons.txtHowto.text = 'Click "Make Tiles" to generate your tiles';
		windowMain.grpButtons.btnMakeTiles.enabled = true;
		windowMain.grpButtons.btnMakeTiles.active = true;
	}
};

// Focus the 'Choose' button on load
windowMain.onShow = function() {
	windowMain.pnlExportDir.grpExport.btnExportPath.active = true;
};


// Generate the tiles, when clicking the "Make Tiles" button
windowMain.grpButtons.btnMakeTiles.onClick = function() {

	// Extract the options
	var options = {
		targetPath: windowMain.pnlExportDir.grpExport.txtExportPath.text,
		useSubFolders: windowMain.pnlExportDir.grpSubfolders.optSubfolders.value,
		createHtmlFile: windowMain.pnlExportDir.grpExportHtml.cbCreateHTML.value,
		tileSize: parseInt(windowMain.pnlExportOptions.grpSizeColor.txtSize.text, 10),
		saveTransparentTiles: true, // !windowMain.pnlExportOptions.grpExportBlanks.cbDontExport.value,
		saveJPEG: windowMain.pnlExportOptions.grpFiletype.optJPEG.value,
		savePNG: windowMain.pnlExportOptions.grpFiletype.optPNG.value,
		saveGIF: windowMain.pnlExportOptions.grpFiletype.optGIF.value,
		bgColor: windowMain.pnlExportOptions.grpSizeColor.txtBgColor.text
	};

	// Hide main window and show the loading window
	windowMain.hide();
	windowLoading.show();
	windowLoading.center(); // Hmmz, this still is a bit off ...

	// Cut the tiles
	cutResult = cutTiles(options, function(curTile, totalTiles) {
		windowLoading.txtStatus.text = 'Cutting Tile ' + curTile + '/' + totalTiles + ' (' + Math.floor(curTile / totalTiles * 100) + '%)';
		// windowLoading.bar.value = parseInt(windowLoading.bar.value, 10) + 1;
	});

	if (options.createHtmlFile) {
		windowLoading.txtStatus.text = 'Creating HTML ...';

		// Define extension
		var extension;
		if (options.saveGIF) extension = 'gif';
		else if (options.savePNG) extension = 'png';
		else if (options.saveJPEG) extension = 'jpg';

		createExampleGoogleMapsHtml(cutResult, extension);
	}

	// Close the windowMain
	windowLoading.close();

};

// **** MAIN CORE: Show the main window if a document is open

// No active document: stop here
if (app.documents.length === 0) {
	alert("Please open a file", "Google Maps Tile Cutter Error", true);
	app.beep();
}

// Active document: show windowMain
else {
	windowMain.center();
	windowMain.show();
}

// EOF