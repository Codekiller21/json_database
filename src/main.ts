import * as express from "express";

import { JsonDBHandler } from "./database_handler";

console.log("Loading server...");

const app = express();
const db = new JsonDBHandler("./data");

async function exit() {
  console.log("Closing DB...");
  await db.close();
  console.log("DB closed\nClosing server...");
  server.close();
  console.log("Closed server");
  process.exit();
}

process.on('SIGINT', exit);

app.get("/get/:database(\\w+)/:id(\\w+)", async (req, res) => {
  const database = req.params.database;
  const id = req.params.id;

  console.log(`Handling: {${req.rawHeaders}}`);

  const ret = await db.get(database, id);
  if (ret === undefined) {
    res.end();
  }
  res.json(ret);
});

// DONT LET THIS GET TO PRODUCTION ONLY FOR DEBUGGING
app.get("/shutdown", (req, res) => {
  console.log("Shutdown received");
  exit();
  res.end();
});

const server = app.listen(4592);
console.log("Server up")
