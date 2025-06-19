
-- Create a table to store raw content
CREATE TABLE public.raw_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  highlighted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) - making it public for now since there's no authentication
ALTER TABLE public.raw_content ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to insert content (since no auth is implemented)
CREATE POLICY "Anyone can insert raw content" 
  ON public.raw_content 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to select content
CREATE POLICY "Anyone can view raw content" 
  ON public.raw_content 
  FOR SELECT 
  USING (true);
