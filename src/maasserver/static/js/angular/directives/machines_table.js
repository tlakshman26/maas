/* Copyright 2017-2018 Canonical Ltd.  This software is licensed under the
* GNU Affero General Public License version 3 (see the file LICENSE).
*
* Machines listing directive.
*
* Renders the machines listing.
*/
// testing



angular.module('MAAS').directive('maasMachinesTable', [
  'MachinesManager',
  'NotificationsManager',
  'UsersManager',
  'GeneralManager',
  'ManagerHelperService',
  '$document',
  function (
    MachinesManager,
    NotificationsManager,
    UsersManager,
    GeneralManager,
    ManagerHelperService,
    $document
  ) {
    return {
      restrict: "E",
      scope: {
        search: "=",
        actionOption: "=",
        ngDisabled: "&",
        machineHasError: "&",
        hideCheckboxes: "=?",
        onListingChange: "&",
        onCheckAll: "&",
        onCheck: "=",
        pools: "=",
        zones: "="
      },
      templateUrl: (
        'static/partials/machines-table.html?v=' + (
          MAAS_config.files_version)),
      link: function(scope, element, attrs) {
        // Statuses that should show spinner.
        var SPINNER_STATUSES = [
          1,   // commissioning
          9,   // deploying
          12,  // releasing
          14,  // disk erasing
          17,  // entering rescue mode
          19,  // exiting rescue mode
          21   // testing
        ];

        const actionMap = new Map([
          ["abort", "abort action in progress"],
          ["acquire", "acquire machine"],
          ["check", "check machine's power state"],
          ["commission", "commission machine"],
          ["deploy", "deploy machine"],
          ["exit-rescue-mode", "exit rescue mode"],
          ["lock", "lock machine"],
          ["mark-broken", "mark machine as broken"],
          ["mark-fixed", "mark machine as fixed"],
          ["off", "power machine off"],
          ["on", "power machine on"],
          ["override-failed-testing", "override failed testing"],
          ["release", "release machine"],
          ["rescue-mode", "enter rescue mode"],
          ["set-pool", "set machine's pool"],
          ["set-zone", "set machine's zone"],
          ["test", "test machine"],
          ["unlock", "unlock machine"],
        ]);

        // Scope variables.
        scope.table = {
          column: 'fqdn',
          predicate: 'fqdn',
          reverse: false,
          allViewableChecked: false,
          machines: MachinesManager.getItems(),
          filteredMachines: [],
          osinfo: GeneralManager.getData("osinfo")
        };
        scope.statusMenuActions = [
          "commission",
          "deploy",
          "abort",
          "test",
          "rescue-mode",
          "exit-rescue-mode",
          "mark-broken",
          "mark-fixed",
          "override-failed-testing",
          "lock",
          "unlock"
        ];
        scope.openMenu = "";

        // Ensures that the checkbox for select all is the correct value.
        scope.updateAllChecked = function() {
          // Not checked when the filtered machines are empty.
          if(scope.table.filteredMachines.length === 0) {
              scope.table.allViewableChecked = false;
              return;
          }

          // Loop through all filtered machines and see if all are checked.
          var i;
          for(i = 0; i < scope.table.filteredMachines.length; i++) {
              if(!scope.table.filteredMachines[i].$selected) {
                  scope.table.allViewableChecked = false;
                  return;
              }
          }
          scope.table.allViewableChecked = true;
        };

        // Selects and deselects visible machines.
        scope.toggleCheckAll = function() {
          if(scope.table.allViewableChecked) {
            angular.forEach(
              scope.table.filteredMachines, function(machine) {
                MachinesManager.unselectItem(machine.system_id);
              });
          } else {
            angular.forEach(
              scope.table.filteredMachines, function(machine) {
                MachinesManager.selectItem(machine.system_id);
              });
          }
          scope.updateAllChecked();
          scope.onCheckAll();
        };

        // Selects and unselects machine.
        scope.toggleChecked = function(machine) {
          if(MachinesManager.isSelected(machine.system_id)) {
            MachinesManager.unselectItem(machine.system_id);
          } else {
            MachinesManager.selectItem(machine.system_id);
          }
          scope.updateAllChecked();
        };

        // Sorts the table by predicate.
        scope.sortTable = function(predicate) {
            scope.table.predicate = predicate;
            scope.table.reverse = !scope.table.reverse;
        };

        // Sets the viewable column or sorts.
        scope.selectColumnOrSort = function(predicate) {
            if(scope.table.column !== predicate) {
                scope.table.column = predicate;
            } else {
                scope.sortTable(predicate);
            }
        };

        // Return true if spinner should be shown.
        scope.showSpinner = function(machine) {
            return SPINNER_STATUSES.indexOf(machine.status_code) > -1;
        };

        scope.showFailedTestWarning = function(machine) {
            if(scope.showSpinner(machine)) {
                return false;
            }
            switch(machine.status_code) {
                // NEW
                case 0:
                // COMMISSIONING
                case 1:
                // FAILED_COMMISSIONING
                case 2:
                // TESTING
                case 21:
                // FAILED_TESTING
                case 22:
                    return false;
            }
            switch(machine.testing_status) {
                // Tests havn't been run
                case -1:
                // Tests have passed
                case 2:
                    return false;
            }
            return true;
        };

        // Return true if the other node status should be shown.
        scope.showNodeStatus = function(machine) {
            // -1 means tests havn't been run, 2 means tests have passed.
            if(!scope.showSpinner(machine) &&
               !scope.showFailedTestWarning(machine) &&
               machine.other_test_status !== -1 &&
               machine.other_test_status !== 2) {
                return true;
            } else {
                return false;
            }
        };

        // Returns the release title from osinfo.
        scope.getReleaseTitle = function(os_release) {
          if(angular.isArray(scope.table.osinfo.releases)) {
            for(i = 0; i < scope.table.osinfo.releases.length; i++) {
              var release = scope.table.osinfo.releases[i];
              if(release[0] === os_release) {
                return release[1];
              }
            }
          }
          return os_release;
        };

        // Returns the status text to show.
        scope.getStatusText = function(machine) {
          var showRelease = ['Deploying', 'Deployed'];
          if(showRelease.indexOf(machine.status) === -1) {
            return machine.status;
          } else {
            var releaseTitle = scope.getReleaseTitle(
              machine.osystem + '/' + machine.distro_series);
            if(machine.osystem === "ubuntu") {
              releaseTitle = releaseTitle.split('"')[0].trim();
            }
            if(machine.status === "Deployed") {
              return releaseTitle;
            }
            if(machine.status === "Deploying") {
              return machine.status + ' ' + releaseTitle;
            }
          }
        };

        // When the list of filtered machines change update the all checkbox.
        scope.$watchCollection("table.filteredMachines", function() {
          scope.updateAllChecked();
          scope.onListingChange({$machines: scope.table.filteredMachines});
        });

        // Watch a simplified list of machines for changes to power state,
        // then set transitional state accordingly.
        scope.$watch(
          scope =>
            scope.table.machines.map(machine => ({
              id: machine.id,
              state: machine.power_state
            })),
          (newMachines, oldMachines) => {
            newMachines.forEach(newMachine => {
              const oldMachine =
                oldMachines.find(
                  machine => machine.id === newMachine.id
                ) || {};
              if (newMachine.state !== oldMachine.state) {
                scope.table.machines.find(
                  machine => machine.id === newMachine.id
                ).powerTransition = undefined;
              }
            });
          },
          true
        );

        // Truncates leading zeroes in RAM and returns unit separately
        scope.formatMemoryUnit = function(ram) {
          var memory = parseFloat(ram);
          return {
            value: memory.toString(),
            unit: 'GiB',
          }
        }

        // Converts GB into TB if necessary and output three sig-figs
        scope.formatStorageUnit = function(gb) {
          var storage = parseFloat(gb);
          if (storage < 1000) {
            return {
              value: Number(storage.toPrecision(3)).toString(),
              unit: 'GB',
            };
          } else {
            return {
              value: Number((storage / 1000).toPrecision(3)).toString(),
              unit: 'TB',
            };
          }
        };

        scope.getCheckboxClass = function(node) {
          if (scope.actionOption) {
            if (node.$selected
              && node.actions.indexOf(scope.actionOption.name) > -1) {
              return 'actionable';
            }
            return 'not-actionable';
          }
          return '';
        };

        scope.getAllCheckboxClass = function(nodes) {
          if (nodes && scope.actionOption) {
            for (var i=0; i < nodes.length; i++) {
              if (nodes[i].actions.indexOf(scope.actionOption.name) === -1) {
                return 'not-actionable';
              }
            }
            return 'actionable';
          }
          return '';
        };

        scope.getBootIp = function(ipArray) {
          for (var i = 0; i < ipArray.length; i++) {
            if (ipArray[i].is_boot) {
              return ipArray[i].ip;
            }
          }
          return false;
        };

        scope.removeDuplicates = function(ipArray, prop) {
          if (!angular.isArray(ipArray)) {
            return;
          }

          return ipArray.filter((obj, pos, arr) => {
            return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
          });
        };

        scope.changePowerState = (machine, action) => {
          scope.closeMenu();
          machine.powerTransition = true;

          if (action === "check") {
            MachinesManager.checkPowerState(machine).then(
              () => {
                machine.action_failed = false;
                machine.powerTransition = undefined;
              },
              error => {
                scope.createErrorNotification(action, error);
                machine.action_failed = true;
                machine.powerTransition = undefined;
              }
            );
          } else {
            MachinesManager.performAction(machine, action).then(
              () => {
                machine.action_failed = false;
              },
              error => {
                scope.createErrorNotification(action, error);
                machine.action_failed = true;
                machine.powerTransition = undefined;
              }
            );
          }
        };

        scope.performAction = (machine, action, extra) => {
          scope.closeMenu();
          machine[`${action}-transition`] = true;

          if(!angular.isObject(extra)) {
            extra = {};
          }

          MachinesManager.performAction(machine, action, extra).then(() => {
            machine.action_failed = false;
          }, error => {
            scope.createErrorNotification(action, error);
            machine.action_failed = true;
            machine[`${action}-transition`] = undefined;
          });
        };

        scope.getActionTitle = actionName => {
          const machineActions = GeneralManager.getData('machine_actions');
          if (machineActions.length) {
            return machineActions
              .find(action => action.name === actionName)
              .title;
          }
        };

        scope.getStatusActions = machine => {
          return scope.statusMenuActions
            .filter(action => machine.actions.includes(action));
        };

        scope.toggleMenu = menu => {
          scope.openMenu = scope.openMenu === menu
            ? ""
            : menu;
        };

        scope.closeMenu = () => scope.openMenu = "";

        scope.createErrorNotification = (action, error) => {
          const authUser = UsersManager.getAuthUser();
          if (angular.isObject(authUser)) {
            NotificationsManager.createItem({
              message: `Unable to ${actionMap.get(action)}: ${error}`,
              category: "error",
              user: authUser.id
            });
          } else {
            console.error(error);
          }
        }

        $document.on('click', event => {
          const targetClasses = event.target.classList || [];
          const parentClasses = event.target.parentNode.classList || [];

          if (targetClasses.contains("p-table-menu__toggle")
            || targetClasses.contains("p-double-row__icon-container")
            || parentClasses.contains("p-table-menu__dropdown")
            || parentClasses.contains("p-double-row__icon-container")) {
            return;
          }

          scope.$apply(scope.closeMenu);
        });
      }
    };
}]);
