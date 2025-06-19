
-- Add a column to store the generated blog post
ALTER TABLE public.raw_content 
ADD COLUMN generated_blog_post TEXT;
