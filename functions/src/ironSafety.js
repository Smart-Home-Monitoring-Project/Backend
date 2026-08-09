const { db } = require("./database");

const activeTimers = new Map();

async function handleIronSafety(
  device,
  houseId,
  floorId,
  roomId,
  deviceId,
) {
  if (deviceId !== "r2-iron") {
    return { safetyCutoff: false };
  }

  const deviceRef = db.ref(
    `houses/${houseId}/floors/${floorId}/rooms/${roomId}/devices/${deviceId}`,
  );

  if (device.status === "ON") {
    const turnedOnAt = Date.now();

    await deviceRef.update({
      turnedOnAt,
      safetyCutoff: false,
    });

    console.log(
      `Iron turned ON. Safety timer started: ${device.maxOnDuration} seconds.`,
    );

    if (activeTimers.has(deviceId)) {
      clearTimeout(activeTimers.get(deviceId));
    }

    const maxDuration = (device.maxOnDuration || 600) * 1000;

    const timer = setTimeout(async () => {
      try {
        const snapshot = await deviceRef.get();
        const currentDevice = snapshot.val();

        if (currentDevice && currentDevice.status === "ON") {
          await deviceRef.update({
            status: "OFF",
            turnedOffAt: Date.now(),
            safetyCutoff: true,
          });

          console.log(
            `SAFETY CUTOFF: ${deviceId} automatically turned OFF.`,
          );
        }
      } catch (error) {
        console.error("Iron safety cutoff error:", error);
      }

      activeTimers.delete(deviceId);
    }, maxDuration);

    activeTimers.set(deviceId, timer);

    return { safetyCutoff: false };
  }

  if (device.status === "OFF") {
    if (activeTimers.has(deviceId)) {
      clearTimeout(activeTimers.get(deviceId));
      activeTimers.delete(deviceId);

      console.log("Iron manually turned OFF. Safety timer cleared.");
    }

    await deviceRef.update({
      turnedOffAt: Date.now(),
      safetyCutoff: false,
    });
  }

  return { safetyCutoff: false };
}

module.exports = {
  handleIronSafety,
};