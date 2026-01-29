import type { HealthMetric } from './api';

type MetricsDb = {
  loadCachedMetrics: (limit?: number) => Promise<HealthMetric[]>;
  storeMetrics: (metrics: HealthMetric[]) => Promise<void>;
  addMetric: (metric: HealthMetric) => Promise<void>;
  init: () => Promise<void>;
};

const memoryCache: HealthMetric[] = [];

function createMemoryDb(): MetricsDb {
  return {
    async init() {
      // no-op
    },
    async loadCachedMetrics(limit = 20) {
      return memoryCache.slice(0, limit);
    },
    async storeMetrics(metrics) {
      memoryCache.length = 0;
      memoryCache.push(...metrics);
    },
    async addMetric(metric) {
      memoryCache.unshift(metric);
    },
  };
}

function createSqliteDb(sqliteModule: any): MetricsDb {
  const dbPromise = sqliteModule.openDatabase({ name: 'metrics.db', location: 'default' });

  return {
    async init() {
      const db = await dbPromise;
      await db.executeSql(
        'CREATE TABLE IF NOT EXISTS metrics (id INTEGER PRIMARY KEY NOT NULL, metric_type TEXT, value REAL, unit TEXT, recorded_at TEXT)',
      );
    },
    async loadCachedMetrics(limit = 20) {
      const db = await dbPromise;
      const result = await db.executeSql(
        'SELECT id, metric_type, value, unit, recorded_at FROM metrics ORDER BY recorded_at DESC LIMIT ?',
        [limit],
      );
      const rows = result[0]?.rows ?? [];
      const output: HealthMetric[] = [];
      for (let index = 0; index < rows.length; index += 1) {
        output.push(rows.item(index) as HealthMetric);
      }
      return output;
    },
    async storeMetrics(metrics) {
      const db = await dbPromise;
      await db.executeSql('DELETE FROM metrics');
      for (const metric of metrics) {
        await db.executeSql(
          'INSERT OR REPLACE INTO metrics (id, metric_type, value, unit, recorded_at) VALUES (?, ?, ?, ?, ?)',
          [metric.id, metric.metric_type, metric.value, metric.unit ?? null, metric.recorded_at],
        );
      }
    },
    async addMetric(metric) {
      const db = await dbPromise;
      await db.executeSql(
        'INSERT OR REPLACE INTO metrics (id, metric_type, value, unit, recorded_at) VALUES (?, ?, ?, ?, ?)',
        [metric.id, metric.metric_type, metric.value, metric.unit ?? null, metric.recorded_at],
      );
    },
  };
}

let db: MetricsDb | null = null;

export async function initMetricsDb(): Promise<void> {
  if (db) {
    await db.init();
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqliteModule = require('react-native-sqlite-storage');
    sqliteModule.enablePromise(true);
    db = createSqliteDb(sqliteModule);
  } catch {
    db = createMemoryDb();
  }
  await db.init();
}

export async function loadCachedMetrics(limit = 20): Promise<HealthMetric[]> {
  if (!db) {
    await initMetricsDb();
  }
  return db?.loadCachedMetrics(limit) ?? [];
}

export async function storeMetrics(metrics: HealthMetric[]): Promise<void> {
  if (!db) {
    await initMetricsDb();
  }
  await db?.storeMetrics(metrics);
}

export async function addMetric(metric: HealthMetric): Promise<void> {
  if (!db) {
    await initMetricsDb();
  }
  await db?.addMetric(metric);
}
