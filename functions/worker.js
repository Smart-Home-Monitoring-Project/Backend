require("dotenv").config();


console.log("==================================");
console.log(" Smart Home Backend Worker Started");
console.log("==================================");

require("./src/database");
require("./src/listeners");

console.log("Listening for database changes...");