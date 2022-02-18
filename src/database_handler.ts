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
  get(db: string, id: any): Promise<any>;

  set(db: string, id: any, data: any): Promise<void>;
}

interface IJsonDB {
  id: string,
  data: any[]
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
  async loadDB(db: string): Promise<IJsonDB> {
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

  async set(db: string, id: any, data: any): Promise<void> {
    await this.mut.runExclusive(async () => {
      const d = await this.loadDB(db);

      let count = 0;
      for (const end = d.data.length; count < end; count++) {
        if (d.data[count][d.id] === id) {
          d.data[count] = data;
          return;
        }
      }

      throw new Error("ID not found in table");
    });
  }
}