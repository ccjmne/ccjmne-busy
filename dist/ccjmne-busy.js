'use strict';

(function (factory) {
  if (typeof module !== 'undefined' && module.exports) {
    if (typeof angular === 'undefined') {
      factory(require('angular'));
    } else {
      factory(angular);
    }

    module.exports = 'ccjmne-busy';
  } else if (typeof define === 'function' && define.amd) {
    define(['angular'], factory);
  } else {
    factory(angular || window.angular);
  }
})(function (angular) {
  angular.module('ccjmne-busy', [])
    .run(['$templateCache', function ($templateCache) {
      /*jshint multistr: true*/
      $templateCache.put('ccjmne-busy_tmpl.html',
        '<div class="sk-folding-cube-wrap" ng-show="busy"> \
          <div class="sk-folding-cube"> \
            <div class="sk-cube1 sk-cube"></div> \
            <div class="sk-cube2 sk-cube"></div> \
            <div class="sk-cube4 sk-cube"></div> \
            <div class="sk-cube3 sk-cube"></div> \
          </div> \
        </div>  \
        <div ng-transclude ng-show="!busy"></div>'
      );
      $templateCache.put('ccjmne-busy-hide_tmpl.html',
        '<div ng-transclude ng-show="!busy"></div>'
      );
    }])
    .factory('BusySvc', function () {
      var state = { global: { count: 0, detached: false } };
      var listeners = {};

      function notify(task) {
        (listeners[task] || []).forEach(function (callback) {
          callback(state[task].count > 0, function () {
            if (listeners[task].indexOf(callback) !== -1) {
              listeners[task].splice(listeners[task].indexOf(callback), 1);
            }
          });
        });
      }

      return {
        register: function (callback, task) {
          task = task ? task : 'global';
          if (listeners[task]) {
            listeners[task].push(callback);
          } else {
            listeners[task] = [callback];
          }

          callback(state[task] && state[task].count > 0, function () {
            if (listeners[task].indexOf(callback) > 0) {
              listeners[task].splice(listeners[task].indexOf(callback), 1);
            }
          });

          return function () {
            if (listeners[task].indexOf(callback) !== -1) {
              listeners[task].splice(listeners[task].indexOf(callback), 1);
            }
          };
        },
        busy: function (task, detach) {
          task = task ? task : 'global';
          detach = detach ? true : false;
          if ((state[task] && (state[task].count > 0) || task === 'global') && state[task].detached !== detach) {
            throw 'Unable to alter detachment status of ongoing task \'' + task + '\', was previously \'' + (state[task].detached ? 'detached' : 'attached') + '\'.';
          }

          if (task && task !== 'global') {
            if (!state[task]) {
              state[task] = { count: 0 };
            }

            state[task].detached = detach;

            if (1 === (state[task].count += 1)) {
              notify(task);
            }
          }

          if (!state[task].detached && 1 === (state.global.count = state.global.count + 1)) {
            notify('global');
          }
        },
        done: function (task) {
          task = task ? task : 'global';
          if (!state[task]) {
            return;
          }

          if (task && task !== 'global') {
            if (!(state[task].count = state[task].count ? state[task].count - 1 : 0)) {
              notify(task);
            }
          }

          if (!state[task].detached && !(state.global.count = state.global.count ? state.global.count - 1 : 0)) {
            notify('global');
          }
        },
        check: function (task) {
          task = task ? task : 'global';
          return state[task] ? state[task].count : 0;
        }
      };
    })
    .directive('busy', ['BusySvc', function (busySvc) {
      return {
        restrict: 'E',
        transclude: true,
        templateUrl: function (elem, attr) {
          return attr.busyTemplate ? attr.busyTemplate : 'ccjmne-busy_tmpl.html';
        },
        link: function (scope, element, attrs) {
          element.on('$destroy', busySvc.register(function (busy) {
            scope.busy = busy;
            setTimeout(function () { scope.$digest(); }, 0);
          }, attrs.busy || attrs.busyTask));
        }
      };
    }])
    .directive('busyHide', ['BusySvc', function (busySvc) {
      return {
        restrict: 'EA',
        transclude: true,
        templateUrl: 'ccjmne-busy-hide_tmpl.html',
        link: function (scope, element, attrs) {
          element.on('$destroy', busySvc.register(function (busy) {
            scope.busy = busy;
            setTimeout(function () { scope.$digest(); }, 0);
          }, attrs.busy || attrs.busyTask));
        }
      };
    }])
    .directive('busyWatch', ['BusySvc', function (busySvc) {
      return {
        restrict: 'EA',
        transclude: true,
        link: function (scope, element, attrs) {
          element.on('$destroy', busySvc.register(function (busy) {
            scope.$busy = busy;
            setTimeout(function () { scope.$digest(); }, 0);
          }, attrs.busy || attrs.busyTask));
        }
      };
    }])
    .directive('busyText', ['BusySvc', '$compile', function (busySvc, $compile) {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          var previousText;
          element.on('$destroy', busySvc.register(function (busy) {
            if (busy) {
              previousText = element.html();
              element.text(attrs.busyText);
            } else {
              element.html($compile(previousText || element.contents())(scope));
            }

            setTimeout(function () { scope.$digest(); }, 0);
          }, attrs.busyTask));
        }
      };
    }])
    .directive('busyHtml', ['BusySvc', '$compile', function (busySvc, $compile) {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          var previousText;
          element.on('$destroy', busySvc.register(function (busy) {
            if (busy) {
              previousText = element.html();
            }

            element.html($compile(busy ? attrs.busyHtml : previousText || element.contents())(scope));
            setTimeout(function () { scope.$digest(); }, 0);
          }, attrs.busyTask));
        }
      };
    }])
    .directive('busyDisable', ['BusySvc', function (busySvc) {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          var previouslyDisabled;
          element.on('$destroy', busySvc.register(function (busy) {
            if (busy) {
              previouslyDisabled = element.attr('disabled') || false;
            }

            element.attr('disabled', busy || previouslyDisabled);
            setTimeout(function () { scope.$digest(); }, 0);
          }, attrs.busyDisable || attrs.busyTask));
        }
      };
    }]);
});
