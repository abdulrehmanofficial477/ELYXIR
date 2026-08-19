import React, { useState, useMemo } from 'react';
import { PlusIcon, TrashIcon, SearchIcon, CloseIcon } from './Icons';
import ElyxirFlaskIcon from './ElyxirFlaskIcon';
import CustomizePanel from './CustomizePanel';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  theme,
  onToggleTheme,
  isOpen,
  onCloseMobile,
  accentColorIndex,
  onAccentChange,
  customAccent,
  onCustomAccentChange,
  botBubbleIndex,
  onBotBubbleChange,
  customBotBubble,
  onCustomBotBubbleChange,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);

  // Filter conversations by title or message text
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations || [];

    return (conversations || []).filter((conv) => {
      if (conv.title && conv.title.toLowerCase().includes(q)) return true;
      if (conv.messages && Array.isArray(conv.messages)) {
        return conv.messages.some((m) =>
          typeof m.content === 'string' && m.content.toLowerCase().includes(q)
        );
      }
      return false;
    });
  }, [conversations, searchQuery]);

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="brand-row">
            <div className="brand-title">
              <ElyxirFlaskIcon size={24} color="var(--accent)" />
              <span className="brand-name-text">ELYXIR</span>
            </div>
          </div>

          <button
            className="new-chat-btn"
            onClick={() => {
              onNewChat();
              if (window.innerWidth <= 768) onCloseMobile();
            }}
          >
            <PlusIcon size={16} />
            <span>New chat</span>
          </button>

          {/* Search Conversations Bar */}
          <div className="sidebar-search-box">
            <SearchIcon size={14} />
            <input
              type="text"
              className="sidebar-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
            />
            {searchQuery && (
              <button
                type="button"
                className="sidebar-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List — hidden when customize panel is open */}
        {!showCustomize && (
          <div className="conversations-container">
            <div className="conversations-label">
              {searchQuery.trim() ? `Search Results (${filteredConversations.length})` : 'Recent Chats'}
            </div>

            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                const displayTitle = conv.title || (conv.messages?.[0]?.content?.slice(0, 30) || 'New Conversation');

                return (
                  <div
                    key={conv.id}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      if (window.innerWidth <= 768) onCloseMobile();
                    }}
                    title={conv.title || 'Conversation'}
                  >
                    <span className="conversation-item-title">{displayTitle}</span>
                    <button
                      className="conversation-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="no-conversations">
                {searchQuery.trim() ? 'No matching chats found' : 'No past chats yet'}
              </div>
            )}
          </div>
        )}

        {/* Customize Panel */}
        {showCustomize && (
          <div className="customize-panel-wrapper">
            <CustomizePanel
              theme={theme}
              onToggleTheme={onToggleTheme}
              accentColorIndex={accentColorIndex}
              onAccentChange={onAccentChange}
              customAccent={customAccent}
              onCustomAccentChange={onCustomAccentChange}
              botBubbleIndex={botBubbleIndex}
              onBotBubbleChange={onBotBubbleChange}
              customBotBubble={customBotBubble}
              onCustomBotBubbleChange={onCustomBotBubbleChange}
            />
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            className={`customize-toggle-btn ${showCustomize ? 'active' : ''}`}
            onClick={() => setShowCustomize((prev) => !prev)}
            title={showCustomize ? 'Back to chats' : 'Customize colors & theme'}
            aria-label="Toggle customize panel"
          >
            <span className="customize-btn-icon">🎨</span>
            <span>{showCustomize ? 'Back to Chats' : 'Customize'}</span>
            {!showCustomize && <span className="customize-btn-badge">New</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
