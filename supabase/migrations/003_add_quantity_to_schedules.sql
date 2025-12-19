-- Add quantity field to schedules table (for existing databases)
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS quantity TEXT;

COMMENT ON COLUMN schedules.quantity IS 'Количество для приёма (например: "1 таблетка", "2 капсулы", "5 капель")';

