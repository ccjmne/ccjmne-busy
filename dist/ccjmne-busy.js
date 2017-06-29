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
      this.state = { global: { count: 0, detached: false } };
      this.listeners = {};
      var self = this;

      this.notify = function (task) {
        (self.listeners[task] || []).slice(0).forEach(function (callback) {
          callback(self.state[task].count > 0, function off() {
            if (self.listeners[task].indexOf(callback) !== -1) {
              self.listeners[task].splice(self.listeners[task].indexOf(callback), 1);
            }
          });
        });
      };

      return this.api = {
        register: function (callback, task) {
          task = task ? task : 'global';
          if (self.listeners[task]) {
            self.listeners[task].push(callback);
          } else {
            self.listeners[task] = [callback];
          }

          function off() {
            if (self.listeners[task].indexOf(callback) !== -1) {
              self.listeners[task].splice(self.listeners[task].indexOf(callback), 1);
            }
          }

          callback(self.state[task] && self.state[task].count > 0, off);
          return off;
        },
        once: function (callback, task) {
          self.api.register(function (busy, off) {
            if (!busy) {
              off();
              callback();
            }
          }, task);
        },
        busy: function (task, detach) {
          task = task ? task : 'global';
          detach = !!detach;
          if ((self.state[task] && (self.state[task].count > 0) || task === 'global') && self.state[task].detached !== detach) {
            throw 'Unable to alter detachment status of ongoing task \'' + task + '\', was previously \'' + (self.state[task].detached ? 'detached' : 'attached') + '\'.';
          }

          if (task && task !== 'global') {
            if (!self.state[task]) {
              self.state[task] = { count: 0 };
            }

            self.state[task].detached = detach;

            if (1 === (self.state[task].count += 1)) {
              self.notify(task);
            }
          }

          if (!self.state[task].detached && 1 === (self.state.global.count = self.state.global.count + 1)) {
            self.notify('global');
          }
        },
        done: function (task) {
          task = task ? task : 'global';
          if (!self.state[task]) {
            return;
          }

          if (task && task !== 'global') {
            if (!(self.state[task].count = self.state[task].count ? self.state[task].count - 1 : 0)) {
              self.notify(task);
            }
          }

          if (!self.state[task].detached && !(self.state.global.count = self.state.global.count ? self.state.global.count - 1 : 0)) {
            self.notify('global');
          }
        },
        check: function (task) {
          task = task ? task : 'global';
          return self.state[task] ? self.state[task].count : 0;
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
