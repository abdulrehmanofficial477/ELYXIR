import React, { useState, useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import AttachmentPreview from './AttachmentPreview';
import { UpArrowIcon, DownArrowIcon, PlusIcon, MicIcon, MicOffIcon, GlobeIcon, StopIcon } from './Icons';
import useVoiceInput from '../hooks/useVoiceInput';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 5;
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.pdf', '.doc', '.docx'];

export default function ChatView({
  messages,
  isWaitingForBot,
  onSendMessage,
  onEditMessage,
  onRegenerate,
  onStopGeneration,
}) {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const errorTimeoutRef = useRef(null);

  const showError = (msg) => {
    setErrorMessage(msg);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      setErrorMessage('');
    }, 5000);
  };

  const { isListening, isTranscribing, recordingSeconds, toggleListening } = useVoiceInput({
    onTranscript: (text) => {
      setInputText((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${text}` : text;
      });
    },
    onError: (err) => {
      showError(err);
    },
  });

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      attachments.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    };
  }, []);

  // Check scroll position to determine if we should show the scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isScrolledUp = distanceFromBottom > 150;
    setShowScrollBottom(isScrolledUp);
    userScrolledUpRef.current = isScrolledUp;
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

  // Auto-scroll when messages update, unless user manually scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom(false);
    }
  }, [messages, isWaitingForBot]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    e.target.value = '';

    let currentImagesCount = attachments.filter((a) => a.isImage).length;
    const newAttachments = [];
    let err = '';

    for (const file of selectedFiles) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].includes(ext);
      const isDoc = file.type === 'application/pdf' || ext === '.pdf' || ['.doc', '.docx'].includes(ext) || file.type.includes('word');
      const isVideo = file.type.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);

      if (isVideo) {
        err = 'Video files are not supported. Please select images or documents (PDF/DOCX).';
        continue;
      }

      if (!isImage && !isDoc && !ALLOWED_EXTENSIONS.includes(ext)) {
        err = `Unsupported file type for "${file.name}". Only images and documents (PDF, DOCX) are supported.`;
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        err = `"${file.name}" exceeds the 10MB file size limit.`;
        continue;
      }

      if (isImage) {
        if (currentImagesCount >= MAX_IMAGES) {
          err = `You can attach a maximum of ${MAX_IMAGES} images per message.`;
          continue;
        }
        currentImagesCount++;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      newAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage,
        previewUrl,
      });
    }

    if (err) {
      showError(err);
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => {
      const target = prev[index];
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isWaitingForBot && onStopGeneration) {
      onStopGeneration();
      return;
    }

    const hasText = inputText.trim().length > 0;
    const hasFiles = attachments.length > 0;
    if (!hasText && !hasFiles) return;

    userScrolledUpRef.current = false;
    onSendMessage({
      text: inputText.trim(),
      attachments: attachments,
      webSearch: webSearchEnabled,
    });

    setInputText('');
    setAttachments([]);
    setErrorMessage('');

    if (inputRef.current) {
      inputRef.current.style.height = '28px';
    }

    setTimeout(() => {
      scrollToBottom(true);
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSubmit = (inputText.trim().length > 0 || attachments.length > 0) && !isListening && !isTranscribing;

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  let inputPlaceholder = 'Reply your chatbot...';
  if (isListening) {
    inputPlaceholder = `🔴 Recording... [${formatSecs(recordingSeconds)}] (Click mic to stop)`;
  } else if (isTranscribing) {
    inputPlaceholder = '✨ Transcribing voice with AI...';
  }

  return (
    <div className="main-chat-container">
      {/* Scrollable Messages Area */}
      <div
        className="chat-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="messages-list">
          {messages.map((msg, idx) => (
            <ChatBubble
              key={msg.id || idx}
              message={msg}
              index={idx}
              onEditMessage={onEditMessage}
              onRegenerate={onRegenerate}
              isStreamingLast={idx === messages.length - 1 && msg.role === 'bot'}
            />
          ))}

          {/* Typing indicator while waiting for bot's first token */}
          {isWaitingForBot && <TypingIndicator />}

          <div ref={messagesEndRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="bottom-input-container">
        {/* Floating Scroll-to-Bottom Button */}
        {showScrollBottom && (
          <button
            className="scroll-to-bottom-btn"
            onClick={() => {
              userScrolledUpRef.current = false;
              scrollToBottom(true);
            }}
            title="Scroll to bottom"
            aria-label="Scroll to bottom"
          >
            <DownArrowIcon size={18} />
          </button>
        )}

        <form className="bottom-input-wrapper" onSubmit={handleSubmit}>
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Attachment Previews and Error Banner */}
          <AttachmentPreview
            attachments={attachments}
            onRemoveAttachment={handleRemoveAttachment}
            errorMessage={errorMessage}
            onDismissError={() => setErrorMessage('')}
          />

          <div className="input-row-flex">
            {/* Subtle '+' Attachment Button */}
            <button
              type="button"
              className="attach-btn-subtle"
              onClick={() => fileInputRef.current?.click()}
              title="Attach images or documents (PDF, DOCX)"
              aria-label="Attach images or documents"
            >
              <PlusIcon size={18} />
            </button>

            {/* Web Search Toggle Button */}
            <button
              type="button"
              className={`input-tool-btn ${webSearchEnabled ? 'active' : ''}`}
              onClick={() => setWebSearchEnabled((prev) => !prev)}
              title={webSearchEnabled ? 'Live Web Search is ON' : 'Enable Live Web Search'}
              aria-label="Toggle web search"
            >
              <GlobeIcon size={17} />
            </button>

            {/* Voice Input Mic Button */}
            <button
              type="button"
              className={`input-tool-btn mic-btn ${isListening ? 'listening' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              onClick={toggleListening}
              title={isListening ? `Recording (${formatSecs(recordingSeconds)})... Click to stop & transcribe` : 'Voice Input (Click to speak)'}
              aria-label="Voice input"
              disabled={isTranscribing}
            >
              {isListening ? <MicOffIcon size={17} /> : <MicIcon size={17} />}
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Adjust height dynamically
                e.target.style.height = '28px';
                const newHeight = Math.min(e.target.scrollHeight - 4, 180);
                e.target.style.height = `${newHeight}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              disabled={isTranscribing}
              autoFocus
            />

            {/* Send / Stop Generation Button */}
            {isWaitingForBot ? (
              <button
                type="button"
                className="send-btn-round stop"
                onClick={onStopGeneration}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <StopIcon size={14} />
              </button>
            ) : (
              <button
                type="submit"
                className="send-btn-round"
                disabled={!canSubmit}
                title="Send message"
                aria-label="Send message"
              >
                <UpArrowIcon size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}


