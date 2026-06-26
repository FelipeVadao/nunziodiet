/**
 * NunzioDiet — Widget de chat do Nunzinho
 * Botão flutuante + janela de conversa. Self-contained, sem dependências.
 *
 * COMO USAR:
 *   1. Ajuste WORKER_URL abaixo com a URL do seu Worker publicado.
 *   2. Inclua no docs/index.html, antes de </body>:
 *        <script src="gemini-chat.js" defer></script>
 *
 * Respeita o tema do app: lê data-theme="dark" no <html> (padrão do NunzioDiet).
 */
(function () {
  "use strict";

  // ⚠️ Troque pela URL do seu Worker depois de publicar (wrangler deploy).
  const WORKER_URL = "https://nunziodiet-ai.felipeconceicaopc.workers.dev";

  // Memória da sessão (não persiste entre recarregamentos — de propósito).
  const history = [];

  /* ---------- estilos ---------- */
  const css = `
  .nd-chat-fab {
    position: fixed; right: 20px; bottom: 20px; z-index: 9999;
    width: 60px; height: 60px; border: none; border-radius: 50%;
    background: #62C823; color: #2B2B2B; cursor: pointer;
    display: grid; place-items: center;
    box-shadow: 0 8px 24px rgba(98,200,35,0.45);
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .nd-chat-fab:hover { transform: translateY(-2px) scale(1.04);
    box-shadow: 0 12px 30px rgba(98,200,35,0.6); }
  .nd-chat-fab:focus-visible { outline: 3px solid #62C823; outline-offset: 3px; }
  .nd-chat-fab svg { width: 28px; height: 28px; }
  .nd-chat-fab.nd-open { transform: scale(0); pointer-events: none; }

  .nd-chat-panel {
    position: fixed; right: 20px; bottom: 20px; z-index: 9999;
    width: 380px; max-width: calc(100vw - 32px);
    height: 560px; max-height: calc(100vh - 100px);
    background: #ffffff; border: 1px solid #e6e6ef;
    border-radius: 22px; overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.22);
    opacity: 0; transform: translateY(16px) scale(.96);
    pointer-events: none; transition: opacity .2s ease, transform .2s ease;
  }
  .nd-chat-panel.nd-open { opacity: 1; transform: none; pointer-events: auto; }

  .nd-chat-header {
    padding: 16px 18px; display: flex; align-items: center; gap: 12px;
    background: linear-gradient(160deg, #7bd92a, #3d9014, #2e6d0f);
    color: #fff;
  }
  .nd-chat-avatar {
    width: 40px; height: 40px; border-radius: 12px; flex: none;
    background: rgba(255,255,255,0.16); display: grid; place-items: center;
  }
  .nd-chat-avatar svg { width: 22px; height: 22px; }
  .nd-chat-title { font-weight: 700; line-height: 1.15; }
  .nd-chat-sub { font-size: .72rem; opacity: .82; margin-top: 1px; }
  .nd-chat-close {
    margin-left: auto; background: rgba(255,255,255,0.14); border: none;
    color: #fff; width: 32px; height: 32px; border-radius: 10px;
    cursor: pointer; display: grid; place-items: center; font-size: 18px;
    line-height: 1; transition: background .15s ease;
  }
  .nd-chat-close:hover { background: rgba(255,255,255,0.28); }

  .nd-chat-body {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    background: #f7f7fb;
  }
  .nd-msg { max-width: 82%; padding: 10px 14px; border-radius: 16px;
    font-size: .9rem; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; }
  .nd-msg-bot { align-self: flex-start; background: #ffffff;
    border: 1px solid #ececf4; border-bottom-left-radius: 5px; color: #2B2B2B; }
  .nd-msg-user { align-self: flex-end; background: #62C823; color: #1d1d1d;
    border-bottom-right-radius: 5px; font-weight: 500; }
  .nd-empty { margin: auto; text-align: center; color: #8a8a99;
    font-size: .85rem; padding: 0 20px; }

  .nd-typing { align-self: flex-start; display: flex; gap: 5px;
    padding: 12px 16px; background: #fff; border: 1px solid #ececf4;
    border-radius: 16px; border-bottom-left-radius: 5px; }
  .nd-typing span { width: 7px; height: 7px; border-radius: 50%;
    background: #b0b0c0; animation: nd-bounce 1.2s infinite ease-in-out; }
  .nd-typing span:nth-child(2) { animation-delay: .15s; }
  .nd-typing span:nth-child(3) { animation-delay: .3s; }
  @keyframes nd-bounce { 0%,60%,100% { transform: translateY(0); opacity:.5; }
    30% { transform: translateY(-5px); opacity: 1; } }

  .nd-chat-foot { padding: 12px; border-top: 1px solid #ececf4;
    display: flex; gap: 8px; background: #fff; }
  .nd-chat-input {
    flex: 1; border: 1px solid #dcdce6; border-radius: 14px;
    padding: 11px 14px; font-size: .9rem; font-family: inherit;
    resize: none; max-height: 96px; outline: none; color: #2B2B2B;
  }
  .nd-chat-input:focus { border-color: #62C823;
    box-shadow: 0 0 0 3px rgba(98,200,35,0.18); }
  .nd-chat-send {
    flex: none; width: 44px; border: none; border-radius: 14px;
    background: #62C823; color: #1d1d1d; cursor: pointer;
    display: grid; place-items: center; transition: filter .15s ease;
  }
  .nd-chat-send:hover { filter: brightness(1.06); }
  .nd-chat-send:disabled { opacity: .5; cursor: not-allowed; }
  .nd-chat-send svg { width: 20px; height: 20px; }

  /* ---------- dark mode (padrão do NunzioDiet) ---------- */
  [data-theme="dark"] .nd-chat-panel { background: #170f2e;
    border-color: rgba(139,92,246,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.55); }
  [data-theme="dark"] .nd-chat-header {
    background: linear-gradient(160deg, #1e0d38, #110820);
    border-bottom: 1px solid rgba(139,92,246,0.3); }
  [data-theme="dark"] .nd-chat-body { background: #0b0718; }
  [data-theme="dark"] .nd-msg-bot { background: #170f2e;
    border-color: rgba(139,92,246,0.18); color: #ece9f5; }
  [data-theme="dark"] .nd-typing { background: #170f2e;
    border-color: rgba(139,92,246,0.18); }
  [data-theme="dark"] .nd-typing span { background: #7c6aa8; }
  [data-theme="dark"] .nd-empty { color: #8b80ab; }
  [data-theme="dark"] .nd-chat-foot { background: #120a24;
    border-top-color: rgba(139,92,246,0.18); }
  [data-theme="dark"] .nd-chat-input { background: #0b0718;
    border-color: rgba(139,92,246,0.25); color: #ece9f5; }
  [data-theme="dark"] .nd-chat-input:focus { border-color: #62C823; }

  @media (max-width: 520px) {
    .nd-chat-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px);
      height: calc(100vh - 80px); }
    .nd-chat-fab { right: 16px; bottom: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .nd-chat-fab, .nd-chat-panel, .nd-typing span { transition: none; animation: none; }
  }
  `;

  /* ---------- ícones (sem emoji, padrão do app) ---------- */
  const ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  const ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  const ICON_LEAF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>';

  /* ---------- build DOM ---------- */
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const fab = document.createElement("button");
  fab.className = "nd-chat-fab";
  fab.setAttribute("aria-label", "Abrir chat com o Nunzinho");
  fab.innerHTML = ICON_CHAT;

  const panel = document.createElement("div");
  panel.className = "nd-chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat com o Nunzinho");
  panel.innerHTML = `
    <div class="nd-chat-header">
      <div class="nd-chat-avatar">${ICON_LEAF}</div>
      <div>
        <div class="nd-chat-title">Nunzinho</div>
        <div class="nd-chat-sub">Seu consultor de dieta (meio atrevido)</div>
      </div>
      <button class="nd-chat-close" aria-label="Fechar chat">&times;</button>
    </div>
    <div class="nd-chat-body" id="ndChatBody">
      <div class="nd-empty">Bora? Pergunta o que comer no lugar de algo,
        quanto de proteína tem num prato, ou como não furar a dieta hoje.</div>
    </div>
    <div class="nd-chat-foot">
      <textarea class="nd-chat-input" id="ndChatInput" rows="1"
        placeholder="Pode falar, tô ouvindo..."></textarea>
      <button class="nd-chat-send" id="ndChatSend" aria-label="Enviar">${ICON_SEND}</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const body = panel.querySelector("#ndChatBody");
  const input = panel.querySelector("#ndChatInput");
  const sendBtn = panel.querySelector("#ndChatSend");
  const closeBtn = panel.querySelector(".nd-chat-close");

  /* ---------- helpers ---------- */
  function openChat() {
    fab.classList.add("nd-open");
    panel.classList.add("nd-open");
    setTimeout(() => input.focus(), 220);
  }
  function closeChat() {
    fab.classList.remove("nd-open");
    panel.classList.remove("nd-open");
    fab.focus();
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addMessage(text, who) {
    const empty = body.querySelector(".nd-empty");
    if (empty) empty.remove();
    const el = document.createElement("div");
    el.className = "nd-msg " + (who === "user" ? "nd-msg-user" : "nd-msg-bot");
    el.textContent = text;
    body.appendChild(el);
    scrollDown();
  }

  function showTyping() {
    const t = document.createElement("div");
    t.className = "nd-typing";
    t.id = "ndTyping";
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t);
    scrollDown();
  }
  function hideTyping() {
    const t = body.querySelector("#ndTyping");
    if (t) t.remove();
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    history.push({ role: "user", text });
    input.value = "";
    input.style.height = "auto";
    input.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const resp = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });
      const data = await resp.json();
      hideTyping();

      const reply = resp.ok && data.reply
        ? data.reply
        : (data.error || "Algo deu errado. Tenta de novo aí.");
      addMessage(reply, "bot");
      if (resp.ok && data.reply) history.push({ role: "model", text: reply });
    } catch {
      hideTyping();
      addMessage("Sem conexão com o servidor. Confere sua internet e tenta de novo.", "bot");
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  /* ---------- eventos ---------- */
  fab.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);
  sendBtn.addEventListener("click", send);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("nd-open")) closeChat();
  });
})();
