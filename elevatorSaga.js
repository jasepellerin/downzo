{
  init: (elevators, floors) => {
    const delayForLoadFactorBeforeLeaving = .25;
    const delay = 20;
    const maxDelays = 1;
    const maxLoadToStopForPassengers = .5;

    const floorsWithWaitingPassengers = {
      up: new Set(),
      down: new Set()
    };

    const floorsElevatorsAreVisiting = new Set();

    const initializeElevator = (elevator) => {
      elevator.timesDelayedOnThisFloor = 0;
      elevator.on("idle", () => {
        let destination = 0;
        const pressedFloors = new Set([...elevator.getPressedFloors()]);
        if (pressedFloors.size > 0) {
          destination = getClosestFloor(elevator, pressedFloors);
        } else {
          const floorsWithPassengers = new Set([...floorsWithWaitingPassengers.up, ...floorsWithWaitingPassengers.down]);
          elevator.destinationQueue = [];
          elevator.checkDestinationQueue();
          destination = getClosestFloor(elevator, floorsWithPassengers, true);
        }
        ensureElevatorIsFullBeforeSending(elevator, destination);
      });

      elevator.on("stopped_at_floor", (floorNum) => {
        floorsWithWaitingPassengers.up.delete(floorNum);
        floorsWithWaitingPassengers.down.delete(floorNum);
        floorsElevatorsAreVisiting.delete(floorNum);
      });

      elevator.on("passing_floor", (floorNum, direction) => {
        if (floorsWithWaitingPassengers[direction].has(floorNum) && elevator.loadFactor() < maxLoadToStopForPassengers && !floorsElevatorsAreVisiting.has(floorNum)) {
          elevator.goToFloor(floorNum, true);
        }
      })
    }

    const initializeFloor = (floor) => {
      floor.on("up_button_pressed", () => {
        floorsWithWaitingPassengers.up.add(floor.floorNum());
      });

      floor.on("down_button_pressed", () => {
        floorsWithWaitingPassengers.down.add(floor.floorNum());
      });
    }

    const ensureElevatorIsFullBeforeSending = (elevator, floorNum) => {
      floorsElevatorsAreVisiting.add(floorNum);
      if (elevator.loadFactor() > delayForLoadFactorBeforeLeaving || elevator.timesDelayedOnThisFloor >= maxDelays) {
        sendElevatorToFloor(elevator, floorNum);
      } else {
        elevator.timesDelayedOnThisFloor++;
        setTimeout(() => { ensureElevatorIsFullBeforeSending(elevator, floorNum); }, delay);
      }
    };

    const sendElevatorToFloor = (elevator, floorNum) => {
      elevator.goToFloor(floorNum);
      elevator.timesDelayedOnThisFloor = 0;
    }

    const getClosestFloor = (elevator, possibleFloors, skipIfAnotherIsVisiting = false) => {
      let closestFloor = elevator.currentFloor();
      let closestRequestedFloorDistance = floors.length + 1;
      let floorsToCheck = possibleFloors;
      if (skipIfAnotherIsVisiting) {
        floorsToCheck = new Set([...floorsToCheck].filter(x => !floorsElevatorsAreVisiting.has(x)));
      }
      floorsToCheck.forEach((floor) => {
        currentRequestedFloorDistance = Math.abs(elevator.currentFloor() - floor);
        if (currentRequestedFloorDistance < closestRequestedFloorDistance) {
          closestFloor = floor;
          closestRequestedFloorDistance = currentRequestedFloorDistance;
        }
      });
      return closestFloor;
    };

    elevators.forEach(initializeElevator);
    floors.forEach(initializeFloor);
  },
    update: (dt, elevators, floors) => {
    }
}
