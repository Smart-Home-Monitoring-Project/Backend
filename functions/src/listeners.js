const { db } = require("./database");

const { handleIronSafety } = require("./ironSafety");
const { logDeviceActivity } = require("./logging");
const { sendNotification } = require("./notifications");

console.log("Device listener started...");

let previousDevices = {};
let initialized = false;
let checking = false;

function collectDevices(houses) {
  const devices = {};

  if (!houses) {
    return devices;
  }

  Object.entries(houses).forEach(([houseId, house]) => {
    const floors = house.floors || {};

    Object.entries(floors).forEach(([floorId, floor]) => {
      const rooms = floor.rooms || {};

      Object.entries(rooms).forEach(([roomId, room]) => {
        const roomDevices = room.devices || {};

        Object.entries(roomDevices).forEach(([deviceId, device]) => {
          const key = `${houseId}/${floorId}/${roomId}/${deviceId}`;

          devices[key] = {
            houseId,
            floorId,
            roomId,
            deviceId,
            device,
          };
        });
      });
    });
  });

  return devices;
}

async function checkForChanges() {
  if (checking) {
    return;
  }

  checking = true;

  try {
    const snapshot = await db.ref("houses").get();
    const houses = snapshot.val();

    const currentDevices = collectDevices(houses);

    if (!initialized) {
      previousDevices = currentDevices;
      initialized = true;

      console.log(
        `Initial device snapshot loaded: ${
          Object.keys(currentDevices).length
        } devices.`,
      );

      return;
    }

    for (const [key, current] of Object.entries(currentDevices)) {
      const previous = previousDevices[key];

      if (!previous) {
        console.log(`New device detected: ${current.deviceId}`);
        continue;
      }

      const previousStatus = previous.device.status;
      const currentStatus = current.device.status;

      if (previousStatus !== currentStatus) {
        console.log(
          `Device status changed: ${current.deviceId} ` +
          `${previousStatus} -> ${currentStatus}`,
        );

        await handleIronSafety(
          current.device,
          current.houseId,
          current.floorId,
          current.roomId,
          current.deviceId,
        );

        await logDeviceActivity(
          previous.device,
          current.device,
          current.houseId,
          current.floorId,
          current.roomId,
          current.deviceId,
        );

        await sendNotification(
          previous.device,
          current.device,
          current.houseId,
          current.floorId,
          current.roomId,
          current.deviceId,
        );
      }
    }

    previousDevices = currentDevices;
  } catch (error) {
    console.error("Listener error:", error);
  } finally {
    checking = false;
  }
}

checkForChanges();

setInterval(checkForChanges, 2000);