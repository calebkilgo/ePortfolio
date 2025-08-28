import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Add keyframe animation for cursor
const cursorStyle = `
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
`;

type Segment = { text: string; color: string };
interface UserLine { segments: Segment[] }

const INDENT = '  '; // two spaces
const LINE_HEIGHT = 24; // 1.5rem (h-6)
const MAX_LINE_LENGTH = 60;

// Static code lines shown before user typing (lines 1-6)
const codeLines: Segment[][] = [
  // Class definition
  [
    { text: 'class ', color: 'text-purple-400' },
    { text: 'Student', color: 'text-yellow-300' },
    { text: ':', color: 'text-white' }
  ],
  // Constructor
  [
    { text: '  def ', color: 'text-purple-400' },
    { text: '__init__', color: 'text-blue-400' },
    { text: '(', color: 'text-white' },
    { text: 'self', color: 'text-orange-400' },
    { text: '):', color: 'text-white' }
  ],
  // Properties
  [
    { text: '    ', color: 'text-white' },
    { text: 'self', color: 'text-orange-400' },
    { text: '.', color: 'text-white' },
    { text: 'name', color: 'text-blue-300' },
    { text: ' = ', color: 'text-white' },
    { text: '"Caleb Kilgo"', color: 'text-green-400' }
  ],
  [
    { text: '    ', color: 'text-white' },
    { text: 'self', color: 'text-orange-400' },
    { text: '.', color: 'text-white' },
    { text: 'university', color: 'text-blue-300' },
    { text: ' = ', color: 'text-white' },
    { text: '"UAH"', color: 'text-green-400' }
  ],
  [
    { text: '    ', color: 'text-white' },
    { text: 'self', color: 'text-orange-400' },
    { text: '.', color: 'text-white' },
    { text: 'major', color: 'text-blue-300' },
    { text: ' = ', color: 'text-white' },
    { text: '"Computer Science"', color: 'text-green-400' }
  ],
  [
    { text: '    ', color: 'text-white' },
    { text: 'self', color: 'text-orange-400' },
    { text: '.', color: 'text-white' },
    { text: 'focus', color: 'text-blue-300' },
    { text: ' = ', color: 'text-white' },
    { text: '"Data Science"', color: 'text-green-400' }
  ]
];

// Enhanced Python syntax highlighter (single-line, robust tokenization)
const highlightCode = (text: string): Segment[] => {
  const kw = new Set([
    'False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield','match','case'
  ]);
  const builtins = new Set([
    'abs','all','any','bin','bool','bytearray','bytes','callable','chr','classmethod','compile','complex','dict','dir','divmod','enumerate','eval','exec','filter','float','format','frozenset','getattr','globals','hasattr','hash','help','hex','id','input','int','isinstance','issubclass','iter','len','list','locals','map','max','memoryview','min','next','object','oct','open','ord','pow','print','property','range','repr','reversed','round','set','setattr','slice','sorted','staticmethod','str','sum','super','tuple','type','vars','zip'
  ]);

  const segments: Segment[] = [];
  const push = (txt: string, color: string) => { if (txt) segments.push({ text: txt, color }); };

  let i = 0;
  let expectNameFor: 'def' | 'class' | null = null; // color next identifier specially
  let lastNonWsChar: string | null = null; // to detect attribute after '.'

  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
  const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);

  while (i < text.length) {
    const c = text[i];

    // Whitespace
    if (c === ' ' || c === '\t') {
      let j = i + 1;
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
      push(text.slice(i, j), 'text-white');
      i = j;
      continue;
    }

    // Comment
    if (c === '#') {
      push(text.slice(i), 'text-gray-500');
      break;
    }

    // String (supports prefixes and triple quotes)
    const maybePrefix = text.slice(i, i + 2).toLowerCase();
    const maybePrefix3 = text.slice(i, i + 3).toLowerCase();
    let prefixLen = 0;
    if ([ 'r','u','f','b' ].includes(maybePrefix[0])) prefixLen = 1;
    if ([ 'br','rb','fr','rf','ur','ru','fb','bf','fu','uf' ].includes(maybePrefix)) prefixLen = 2;
    if ([ 'bfr','brf','rfr','rfb','fbr','frb' ].includes(maybePrefix3)) prefixLen = 3; // generous
    const quote = text[i + prefixLen];
    if (quote === '"' || quote === '\'') {
      const triple = text.slice(i + prefixLen, i + prefixLen + 3) === quote.repeat(3);
      let j = i + prefixLen + (triple ? 3 : 1);
      const raw = text.slice(i, i + prefixLen).toLowerCase().includes('r');
      while (j < text.length) {
        if (!raw && text[j] === '\\') { j += 2; continue; }
        if (triple) {
          if (text.slice(j, j + 3) === quote.repeat(3)) { j += 3; break; }
          j++;
        } else {
          if (text[j] === quote) { j++; break; }
          j++;
        }
      }
      push(text.slice(i, j), 'text-green-400');
      lastNonWsChar = quote;
      i = j;
      expectNameFor = null;
      continue;
    }

    // Number literals (int/float/hex/bin/oct)
    const numMatch = text.slice(i).match(/^((\d[\d_]*\.\d[\d_]*|\d[\d_]*\.\d*|\.\d[\d_]*|\d[\d_]*)([eE][+-]?\d[\d_]*)?|0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+)/);
    if (numMatch) {
      push(numMatch[0], 'text-cyan-300');
      i += numMatch[0].length;
      expectNameFor = null;
      lastNonWsChar = numMatch[0].slice(-1);
      continue;
    }

    // Identifier / keywords / builtins / self / special contexts
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < text.length && isIdent(text[j])) j++;
      const ident = text.slice(i, j);
      let color = 'text-white';

      if (expectNameFor === 'class') {
        color = 'text-yellow-300';
        expectNameFor = null;
      } else if (expectNameFor === 'def') {
        color = 'text-blue-400';
        expectNameFor = null;
      } else if (ident === 'self') {
        color = 'text-orange-400';
      } else if (kw.has(ident)) {
        color = 'text-purple-400';
        if (ident === 'class') expectNameFor = 'class';
        if (ident === 'def') expectNameFor = 'def';
      } else if (builtins.has(ident)) {
        color = 'text-indigo-300';
      } else if (/^__\w+__$/.test(ident)) {
        color = 'text-blue-400'; // dunder
      } else if (lastNonWsChar === '.') {
        color = 'text-blue-300'; // attribute after dot
      } else if (/^[A-Z]\w*$/.test(ident)) {
        color = 'text-yellow-300'; // Class-like name
      }

      push(ident, color);
      lastNonWsChar = ident.slice(-1);
      i = j;
      continue;
    }

    // Decorators
    if (c === '@') {
      let j = i + 1;
      while (j < text.length && (isIdent(text[j]) || text[j] === '.')) j++;
      push(text.slice(i, j), 'text-yellow-300');
      lastNonWsChar = text[j - 1];
      i = j;
      expectNameFor = null;
      continue;
    }

    // Operators and punctuation (treat as white for consistency with static lines)
    const two = text.slice(i, i + 2);
    const three = text.slice(i, i + 3);
    const multiOps = ['**=', '//=', '==', '!=', '>=', '<=', ':=', '**', '//', '->'];
    const triOps = ['<<<', '>>>']; // placeholders, rarely used in Python
    if (triOps.includes(three)) { push(three, 'text-white'); i += 3; lastNonWsChar = three.slice(-1); expectNameFor = null; continue; }
    if (multiOps.includes(two)) { push(two, 'text-white'); i += 2; lastNonWsChar = two.slice(-1); expectNameFor = null; continue; }
    push(c, 'text-white');
    if (c !== ' ' && c !== '\t') lastNonWsChar = c;
    expectNameFor = null;
    i++;
  }

  return segments;
};

const CodeWindow = () => {
  const [currentIndex] = useState(6); // Start from line 7
  const [showCursor] = useState(true);
  const [userLines, setUserLines] = useState<UserLine[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [actualLines, setActualLines] = useState(7); // Start with 7 lines
  const maxLineLength = MAX_LINE_LENGTH;
  const isInteractive = true;
  
  // Focusable editor container
  const editorRef = useRef<HTMLDivElement>(null);

  // Create a ref to measure the current line's height
  const currentLineRef = useRef<HTMLDivElement>(null);

  // Memoize highlighted current line to avoid recompute on unrelated renders
  const highlightedCurrent = useMemo(() => highlightCode(currentLine), [currentLine]);

  // Update actual lines based on element height and content wrapping
  useEffect(() => {
    const updateLines = () => {
      const elementHeight = currentLineRef.current?.offsetHeight ?? LINE_HEIGHT;
      const wrappedCurrent = Math.max(1, Math.ceil(elementHeight / LINE_HEIGHT));
      const userWrapped = userLines.reduce((sum, line) => {
        const textLength = line.segments.reduce((acc, s) => acc + s.text.length, 0);
        const wrapped = Math.max(1, Math.ceil(textLength / maxLineLength));
        return sum + wrapped;
      }, 0);
      const baseLines = Math.min(currentIndex, codeLines.length);
      const totalLines = baseLines + userWrapped + wrappedCurrent;
      setActualLines(totalLines);
    };

    updateLines();
    const observer = new ResizeObserver(updateLines);
    if (currentLineRef.current) observer.observe(currentLineRef.current);
    return () => observer.disconnect();
  }, [currentIndex, userLines, currentLine, maxLineLength]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;

    const key = e.key;

    // Indent with Tab inside the editor and prevent page focus navigation
    if (key === 'Tab') {
      e.preventDefault();
      if (currentLine.length + INDENT.length <= maxLineLength) {
        setCurrentLine(prev => prev + INDENT);
      }
      return;
    }

    if (key === 'Enter') {
      e.preventDefault();
      // Save current line with its content and syntax highlighting
      const lineToAdd = {
        segments: highlightCode(currentLine)
      } as UserLine;
      setUserLines(prev => [...prev, lineToAdd]);
      setCurrentLine("");
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      if (currentLine.length > 0) {
        // If there's text in the current line, delete one character
        setCurrentLine(prev => prev.slice(0, -1));
      } else {
        // If on empty line and there are previous lines, merge up
        setUserLines(prev => {
          if (prev.length === 0) return prev;
          const next = prev.slice(0, -1);
          const last = prev[prev.length - 1];
          const lastText = last.segments.map(s => s.text).join("");
          setCurrentLine(lastText);
          return next;
        });
      }
      return;
    }

    // Printable characters (single char, not control keys)
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (currentLine.length < maxLineLength) {
        setCurrentLine(prev => prev + key);
      }
      return;
    }
  }, [isInteractive, currentLine, maxLineLength]);

  // Focus the editor on mount so typing works immediately
  useEffect(() => {
    editorRef.current?.focus();
  }, []);



  // Cursor uses CSS animation; no JS toggling needed

  // Disable auto-typing; start with the first 6 lines shown and let user type from line 7.

  return (
    <div className="relative bg-gray-900/80 backdrop-blur-md border border-gray-600/50 rounded-lg overflow-hidden shadow-2xl max-w-lg w-full">
      <style>{cursorStyle}</style>
      {/* Windows 11 Header */}
      <div className="bg-gray-800/90 border-b border-gray-600/30 px-4 py-2 flex items-center justify-between">
        <div className="w-16"></div>
        <span className="text-white/80 text-sm font-mono">student.py - Visual Studio Code</span>
        <div className="flex items-center space-x-1">
          {/* Windows 11 control buttons with hover effects */}
          <button className="w-3 h-3 hover:bg-gray-600 rounded-sm flex items-center justify-center transition-colors duration-200 group">
            <div className="w-2 h-0.5 bg-white/70 group-hover:bg-white transition-colors duration-200"></div>
          </button>
          <button className="w-3 h-3 hover:bg-gray-600 rounded-sm flex items-center justify-center transition-colors duration-200 group">
            <div className="w-1.5 h-1.5 border border-white/70 group-hover:border-white rounded-sm transition-colors duration-200"></div>
          </button>
          <button className="w-3 h-3 hover:bg-red-600 rounded-sm flex items-center justify-center transition-colors duration-200 group">
            <div className="w-2 h-0.5 bg-white/70 group-hover:bg-white rotate-45 absolute transition-colors duration-200"></div>
            <div className="w-2 h-0.5 bg-white/70 group-hover:bg-white -rotate-45 absolute transition-colors duration-200"></div>
          </button>
        </div>
      </div>
      
      {/* Code Content */}
      <div
        ref={editorRef}
        className="p-4 font-mono text-sm bg-gray-900/60 outline-none"
        tabIndex={0}
        onKeyDown={(e) => handleKeyDown(e)}
        role="textbox"
        aria-multiline="true"
      >
        <div className="flex">
          {/* Line numbers */}
          <div className="flex-none w-12 text-gray-500 text-right pr-4 select-none">
            {Array.from({ length: actualLines }, (_, i) => (
              <div key={`line-${i}`} className="h-6 leading-6 flex-shrink-0">
                {i + 1}
              </div>
            ))}
          </div>
          {/* Main code content */}
          <div className="relative w-full max-w-[calc(100%-3rem)]">
            <pre className="m-0 p-0 whitespace-pre-wrap break-words" style={{ maxWidth: `${maxLineLength}ch` }}>
              <code className="block text-left">
                <div className="flex flex-col w-full">
                  {/* Code lines */}
                  {codeLines.slice(0, currentIndex).map((line, lineIndex) => (
                    <div 
                      key={lineIndex} 
                      className="min-h-6 leading-6 relative py-0"
                    >
                      {line.map((segment, segmentIndex) => (
                        <span 
                          key={`${lineIndex}-${segmentIndex}`} 
                          className={segment.color}
                        >
                          {segment.text}
                        </span>
                      ))}
                    </div>
                  ))}
                  {/* User input lines */}
                  {userLines.map((line, lineIndex) => (
                    <div
                      key={`user-${lineIndex}`}
                      className="min-h-6 leading-6 relative py-0"
                    >
                      {line.segments.map((segment, segmentIndex) => (
                        <span
                          key={`user-${lineIndex}-${segmentIndex}`}
                          className={`${segment.color}`}
                        >
                          {segment.text}
                        </span>
                      ))}
                    </div>
                  ))}
                  {/* Current input line */}
                  {isInteractive && (
                    <div 
                      ref={currentLineRef}
                      className="min-h-6 leading-6 relative py-0 whitespace-pre-wrap"
                      style={{ 
                        maxWidth: `${maxLineLength}ch`,
                        overflowWrap: 'break-word',
                        wordWrap: 'break-word',
                        wordBreak: 'normal',
                        minWidth: '1ch',
                        display: 'inline-block'
                      }}
                    >
                      {highlightedCurrent.map((segment, index) => (
                        <span
                          key={`current-${index}`}
                          className={`${segment.color}`}
                        >
                          {segment.text}
                        </span>
                      ))}
                      {showCursor && (
                        <span 
                          className="inline-block text-white/90"
                          style={{ 
                            animation: 'blink 1s ease-in-out infinite'
                          }}
                        >
                          |
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};export default CodeWindow;
