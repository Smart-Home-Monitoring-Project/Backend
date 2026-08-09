const admin = require("firebase-admin");
const serviceAccount = require("../credentials/firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://smart-home-monitoring-84ea7-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

module.exports = {
  admin,
  db,
};