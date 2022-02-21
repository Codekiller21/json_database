import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { Mutex } from "async-mutex";
import { sleep } from "./utils";

export interface IDBHandler {
  flush(): Promise<void>;

  close(): Promise<void>;

  createDB(name: string, idName: string): Promise<void>;

  deleteDB(name: string): Promise<void>;

  /**
   * Searches DB table for id, returns undefined if not found
   * @param db The database to search
   * @param id The ids value to check
   */
  get(dbName: string, id: any): Promise<object>;

  set(dbName: string, id: any, entry: object): Promise<boolean>;

  delete(dbName: string, id: any): Promise<boolean>;

  add(dbName: string, id: any, value: object): Promise<boolean>;
}

interface IJsonDB {
  id: string,
  data: object[]
}

export class JsonDBHandler implements IDBHandler {
  private root: string;
  private cache: Map<string, IJsonDB> = new Map();
  private mut: Mutex = new Mutex();
  private running: boolean = true;

  constructor(root: string) {
    this.root = root;

    // Flushing 'thread'
    (async () => {
      while (this.running) {
        await sleep(10_000);
        await this.flush();
      }
    })();
  }

  private getFileName(db: string): string {
    return `${this.root}/${db}.json`;
  }

  /**
   * Should not be called without locking mutex first or could have data races
   * @param db The database to load
   * @returns loaded database
   */
  private async loadDB(db: string): Promise<IJsonDB> {
    let d: IJsonDB;

    if (this.cache.has(db)) {
      d = this.cache.get(db);
    }
    else {
      if (!existsSync(this.getFileName(db))) {
        throw new Error("Database does not exist");
      }

      d = await JSON.parse((await readFile(this.getFileName(db))).toString()) as IJsonDB;
      this.cache.set(db, d);
    }

    return d;
  }

  async flush(): Promise<void> {
    if (this.cache.size == 0) return;

    await this.mut.runExclusive(async () => {
      for (const [db, data] of this.cache) {
        await writeFile(this.getFileName(db), JSON.stringify(data));
      }
    });
  }

  async close(): Promise<void> {
    this.running = false;
    await sleep(10_000);
  }

  createDB(name: string, idName: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  deleteDB(name: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async get(db: string, id: any): Promise<any> {
    return await this.mut.runExclusive(async () => {
      const d = await this.loadDB(db);

      return d.data.find(v => v[d.id] === id);
    });
  }

  async set(db: string, id: any, data: object): Promise<boolean> {
    return await this.mut.runExclusive(async () => {
      const d = await this.loadDB(db);

      if (!data.hasOwnProperty(d.id)) {
        return false;
      }

      let count = 0;
      for (const end = d.data.length; count < end; count++) {
        if (d.data[count][d.id] === id) {
          d.data[count] = data;
          return true;
        }
      }

      return false;
    });
  }

  async delete(dbName: string, id: any): Promise<boolean> {
    return await this.mut.runExclusive(async () => {
      const db = await this.loadDB(dbName);

      let count = 0;
      for (const end = db.data.length; count < end; count++) {
        if (db.data[count][db.id] === id) {
          db.data.splice(count, 1);
          return true;
        }
      }

      return false;
    });
  }

  async add(dbName: string, id: any, value: object): Promise<boolean> {
    return await this.mut.runExclusive(async () => {
      const db = await this.loadDB(dbName);

      if (!value.hasOwnProperty(db.id)) {
        return false;
      }

      if (db.data.find(v => v[db.id] === id) != undefined) {
        return false;
      }

      db.data.push(value);

      return true;
    });
  }
}