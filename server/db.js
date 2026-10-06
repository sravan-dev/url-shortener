import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
});

// Store and read every DATETIME as UTC regardless of the server's local time zone.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function initDb() {
  await pool.query(`
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
