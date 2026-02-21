import { createZerodhaClient } from "./brokers/zerodha.js";
import { startBotLoop } from "./bot/runner.js";
import { startMcpServer } from "./mcp/server.js";
import { getBoolEnv } from "./utils/env.js";

const client = createZerodhaClient();

await startMcpServer({ client });

if (getBoolEnv("RUN_BOT", false)) {
  startBotLoop({ client });
}
