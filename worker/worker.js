/**
 * NunzioDiet AI — Cloudflare Worker
 * Proxy seguro entre o frontend e a API do Google Gemini 1.5 Flash.
 *
 * A chave NUNCA fica no código. Ela vem de env.GEMINI_API_KEY,
 * configurada via:  wrangler secret put GEMINI_API_KEY
 */

const ALLOWED_ORIGIN = "https://felipevadao.github.io";

const SYSTEM_INSTRUCTION =
  "Você é o Nunzinho, um assistente nutricional inteligente da aplicação " +
  "NunzioDiet. Sua missão é ajudar usuários a fazerem substituições " +
  "inteligentes e manterem a dieta de forma prática. Use um tom sarcástico, " +
  "debochado e brasileiro. Seja útil de verdade: dê números, porções e " +
  "alternativas concretas, mas sempre com aquele deboche leve. Calibre o " +
  "tamanho da resposta pela pergunta: cumprimento ou pergunta simples leva " +
  "1 a 2 frases; pergunta que precisa de números, porções ou comparação " +
  "leva no máximo 4 a 5 frases. Nunca estique a resposta só por estilo — " +
  "ninguém aguenta textão de nutricionista. Nunca use formatação markdown: sem **negrito**, sem " +
  "asteriscos, sem listas com marcadores (* ou -), sem títulos com #. " +
  "Escreva só em texto corrido, como uma mensagem de WhatsApp. Não escreva " +
  "em inglês nem misture idiomas. Termine sempre a ideia — nunca pare a " +
  "frase no meio.";

const GEMINI_MODEL = "gemini-flash-latest";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request, env) {
    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST, parceiro." }, 405);
    }

    if (!env.GEMINI_API_KEY) {
      return json(
        { error: "Chave da API não configurada no servidor." },
        500
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "JSON inválido." }, 400);
    }

    const message = (payload.message || "").toString().trim();
    if (!message) {
      return json({ error: "Manda uma mensagem que aí eu respondo." }, 400);
    }

    // Histórico opcional vindo do frontend (memória da sessão).
    // Cada item: { role: "user" | "model", text: "..." }
    const history = Array.isArray(payload.history) ? payload.history : [];

    const contents = [
      ...history
        .filter((h) => h && (h.role === "user" || h.role === "model") && h.text)
        .slice(-12) // limita o contexto pra não estourar tokens/custo
        .map((h) => ({ role: h.role, parts: [{ text: String(h.text) }] })),
      { role: "user", parts: [{ text: message }] },
    ];

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 },
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      ],
    };

    let geminiResp;
    try {
      geminiResp = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    } catch {
      return json({ error: "Não consegui falar com a IA agora. Tenta de novo." }, 502);
    }

    if (!geminiResp.ok) {
      // Não vaza detalhes da API pro cliente; loga internamente.
      const detail = await geminiResp.text().catch(() => "");
      console.error("Gemini error", geminiResp.status, detail);
      const busy = geminiResp.status === 503;
      return json(
        {
          error: busy
            ? "Tá engasgado de tanta gente perguntando. Espera uns segundos e tenta de novo."
            : "A IA travou. Tenta de novo daqui a pouco.",
        },
        502
      );
    }

    const data = await geminiResp.json().catch(() => null);
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Deu branco aqui. Repete a pergunta?";

    return json({ reply });
  },
};
