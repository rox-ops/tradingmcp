import { getEnv, getNumberEnv } from "../utils/env.js";

function parseAllowedSymbols() {
  const raw = getEnv("ALLOWED_SYMBOLS", "");
  if (!raw) {
    return null;
  }
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function withinTradingWindow(now, start, end) {
  if (!start || !end) {
    return true;
  }
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

function netPositionForSymbol(positions, symbol) {
  if (!positions || !positions.net) {
    return 0;
  }
  const match = positions.net.find(
    (pos) => `${pos.exchange}:${pos.tradingsymbol}` === symbol
  );
  return match ? match.quantity : 0;
}

export function applyRiskControls(decision, context) {
  const allowedSymbols = parseAllowedSymbols();
  const maxOrderQty = getNumberEnv("MAX_ORDER_QTY", 1);
  const maxPositionQty = getNumberEnv("MAX_POSITION_QTY", 5);
  const start = getEnv("TRADING_START_HHMM", "");
  const end = getEnv("TRADING_END_HHMM", "");

  if (decision.action === "HOLD") {
    return { allowed: false, reason: "hold" };
  }

  if (allowedSymbols && !allowedSymbols.has(decision.symbol)) {
    return { allowed: false, reason: "symbol_not_allowed" };
  }

  if (!withinTradingWindow(new Date(), start, end)) {
    return { allowed: false, reason: "outside_trading_window" };
  }

  if (decision.qty > maxOrderQty) {
    return { allowed: false, reason: "max_order_qty" };
  }

  const netQty = netPositionForSymbol(context.positions, decision.symbol);
  if (Math.abs(netQty + decision.qty) > maxPositionQty) {
    return { allowed: false, reason: "max_position_qty" };
  }

  return { allowed: true };
}
