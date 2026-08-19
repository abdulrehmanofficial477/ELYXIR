import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="message-row bot" style={{ marginTop: 4 }}>
      <div className="message-bubble-wrapper">
        <div className="typing-indicator-bubble" aria-label="ASK ME is thinking...">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
      <div className="message-timestamp">Thinking...</div>
    </div>
  );
}
