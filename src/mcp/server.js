import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

export async function startMcpServer({ client }) {
  const server = new Server(
    {
      name: "tradingmcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "market_quote",
        description: "Get a market quote for a symbol like NSE:INFY",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string" }
          },
          required: ["symbol"]
        }
      },
      {
        name: "get_positions",
        description: "Get current positions",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "place_order",
        description: "Place a market or limit order",
        inputSchema: {
          type: "object",
          properties: {
            symbol: { type: "string" },
            side: { type: "string", enum: ["BUY", "SELL"] },
            qty: { type: "number" },
            orderType: { type: "string", enum: ["MARKET", "LIMIT"] },
            price: { type: ["number", "null"] }
          },
          required: ["symbol", "side", "qty"]
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "market_quote") {
      const quote = await client.getQuote(args.symbol);
      return {
        content: [{ type: "text", text: JSON.stringify(quote, null, 2) }]
      };
    }

    if (name === "get_positions") {
      const positions = await client.getPositions();
      return {
        content: [{ type: "text", text: JSON.stringify(positions, null, 2) }]
      };
    }

    if (name === "place_order") {
      const orderId = await client.placeOrder({
        symbol: args.symbol,
        side: args.side,
        qty: args.qty,
        orderType: args.orderType,
        price: args.price
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ orderId }) }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
