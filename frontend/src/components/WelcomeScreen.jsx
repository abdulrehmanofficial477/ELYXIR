import React, { useState, useRef, useEffect } from 'react';
import ElyxirFlaskIcon from './ElyxirFlaskIcon';
import ConcentricCirclesIcon from './ConcentricCirclesIcon';
import { UpArrowIcon, PlusIcon, MicIcon, MicOffIcon, GlobeIcon } from './Icons';
import AttachmentPreview from './AttachmentPreview';
import useVoiceInput from '../hooks/useVoiceInput';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 5;

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.pdf', '.doc', '.docx'];

const SUGGESTED_PROMPTS = [
  {
    icon: '💡',
    title: 'Brainstorm Ideas',
    subtitle: 'Innovative startup ideas for 2026',
    prompt: 'Help me brainstorm 5 unique and profitable startup ideas for 2026.',
  },
  {
    icon: '📝',
    title: 'Draft an Email',
    subtitle: 'Professional follow-up to a client',
    prompt: 'Write a polite and professional follow-up email to a client after submitting a proposal.',
  },
  {
    icon: '💻',
    title: 'Code & Explain',
    subtitle: 'SQL vs NoSQL with examples',
    prompt: 'Explain the difference between SQL and NoSQL databases with clear real-world examples.',
  },
  {
    icon: '🌐',
    title: 'Explore & Research',
    subtitle: 'Latest breakthroughs in AI',
    prompt: 'What are the most exciting recent breakthroughs in artificial intelligence and tech?',
  },
];

export default function WelcomeScreen({ onSendMessage }) {
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
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
      setInputValue((prev) => {
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
      // Clean up object URLs on unmount
      attachments.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    };
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Reset input so re-selecting same file triggers change
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
    const hasText = inputValue.trim().length > 0;
    const hasFiles = attachments.length > 0;
    if (!hasText && !hasFiles) return;

    onSendMessage({
      text: inputValue.trim(),
      attachments: attachments,
      webSearch: webSearchEnabled,
    });

    setInputValue('');
    setAttachments([]);
    setErrorMessage('');
    if (inputRef.current) {
      inputRef.current.style.height = '28px';
    }
  };

  const handlePromptClick = (promptText) => {
    onSendMessage({
      text: promptText,
      attachments: [],
      webSearch: webSearchEnabled,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSubmit = (inputValue.trim().length > 0 || attachments.length > 0) && !isListening && !isTranscribing;

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  let inputPlaceholder = 'How can I help you today?';
  if (isListening) {
    inputPlaceholder = `🔴 Recording... [${formatSecs(recordingSeconds)}] (Click mic to stop)`;
  } else if (isTranscribing) {
    inputPlaceholder = '✨ Transcribing voice with AI...';
  }

  return (
    <div className="welcome-screen">
      {/* Slogan row with Elyxir Flask SVG icon and Cormorant italic text */}
      <div className="welcome-slogan-row">
        <span className="welcome-icon-wrap">
          <ElyxirFlaskIcon size={34} color="var(--accent)" />
        </span>
        <h1 className="welcome-slogan-text">Answers that keep up with you.</h1>
      </div>

      {/* Rounded-rectangle Input Bar with Attachments */}
      <form className="welcome-input-bar" onSubmit={handleSubmit}>
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
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
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

          <button
            type="submit"
            className="send-btn-round"
            disabled={!canSubmit}
            title="Send message"
            aria-label="Send message"
          >
            <UpArrowIcon size={18} />
          </button>
        </div>
      </form>

      {/* Suggested Prompts Cards Grid */}
      <div className="suggested-prompts-grid">
        {SUGGESTED_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className="suggested-prompt-card"
            onClick={() => handlePromptClick(item.prompt)}
          >
            <span className="prompt-card-icon">{item.icon}</span>
            <div className="prompt-card-text">
              <span className="prompt-card-title">{item.title}</span>
              <span className="prompt-card-subtitle">{item.subtitle}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}



