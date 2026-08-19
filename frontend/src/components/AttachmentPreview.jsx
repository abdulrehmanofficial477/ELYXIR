import React from 'react';
import { CloseIcon, DocumentIcon, ImageIcon } from './Icons';

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'DOC';
}

export default function AttachmentPreview({
  attachments,
  onRemoveAttachment,
  errorMessage,
  onDismissError,
}) {
  if ((!attachments || attachments.length === 0) && !errorMessage) {
    return null;
  }

  return (
    <div className="attachments-preview-wrapper">
      {/* Inline Error Banner */}
      {errorMessage && (
        <div className="inline-attachment-error">
          <span>⚠️ {errorMessage}</span>
          {onDismissError && (
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={onDismissError}
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      )}

      {/* Attachment Chips Row */}
      {attachments && attachments.length > 0 && (
        <div className="attachments-chips-row">
          {attachments.map((item, index) => {
            const isImage = item.isImage || (item.file && item.file.type.startsWith('image/'));
            const ext = getFileExtension(item.name || (item.file && item.file.name));
            const sizeStr = formatFileSize(item.size || (item.file && item.file.size));
            const isPdf = ext === 'PDF';

            return (
              <div key={item.id || index} className="attachment-chip">
                {isImage ? (
                  <div className="chip-image-container">
                    <img
                      src={item.previewUrl}
                      alt={item.name || 'Attached image'}
                      className="chip-image-thumb"
                    />
                  </div>
                ) : (
                  <div className={`chip-doc-container ${isPdf ? 'pdf' : 'docx'}`}>
                    <span className="chip-doc-icon">
                      <DocumentIcon size={18} />
                    </span>
                    <div className="chip-doc-details">
                      <span className="chip-doc-name" title={item.name || 'Document'}>
                        {item.name || 'Document'}
                      </span>
                      <div className="chip-doc-meta">
                        <span className={`chip-ext-badge ${isPdf ? 'pdf' : 'docx'}`}>{ext}</span>
                        {sizeStr && <span className="chip-doc-size">{sizeStr}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Remove button in corner */}
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={() => onRemoveAttachment(index)}
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <CloseIcon size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
