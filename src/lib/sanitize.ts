// Minimal HTML sanitizer for rendering email/message bodies coming from the
// outreach APIs. These bodies are the user's own campaign copy, but we still
// strip anything executable before rendering with dangerouslySetInnerHTML.
// Not a general-purpose sanitizer — scoped to simple marketing-email markup.

/** Convert simple email HTML to readable plain text (for short previews). */
export function htmlToText(input: string): string {
  if (!input) return "";
  return input
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(div|p|tr)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return (
    input
      // Drop entire executable/embed blocks including their contents.
      .replace(
        /<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
        "",
      )
      // Drop self-closing/void variants of the same.
      .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
      // Remove inline event handlers (onclick=, onerror=, …).
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
      // Neutralize javascript: URLs.
      .replace(/javascript:/gi, "")
  );
}
