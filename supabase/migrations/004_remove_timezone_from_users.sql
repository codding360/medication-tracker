-- Remove timezone column from users table (for existing databases)
ALTER TABLE users 
DROP COLUMN IF EXISTS timezone;

COMMENT ON TABLE users IS 'Users table - timezone managed globally via CRON_TIMEZONE env variable';

