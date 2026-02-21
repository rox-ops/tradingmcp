import { getEnv, getNumberEnv, requireEnv } from "../utils/env.js";

function buildPrompt({ symbol, quote }) {
  return {
    symbol,
    lastPrice: quote?.last_price,
    change: quote?.net_change,
    changePercent: quote?.change,
    timestamp: quote?.timestamp
  };
}

function defaultDecision(symbol) {
  return {
    symbol,
    action: "HOLD",
    qty: 0,
    orderType: "MARKET",
    price: null,
    rationale: "no_signal"
  };
}

export async function decideTrade({ symbol, quote }) {
  const apiUrl = requireEnv("LLM_API_URL");
  const apiKey = requireEnv("LLM_API_KEY");
  const model = getEnv("LLM_MODEL", "gpt-4o-mini");
  const defaultQty = getNumberEnv("DEFAULT_ORDER_QTY", 1);

  const promptData = buildPrompt({ symbol, quote });
  const system =
    "You are an automated trading signal engine. " +
    "Return ONLY valid JSON with fields: action (BUY|SELL|HOLD), qty (number), orderType (MARKET|LIMIT), price (number|null), rationale (string).";

  const user = `Market snapshot:\n${JSON.stringify(promptData)}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    return defaultDecision(symbol);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return defaultDecision(symbol);
  }

  try {
    const parsed = JSON.parse(content);
    const action = String(parsed.action || "HOLD").toUpperCase();
    const qty = Number(parsed.qty ?? defaultQty);

    if (!Number.isFinite(qty) || qty <= 0) {
      return defaultDecision(symbol);
    }

    return {
      symbol,
      action: action === "BUY" || action === "SELL" ? action : "HOLD",
      qty,
      orderType: parsed.orderType || "MARKET",
      price: parsed.price ?? null,
      rationale: parsed.rationale || ""
    };
  } catch {
    return defaultDecision(symbol);
  }
}
