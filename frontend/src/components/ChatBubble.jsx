import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { EditIcon, CopyIcon, CheckIcon, RefreshIcon, SpeakerIcon, SpeakerOffIcon } from './Icons';
import ElyxirFlaskIcon from './ElyxirFlaskIcon';
import AttachmentBubbleView from './AttachmentBubbleView';
import { speakText, stopSpeech } from '../utils/speechUtils';

// Custom marked renderer — adds copy button to every code block
const renderer = new marked.Renderer();

renderer.code = function (code, language) {
  const lang = (language && hljs.getLanguage(language)) ? language : 'plaintext';
  let highlighted = code;
  try {
    highlighted = hljs.highlight(typeof code === 'object' ? code.text || '' : code, { language: lang }).value;
  } catch (e) {
    highlighted = typeof code === 'object' ? code.text || '' : code;
  }
  const escapedCode = (typeof code === 'object' ? code.text || '' : code)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  return `<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-lang-label">${lang}</span>
    <button class="code-copy-btn" data-code="${encodeURIComponent(typeof code === 'object' ? code.text || '' : code)}" title="Copy code">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span>Copy</span>
    </button>
  </div>
  <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
</div>`;
};

marked.setOptions({ gfm: true, breaks: true, renderer });

function getRelativeTime(timeValue) {
  if (!timeValue) return 'Just now';
  const date = new Date(timeValue);
  if (isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSecs < 10) {
    return 'Just now';
  }
  if (diffInSecs < 60) {
    return `${diffInSecs} seconds ago`;
  }
  if (diffInMins < 60) {
    return diffInMins === 1 ? '1 minute ago' : `${diffInMins} minutes ago`;
  }
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }
  return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
}

export default function ChatBubble({
  message,
  index,
  onEditMessage,
  onRegenerate,
  isStreamingLast,
}) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(message.timestamp));

  useEffect(() => {
    setRelativeTime(getRelativeTime(message.timestamp));

    // Update relative time text every 15 seconds so it feels dynamic
    const timer = setInterval(() => {
      setRelativeTime(getRelativeTime(message.timestamp));
    }, 15000);

    return () => clearInterval(timer);
  }, [message.timestamp]);

  const isUser = message.role === 'user';
  const isBot = message.role === 'bot' || message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const contentRef = useRef(null);

  const isMessageStreaming = isBot && message.isStreaming;

  // Stop speech if unmounting
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeech();
      }
    };
  }, [isSpeaking]);

  // Attach copy button handlers after render
  useEffect(() => {
    if (!contentRef.current || !isBot) return;

    const handleCodeCopy = (e) => {
      const btn = e.target.closest('.code-copy-btn');
      if (!btn) return;
      const encoded = btn.getAttribute('data-code');
      const code = decodeURIComponent(encoded || '');
      navigator.clipboard.writeText(code).then(() => {
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            span.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        }
      }).catch(() => {});
    };

    const container = contentRef.current;
    container.addEventListener('click', handleCodeCopy);
    return () => container.removeEventListener('click', handleCodeCopy);
  }, [message.content, isMessageStreaming, isBot]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    } else {
      speakText(message.content || '', {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleSaveEdit = () => {
    if (!editText.trim() && (!message.attachments || message.attachments.length === 0)) return;
    setIsEditing(false);
    onEditMessage(index, editText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(message.content || '');
    }
  };

  const renderContent = () => {
    if (isUser) {
      return (
        <div className="user-bubble-content">
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentBubbleView attachments={message.attachments} />
          )}
          {message.content && <span>{message.content}</span>}
        </div>
      );
    }

    // Bot message: Parse markdown
    const rawHtml = marked.parse(message.content || '');
    return (
      <div
        ref={contentRef}
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    );
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'bot'}`}>
      <div className="message-bubble-wrapper">
        {/* User Action Buttons: appear on the left of user bubble */}
        {isUser && !isEditing && (
          <div className="bubble-actions">
            <button
              className="action-icon-btn"
              onClick={() => {
                setEditText(message.content);
                setIsEditing(true);
              }}
              title="Edit message"
              aria-label="Edit message"
            >
              <EditIcon size={14} />
            </button>
            <button
              className={`action-icon-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy message'}
              aria-label="Copy message"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
          </div>
        )}

        {/* Bubble Content */}
        <div className="chat-bubble">
          {isEditing ? (
            <div className="inline-edit-box">
              <textarea
                className="inline-edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="inline-edit-actions">
                <button
                  className="inline-edit-btn cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(message.content);
                  }}
                >
                  Cancel
                </button>
                <button className="inline-edit-btn save" onClick={handleSaveEdit}>
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <>
              {renderContent()}
              {/* Done icon for bot message once streaming completes */}
              {isBot && !isMessageStreaming && message.content && (
                <span className="bot-done-icon" title="Response complete">
                  <ElyxirFlaskIcon size={14} color="var(--accent)" />
                </span>
              )}
            </>
          )}
        </div>

        {/* Bot Action Buttons: appear to the right of bot bubble */}
        {isBot && !isMessageStreaming && (
          <div className="bubble-actions">
            <button
              className={`action-icon-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy message'}
              aria-label="Copy message"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>

            {/* Read Aloud / TTS Button */}
            <button
              className={`action-icon-btn ${isSpeaking ? 'speaking active' : ''}`}
              onClick={handleToggleSpeech}
              title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              aria-label="Read aloud"
            >
              {isSpeaking ? <SpeakerOffIcon size={14} /> : <SpeakerIcon size={14} />}
            </button>

            {/* Regenerate Button */}
            {onRegenerate && (
              <button
                className="action-icon-btn"
                onClick={() => onRegenerate(index)}
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RefreshIcon size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timestamp under bubble */}
      <div className="message-timestamp">
        {relativeTime}
      </div>
    </div>
  );
}


