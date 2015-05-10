/**
 * Created by Ivan on 5/1/2015.
 */
App.modules.groundStations = {

    init: function () {
        $.ajax({
            url: App.settings.apiEndpoint + 'api/ground-stations',
            dataType: 'json',
            success: function (data) {
                for (var i in data) {
                    var marker = new google.maps.Marker({
                        position: (new google.maps.LatLng(parseFloat(data[i].latitude), parseFloat(data[i].longitude))),
                        map: App.map
                    });
                    App.mapFeatures.groundStations.push(marker);
                }
            }
        });
    },

}