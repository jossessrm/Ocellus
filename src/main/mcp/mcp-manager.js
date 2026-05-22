/**
 * MCP server manager. Owns the Express/SSE transport setup and port listener.
 * Imports launchCommodityMarketMCP() from commodity-market.js to register the tools.
 */

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { launchCommodityMarketMCP } from "./commodity-market.js";

/**
 * Starts the MCP server over SSE transport on the given port.
 * @param {number} [port=3000] - The HTTP port to listen on.
 */
export async function startMCPServer(port) {
  const PORT = port || parseInt(process.env.PORT, 10) || 3000;
  const app = express();
  app.use(express.json());

  // Map to track active SSE sessions
  const transports = new Map(); // sessionId -> SSEServerTransport

  // SSE endpoint - establishes the SSE connection
  app.get("/sse", async (req, res) => {
    try {
      const transport = new SSEServerTransport("/messages", res);
      transports.set(transport.sessionId, transport);

      // Clean up when connection closes
      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };

      const server = await launchCommodityMarketMCP();
      await server.connect(transport);
    } catch (error) {
      console.error("SSE connection error:", error);
      res.status(500).end("Internal Server Error");
    }
  });

  // Message endpoint - handles MCP JSON-RPC messages
  app.post("/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId;
      if (!sessionId) {
        res.status(400).end("Missing sessionId query parameter");
        return;
      }

      const transport = transports.get(sessionId);
      if (!transport) {
        res.status(400).end("Unknown sessionId");
        return;
      }

      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error("Message handling error:", error);
      res.status(500).end("Internal Server Error");
    }
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`Ocellus SSE server listening on http://localhost:${PORT}`);
    console.log(`Connect to /sse to establish SSE stream, then POST messages to /messages?sessionId=<id>`);
  });
}
