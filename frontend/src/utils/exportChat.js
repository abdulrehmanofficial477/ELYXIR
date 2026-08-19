/**
 * Utilities for exporting conversations into TXT, Markdown, and PDF.
 */

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export conversation as Plain Text (.txt)
 */
export function exportToTxt(conversation) {
  if (!conversation || !conversation.messages) return;

  const title = conversation.title || 'ELYXIR_Chat';
  const date = conversation.createdAt ? new Date(conversation.createdAt).toLocaleString() : new Date().toLocaleString();

  let text = `========================================\n`;
  text += ` ELYXIR Chat Export: ${title}\n`;
  text += ` Date: ${date}\n`;
  text += `========================================\n\n`;

  conversation.messages.forEach((msg, idx) => {
    const role = msg.role === 'user' ? 'YOU' : 'ELYXIR (AI)';
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
    text += `[${role}] ${time ? `(${time})` : ''}\n`;
    if (msg.attachments && msg.attachments.length > 0) {
      const attNames = msg.attachments.map((a) => a.name).join(', ');
      text += `[Attachments: ${attNames}]\n`;
    }
    text += `${msg.content || ''}\n\n`;
    text += `----------------------------------------\n\n`;
  });

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  downloadFile(text, `${sanitizedTitle}_export.txt`, 'text/plain;charset=utf-8');
}

/**
 * Export conversation as Markdown (.md)
 */
export function exportToMarkdown(conversation) {
  if (!conversation || !conversation.messages) return;

  const title = conversation.title || 'ELYXIR Conversation';
  const date = conversation.createdAt ? new Date(conversation.createdAt).toLocaleString() : new Date().toLocaleString();

  let md = `# 💬 ${title}\n\n`;
  md += `*Exported on ${date} from **ELYXIR***\n\n---\n\n`;

  conversation.messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const role = isUser ? '👤 **You**' : '🤖 **ELYXIR**';
    const time = msg.timestamp ? `*(${new Date(msg.timestamp).toLocaleTimeString()})*` : '';

    md += `### ${role} ${time}\n\n`;
    if (msg.attachments && msg.attachments.length > 0) {
      const attLinks = msg.attachments.map((a) => `📎 \`${a.name}\``).join('  \n');
      md += `${attLinks}\n\n`;
    }
    md += `${msg.content || ''}\n\n`;
  });

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  downloadFile(md, `${sanitizedTitle}_export.md`, 'text/markdown;charset=utf-8');
}

/**
 * Export conversation as PDF (formatted HTML printed to PDF)
 */
export function exportToPdf(conversation) {
  if (!conversation || !conversation.messages) return;

  const title = conversation.title || 'ELYXIR Conversation';
  const date = conversation.createdAt ? new Date(conversation.createdAt).toLocaleString() : new Date().toLocaleString();

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export to PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ELYXIR Export</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px 20px;
          }
          .header {
            border-bottom: 2px solid #e5e0d8;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            color: #c85a30;
            margin-bottom: 4px;
          }
          .date {
            font-size: 13px;
            color: #8d7d71;
          }
          .message {
            margin-bottom: 20px;
            padding: 12px 16px;
            border-radius: 8px;
          }
          .user-msg {
            background-color: #f6efe2;
            border-left: 4px solid #c85a30;
          }
          .bot-msg {
            background-color: #ffffff;
            border: 1px solid #e5e0d8;
            border-left: 4px solid #8d7d71;
          }
          .role {
            font-weight: 700;
            font-size: 13px;
            margin-bottom: 6px;
            color: #3a2f28;
          }
          .content {
            font-size: 14px;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .attachments {
            margin-top: 8px;
            font-size: 12px;
            color: #8d7d71;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">ELYXIR - ${title}</div>
          <div class="date">Exported on ${date}</div>
        </div>
        <div class="messages">
          ${conversation.messages
            .map((msg) => {
              const isUser = msg.role === 'user';
              const role = isUser ? '👤 You' : '🤖 ELYXIR';
              const att =
                msg.attachments && msg.attachments.length > 0
                  ? `<div class="attachments">📎 Attached: ${msg.attachments.map((a) => a.name).join(', ')}</div>`
                  : '';
              return `
                <div class="message ${isUser ? 'user-msg' : 'bot-msg'}">
                  <div class="role">${role} ${msg.timestamp ? `<span style="font-weight: normal; font-size: 11px; color: #8d7d71;">(${new Date(msg.timestamp).toLocaleTimeString()})</span>` : ''}</div>
                  ${att}
                  <div class="content">${escapeHtml(msg.content || '')}</div>
                </div>
              `;
            })
            .join('')}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
