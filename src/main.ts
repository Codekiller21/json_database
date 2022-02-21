import * as express from "express";
import * as bodyParser from "body-parser";

import { JsonDBHandler } from "./database_handler";

console.log("Loading server...");

const app = express();
app.use(bodyParser.json());
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

  console.log(`Get request: {${req.rawHeaders}}`);

  try {
    const ret = await db.get(database, id);
    if (ret === undefined) {
      res.sendStatus(500);
    }
    res.json(ret);
  }
  catch (e) {
    res.sendStatus(500);
  }
});

app.post("/set/:database(\\w+)/:id(\\w+)", async (req, res) => {
  const database = req.params.database;
  const id = req.params.id;

  console.log(`Set request {${req.rawHeaders}}`);

  try {
    if (!await db.set(database, id, req.body)) {
      res.sendStatus(404);
    }
  }
  catch (e) {
    res.sendStatus(500);
  }

  res.end();
});

app.head("/delete/:database(\\w+)/:id(\\w+)", async (req, res) => {
  const database = req.params.database;
  const id = req.params.id;

  console.log(`Set request {${req.rawHeaders}}`);

  try {
    if (!await db.delete(database, id)) {
      res.sendStatus(404);
    }
    res.end();
  }
  catch (e) {
    res.sendStatus(500);
  }
});

app.post("/add/:database(\\w+)/:id(\\w+)", async (req, res) => {
  const database = req.params.database;
  const id = req.params.id;

  console.log(`Add request {${req.rawHeaders}}`);

  try {
    if (!await db.add(database, id, req.body)) {
      res.sendStatus(403);
    }
  }
  catch (e) {
    res.sendStatus(500);
  }

  res.end();
});

// DONT LET THIS GET TO PRODUCTION ONLY FOR DEBUGGING
app.get("/shutdown", (req, res) => {
  console.log("Shutdown received");
  exit();
  res.end();
});

const server = app.listen(4592);
console.log("Server up")
