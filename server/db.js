import mysql from 'mysql2/promise';

export function dbConfigFromEnv(env = process.env) {
  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  };
}

// Live binding: routes read `pool` at call time, so it can be created after setup completes.
export let pool = null;

export async function connectDb(config = dbConfigFromEnv()) {
  const next = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: 'Z',
  });
  // Store and read every DATETIME as UTC regardless of the server's local time zone.
  next.pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  await initDb(next);
  const previous = pool;
  pool = next;
  if (previous) previous.end().catch(() => {});
}

// One-off connection used by the setup wizard to validate credentials.
export async function testConnection(config) {
  const connection = await mysql.createConnection({ ...config, connectTimeout: 8000 });
  try {
    const [[row]] = await connection.query('SELECT VERSION() AS version');
    return row.version;
  } finally {
    await connection.end().catch(() => {});
  }
}

async function initDb(target) {
  await target.query(`
    CREATE TABLE IF NOT EXISTS settings (
      name VARCHAR(64) NOT NULL PRIMARY KEY,
      value MEDIUMTEXT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await target.query(`
    CREATE TABLE IF NOT EXISTS links (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
      url TEXT NOT NULL,
      title VARCHAR(255) NULL,
      clicks INT UNSIGNED NOT NULL DEFAULT 0,
      last_clicked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_links_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
