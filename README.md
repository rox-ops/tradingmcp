# tradingmcp

Automated MCP trading bot using Bun, Zerodha (Kite Connect), and an LLM strategy with rules-based guardrails.

See [MODULES.md](./MODULES.md) for a plain-English explanation of every module in this project.

## Overview
- Runs an MCP server exposing market data and order execution tools.
- Optional bot loop for fully automated trading.
- LLM-driven signals with safety checks (order size, position limits, trading window).

## Requirements
- Bun
- Zerodha Kite Connect API key and access token
- LLM API compatible with OpenAI-style chat completions

## Setup
1. Install dependencies: `bun install`
2. Copy [.env.example](.env.example) to `.env` and fill in values.

## Run
- Start MCP server: `bun src/index.js`
- Run MCP server + bot loop: set `RUN_BOT=true` and run `bun src/index.js`

## MCP Tools
- `market_quote`: get a quote for a symbol like `NSE:INFY`
- `get_positions`: retrieve current positions
- `place_order`: submit a market or limit order

## Safety
The bot loop respects `DRY_RUN`, `MAX_ORDER_QTY`, `MAX_POSITION_QTY`, `ALLOWED_SYMBOLS`, and trading window env vars.
Keep `DRY_RUN=true` until you are ready to trade live.