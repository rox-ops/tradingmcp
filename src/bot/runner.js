import { decideTrade } from "../strategy/index.js";
import { applyRiskControls } from "../risk/controls.js";
import { getBoolEnv, getEnv, getNumberEnv } from "../utils/env.js";

function parseWatchlist() {
  const raw = getEnv("WATCHLIST", "");
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function handleDecision(client, decision, positions) {
  const risk = applyRiskControls(decision, { positions });
  if (!risk.allowed) {
    return { skipped: true, reason: risk.reason };
  }

  if (getBoolEnv("DRY_RUN", true)) {
    return { skipped: true, reason: "dry_run" };
  }

  const order = {
    symbol: decision.symbol,
    side: decision.action,
    qty: decision.qty,
    orderType: decision.orderType,
    price: decision.price
  };

  const orderId = await client.placeOrder(order);
  return { skipped: false, orderId };
}

export function startBotLoop({ client }) {
  const intervalMs = getNumberEnv("BOT_INTERVAL_MS", 60000);
  const watchlist = parseWatchlist();

  if (!watchlist.length) {
    throw new Error("WATCHLIST is required to run the bot loop.");
  }

  const runOnce = async () => {
    const positions = await client.getPositions();

    for (const symbol of watchlist) {
      const quote = await client.getQuote(symbol);
      const decision = await decideTrade({ symbol, quote });
      const result = await handleDecision(client, decision, positions);

      const message = {
        symbol,
        decision,
        result
      };

      console.log(JSON.stringify(message));
    }
  };

  runOnce();
  setInterval(runOnce, intervalMs);
}
