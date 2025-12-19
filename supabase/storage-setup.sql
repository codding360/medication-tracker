-- Create storage bucket for medication images
INSERT INTO storage.buckets (id, name, public)
VALUES ('medication-images', 'medication-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow all operations (no auth)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'medication-images');

CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'medication-images');

CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'medication-images')
WITH CHECK (bucket_id = 'medication-images');

CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'medication-images');

