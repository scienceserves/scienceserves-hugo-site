
var map = new ol.Map({
    target: 'map',
    renderer: 'canvas',
    layers: layersList,
    view: new ol.View({
        //extent: [-10189500.731377, 3655863.811790, -9745373.173235, 4054708.446631], maxZoom: 24, minZoom: 1
    })
});

//initial view - epsg:3857 coordinates if not "Match project CRS"
map.getView().fit([-10189500.731377, 3655863.811790, -9745373.173235, 4054708.446631], map.getSize());

//full zooms only
map.getView().setProperties({constrainResolution: true});

//change cursor
function pointerOnFeature(evt) {
    if (evt.dragging) {
        return;
    }
    var hasFeature = map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: function(layer) {
            return layer && (layer.get("interactive"));
        }
    });
    map.getViewport().style.cursor = hasFeature ? "pointer" : "";
}
map.on('pointermove', pointerOnFeature);
function styleCursorMove() {
    map.on('pointerdrag', function() {
        map.getViewport().style.cursor = "move";
    });
    map.on('pointerup', function() {
        map.getViewport().style.cursor = "default";
    });
}
styleCursorMove();

////small screen definition
    var hasTouchScreen = map.getViewport().classList.contains('ol-touch');
    var isSmallScreen = window.innerWidth < 650;

////controls container

    //top left container
    var topLeftContainer = new ol.control.Control({
        element: (() => {
            var topLeftContainer = document.createElement('div');
            topLeftContainer.id = 'top-left-container';
            return topLeftContainer;
        })(),
    });
    map.addControl(topLeftContainer)

    //bottom left container
    var bottomLeftContainer = new ol.control.Control({
        element: (() => {
            var bottomLeftContainer = document.createElement('div');
            bottomLeftContainer.id = 'bottom-left-container';
            return bottomLeftContainer;
        })(),
    });
    map.addControl(bottomLeftContainer)
  
    //top right container
    var topRightContainer = new ol.control.Control({
        element: (() => {
            var topRightContainer = document.createElement('div');
            topRightContainer.id = 'top-right-container';
            return topRightContainer;
        })(),
    });
    map.addControl(topRightContainer)

    //bottom right container
    var bottomRightContainer = new ol.control.Control({
        element: (() => {
            var bottomRightContainer = document.createElement('div');
            bottomRightContainer.id = 'bottom-right-container';
            return bottomRightContainer;
        })(),
    });
    map.addControl(bottomRightContainer)

//popup
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var sketch;

function stopMediaInPopup() {
    var mediaElements = container.querySelectorAll('audio, video');
    mediaElements.forEach(function(media) {
        media.pause();
        media.currentTime = 0;
    });
}
closer.onclick = function() {
    container.style.display = 'none';
    closer.blur();
    stopMediaInPopup();
    return false;
};
var overlayPopup = new ol.Overlay({
    element: container,
	autoPan: true
});
map.addOverlay(overlayPopup)
    
    
var NO_POPUP = 0
var ALL_FIELDS = 1

/**
 * Returns either NO_POPUP, ALL_FIELDS or the name of a single field to use for
 * a given layer
 * @param layerList {Array} List of ol.Layer instances
 * @param layer {ol.Layer} Layer to find field info about
 */
function getPopupFields(layerList, layer) {
    // Determine the index that the layer will have in the popupLayers Array,
    // if the layersList contains more items than popupLayers then we need to
    // adjust the index to take into account the base maps group
    var idx = layersList.indexOf(layer) - (layersList.length - popupLayers.length);
    return popupLayers[idx];
}

//highligth collection
var collection = new ol.Collection();
var featureOverlay = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: collection,
        useSpatialIndex: false // optional, might improve performance
    }),
    style: [new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#f00',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255,0,0,0.1)'
        }),
    })],
    updateWhileAnimating: true, // optional, for instant visual feedback
    updateWhileInteracting: true // optional, for instant visual feedback
});

var doHighlight = false;
var doHover = false;

function createPopupField(currentFeature, currentFeatureKeys, layer) {
    var popupText = '';
    for (var i = 0; i < currentFeatureKeys.length; i++) {
        if (currentFeatureKeys[i] != 'geometry' && currentFeatureKeys[i] != 'layerObject' && currentFeatureKeys[i] != 'idO') {
            var popupField = '';
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "hidden field") {
                continue;
            } else if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "inline label - visible with data") {
                if (currentFeature.get(currentFeatureKeys[i]) == null) {
                    continue;
                }
            }
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "inline label - always visible" ||
                layer.get('fieldLabels')[currentFeatureKeys[i]] == "inline label - visible with data") {
                popupField += '<th>' + layer.get('fieldAliases')[currentFeatureKeys[i]] + '</th><td>';
            } else {
                popupField += '<td colspan="2">';
            }
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "header label - visible with data") {
                if (currentFeature.get(currentFeatureKeys[i]) == null) {
                    continue;
                }
            }
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "header label - always visible" ||
                layer.get('fieldLabels')[currentFeatureKeys[i]] == "header label - visible with data") {
                popupField += '<strong>' + layer.get('fieldAliases')[currentFeatureKeys[i]] + '</strong><br />';
            }
            if (layer.get('fieldImages')[currentFeatureKeys[i]] != "ExternalResource") {
				popupField += (currentFeature.get(currentFeatureKeys[i]) != null ? autolinker.link(currentFeature.get(currentFeatureKeys[i]).toLocaleString()) + '</td>' : '');
			} else {
				var fieldValue = currentFeature.get(currentFeatureKeys[i]);
				if (/\.(gif|jpg|jpeg|tif|tiff|png|avif|webp|svg)$/i.test(fieldValue)) {
					popupField += (fieldValue != null ? '<img src="images/' + fieldValue.replace(/[\\\/:]/g, '_').trim() + '" /></td>' : '');
				} else if (/\.(mp4|webm|ogg|avi|mov|flv)$/i.test(fieldValue)) {
					popupField += (fieldValue != null ? '<video controls><source src="images/' + fieldValue.replace(/[\\\/:]/g, '_').trim() + '" type="video/mp4">Il tuo browser non supporta il tag video.</video></td>' : '');
				} else if (/\.(mp3|wav|ogg|aac|flac)$/i.test(fieldValue)) {
                    popupField += (fieldValue != null ? '<audio controls><source src="images/' + fieldValue.replace(/[\\\/:]/g, '_').trim() + '" type="audio/mpeg">Il tuo browser non supporta il tag audio.</audio></td>' : '');
                } else {
					popupField += (fieldValue != null ? autolinker.link(fieldValue.toLocaleString()) + '</td>' : '');
				}
			}
            popupText += '<tr>' + popupField + '</tr>';
        }
    }
    return popupText;
}

var highlight;
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

function onPointerMove(evt) {
    if (!doHover && !doHighlight) {
        return;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var coord = evt.coordinate;
    var currentFeature;
    var currentLayer;
    var currentFeatureKeys;
    var clusteredFeatures;
    var clusterLength;
    var popupText = '<ul>';

    // Collect all features and their layers at the pixel
    var featuresAndLayers = [];
    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer && feature instanceof ol.Feature && (layer.get("interactive") || layer.get("interactive") === undefined)) {
            featuresAndLayers.push({ feature, layer });
        }
    });

    // Iterate over the features and layers in reverse order
    for (var i = featuresAndLayers.length - 1; i >= 0; i--) {
        var feature = featuresAndLayers[i].feature;
        var layer = featuresAndLayers[i].layer;
        var doPopup = false;
        for (k in layer.get('fieldImages')) {
            if (layer.get('fieldImages')[k] != "Hidden") {
                doPopup = true;
            }
        }
        currentFeature = feature;
        currentLayer = layer;
        clusteredFeatures = feature.get("features");
        if (clusteredFeatures) {
            clusterLength = clusteredFeatures.length;
        }
        if (typeof clusteredFeatures !== "undefined") {
            if (doPopup) {
                for(var n=0; n<clusteredFeatures.length; n++) {
                    currentFeature = clusteredFeatures[n];
                    currentFeatureKeys = currentFeature.getKeys();
                    popupText += '<li><table>'
                    popupText += '<a>' + '<b>' + layer.get('popuplayertitle') + '</b>' + '</a>';
                    popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                    popupText += '</table></li>';    
                }
            }
        } else {
            currentFeatureKeys = currentFeature.getKeys();
            if (doPopup) {
                popupText += '<li><table>';
                popupText += '<a>' + '<b>' + layer.get('popuplayertitle') + '</b>' + '</a>';
                popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                popupText += '</table></li>';
            }
        }
    }

    if (popupText == '<ul>') {
        popupText = '';
    } else {
        popupText += '</ul>';
    }
    
	if (doHighlight) {
        if (currentFeature !== highlight) {
            if (highlight) {
                featureOverlay.getSource().removeFeature(highlight);
            }
            if (currentFeature) {
                var featureStyle
                if (typeof clusteredFeatures == "undefined") {
					var style = currentLayer.getStyle();
					var styleFunction = typeof style === 'function' ? style : function() { return style; };
					featureStyle = styleFunction(currentFeature)[0];
				} else {
					featureStyle = currentLayer.getStyle().toString();
				}

                if (currentFeature.getGeometry().getType() == 'Point' || currentFeature.getGeometry().getType() == 'MultiPoint') {
                    var radius
					if (typeof clusteredFeatures == "undefined") {
						radius = featureStyle.getImage().getRadius();
					} else {
						radius = parseFloat(featureStyle.split('radius')[1].split(' ')[1]) + clusterLength;
					}

                    highlightStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({
                                color: "rgba(255, 255, 0, 1.00)"
                            }),
                            radius: radius
                        })
                    })
                } else if (currentFeature.getGeometry().getType() == 'LineString' || currentFeature.getGeometry().getType() == 'MultiLineString') {

                    var featureWidth = featureStyle.getStroke().getWidth();

                    highlightStyle = new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'rgba(255, 255, 0, 1.00)',
                            lineDash: null,
                            width: featureWidth
                        })
                    });

                } else {
                    highlightStyle = new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 0, 1.00)'
                        })
                    })
                }
                featureOverlay.getSource().addFeature(currentFeature);
                featureOverlay.setStyle(highlightStyle);
            }
            highlight = currentFeature;
        }
    }

    if (doHover) {
        if (popupText) {
			content.innerHTML = popupText;
            container.style.display = 'block';
            overlayPopup.setPosition(coord);
        } else {
            container.style.display = 'none';
            closer.blur();
        }
    }
};

map.on('pointermove', onPointerMove);

var popupContent = '';
var popupCoord = null;
var featuresPopupActive = false;

function updatePopup() {
    if (popupContent) {
        content.innerHTML = popupContent;
        container.style.display = 'block';
		overlayPopup.setPosition(popupCoord);
    } else {
        container.style.display = 'none';
        closer.blur();
        stopMediaInPopup();
    }
} 

function onSingleClickFeatures(evt) {
    if (doHover || sketch) return;
    if (!featuresPopupActive) featuresPopupActive = true;

    var pixel = map.getEventPixel(evt.originalEvent);
    var coord = evt.coordinate;
    var popupText = '<ul>';
    
    // --- THE GATEKEEPER ---
    var tractAlreadyAdded = false; 

    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer && feature instanceof ol.Feature && (layer.get("interactive") || layer.get("interactive") === undefined)) {
            
            var title = (layer.get('title') || "").toLowerCase();
            // Identify if this is the tract layer
            var isTract = title.includes("tract") || title.includes("lbl");

            // IF THIS IS A TRACT AND WE ALREADY HAVE ONE, SKIP EVERYTHING ELSE
            if (isTract && tractAlreadyAdded) return;

            var doPopup = false;
            for (var k in layer.get('fieldImages')) {
                if (layer.get('fieldImages')[k] !== "Hidden") {
                    doPopup = true;
                }
            }

            var currentFeature = feature;
            var clusteredFeatures = feature.get("features");

            if (typeof clusteredFeatures !== "undefined") {
                if (doPopup) {
                    for(var n = 0; n < clusteredFeatures.length; n++) {
                        // CHECK AGAIN INSIDE CLUSTER LOOP
                        if (isTract && tractAlreadyAdded) continue; 
                        
                        currentFeature = clusteredFeatures[n];
                        if (isTract) tractAlreadyAdded = true;

                        popupText += '<li><table>';
                        popupText += '<a><b>' + layer.get('popuplayertitle') + '</b></a>';
                        popupText += createPopupField(currentFeature, currentFeature.getKeys(), layer);
                        popupText += '</table></li>';    
                    }
                }
            } else {
                if (doPopup) {
                    // Mark as found
                    if (isTract) tractAlreadyAdded = true;

                    popupText += '<li><table>';
                    popupText += '<a><b>' + layer.get('popuplayertitle') + '</b></a>';
                    popupText += createPopupField(currentFeature, currentFeature.getKeys(), layer);
                    popupText += '</table></li>';
                }
            }
        }
    });

    if (popupText === '<ul>') {
        popupText = '';
    } else {
        popupText += '</ul>';
    }
    
    popupContent = popupText;
    popupCoord = coord;
    updatePopup();
}

function onSingleClickWMS(evt) {
    if (doHover || sketch) {
        return;
    }
    if (!featuresPopupActive) {
        popupContent = '';
    }
    var coord = evt.coordinate;
    var viewProjection = map.getView().getProjection();
    var viewResolution = map.getView().getResolution();

    for (var i = 0; i < wms_layers.length; i++) {
        if (wms_layers[i][1] && wms_layers[i][0].getVisible()) {
            var url = wms_layers[i][0].getSource().getFeatureInfoUrl(
                evt.coordinate, viewResolution, viewProjection, {
                    'INFO_FORMAT': 'text/html',
                });
            if (url) {
                const wmsTitle = wms_layers[i][0].get('popuplayertitle');
                var ldsRoller = '<div class="roller-switcher" style="height: 25px; width: 25px;"></div>';

                popupCoord = coord;
                popupContent += ldsRoller;
                updatePopup();

                var timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Timeout exceeded'));
                    }, 5000); // (5 second)
                });

                // Function to try fetch with different option
                function tryFetch(urls) {
                    if (urls.length === 0) {
                        return Promise.reject(new Error('All fetch attempts failed'));
                    }
                    return fetch(urls[0])
                        .then((response) => {
                            if (response.ok) {
                                return response.text();
                            } else {
                                throw new Error('Fetch failed');
                            }
                        })
                        .catch(() => tryFetch(urls.slice(1))); // Try next URL
                }

                // List of URLs to try
                // The first URL is the original, the second is the encoded version, and the third is the proxy
                const urlsToTry = [
                    url,
                    encodeURIComponent(url),
                    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
                ];

                Promise.race([tryFetch(urlsToTry), timeoutPromise])
                    .then((html) => {
                        if (html.indexOf('<table') !== -1) {
                            popupContent += '<a><b>' + wmsTitle + '</b></a>';
                            popupContent += html + '<p></p>';
                            updatePopup();
                        }
                    })
                    .finally(() => {
                        setTimeout(() => {
                            var loaderIcon = document.querySelector('.roller-switcher');
                            if (loaderIcon) loaderIcon.remove();
                        }, 500); // (0.5 second)
                    });
            }
        }
    }
}

map.on('singleclick', onSingleClickFeatures);
map.on('singleclick', onSingleClickWMS);

//get container
var topLeftContainerDiv = document.getElementById('top-left-container')
var bottomLeftContainerDiv = document.getElementById('bottom-left-container')
var topRightContainerDiv = document.getElementById('top-right-container')
var bottomRightContainerDiv = document.getElementById('bottom-right-container')

//title

//abstract


//geolocate



//measurement





//geocoder

  //Layer to represent the point of the geocoded address
  var geocoderLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
  });
  map.addLayer(geocoderLayer);
  var vectorSource = geocoderLayer.getSource();

  //Variable used to store the coordinates of geocoded addresses
  var obj2 = {
  value: '',
  letMeKnow() {
      //console.log(`Geocoded position: ${this.gcd}`);
  },
  get gcd() {
      return this.value;
  },
  set gcd(value) {
      this.value = value;
      this.letMeKnow();
  }
  }

  var obj = {
      value: '',
      get label() {
          return this.value;
      },
      set label(value) {
          this.value = value;
      }
  }

  // Function to handle the selected address
  function onSelected(feature) {
      obj.label = feature;
      input.value = typeof obj.label.properties.label === "undefined"? obj.label.properties.display_name : obj.label.properties.label;
      var coordinates = ol.proj.transform(
      [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
      "EPSG:4326",
      map.getView().getProjection()
      );
      vectorSource.clear(true);
      obj2.gcd = [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];
      var marker = new ol.Feature(new ol.geom.Point(coordinates));
      var zIndex = 1;
      marker.setStyle(new ol.style.Style({
      image: new ol.style.Icon(({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          scale: 0.7,
          opacity: 1,
          src: "./resources/marker.png",
          zIndex: zIndex
      })),
      zIndex: zIndex
      }));
      vectorSource.addFeature(marker);
      map.getView().setCenter(coordinates);
      map.getView().setZoom(18);
  }

  // Format the result in the autocomplete search bar
  var formatResult = function (feature, el) {
      var title = document.createElement("strong");
      el.appendChild(title);
      var detailsContainer = document.createElement("small");
      el.appendChild(detailsContainer);
      var details = [];
      title.innerHTML = feature.properties.label || feature.properties.display_name;
      var types = {
      housenumber: "numéro",
      street: "rue",
      locality: "lieu-dit",
      municipality: "commune",
      };
      if (
      feature.properties.city &&
      feature.properties.city !== feature.properties.name
      ) {
      details.push(feature.properties.city);
      }
      if (feature.properties.context) {
      details.push(feature.properties.context);
      }
      detailsContainer.innerHTML = details.join(", ");
  };

  // Define a class to create the control button for the search bar in a div tag
  class AddDomControl extends ol.control.Control {
      constructor(elementToAdd, opt_options) {
      const options = opt_options || {};

      const element = document.createElement("div");
      if (options.className) {
          element.className = options.className;
      }
      element.appendChild(elementToAdd);

      super({
          element: element,
          target: options.target,
      });
      }
  }

  // Function to show you can do something with the returned elements
  function myHandler(featureCollection) {
      //console.log(featureCollection);
  }

  // URL for API
  const url = {"Nominatim OSM": "https://nominatim.openstreetmap.org/search?format=geojson&addressdetails=1&",
  "France BAN": "https://api-adresse.data.gouv.fr/search/?"}
  var API_URL = "//api-adresse.data.gouv.fr";

  // Create search by adresses component
  var containers = new Photon.Search({
    resultsHandler: myHandler,
    onSelected: onSelected,
    placeholder: "Search an address",
    formatResult: formatResult,
    //url: API_URL + "/search/?",
    url: url["Nominatim OSM"],
    position: "topright",
    // ,includePosition: function() {
    //   return ol.proj.transform(
    //     map.getView().getCenter(),
    //     map.getView().getProjection(), //'EPSG:3857',
    //     'EPSG:4326'
    //   );
    // }
  });

  // Add the created DOM element within the map
  //var left = document.getElementById("top-left-container");
  var controlGeocoder = new AddDomControl(containers, {
    className: "photon-geocoder-autocomplete ol-unselectable ol-control",
  });
  map.addControl(controlGeocoder);
  var search = document.getElementsByClassName("photon-geocoder-autocomplete ol-unselectable ol-control")[0];
  search.style.display = "flex";

  // Create the new button element
  var button = document.createElement("button");
  button.type = "button";
  button.id = "gcd-button-control";
  button.className = "gcd-gl-btn fa fa-search leaflet-control";

  // Ajouter le bouton à l'élément parent
  search.insertBefore(button, search.firstChild);
  last = search.lastChild;
  last.style.display = "none";
  button.addEventListener("click", function (e) {
      if (last.style.display === "none") {
          last.style.display = "block";
      } else {
          last.style.display = "none";
      }
  });
  input = document.getElementsByClassName("photon-input")[0];
  //var searchbar = document.getElementsByClassName("photon-geocoder-autocomplete ol-unselectable ol-control")[0]
  //left.appendChild(searchbar);
        

//layer search


//scalebar


//layerswitcher

var layerSwitcher = new ol.control.LayerSwitcher({
    tipLabel: "Layers",
    target: 'top-right-container'
});
map.addControl(layerSwitcher);
    





//attribution
var bottomAttribution = new ol.control.Attribution({
  collapsible: false,
  collapsed: false,
  className: 'bottom-attribution'
});
map.addControl(bottomAttribution);

var attributionList = document.createElement('li');
attributionList.innerHTML = `
	<a href="https://github.com/qgis2web/qgis2web">qgis2web</a> &middot;
	<a href="https://openlayers.org/">OpenLayers</a> &middot;
	<a href="https://qgis.org/">QGIS</a>	
`;
var bottomAttributionUl = bottomAttribution.element.querySelector('ul');
if (bottomAttributionUl) {
  bottomAttribution.element.insertBefore(attributionList, bottomAttributionUl);
}


// Disable "popup on hover" or "highlight on hover" if ol-control mouseover
var preDoHover = doHover;
var preDoHighlight = doHighlight;
var isPopupAllActive = false;
document.addEventListener('DOMContentLoaded', function() {
	if (doHover || doHighlight) {
		var controlElements = document.getElementsByClassName('ol-control');
		for (var i = 0; i < controlElements.length; i++) {
			controlElements[i].addEventListener('mouseover', function() { 
				doHover = false;
				doHighlight = false;
			});
			controlElements[i].addEventListener('mouseout', function() {
				doHover = preDoHover;
				if (isPopupAllActive) { return }
				doHighlight = preDoHighlight;
			});
		}
	}
});


//move controls inside containers, in order
    //zoom
    var zoomControl = document.getElementsByClassName('ol-zoom')[0];
    if (zoomControl) {
        topLeftContainerDiv.appendChild(zoomControl);
    }
    //geolocate
    if (typeof geolocateControl !== 'undefined') {
        topLeftContainerDiv.appendChild(geolocateControl);
    }
    //measure
    if (typeof measureControl !== 'undefined') {
        topLeftContainerDiv.appendChild(measureControl);
    }
    //geocoder
    var searchbar = document.getElementsByClassName('photon-geocoder-autocomplete ol-unselectable ol-control')[0];
    if (searchbar) {
        topLeftContainerDiv.appendChild(searchbar);
    }
    //search layer
    var searchLayerControl = document.getElementsByClassName('search-layer')[0];
    if (searchLayerControl) {
        topLeftContainerDiv.appendChild(searchLayerControl);
    }
    //scale line
    var scaleLineControl = document.getElementsByClassName('ol-scale-line')[0];
    if (scaleLineControl) {
        scaleLineControl.className += ' ol-control';
        bottomLeftContainerDiv.appendChild(scaleLineControl);
    }
    //attribution
    var attributionControl = document.getElementsByClassName('bottom-attribution')[0];
    if (attributionControl) {
        bottomRightContainerDiv.appendChild(attributionControl);
    }



    // --- SECTION 1: LAYER TOGGLE LOGIC ---
const stayOnKeywords = ['counties', 'tracts', 'proposedmsx', 'pipeline', 'stations', 'osm', 'base'];

function findLayers(group) {
    let layers = [];
    group.getLayers().forEach(lyr => {
        if (lyr instanceof ol.layer.Group) {
            layers = layers.concat(findLayers(lyr));
        } else {
            layers.push(lyr);
        }
    });
    return layers;
}

function syncToggle(event) {
    var activeLayer = event.target;
    if (activeLayer.getVisible()) {
        findLayers(map).forEach(function(layer) {
            var title = (layer.get('title') || '').toLowerCase();
            var isProtected = stayOnKeywords.some(k => title.includes(k));
            if (layer !== activeLayer && !isProtected) {
                layer.un('change:visible', syncToggle);
                layer.setVisible(false);
                layer.on('change:visible', syncToggle);
            }
        });
        if (window.layerSwitcher) window.layerSwitcher.renderPanel();
    }
}

setTimeout(() => {
    findLayers(map).forEach(layer => {
        var title = (layer.get('title') || '').toLowerCase();
        if (!stayOnKeywords.some(k => title.includes(k))) {
            layer.on('change:visible', syncToggle);
        }
    });
}, 1000);


    // --- SECTION 2: CEJST TRANSLATION DICTIONARY ---
const cejstLookup = {
    "DF_PFS": "Diabetes (National Percentile)",
    "AF_PFS": "Asthma (National Percentile)",
    "HDF_PFS": "Heart Disease (National Percentile)",
    "DSF_PFS": "Diesel Particulate Matter (National Percentile)",
    "EBF_PFS": "Lead Paint (National Percentile)",
    "EALR_PFS": "Expected Agricultural Loss (National Percentile)",
    "EBLR_PFS": "Expected Building Loss (National Percentile)",
    "EPLR_PFS": "Expected Population Loss (National Percentile)",
    "HBF_PFS": "Housing Burden (National Percentile)",
    "LLEF_PFS": "Low Life Expectancy (National Percentile)",
    "LIF_PFS": "Low Income (National Percentile)",
    "LMI_PFS": "Linguistic Isolation (National Percentile)",
    "PM25F_PFS": "PM2.5 Air Pollution (National Percentile)",
    "P100_PFS": "Poverty: Below 100% Federal Line (National Percentile)",
    "P200_I_PFS": "Poverty: Below 200% Federal Line (National Percentile)",
    "UF_PFS": "Unemployment (National Percentile)",
    "WF_PFS": "Wastewater Discharge (National Percentile)",
    "UST_PFS": "Leaking Underground Storage Tanks (National Percentile)",
    "TD_PFS": "Traffic Proximity (National Percentile)",
    "FLD_PFS": "Flood Risk (National Percentile)",
    "WFR_PFS": "Wildfire Risk (National Percentile)",
    "IS_PFS": "Impervious Surface (National Percentile)",
    "LPF_PFS": "Low Phasing (National Percentile)",
    "KP_PFS": "Kitchen Property (National Percentile)",
    "NPL_PFS": "Superfund Proximity (National Percentile)",
    "RMP_PFS": "RMP Facility Proximity (National Percentile)",
    "TSDF_PFS": "Hazardous Waste Proximity (National Percentile)",
    "DM_B": "Percent Black/African American (%)",
    "DM_AI": "Percent American Indian (%)",
    "DM_A": "Percent Asian (%)",
    "DM_HI": "Percent Native Hawaiian/PI (%)",
    "DM_T": "Percent Two or More Races (%)",
    "DM_W": "Percent White (%)",
    "DM_H": "Percent Hispanic/Latino (%)",
    "AGE_10": "Percent under age 10 (%)",
    "AGE_MIDDLE": "Percent age 10-64 (%)",
    "AGE_OLD": "Percent age 65+ (%)",
    "TPF": "Total Population (Count)"
};

// --- SECTION 3: REPORT GENERATOR (OPTIMIZED) ---
document.addEventListener('DOMContentLoaded', function() {
    var printBtn = document.getElementById('print-btn');
    if (!printBtn) return;

    printBtn.onclick = function() {
        const center = map.getView().getCenter();
        const pixel = map.getPixelFromCoordinate(center);
        
        let reportData = [];
        let countyTitle = "Local Area";
        let stateTitle = ""; // Initialize this here!
        let tractID = "Target Area";
        let foundTractData = false; // Move this OUTSIDE the loop

        map.forEachFeatureAtPixel(pixel, function(feature, layer) {
            if (!layer) return;
            const props = feature.getProperties();
            const title = (layer.get('title') || "").toLowerCase();

            // 1. County & State Logic (Independent)
            if (title.includes("counties") || title.includes("county")) {
                countyTitle = props.NAME || props.NAMELSAD || props.name || countyTitle;
                
                // --- NEW STATE LOGIC ---
                // We check for common state FIPS keys in your data
                const stateFips = props.STATEFP || props.STATE_FIPS || props.STATE;
                
                if (stateFips === "28" || stateFips === 28) {
                    stateTitle = "Mississippi";
                } else if (stateFips === "01" || stateFips === 1 || stateFips === "1") {
                    stateTitle = "Alabama";
                }
                // --- END NEW STATE LOGIC ---
            }

            // 2. Tract Logic (Gated by foundTractData)
            if (!foundTractData && (title.includes("tract") || title.includes("lbl"))) {
                tractID = props.GEOID || props.geoid || props.GEOID20 || props.FullID || tractID;
                
                for (let key in props) {
                    if (cejstLookup[key]) {
                        let val = props[key];
                        let label = cejstLookup[key];
                        let fVal = (key === "TPF") ? Number(val).toLocaleString() : (val * 100).toFixed(1);
                        if (label.includes("(%)")) fVal += "%";
                        reportData.push({ attribute: label, value: fVal });
                    }
                }
                foundTractData = true; // This only stops MORE tracts, not the county
            }
        });
        map.once('rendercomplete', function() {
            const mapCanvas = document.createElement('canvas');
            const size = map.getSize();
            mapCanvas.width = size[0];
            mapCanvas.height = size[1];
            const mapContext = mapCanvas.getContext('2d');

            // 1. Collect all canvas layers (Your existing code)
            document.querySelectorAll('.ol-layer canvas').forEach(canvas => {
                if (canvas.width > 0) {
                    const opacity = canvas.parentNode.style.opacity || 1;
                    mapContext.globalAlpha = opacity;
                    const transform = canvas.style.transform;
                    let matrix;
                    if (transform) {
                        matrix = transform.match(/^matrix\(([^\(]*)\)$/)?.[1].split(',').map(Number);
                    }
                    if (matrix) {
                        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
                    }
                    mapContext.drawImage(canvas, 0, 0);
                }
            });
            mapContext.setTransform(1, 0, 0, 1, 0, 0); // Reset globalAlpha and transforms

            // --- 2. START OF CROSS ADDITION ---
            // Calculate the center of the canvas
            const centerX = mapCanvas.width / 2;
            const centerY = mapCanvas.height / 2;
            const crossSize = 15; // Length of the crosshair arms



            mapContext.strokeStyle = '#1e00ff';
            mapContext.lineWidth = 5;
            mapContext.globalAlpha = 1.0; // Ensure the cross is fully opaque

            // Draw Vertical Line
            mapContext.beginPath();
            mapContext.moveTo(centerX, centerY - crossSize);
            mapContext.lineTo(centerX, centerY + crossSize);
            mapContext.stroke();

            // Draw Horizontal Line
            mapContext.beginPath();
            mapContext.moveTo(centerX - crossSize, centerY);
            mapContext.lineTo(centerX + crossSize, centerY);
            mapContext.stroke();
            // --- END OF RED CROSS ADDITION ---

            const win = window.open('', '_blank');
            // Now the dataURL contains the red cross drawn on top of the map
            const mapImg = mapCanvas.toDataURL('image/png');

            win.document.write(`
                <html>
                <head>
                    <title>Report - ${tractID}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; line-height: 1.6; }
                        h1 { border-bottom: 2px solid #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                        th { background: #eee; }
                        .map-img { width: 100%; border: 1px solid #000; margin: 20px 0; }
                        .footer { font-size: 0.9em; color: #555; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <h1>Community Impact Snapshot</h1>
                    <p>
                        <strong>Census Tract:</strong> ${tractID} | 
                        <strong>Location:</strong> ${countyTitle}${stateTitle ? ', ' + stateTitle : ''}
                    </p>
                    <img src="${mapImg}" class="map-img">
                    <table>
                        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                        <tbody>
                            ${reportData.length > 0 ? 
                                reportData.map(r => `<tr><td>${r.attribute}</td><td>${r.value}</td></tr>`).join('') : 
                                '<tr><td colspan="2">No data found at crosshair location.</td></tr>'}
                        </tbody>
                    </table>
                    <div class="footer">
                        <p><strong>Reading the Data:</strong><br>
                        <strong>National Percentile:</strong> A score of 90 means this specific neighborhood faces a higher burden than 90% of all other tracts in the United States.<br>
                        <strong>Percent (%):</strong> The actual percentage share of the population within this specific neighborhood.<br>
                        Source: Federal Climate and Economic Justice Screening Tool (CEJST) v1.0.</p>
                    </div>
                </body>
                </html>
            `);
            win.document.close();

            setTimeout(function() {
                if (win) {
                    win.focus();
                }
            }, 1000); 
        });
        map.renderSync();
    };
});