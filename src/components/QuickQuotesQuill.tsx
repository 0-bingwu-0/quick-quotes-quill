import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, Download } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import TextEditor from './TextEditor';
import BlogPostViewer from './BlogPostViewer';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the Gemini API key is available from environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// The master prompt that instructs the AI model on how to behave.
const systemPrompt = `
**Role:** You are a senior tech writer for Medium.

Task: Your mission is to create a blog post by analyzing the [RAW_CONTENT] and exclusively summarizing the information that directly relates to the topics in [HIGHLIGHTED_TEXT]. All other information from the source material must be ignored.

**Inputs:**
1.  [RAW_CONTENT]: The full source text.
2.  [HIGHLIGHTED_TEXT]: The list of core themes or questions for the blog post.

**Core Principles:**
* **Strict Focus:** The final output must only contain summaries of information from the [RAW_CONTENT] that is directly relevant to the [HIGHLIGHTED_TEXT]. Disregard all other parts of the source material.
* **Synthesize, Don't Copy:** Summarize and rephrase ideas in professional language. Do not copy sentences verbatim or add external information.
* **Extreme Brevity:** If a point can be made in one sentence, never use more.
* **Objective Voice:** Refer to speakers by name or title (e.g., "the CEO"). Strictly forbid "I" or "we" and avoid weak attributions like "according to him...". State facts directly.

**Output Format (Strict Adherence):**

1.  **Main Title (H1)**
2.  **Opening Quote:**
    * Format: '> "The most impactful quote from the text." — Speaker's Name, Title'
3.  **TL;DR:**
    * On a new line, use '### TL;DR'.
    * Summarize the core argument in 1-2 sentences.
4.  **Body Text:**
    * Use each [HIGHLIGHTED_TEXT] item as an '##' heading.
    * **When the heading is a question** (e.g., '## What is the biggest challenge for AI?'): Answer directly using bullet points ('-').
    * **When the heading is a topic** (e.g., '## The Future of AI'): You may optionally use a '**Q:**' / 'A:' format for in-depth points.
    * Ensure there is no redundant information between the heading and the content below it.
`;

const QuickQuotesQuill = () => {
  const [content, setContent] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  const [blogPost, setBlogPost] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTextHighlight = (selectedText: string) => {
    setHighlightedText(selectedText);
  };

  /**
   * Generates a blog post by sending the raw content and highlighted text
   * to the Gemini API and saving the results to Supabase if configured.
   */
  const generateBlogPost = async () => {
    if (!highlightedText.trim()) {
      toast({
        title: "No text highlighted",
        description: "Please highlight some text in the editor first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setBlogPost('');
    let recordId: string | null = null;

    try {
      // Conditionally insert data into Supabase
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('quick_quotes_quill_data')
          .insert({
            content: content,
            highlighted_text: highlightedText,
          })
          .select('id')
          .single();

        if (error) {
          console.error("Database Insert Error:", error.message);
        } else if (data) {
          recordId = data.id;
          setCurrentRecordId(data.id);
        }
      }

      // Next, generate the blog post with the Gemini API.
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `${systemPrompt}\n\n[RAW_CONTENT]:\n${content}\n\n[HIGHLIGHTED_TEXT]:\n${highlightedText}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedBlogPost = response.text();

      setBlogPost(generatedBlogPost);

      // Conditionally update the database record with the generated blog post.
      if (isSupabaseConfigured && supabase && recordId) {
        const { error: updateError } = await supabase
          .from('quick_quotes_quill_data')
          .update({ generated_blog_post: generatedBlogPost })
          .eq('id', recordId);

        if (updateError) {
          console.error("Database Update Error:", updateError.message);
        }
      }

    } catch (error) {
      console.error('Unexpected error during generation:', error);
      toast({
        title: "Generation failed",
        description: "An unexpected error occurred while generating the blog post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Copies the generated blog post content to the user's clipboard.
   */
  const copyBlogPost = () => {
    if (!blogPost) return;
    navigator.clipboard.writeText(blogPost);
    toast({
      title: "Copied to clipboard!",
    });
  };

  /**
   * Downloads the generated blog post as a Markdown (.md) file.
   */
  const downloadBlogPost = () => {
    if (!blogPost) return;
    const element = document.createElement('a');
    const file = new Blob([blogPost], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = 'blog-post.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Download started",
      description: "Your blog post is being downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🖋️ Quick-Quotes Quill</h1>
          <p className="text-lg text-gray-600">Transform your raw content into polished blog posts with Magic</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Side - Text Editor */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-[620px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Raw Content Editor</h2>
            </div>

            <TextEditor
              content={content}
              onContentChange={setContent}
              onTextHighlight={setHighlightedText}
            />

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={generateBlogPost}
                disabled={!highlightedText || isGenerating}
                className="w-full"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {isGenerating ? 'Generating Blog Post...' : 'Generate Blog Post'}
              </Button>
            </div>
          </div>

          {/* Right Side - Blog Post Viewer */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-[620px]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">Generated Blog Post</h2>
              {blogPost && !isGenerating && (
                <div className="flex gap-2">
                  <Button
                    onClick={copyBlogPost}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    onClick={downloadBlogPost}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-hidden">
              <BlogPostViewer content={blogPost} isGenerating={isGenerating} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickQuotesQuill;