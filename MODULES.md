# Module Guide

A plain-English tour of every file in `src/` so you can understand how the pieces fit together.

---

## How the whole system fits together

```
index.js
  ├── brokers/zerodha.js  ← talks to Zerodha to get prices & place orders
  ├── mcp/server.js       ← exposes tools so an AI assistant can call them
  └── bot/runner.js       ← runs automatically on a timer (optional)
        ├── strategy/index.js  ← asks an LLM "should I buy, sell, or hold?"
        └── risk/controls.js   ← safety checks before any order is sent

utils/env.js              ← reads settings from the .env file
```

---

## `src/index.js` — The Starting Point

This is the first file that runs when you do `bun src/index.js`.

It does three things in order:
1. Creates a connection to Zerodha (the broker).
2. Starts the MCP server so tools are available to an AI assistant.
3. If the `RUN_BOT` setting is `true`, also starts the automated trading loop.

Think of it as the **on switch** for the whole application.

---

## `src/brokers/zerodha.js` — The Broker Connector

This module is how the app talks to your **Zerodha** brokerage account using their Kite Connect API.

It provides three actions:

| Action | What it does |
|---|---|
| `getQuote(symbol)` | Fetches the latest price for a stock, e.g. `NSE:INFY`. |
| `getPositions()` | Returns all stocks you currently hold in your account. |
| `placeOrder(order)` | Sends a buy or sell order to the exchange. |

It also handles the `"NSE:INFY"` → `{ exchange: "NSE", tradingsymbol: "INFY" }` conversion automatically, so the rest of the code doesn't need to worry about it.

Your **API key** and **access token** (from `.env`) are required here — without them the app will refuse to start.

---

## `src/mcp/server.js` — The MCP Server

**MCP** stands for *Model Context Protocol*. It is a standard way for an AI assistant (like Claude or a GPT-based tool) to call external functions in a structured way.

This module starts a server that advertises three **tools** that any MCP-compatible AI client can call:

| Tool | What it does |
|---|---|
| `market_quote` | Returns the live price of a stock symbol. |
| `get_positions` | Returns your current open positions. |
| `place_order` | Places a buy or sell order. |

Think of it as a **plugin** that lets an AI assistant interact with your brokerage account through a safe, well-defined interface.

The server communicates over **standard input/output (stdio)**, which is the normal transport for MCP servers.

---

## `src/bot/runner.js` — The Automated Bot Loop

This module runs on a timer (every 60 seconds by default, set via `BOT_INTERVAL_MS`) and automates the whole trading cycle without any human involvement.

Each time the timer fires it:
1. Gets your current positions from Zerodha.
2. For every symbol on your **watchlist**, fetches the latest price.
3. Sends the price to the **strategy** module and asks "should I trade?".
4. Passes the strategy's answer through **risk controls**.
5. If everything passes, places a real order (or just logs it in dry-run mode).

It only activates when `RUN_BOT=true` is set in your `.env` file.

---

## `src/strategy/index.js` — The AI Trading Strategy

This module is the "brain" that decides whether to **BUY**, **SELL**, or **HOLD** a stock.

It works by:
1. Taking the latest price data for a symbol.
2. Sending it to a **Large Language Model (LLM)** (e.g. GPT-4o-mini) via an HTTP request.
3. Asking the LLM to respond with a structured JSON decision.
4. Parsing the JSON and returning a decision object like:

```json
{
  "symbol": "NSE:INFY",
  "action": "BUY",
  "qty": 1,
  "orderType": "MARKET",
  "price": null,
  "rationale": "Momentum looks positive"
}
```

If the LLM is unavailable or returns something unreadable, it safely falls back to a `HOLD` decision so no unintended trades are placed.

---

## `src/risk/controls.js` — The Safety Guard

Before any order is actually placed, it must pass through this module. It acts as a **gatekeeper** that blocks trades that break your configured limits.

It checks, in order:

| Check | What it prevents |
|---|---|
| `HOLD` action | Doesn't block, just skips — no order needed. |
| Symbol allowlist | Stops trading on symbols not in `ALLOWED_SYMBOLS`. |
| Trading window | Stops trading outside `TRADING_START_HHMM`–`TRADING_END_HHMM`. |
| Max order size | Blocks any single order larger than `MAX_ORDER_QTY` shares. |
| Max position size | Blocks orders that would push your total holding above `MAX_POSITION_QTY`. |

If any check fails it returns `{ allowed: false, reason: "..." }` and the bot skips the order entirely. This protects you from accidental over-trading.

---

## `src/utils/env.js` — The Settings Reader

A small helper that reads values from environment variables (your `.env` file).

It provides four functions:

| Function | What it does |
|---|---|
| `requireEnv(name)` | Returns the value, or **crashes** if it is missing. Use for critical keys. |
| `getEnv(name, fallback)` | Returns the value, or a **default** if it is missing. |
| `getBoolEnv(name, fallback)` | Same as `getEnv` but converts `"true"` / `"false"` to a real boolean. |
| `getNumberEnv(name, fallback)` | Same as `getEnv` but converts the string to a number. |

Every other module uses these helpers so that settings are always read in a consistent, safe way.

---

## Configuration Quick Reference

All settings live in your `.env` file (copy `.env.example` to get started).

| Variable | Module that uses it | What it controls |
|---|---|---|
| `ZERODHA_API_KEY` | `brokers/zerodha.js` | Your Zerodha API key |
| `ZERODHA_ACCESS_TOKEN` | `brokers/zerodha.js` | Your Zerodha session token |
| `LLM_API_URL` | `strategy/index.js` | URL of the LLM API endpoint |
| `LLM_API_KEY` | `strategy/index.js` | API key for the LLM |
| `LLM_MODEL` | `strategy/index.js` | Which LLM model to use |
| `RUN_BOT` | `index.js` | Set `true` to enable the automated bot loop |
| `DRY_RUN` | `bot/runner.js` | Set `true` to log orders without sending them |
| `WATCHLIST` | `bot/runner.js` | Comma-separated list of symbols to monitor |
| `BOT_INTERVAL_MS` | `bot/runner.js` | How often the bot runs (milliseconds) |
| `DEFAULT_ORDER_QTY` | `strategy/index.js` | Default number of shares per order |
| `MAX_ORDER_QTY` | `risk/controls.js` | Maximum shares allowed in one order |
| `MAX_POSITION_QTY` | `risk/controls.js` | Maximum total shares allowed per symbol |
| `ALLOWED_SYMBOLS` | `risk/controls.js` | Comma-separated allowlist of tradeable symbols |
| `TRADING_START_HHMM` | `risk/controls.js` | Earliest time to trade (e.g. `09:20`) |
| `TRADING_END_HHMM` | `risk/controls.js` | Latest time to trade (e.g. `15:20`) |
| `ORDER_PRODUCT` | `brokers/zerodha.js` | Product type (`MIS` for intraday, `CNC` for delivery) |
| `ORDER_VALIDITY` | `brokers/zerodha.js` | Order validity (`DAY` or `IOC`) |
| `DEFAULT_EXCHANGE` | `brokers/zerodha.js` | Exchange to use when not specified in a symbol |
