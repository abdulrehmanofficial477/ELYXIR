import React, { useState, useRef, useEffect } from 'react';
import { HamburgerIcon, DownloadIcon } from './Icons';
import { exportToPdf, exportToMarkdown, exportToTxt } from '../utils/exportChat';

export default function ChatHeader({
  onToggleSidebar,
  isSidebarOpen,
  activeConversation,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dropdownRef = useRef(null);

  const hasMessages =
    activeConversation &&
    activeConversation.messages &&
    activeConversation.messages.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const handleExport = (type) => {
    setShowExportMenu(false);
    if (!activeConversation) return;

    if (type === 'pdf') {
      exportToPdf(activeConversation);
    } else if (type === 'md') {
      exportToMarkdown(activeConversation);
    } else if (type === 'txt') {
      exportToTxt(activeConversation);
    }
  };

  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label="Toggle sidebar"
        >
          <HamburgerIcon size={20} />
        </button>

        <div className="header-bot-info">
          <div className="header-bot-text-group">
            <span className="header-bot-name">ELYXIR</span>
            <div className="header-bot-status">
              <span className="online-dot" />
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header Right with Export Menu */}
      {hasMessages && (
        <div className="header-right" ref={dropdownRef}>
          <button
            className={`header-export-btn ${showExportMenu ? 'active' : ''}`}
            onClick={() => setShowExportMenu((prev) => !prev)}
            title="Export conversation"
            aria-label="Export conversation"
          >
            <DownloadIcon size={16} />
            <span>Export</span>
          </button>

          {showExportMenu && (
            <div className="export-dropdown-menu">
              <button
                type="button"
                className="export-dropdown-item"
                onClick={() => handleExport('pdf')}
              >
                <span className="export-item-icon">📄</span>
                <div className="export-item-text">
                  <span className="export-item-title">PDF Document</span>
                  <span className="export-item-desc">Print / Save as formatted PDF</span>
                </div>
              </button>

              <button
                type="button"
                className="export-dropdown-item"
                onClick={() => handleExport('md')}
              >
                <span className="export-item-icon">📝</span>
                <div className="export-item-text">
                  <span className="export-item-title">Markdown (.md)</span>
                  <span className="export-item-desc">Formatted markdown with headings</span>
                </div>
              </button>

              <button
                type="button"
                className="export-dropdown-item"
                onClick={() => handleExport('txt')}
              >
                <span className="export-item-icon">📃</span>
                <div className="export-item-text">
                  <span className="export-item-title">Plain Text (.txt)</span>
                  <span className="export-item-desc">Standard text conversation log</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

