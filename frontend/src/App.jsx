import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import WelcomeScreen from './components/WelcomeScreen';
import ChatView from './components/ChatView';
import { streamChatResponse } from './services/api';
import { ACCENT_COLORS, BOT_BUBBLE_COLORS } from './components/CustomizePanel';

const STORAGE_KEY = 'askme_conversations';
const THEME_KEY = 'askme_theme';
const ACCENT_KEY = 'askme_accent_index';
const CUSTOM_ACCENT_KEY = 'askme_custom_accent';
const BOT_BUBBLE_KEY = 'askme_bot_bubble_index';
const CUSTOM_BOT_BUBBLE_KEY = 'askme_custom_bot_bubble';

export default function App() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading conversations from localStorage:', e);
      return [];
    }
  });

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'light';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  // ── Color customization state ──────────────────────────────────────────────
  const [accentColorIndex, setAccentColorIndex] = useState(() => {
    const saved = localStorage.getItem(ACCENT_KEY);
    if (saved === 'custom') return 'custom';
    const n = parseInt(saved, 10);
    return isNaN(n) ? 0 : n;
  });
  const [customAccent, setCustomAccent] = useState(() => {
    return localStorage.getItem(CUSTOM_ACCENT_KEY) || '#7c3aed';
  });
  const [botBubbleIndex, setBotBubbleIndex] = useState(() => {
    const saved = localStorage.getItem(BOT_BUBBLE_KEY);
    if (saved === 'custom') return 'custom';
    const n = parseInt(saved, 10);
    return isNaN(n) ? 0 : n;
  });
  const [customBotBubble, setCustomBotBubble] = useState(() => {
    return localStorage.getItem(CUSTOM_BOT_BUBBLE_KEY) || '#dbeafe';
  });
  const [isWaitingForBot, setIsWaitingForBot] = useState(false);

  const abortControllerRef = useRef(null);

  // ── HSL helper ────────────────────────────────────────────────────────────
  // ── Apply theme + custom colors to CSS variables ────────────────────────
  const applyColors = useCallback(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    root.setAttribute('data-theme', theme);

    // Resolve accent hex
    let accent;
    if (accentColorIndex === 'custom') {
      accent = customAccent;
    } else {
      const c = ACCENT_COLORS[accentColorIndex] || ACCENT_COLORS[0];
      accent = isDark ? c.dark : c.light;
    }

    // Parse hex → HSL so we can build a full tinted theme
    const hexToHsl = (hex) => {
      let r = parseInt(hex.slice(1, 3), 16) / 255;
      let g = parseInt(hex.slice(3, 5), 16) / 255;
      let b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    };

    const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

    const [h, s] = hexToHsl(accent);
    // Cap saturation so backgrounds aren't too vivid
    const bs = Math.min(s, 30); // background saturation

    if (isDark) {
      root.style.setProperty('--bg',              hsl(h, bs, 9));
      root.style.setProperty('--header-bg',       hsl(h, bs, 13));
      root.style.setProperty('--sidebar-bg',      hsl(h, bs, 7));
      root.style.setProperty('--sidebar-border',  hsl(h, Math.min(bs, 20), 19));
      root.style.setProperty('--sidebar-hover',   hsl(h, bs, 17));
      root.style.setProperty('--dot-color',       hsl(h, Math.min(bs, 18), 20));
      root.style.setProperty('--input-bg',        hsl(h, bs, 13));
      root.style.setProperty('--input-border',    hsl(h, Math.min(bs, 18), 22));
      root.style.setProperty('--name-color',      hsl(h, 18, 92));
      root.style.setProperty('--bot-text',        hsl(h, 12, 87));
      root.style.setProperty('--text-muted',      hsl(h, 10, 52));
      root.style.setProperty('--action-btn-hover',hsl(h, bs, 20));
      root.style.setProperty('--shadow-subtle',   '0 4px 16px rgba(0,0,0,0.4)');
    } else {
      root.style.setProperty('--bg',              hsl(h, Math.min(bs, 28), 95));
      root.style.setProperty('--header-bg',       hsl(h, Math.min(bs, 15), 99));
      root.style.setProperty('--sidebar-bg',      hsl(h, Math.min(bs, 26), 91));
      root.style.setProperty('--sidebar-border',  hsl(h, Math.min(bs, 22), 85));
      root.style.setProperty('--sidebar-hover',   hsl(h, Math.min(bs, 24), 84));
      root.style.setProperty('--dot-color',       hsl(h, Math.min(bs, 18), 87));
      root.style.setProperty('--input-bg',        hsl(h, Math.min(bs, 12), 99));
      root.style.setProperty('--input-border',    hsl(h, Math.min(bs, 18), 87));
      root.style.setProperty('--name-color',      hsl(h, Math.min(s, 50), 18));
      root.style.setProperty('--bot-text',        hsl(h, Math.min(s, 40), 22));
      root.style.setProperty('--text-muted',      hsl(h, Math.min(s, 20), 52));
      root.style.setProperty('--action-btn-hover',hsl(h, Math.min(bs, 20), 88));
      root.style.setProperty('--shadow-subtle',   `0 4px 16px hsl(${h},${Math.min(bs,30)}%,70%,0.12)`);
    }

    // Accent & accent-light
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-hover', accent);
    root.style.setProperty('--accent-light', accent + '22');

    // Resolve bot bubble
    if (botBubbleIndex === 0) {
      // "Default" — derive from theme hue
      if (isDark) {
        root.style.setProperty('--bot-bubble-bg', hsl(h, bs, 16));
      } else {
        root.style.setProperty('--bot-bubble-bg', hsl(h, Math.min(bs, 28), 96));
      }
    } else if (botBubbleIndex === 'custom') {
      root.style.setProperty('--bot-bubble-bg', customBotBubble);
    } else {
      const b = BOT_BUBBLE_COLORS[botBubbleIndex];
      if (b) {
        root.style.setProperty('--bot-bubble-bg', isDark ? b.dark : b.light);
      }
    }
  }, [theme, accentColorIndex, customAccent, botBubbleIndex, customBotBubble]);


  useEffect(() => {
    applyColors();
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(ACCENT_KEY, String(accentColorIndex));
    localStorage.setItem(CUSTOM_ACCENT_KEY, customAccent);
    localStorage.setItem(BOT_BUBBLE_KEY, String(botBubbleIndex));
    localStorage.setItem(CUSTOM_BOT_BUBBLE_KEY, customBotBubble);
  }, [applyColors, theme, accentColorIndex, customAccent, botBubbleIndex, customBotBubble]);

  // Persist conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Error saving conversations to localStorage:', e);
    }
  }, [conversations]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === currentConversationId);
  const activeMessages = activeConversation ? activeConversation.messages : [];

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleNewChat = () => {
    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsWaitingForBot(false);
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (id) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsWaitingForBot(false);
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      handleNewChat();
    }
  };

  /**
   * Sends a user message and streams the bot response.
   * @param {string|object} msgInput - Message text string or { text, attachments }
   * @param {Array|null} existingHistory - Preceding history if resending
   * @param {string|null} targetConvId - Target conversation ID
   */
  const handleSendMessage = async (msgInput, existingHistory = null, targetConvId = null) => {
    const text = typeof msgInput === 'string' ? msgInput : (msgInput?.text || '');
    const stagedAttachments = typeof msgInput === 'object' && msgInput?.attachments ? msgInput.attachments : [];
    const isWebSearch = typeof msgInput === 'object' && Boolean(msgInput?.webSearch);

    const timestamp = new Date().toISOString();

    // Create user message with attachments metadata for display
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      attachments: stagedAttachments.map((a) => ({
        id: a.id || `att-${Date.now()}`,
        name: a.name,
        size: a.size,
        type: a.type,
        isImage: a.isImage,
        previewUrl: a.previewUrl,
      })),
      timestamp,
    };

    let convId = targetConvId || currentConversationId;
    let historyForApi = [];

    if (!convId || !conversations.some((c) => c.id === convId)) {
      // Create new conversation
      convId = `conv-${Date.now()}`;
      let title = text;
      if (!title && stagedAttachments.length > 0) {
        title = stagedAttachments[0].name || 'Attached File';
      }
      if (title.length > 30) {
        title = title.slice(0, 30) + '...';
      }
      if (!title) title = 'New Conversation';

      const newConv = {
        id: convId,
        title,
        createdAt: timestamp,
        messages: [userMsg],
      };
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversationId(convId);
      historyForApi = [];
    } else {
      // Update existing conversation
      const conv = conversations.find((c) => c.id === convId);
      const baseMessages = existingHistory !== null ? existingHistory : (conv ? conv.messages : []);
      const updatedMessages = [...baseMessages, userMsg];

      historyForApi = baseMessages;

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages: updatedMessages } : c))
      );
    }

    // Set waiting for bot response
    setIsWaitingForBot(true);

    // Create placeholder for bot response
    const botMsgId = `bot-${Date.now()}`;
    const botPlaceholder = {
      id: botMsgId,
      role: 'bot',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    let botResponseText = '';
    let isFirstToken = true;

    // Abort previous stream if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Extract raw File objects for upload
    const rawFiles = stagedAttachments
      .map((a) => a.file)
      .filter((f) => f instanceof File || f instanceof Blob);

    await streamChatResponse({
      message: text,
      history: historyForApi,
      files: rawFiles,
      webSearch: isWebSearch,
      signal: abortControllerRef.current.signal,
      onChunk: (chunk) => {
        if (isFirstToken) {
          setIsWaitingForBot(false);
          isFirstToken = false;
          // Add bot message into conversation
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === convId) {
                return {
                  ...c,
                  messages: [...c.messages, { ...botPlaceholder, content: chunk }],
                };
              }
              return c;
            })
          );
          botResponseText += chunk;
        } else {
          botResponseText += chunk;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === convId) {
                const msgs = c.messages.map((m) =>
                  m.id === botMsgId ? { ...m, content: botResponseText } : m
                );
                return { ...c, messages: msgs };
              }
              return c;
            })
          );
        }
      },
      onError: (errorMessage) => {
        setIsWaitingForBot(false);
        const errorContent = `⚠️ ${errorMessage}`;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              const hasBotMsg = c.messages.some((m) => m.id === botMsgId);
              if (hasBotMsg) {
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === botMsgId
                      ? { ...m, content: (m.content ? m.content + '\n\n' : '') + errorContent, isStreaming: false }
                      : m
                  ),
                };
              } else {
                return {
                  ...c,
                  messages: [...c.messages, { ...botPlaceholder, content: errorContent, isStreaming: false }],
                };
              }
            }
            return c;
          })
        );
      },
      onDone: () => {
        setIsWaitingForBot(false);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === convId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === botMsgId ? { ...m, isStreaming: false } : m
                ),
              };
            }
            return c;
          })
        );
      },
    });
  };

  /**
   * Handles inline message edit by user.
   * Truncates history after edited message index and resends.
   */
  const handleEditMessage = (index, newText) => {
    if (!activeConversation) return;

    // Truncate history before this message
    const precedingHistory = activeConversation.messages.slice(0, index);

    // Resend with truncated history
    handleSendMessage(newText, precedingHistory, activeConversation.id);
  };

  /**
   * Handles regenerating a bot response.
   * Finds the preceding user message, truncates history before it, and re-sends.
   */
  const handleRegenerate = (botIndex) => {
    if (!activeConversation || botIndex <= 0) return;

    const userMsgIndex = botIndex - 1;
    const userMsg = activeConversation.messages[userMsgIndex];
    if (!userMsg || userMsg.role !== 'user') return;

    const precedingHistory = activeConversation.messages.slice(0, userMsgIndex);
    
    // Resend the user message with preceding history
    handleSendMessage(
      {
        text: userMsg.content || '',
        attachments: userMsg.attachments || [],
      },
      precedingHistory,
      activeConversation.id
    );
  };

  /**
   * Stops streaming/generation in progress.
   */
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsWaitingForBot(false);
    if (currentConversationId) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === currentConversationId) {
            return {
              ...c,
              messages: c.messages.map((m) => ({ ...m, isStreaming: false })),
            };
          }
          return c;
        })
      );
    }
  };

  const isChatActive = activeConversation && activeMessages.length > 0;

  return (
    <div className="app-container">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        accentColorIndex={accentColorIndex}
        onAccentChange={setAccentColorIndex}
        customAccent={customAccent}
        onCustomAccentChange={setCustomAccent}
        botBubbleIndex={botBubbleIndex}
        onBotBubbleChange={setBotBubbleIndex}
        customBotBubble={customBotBubble}
        onCustomBotBubbleChange={setCustomBotBubble}
      />

      {/* Main Chat Area */}
      <div className="main-chat-container">
        {/* Chat Header */}
        <ChatHeader
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
          activeConversation={activeConversation}
        />


        {/* Content: Welcome Screen or Active Chat View */}
        {isChatActive ? (
          <ChatView
            messages={activeMessages}
            isWaitingForBot={isWaitingForBot}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onRegenerate={handleRegenerate}
            onStopGeneration={handleStopGeneration}
          />
        ) : (
          <WelcomeScreen onSendMessage={handleSendMessage} />
        )}
      </div>
    </div>
  );
}

