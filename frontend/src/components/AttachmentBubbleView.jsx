import React, { useState } from 'react';
import { DocumentIcon, CloseIcon } from './Icons';
import { formatFileSize, getFileExtension } from './AttachmentPreview';

export default function AttachmentBubbleView({ attachments }) {
  const [modalImage, setModalImage] = useState(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const images = attachments.filter(
    (a) => a.isImage || (a.type && a.type.startsWith('image/')) || (a.file && a.file.type.startsWith('image/'))
  );
  const docs = attachments.filter(
    (a) => !images.includes(a)
  );

  return (
    <div className="bubble-attachments-container">
      {/* Attached Images */}
      {images.length > 0 && (
        <div className={`bubble-images-grid count-${Math.min(images.length, 4)}`}>
          {images.map((img, idx) => (
            <div
              key={img.id || idx}
              className="bubble-image-wrapper"
              onClick={() => setModalImage(img.previewUrl || img.url)}
              title="Click to expand"
            >
              <img
                src={img.previewUrl || img.url}
                alt={img.name || `Attached image ${idx + 1}`}
                className="bubble-image-thumb"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Attached Documents (PDF/DOCX) */}
      {docs.length > 0 && (
        <div className="bubble-docs-list">
          {docs.map((doc, idx) => {
            const ext = getFileExtension(doc.name || (doc.file && doc.file.name));
            const sizeStr = formatFileSize(doc.size || (doc.file && doc.file.size));
            const isPdf = ext === 'PDF';

            return (
              <div key={doc.id || idx} className={`bubble-doc-card ${isPdf ? 'pdf' : 'docx'}`}>
                <div className="bubble-doc-icon-wrap">
                  <DocumentIcon size={20} />
                </div>
                <div className="bubble-doc-info">
                  <span className="bubble-doc-title" title={doc.name}>
                    {doc.name || 'Attached Document'}
                  </span>
                  <div className="bubble-doc-sub">
                    <span className={`bubble-ext-badge ${isPdf ? 'pdf' : 'docx'}`}>{ext}</span>
                    {sizeStr && <span className="bubble-doc-size">{sizeStr}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Image Viewer for Zooming */}
      {modalImage && (
        <div className="image-zoom-modal" onClick={() => setModalImage(null)}>
          <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="zoom-close-btn"
              onClick={() => setModalImage(null)}
              title="Close image"
              aria-label="Close image"
            >
              <CloseIcon size={18} />
            </button>
            <img src={modalImage} alt="Expanded preview" className="zoomed-image" />
          </div>
        </div>
      )}
    </div>
  );
}
