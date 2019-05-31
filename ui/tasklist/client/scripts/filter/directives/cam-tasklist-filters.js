'use strict';
var fs = require('fs');

var template = fs.readFileSync(__dirname + '/cam-tasklist-filters.html', 'utf8');

var noop = function() {};

module.exports = [function() {

  return {

    restrict: 'A',
    scope: {
      filtersData: '=',
      openModal: '&',
      userCanCreateFilter: '='
    },

    template: template,

    controller: [
      '$scope',
      'search',
      'camAPI',
      'Uri',
      'Notifications',
      '$translate',
      '$http',
      '$q',
      function(
        $scope,
        search,
        camAPI,
        Uri,
        Notifications,
        $translate,
        $http,
        $q
      ) {

        var filtersData = $scope.filtersData = $scope.filtersData.newChild($scope);

        $scope.openModal = $scope.openModal() || noop;

        var filterResource = camAPI.resource('filter');

        // observe ////////////////////////////////////////////////////////////////////////////////

        /**
         * update all filters when taskList changes
         */
        filtersData.observe('taskList', function() {
          $scope.filters.forEach(function(filter) {
            _getFilterItemCount(filter).then(function(itemCount) {
              filter.filterCount = itemCount;
            });
          });
        });

        /**
         * observe list of filters to set the background-color on a filter
         */
        $scope.state = filtersData.observe('filters', function(filters) {

          $scope.totalItems = filters.length;
          var promises = [];
          filters.forEach(function(filter, index) {
            filter.style = {
              'z-index': filters.length + 10 - index
            };
            var promise = _getFilterItemCount(filter);
            promises.push(promise);
            promise.then(function(itemCount) {
              filter.filterCount = itemCount;
            });
          });
          $q.all(promises).then(function() {
            $scope.filters = filters;
          });
        });

        filtersData.observe('currentFilter', function(currentFilter) {
          $scope.currentFilter = currentFilter;
        });

        /**
         * returns filter's item amount
         */
        function _getFilterItemCount(filter) {
          var deferred = $q.defer();
          $http.get(Uri.appUri('engine://engine/:engine/filter/' + filter.id + '?itemCount=true'))
            .success(
              function(response) {
                deferred.resolve(response.itemCount);
              }
            )
            .catch(function(error) {
              deferred.reject(error);
            });
          return deferred.promise;
        }

        // selection ////////////////////////////////////////////////////////////////

        /**
         * select a filter
         */
        $scope.focus = function(filter) {
          filtersData.changed('filters');
          search.updateSilently({
            filter: filter.id
          });
        };

        /**
         * returns true if the provided filter is the focused filter
         */
        $scope.isFocused = function(filter) {
          return filter.id === $scope.currentFilter.id;
        };

        /**
         * Add initial 'All' filter
         */

        $scope.addAllFilter = function() {
          return $translate('ALL_TASKS').then(function(translated) {
            var payload = {
              name: translated,
              resourceType: 'Task',
              query: {},
              properties: {
                description: 'Unfiltered Tasks',
                priority: 1,
                color: '#555555',
                refresh: false,
                howUndefinedVariable: false
              }
            };
            return filterResource.create(payload);
          }).then(function() {
            $scope.filtersData.changed('filters');
          })
            .catch(function(err) {
              return $translate('FILTER_SAVE_ERROR').then(function(translated) {
                Notifications.addError({
                  status: translated,
                  message: err.message || ''
                });
              });
            });
        };

      }]
  };
}];
