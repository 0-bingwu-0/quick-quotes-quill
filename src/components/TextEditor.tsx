import React, { useRef, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onTextHighlight: (selectedText: string) => void;
}

interface HighlightRange {
  start: number;
  end: number;
  text: string;
}

const TextEditor: React.FC<TextEditorProps> = ({
  content,
  onContentChange,
  onTextHighlight,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<HighlightRange[]>([]);
  const { toast } = useToast();

  const getTextContent = (element: HTMLElement): string => {
    return element.textContent || '';
  };

  const getSelectionRange = (): { start: number; end: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    if (!editor) return null;

    // Create a range from the start of the editor to the start of selection
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(editor);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    // Calculate end position
    const end = start + range.toString().length;

    return { start, end };
  };

  const renderContentWithHighlights = (text: string): string => {
    if (highlights.length === 0) return escapeHtml(text);

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

    let result = '';
    let lastIndex = 0;

    sortedHighlights.forEach((highlight) => {
      // Add text before highlight
      result += escapeHtml(text.substring(lastIndex, highlight.start));
      // Add highlighted text
      result += `<mark style="background-color: rgba(254, 240, 138, 0.8); padding: 1px 2px; border-radius: 2px;">${escapeHtml(text.substring(highlight.start, highlight.end))}</mark>`;
      lastIndex = highlight.end;
    });

    // Add remaining text
    result += escapeHtml(text.substring(lastIndex));

    return result;
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleTextSelection = () => {
    const selectionRange = getSelectionRange();
    if (!selectionRange || selectionRange.start === selectionRange.end) return;

    const selectedText = content.substring(selectionRange.start, selectionRange.end);
    if (!selectedText.trim()) return;

    // Check if this selection overlaps with existing highlights
    const existingHighlightIndex = highlights.findIndex(highlight =>
      (selectionRange.start >= highlight.start && selectionRange.start < highlight.end) ||
      (selectionRange.end > highlight.start && selectionRange.end <= highlight.end) ||
      (selectionRange.start <= highlight.start && selectionRange.end >= highlight.end)
    );

    if (existingHighlightIndex !== -1) {
      // Remove existing highlight (toggle off)
      setHighlights(prev => prev.filter((_, index) => index !== existingHighlightIndex));
    } else {
      // Add new highlight
      const newHighlight: HighlightRange = {
        start: selectionRange.start,
        end: selectionRange.end,
        text: selectedText
      };
      setHighlights(prev => [...prev, newHighlight]);
    }

    onTextHighlight(selectedText);

    // Clear selection after a short delay to allow highlight to render
    setTimeout(() => {
      window.getSelection()?.removeAllRanges();
    }, 100);
  };

  const saveSelection = (containerEl: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    return {
      start,
      end: start + range.toString().length
    };
  };

  const restoreSelection = (containerEl: HTMLElement, savedSel: { start: number; end: number } | null) => {
    if (!savedSel) return;

    let charIndex = 0;
    const range = document.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);
    const nodeStack: Node[] = [containerEl];
    let node: Node | undefined = undefined;
    let foundStart = false;
    let stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType === 3) {
        const nextCharIndex = charIndex + node.textContent!.length;
        if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;

    const savedSelection = saveSelection(editor);

    let newContent = getTextContent(editor);

    // Check character limit and truncate if necessary
    if (newContent.length > 50000) {
      newContent = newContent.substring(0, 50000);
      editor.innerHTML = renderContentWithHighlights(newContent);

      toast({
        title: "Character limit exceeded",
        description: "Content has been truncated to 50,000 characters.",
        variant: "destructive",
      });
    }

    // Clear highlights when content changes significantly
    if (Math.abs(newContent.length - content.length) > 10) {
      setHighlights([]);
    }

    onContentChange(newContent);

    restoreSelection(editor, savedSelection);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent some formatting shortcuts that could break our highlighting
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['b', 'i', 'u'].includes(key)) {
        e.preventDefault();
      }
    }
  };

  // Update editor content when content prop changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const savedSelection = saveSelection(editor);

    // Always update the content with highlights
    editor.innerHTML = renderContentWithHighlights(content);

    restoreSelection(editor, savedSelection);
  }, [content, highlights]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    editor.addEventListener('mouseup', handleMouseUp);

    return () => {
      editor.removeEventListener('mouseup', handleMouseUp);
    };
  }, [highlights, content, onTextHighlight]);

  // Initialize content on mount
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !content) return;

    editor.innerHTML = renderContentWithHighlights(content);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full h-[420px] p-3 border border-gray-200 rounded-md font-mono text-sm leading-relaxed overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            scrollbarWidth: 'auto', // Ensure scrollbar is shown
            msOverflowStyle: 'auto' // For IE/Edge
          }}
          suppressContentEditableWarning={true}
          data-placeholder="Paste your raw content here (interviews, transcripts, notes, etc.)"
        />

        {/* Placeholder when empty */}
        {!content && (
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none font-mono text-sm">
            Paste your raw content here (interviews, transcripts, notes, etc.)
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
        <span>💡 Tip: Select text with your mouse to highlight key points.</span>
        <span className={`font-mono ${content.length > 45000 ? 'text-orange-500' : content.length > 48000 ? 'text-red-500' : 'text-gray-500'}`}>
          {content.length.toLocaleString()} / 50,000 characters
        </span>
      </div>
    </div>
  );
};

export default TextEditor;
