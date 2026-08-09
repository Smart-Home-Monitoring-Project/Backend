const { db } = require("./database");

async function sendNotification(
  previousDevice,
  currentDevice,
  houseId,
  floorId,
  roomId,
  deviceId,
) {
  if (!previousDevice || previousDevice.status === currentDevice.status) {
    return;
  }

  if (currentDevice.type !== "heavy_appliance") {
    return;
  }

  // Only create an alert when the backend safety system
  // automatically turned the device OFF.
  if (
    previousDevice.status === "ON" &&
    currentDevice.status === "OFF" &&
    currentDevice.safetyCutoff === true
  ) {
    const notification = {
      type: "SAFETY_ALERT",
      deviceId,
      deviceName: currentDevice.name || deviceId,
      houseId,
      floorId,
      roomId,
      message:
        `${currentDevice.name || deviceId} was automatically ` +
        "turned OFF for safety.",
      timestamp: Date.now(),
      read: false,
    };

    await db
      .ref(`houses/${houseId}/notifications`)
      .push(notification);

    console.log(
      `Safety notification created for ${deviceId}.`,
    );
  }
}

module.exports = {
  sendNotification,
};