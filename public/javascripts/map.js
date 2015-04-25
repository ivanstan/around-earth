var App = {
    user: {
        position: {
            latitude: 0,
            longitude: 0
        },
        timezoneOffset: 0,
        timestamp: function () {
            return Math.round(new Date());
        },
        time: function () {
            var now = new Date(App.user.timestamp());
            return now.getFullYear() + '/' + now.getMonth() + '/' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
        }
    },
    settings: {
        showGroundStations: true,
        apogeeInfoWindowOpen: null,
        perigeeInfoWindowOpen: null
    },
    orbit: {
        apogeeMarker: null,
        perigeeMarker: null,
        apogeeMarkerInfoWindow: null,
        perigeeMarkerInfoWindow: null,
    },
    map: null,
    stationMarker: null,
    userMarker: null,
    geocoder: null,
    tickerLastUpdated: false,
    toolbarRightOpen: true,
    dashboardOpen: localStorage.getItem('dashboardOpen'),
    mapInitialized: false,
    apiEndpoint: '',
    trackSatellite: 'ISS (ZARYA)',
    orbitLine: null,
    dayNightTerminator: null,
    defaultPosition: {
        latitude: 28.396837,
        longitude: -80.605659,
        altitude: 0
    },
    altitudeChart: null,
    mapFeatures: {
        groundStations: []
    },

    toggleSidebar: function () {
        var $sidebar = $('#toolbar-right'),
            width = $sidebar.outerWidth();

        if ($sidebar.is('.active')) {
            $sidebar.removeClass('active').animate({'right': -width}, 300);
            App.toolbarRightOpen = false;
        } else {
            $sidebar.addClass('active').animate({'right': 0}, 200);
            App.toolbarRightOpen = true;
        }

    },

    toggleDashboard: function () {
        var $dashboard = $('#toolbar-bottom'),
            height = $dashboard.outerHeight();

        if ($dashboard.is('.active')) {
            $dashboard.removeClass('active').animate({'bottom': -height}, 300);
            App.dashboardOpen = false;
            localStorage.setItem('dashboardOpen', false);
        } else {
            $dashboard.addClass('active').animate({'bottom': 0}, 200);
            App.dashboardOpen = true;
            localStorage.setItem('dashboardOpen', true);
        }

    },

    repositionToolbarRight: function () {
        var $sidebar = $('#toolbar-right'),
            width = $sidebar.outerWidth();

        $sidebar.css('right', -width);
    },

    initializeMap: function (data) {
        var latitude = parseFloat(data.position.latitude);
        var longitude = parseFloat(data.position.longitude);
        var stationPosition = new google.maps.LatLng(latitude, longitude);
        var mapCenter = new google.maps.LatLng(latitude, longitude);
        App.geocoder = new google.maps.Geocoder();
        App.initAltitudeChart(data);

        var options = {
            styles: styles,
            center: mapCenter,
            zoom: 2,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            minZoom: 2,
            backgroundColor: '#1D252A', // map's BG color
        };

        App.map = new google.maps.Map(document.getElementById("map"), options);

        App.dayNightTerminator = new DayNightOverlay({
            map: App.map,
            fillColor: 'rgba(0,0,0,0.3)',
            date: new Date(Date.UTC())
        });

        var image = {
            url: 'images/station-white.png',
            size: new google.maps.Size(169, 62),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(32, 11),
            scaledSize: new google.maps.Size(64, 22)
        };

        App.stationMarker = new google.maps.Marker({
            position: stationPosition,
            icon: image,
            map: App.map
        });

        var locationImg = {
            url: 'images/location.png',
            size: new google.maps.Size(81, 81),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(40, 55),
        };

        var userPosition = new google.maps.LatLng(App.userPosition.latitude, App.userPosition.longitude);
        App.userMarker = new google.maps.Marker({
            position: userPosition,
            icon: locationImg,
            draggable: true,
            map: App.map
        });

        google.maps.event.addListener(App.userMarker, 'dragend', function (event) {
            App.userPosition.latitude = event.latLng.lat();
            App.userPosition.longitude = event.latLng.lng();
        });

        $('#label-satellite').html(data.satellite);

        if (App.settings.showGroundStations) {
            // App.initGroundStations();
        }
    },

    initGroundStations: function () {
        $.ajax({
            url: App.apiEndpoint + 'api/ground-stations',
            dataType: 'json',
            success: function (data) {
                for (var i in data) {
                    var position = new google.maps.LatLng(parseFloat(data[i].latitude), parseFloat(data[i].longitude));
                    var marker = new google.maps.Marker({
                        position: position,
                        map: App.map
                    });

                    App.mapFeatures.groundStations.push(marker);
                }
            }
        });
    },

    drawOrbit: function (data) {
        var orbit = [];

        var apogee = {
            altitude: 0
        }

        var perigee = {
            altitude: 9007199254740992
        }

        for (i in data.orbit) {
            var latitude = parseFloat(data.orbit[i].latitude);
            var longitude = parseFloat(data.orbit[i].longitude);

            var point = new google.maps.LatLng(latitude, longitude);
            orbit.push(point);

            if (data.orbit[i].altitude > apogee.altitude) {
                apogee = data.orbit[i]
            }

            if (data.orbit[i].altitude < perigee.altitude) {
                perigee = data.orbit[i]
            }
        }

        var apogeePosition = new google.maps.LatLng(parseFloat(apogee.latitude), parseFloat(apogee.longitude));
        if (App.orbit.apogeeMarker == null) {
            App.orbit.apogeeMarker = new google.maps.Marker({
                position: apogeePosition,
                map: App.map
            });

            App.orbit.apogeeMarkerInfoWindow = new InfoBox({
                content: 'Apogee<br>Altitude: ' + parseFloat(apogee.altitude).toFixed(2) + ' km',
                pixelOffset: new google.maps.Size(-65, 5),
                boxStyle: {
                    background: '#0F6388',
                    opacity: 0.5,
                    width: '130px',
                    color: '#ffffff'
                }
            });

            if(App.settings.apogeeInfoWindowOpen) {
                App.orbit.apogeeMarkerInfoWindow.open(App.map, App.orbit.apogeeMarker);
            }

            google.maps.event.addListener(App.orbit.apogeeMarker, 'click', function () {
                if (App.isInfoWindowOpen(App.orbit.apogeeMarkerInfoWindow)) {
                    App.orbit.apogeeMarkerInfoWindow.close();
                    localStorage.setItem('apogeeInfoWindowOpen', false);
                    App.settings.apogeeInfoWindowOpen = false;
                } else {
                    localStorage.setItem('apogeeInfoWindowOpen', true);
                    App.settings.apogeeInfoWindowOpen = true;
                    App.orbit.apogeeMarkerInfoWindow.open(App.map, App.orbit.apogeeMarker);
                }
            });

        } else {
            App.orbit.apogeeMarker.content = 'Apogee<br>Altitude: ' + parseFloat(apogee.altitude).toFixed(2) + ' km';
            App.orbit.apogeeMarker.setPosition(apogeePosition);
        }

        var perigeePosition = new google.maps.LatLng(parseFloat(perigee.latitude), parseFloat(perigee.longitude));
        if (App.orbit.perigeeMarker == null) {
            App.orbit.perigeeMarker = new google.maps.Marker({
                position: perigeePosition,
                map: App.map,
            });

            App.orbit.perigeeMarkerInfoWindow = new InfoBox({
                content: 'Perigee<br>Altitude: ' + parseFloat(perigee.altitude).toFixed(2) + ' km',
                pixelOffset: new google.maps.Size(-65, 5),
                boxStyle: {
                    background: '#0F6388',
                    opacity: 0.5,
                    width: '130px',
                    color: '#ffffff'
                }
            });

            if(App.settings.perigeeInfoWindowOpen) {
                App.orbit.perigeeMarkerInfoWindow.open(App.map, App.orbit.perigeeMarker);
            }

            google.maps.event.addListener(App.orbit.perigeeMarker, 'click', function () {
                if (App.isInfoWindowOpen(App.orbit.perigeeMarkerInfoWindow)) {
                    App.orbit.perigeeMarkerInfoWindow.close();
                    localStorage.setItem('perigeeInfoWindowOpen', false);
                    App.settings.perigeeInfoWindowOpen = false;

                } else {
                    App.orbit.perigeeMarkerInfoWindow.open(App.map, App.orbit.perigeeMarker);
                    localStorage.setItem('perigeeInfoWindowOpen', true);
                    App.settings.perigeeInfoWindowOpen = true;
                }
            });

        } else {
            App.orbit.perigeeMarker.content = 'Perigee<br>Altitude: ' + parseFloat(perigee.altitude).toFixed(2) + ' km';
            App.orbit.perigeeMarker.setPosition(perigeePosition);
        }

        if (App.orbitLine) {
            App.orbitLine.setMap(null);
        }

        App.orbitLine = new google.maps.Polyline({
            path: orbit,
            geodesic: false,
            strokeColor: '#ffffff', // orbitPath color
            strokeOpacity: 0.6,
            strokeWeight: 3
        });

        App.orbitLine.setMap(App.map);
    },

    updateStationPosition: function (position) {
        if (App.mapInitialized) {
            position = {
                latitude: App.userPosition.latitude,
                longitude: App.userPosition.longitude,
                altitude: App.userPosition.altitude
            }
        }

        $.ajax({
            data: {
                satellite: App.trackSatellite,
                user_latitude: position.latitude,
                user_longitude: position.longitude,
                user_altitude: position.altitude
            },
            method: 'POST',
            url: App.apiEndpoint + 'api/satellite',
            dataType: 'json',
            success: function (data) {
                var latitude = parseFloat(data.position.latitude);
                var longitude = parseFloat(data.position.longitude);

                if (App.mapInitialized) {
                    var newLatLng = new google.maps.LatLng(latitude, longitude);
                    App.stationMarker.setPosition(newLatLng);
                    App.dayNightTerminator.setDate(Date.UTC());
                } else {
                    App.initializeMap(data);
                    var interval = 1000 * 5; // where X is your every X seconds
                    setInterval(App.updateStationPosition, interval);

                    App.mapInitialized = true;
                }

                App.updateRightPanel(data);
                App.updateTicker(data);
                App.drawOrbit(data);
                App.updateAltitudeChart(data);
            }
        });
    },

    updateTicker: function (data) {
        var timestamp = Math.round(+new Date() / 1000);
        if (App.tickerLastUpdated == false || timestamp > App.tickerLastUpdated + 60) {
            App.tickerLastUpdated = timestamp;
            var latLng = new google.maps.LatLng(data.position.latitude, data.position.longitude);
            App.geocoder.geocode({'latLng': latLng}, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    if (results[0]) {
                        $('#label-passing-over').html(results[0].formatted_address);
                    } else {
                        $('#label-passing-over').html('Ocean');
                    }
                }
            });
        }
    },

    updateRightPanel: function (data) {
        $('#label-latitude').html(parseFloat(data.position.latitude).toFixed(5));
        $('#label-longitude').html(parseFloat(data.position.longitude).toFixed(5));
        $('#label-altitude').html(parseFloat(data.position.altitude).toFixed(2) + ' km');
        $('#label-epoch').html(data.tle.epoch_year + data.tle.epoch_day);
        $('#label-raan').html(data.tle.right_ascension);
        $('#label-argp').html(data.tle.arg_perigee);
        $('#label-ecce').html(data.tle.eccentricity);
        $('#label-inclination').html(data.tle.inclination);
        $('#label-mean-motion').html(data.tle.mean_motion);
        $('#label-ma').html(data.tle.mean_anomaly);
        $('#label-drag').html(data.tle.bstar);
        $('#label-satellite').html(data.satellite);
        var periodMins = parseInt(data.tle.orbit_time / 60);
        $('#label-period').html('~' + periodMins + ' min');

        var userPosition = App.userMarker.getPosition();
        var userLat = userPosition.lat();
        var userLng = userPosition.lat();
        var satLat = data.position.latitude;
        var satLng = data.position.longitude;

        var userLocation = new LatLon(userLat, userLng);
        var stationLocation = new LatLon(satLat, satLng);
        var bearing = userLocation.bearingTo(stationLocation);

        var compass_rotation = data.user_view.azimuth;
        var elevation = data.user_view.elevation * -1;

        $('#user-view-elevation #label-elvation').html(parseInt(data.user_view.elevation) + '°');
        $('#user-view-compass #label-azimuth').html(parseInt(compass_rotation) + '°');
        $('#user-view-compass #station').css('transform', 'rotate(' + compass_rotation + 'deg)');
        $('#user-view-elevation #elevation').attr('transform', 'rotate(' + elevation + ' 0 55)');
    },

    initAltitudeChart: function (data) {
        var altitudes = [];
        var categories = [];
        for (var i in data.orbit) {
            altitudes.push(parseFloat(data.orbit[i].altitude.toFixed(2)));
            var date = new Date(data.orbit[i].timestamp * 1000);
            var hours = date.getHours();
            var minutes = "0" + date.getMinutes();
            var seconds = "0" + date.getSeconds();

            categories.push(date.toUTCString());
        }

        App.altitudeChart = $('#altitude-chart').highcharts({
            title: {
                text: '',
                style: {
                    display: 'none'
                }
            },
            credits: {
                enabled: false
            },
            xAxis: {
                categories: categories,
                labels: {
                    enabled: false
                }
            },
            yAxis: {
                title: {
                    text: 'Altitude (km)'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {
                valueSuffix: ' km'
            },
            series: [{
                name: data.satellite,
                data: altitudes
            }]
        });
    },
    updateAltitudeChart: function (data) {
        var altitudes = [];
        var categories = [];
        for (var i in data.orbit) {
            altitudes.push(parseFloat(data.orbit[i].altitude.toFixed(2)));
            var date = new Date(data.orbit[i].timestamp * 1000);
            var hours = date.getHours();
            var minutes = "0" + date.getMinutes();
            var seconds = "0" + date.getSeconds();

            categories.push(date.toUTCString());
        }
        App.altitudeChart.series = altitudes;
        App.altitudeChart.xAxis = {
            categories: categories,
            labels: {
                enabled: false
            }
        }
    },
    isInfoWindowOpen: function (infoWindow) {
        var map = infoWindow.getMap();
        return (map !== null && typeof map !== "undefined");
    }
};

(function ($) {
    $(document).ready(function () {
        var height = $(document).height();
        var width = $(document).width();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                position.latitude = position.coords.latitude;
                position.longitude = position.coords.longitude;
                position.altitude = position.coords.altitude ? position.coords.altitude : 0;

                App.userPosition = position;
                App.updateStationPosition(position);

                if (App.userMarker) {
                    var userPosition = new google.maps.LatLng(position.latitude, position.longitude);
                    App.userMarker.setPosition(userPosition);
                }

            }, function () {
                App.userPosition = App.defaultPosition;
                App.updateStationPosition(App.defaultPosition);
            }, {
                timeout: 10,
                maximumAge: 75000,
                timeout: 5000
            });
        } else {
            App.userPosition = App.defaultPosition;
            App.updateStationPosition(App.defaultPosition);
        }

        if (App.mapInitialized == false) {
            App.userPosition = App.defaultPosition;
            App.updateStationPosition(App.defaultPosition);
        }

        if (App.toolbarRightOpen) {
            $('#toolbar-right').addClass('active');
        } else {
            $('#toolbar-right').removeClass('active');
        }

        $('#toolbar-right-toggle').click(App.toggleSidebar);
        $('#toolbar-bottom-toggle').click(App.toggleDashboard);

        $(window).resize(function () {
            if (!App.toolbarRightOpen) {
                App.repositionToolbarRight();
            }
        });

        $('#select-satellite').select2({
            //ajax: {
            //    // url: "https://api.github.com/search/repositories",
            //    url: App.apiEndpoint + "satellites.php",
            //    dataType: 'json',
            //    delay: 250,
            //    data: function (params) {
            //      return {
            //        q: params.term,
            //      };
            //    },
            //    processResults: function (data, page) {
            //        var rval = [];
            //        for(var i in data) {
            //            rval.push({id: data[i], name: data[i]});
            //        }
            //
            //        return {
            //            results: rval
            //        };
            //    },
            //    cache: true
            //  },
        });
        $('[data-toggle="tooltip"]').tooltip();
        $('[data-toggle="popover"]').popover();

        $('#select-satellite').change(function () {
            App.trackSatellite = $(this).val();
        });

        if (typeof(Storage) !== "undefined") {
            if (localStorage.getItem('dashboardOpen') == "false") {
                $('#toolbar-bottom').removeClass('active');
                App.dashboardOpen = false;
            }

            App.settings.perigeeInfoWindowOpen = localStorage.getItem('perigeeInfoWindowOpen');
            App.settings.apogeeInfoWindowOpen = localStorage.getItem('apogeeInfoWindowOpen');

        } else {
            App.settings.perigeeInfoWindowOpen = true;
            App.settings.apogeeInfoWindowOpen = true;
        }

    });
})(jQuery)

