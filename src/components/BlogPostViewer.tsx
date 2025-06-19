import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface BlogPostViewerProps {
  content: string;
  isGenerating: boolean;
}

const BlogPostViewer: React.FC<BlogPostViewerProps> = ({ content, isGenerating }) => {
  /**
   * A simple markdown-to-HTML converter for basic formatting.
   * This function handles headers, bold, italics, lists, and line breaks.
   * It is not a full-featured markdown parser but serves the basic needs of this app.
   * @param {string} text - The markdown text to convert.
   * @returns {string} - The HTML representation of the text.
   */
  const formatMarkdown = (text: string): string => {
    if (!text) return '';

    // Note: The order of replacements is important.
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-800 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-800 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // List items
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/<\/li><li>/g, '</li><li class="mt-1">') // Add space between list items
      .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside mb-4 pl-4">$1</ul>') // Wrap in ul
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="my-6 border-gray-200">')
      // Paragraphs and line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  // Display a skeleton loader while the blog post is being generated.
  if (isGenerating) {
    return (
      <div className="h-full overflow-auto space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-1/2 mt-6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="text-center text-sm text-gray-500 mt-8">
          🤖 Generating your blog post... this may take a moment.
        </div>
      </div>
    );
  }

  // Display a placeholder if no content has been generated yet.
  if (!content) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
          <p className="text-sm">
            Highlight raw content and click "Generate Blog Post" to see your blog post here.
          </p>
        </div>
      </div>
    );
  }

  // Display the formatted blog post.
  return (
    <ScrollArea className="h-full">
      <div className="prose prose-gray max-w-none p-4">
        <div
          className="leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: `<p class="mb-4">${formatMarkdown(content)}</p>`
          }}
        />
      </div>
    </ScrollArea>
  );
};

export default BlogPostViewer;