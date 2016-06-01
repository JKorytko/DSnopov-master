(function() {
  angular.module('pd')
    .service('helpers', ['$ionicPopup', helpersService]);

  function helpersService($ionicPopup) {
    
    var helpers = {
      
      showAlert: function(title, msg) {
        $ionicPopup.alert({
          title: title,
          template: msg
        });
      }
      
    };
    
    return helpers;
  }
})();