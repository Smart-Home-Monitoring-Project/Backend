const { db } = require("./database");

const activeTimers = new Map();

async function handleIronSafety(
  device,
  houseId,
  floorId,
  roomId,
  deviceId,
) {
  // Safety logic is currently implemented for the iron.
  if (deviceId !== "r2-iron") {
    return { safetyCutoff: false };
  }

  const deviceRef = db.ref(
    `houses/${houseId}/floors/${floorId}/rooms/${roomId}/devices/${deviceId}`,
  );

  /*
   * IRON TURNED ON
   */
  if (device.status === "ON") {
    const turnedOnAt = Date.now();

    await deviceRef.update({
      turnedOnAt,
      safetyCutoff: false,
    });

    console.log(
      `Iron turned ON. Safety timer started: ${device.maxOnDuration} seconds.`,
    );

    // Clear an existing timer if one exists.
    if (activeTimers.has(deviceId)) {
      clearTimeout(activeTimers.get(deviceId));
    }

    /*
     * maxOnDuration is stored in seconds.
     * Default = 600 seconds = 10 minutes.
     */
    const maxDuration =
      (device.maxOnDuration || 600) * 1000;

    const timer = setTimeout(async () => {
      try {
        const snapshot = await deviceRef.get();
        const currentDevice = snapshot.val();

        /*
         * Only perform the safety cutoff if the iron
         * is still ON.
         */
        if (
          currentDevice &&
          currentDevice.status === "ON"
        ) {
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
        console.error(
          "Iron safety cutoff error:",
          error,
        );
      }

      activeTimers.delete(deviceId);
    }, maxDuration);

    activeTimers.set(deviceId, timer);

    return {
      safetyCutoff: false,
    };
  }

  /*
   * IRON TURNED OFF
   */
  if (device.status === "OFF") {
    /*
     * If the timer still exists, this was a manual OFF.
     */
    if (activeTimers.has(deviceId)) {
      clearTimeout(activeTimers.get(deviceId));
      activeTimers.delete(deviceId);

      console.log(
        "Iron manually turned OFF. Safety timer cleared.",
      );

      await deviceRef.update({
        turnedOffAt: Date.now(),
        safetyCutoff: false,
      });

      return {
        safetyCutoff: false,
      };
    }

    /*
     * If there is no active timer and safetyCutoff is
     * already TRUE, this OFF state was produced by the
     * automatic safety cutoff.
     *
     * Keep safetyCutoff as TRUE.
     */
    if (device.safetyCutoff === true) {
      console.log(
        "Iron safety cutoff confirmed. Keeping safetyCutoff=true.",
      );

      return {
        safetyCutoff: true,
      };
    }

    /*
     * Normal OFF state.
     */
    await deviceRef.update({
      turnedOffAt: Date.now(),
      safetyCutoff: false,
    });
  }

  return {
    safetyCutoff: false,
  };
}

module.exports = {
  handleIronSafety,
};