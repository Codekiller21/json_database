export function* range(r: number, end?: number, step?: number): Generator<number, void, void> {
  let start: number;
  if (end === undefined) {
      start = 0;
      end = r;
  }
  else {
      start = r;
  }
  if (step === undefined) {
      step = 1;
  }

  for (; start < end; start += step) {
      yield start;
  }
}

export function* enumerate<T>(arr: Iterable<T>): Generator<[number, T], void, void> {
  let count = 0;
  for (let i of arr) {
      yield [count++, i];
  }
}

export function collect<T>(it: Iterator<T>): T[] {
  const ret: T[] = [];

  let i = it.next();
  while (i.value !== undefined) {
      ret.push(i.value);
      i = it.next();
  }

  return ret;
}

export function sleep(time: number): Promise<void> {
  return new Promise((res, _) => {
      setTimeout(() => res(), time);
  });
}

export class Queue<T> implements Iterable<T> {
  private data: T[];

  constructor(init?: Iterable<T>) {
      if (init === undefined) {
          this.data = [];
      }
      else {
          this.data = [];
          for (let i of init) {
              this.data.push(i);
          }
      }
  }

  [Symbol.iterator] = function* (): Generator<T, void> {
      for (let d of this.data) {
          yield d;
      }
  }

  get length(): number {
      return this.data.length;
  }

  add(value: T) {
      this.data.push(value);
  }

  remove(index?: number): T {
      if (index === undefined) {
          if (this.data.length == 0) {
              throw "Index out of bounds";
          }
          return this.data.splice(0, 1)[0];
      }
      if (index < 0 || index >= this.data.length) {
          throw "Index out of bounds";
      }
      return this.data.splice(index, 1)[0];
  }

  get(index?: number): T {
      if (index === undefined) {
          if (this.data.length == 0) {
              throw "Index out of bounds";
          }
          return this.data[0];
      }
      if (index < 0 || index >= this.data.length) {
          throw "Index out of bounds";
      }
      return this.data[index];
  }

  toArray(): T[] {
      const data: T[] = [];

      for (const i of this.data) {
          data.push(i);
      }

      return data;
  }

  toString(): string {
      return `[${this.data.join(", ")}]`;
  }
}