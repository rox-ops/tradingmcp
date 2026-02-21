import { KiteConnect } from "kiteconnect";
import { getEnv, requireEnv } from "../utils/env.js";

function parseSymbol(symbol) {
  const parts = symbol.split(":");
  if (parts.length === 2) {
    return { exchange: parts[0], tradingsymbol: parts[1] };
  }
  return { exchange: getEnv("DEFAULT_EXCHANGE", "NSE"), tradingsymbol: symbol };
}

export function createZerodhaClient() {
  const apiKey = requireEnv("ZERODHA_API_KEY");
  const accessToken = requireEnv("ZERODHA_ACCESS_TOKEN");
  const client = new KiteConnect({ api_key: apiKey });
  client.setAccessToken(accessToken);

  async function getQuote(symbol) {
    const response = await client.getQuote([symbol]);
    return response[symbol];
  }

  async function getPositions() {
    return client.getPositions();
  }

  async function placeOrder(order) {
    const { exchange, tradingsymbol } = parseSymbol(order.symbol);
    const orderType = order.orderType || "MARKET";
    const product = order.product || getEnv("ORDER_PRODUCT", "MIS");
    const validity = order.validity || getEnv("ORDER_VALIDITY", "DAY");

    return client.placeOrder("regular", {
      exchange,
      tradingsymbol,
      transaction_type: order.side,
      quantity: order.qty,
      order_type: orderType,
      product,
      validity,
      price: order.price,
      trigger_price: order.triggerPrice,
      disclosed_quantity: order.disclosedQty
    });
  }

  return {
    getQuote,
    getPositions,
    placeOrder
  };
}
