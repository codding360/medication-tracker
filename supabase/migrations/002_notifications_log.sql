-- Create notifications log table
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'whatsapp', 'email', 'sms', etc.
  recipient TEXT NOT NULL, -- phone number, email, etc.
  message TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'pending', 'failed'
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications_log(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications_log(channel);

-- Enable Row Level Security
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Create policy (permissive for our use case)
CREATE POLICY "Allow all operations on notifications_log" 
  ON notifications_log 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE notifications_log IS 'Stores history of all sent notifications (WhatsApp, Email, SMS, etc.)';

