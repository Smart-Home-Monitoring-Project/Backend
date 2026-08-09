const { db } = require("./database");

/**
 * Records important device status changes for usage reporting.
 *
 * @param {Object} previousDevice Previous device state.
 * @param {Object} currentDevice Current device state.
 * @param {string} houseId House identifier.
 * @param {string} floorId Floor identifier.
 * @param {string} roomId Room identifier.
 * @param {string} deviceId Device identifier.
 */
async function logDeviceActivity(
  previousDevice,
  currentDevice,
  houseId,
  floorId,
  roomId,
  deviceId,
) {
  // Only log devices that have actually changed status.
  if (!previousDevice || previousDevice.status === currentDevice.status) {
    return;
  }

  // For this assignment, usage logging is most important
  // for high-power / safety-critical devices.
  if (currentDevice.type !== "heavy_appliance") {
    return;
  }

  const timestamp = Date.now();

  const logEntry = {
    deviceId,
    deviceName: currentDevice.name || deviceId,
    houseId,
    floorId,
    roomId,
    fromStatus: previousDevice.status,
    toStatus: currentDevice.status,
    timestamp,
  };

  // Calculate usage duration when the device is turned OFF.
  if (
    previousDevice.status === "ON" &&
    currentDevice.status === "OFF" &&
    currentDevice.turnedOnAt
  ) {
    logEntry.durationSeconds = Math.round(
      (timestamp - currentDevice.turnedOnAt) / 1000,
    );
  }

  await db.ref(`houses/${houseId}/logs`).push(logEntry);

  console.log(
    `Usage log created for ${deviceId}: ` +
    `${previousDevice.status} -> ${currentDevice.status}`,
  );
}

module.exports = {
  logDeviceActivity,
};