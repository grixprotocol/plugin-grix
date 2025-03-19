import {
    type Action,
    elizaLogger,
    generateObjectDeprecated,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
  } from "@elizaos/core";
  import { GrixService } from "../services";
  import { validateGrixConfig } from "../environment";
  
  const perpsPairsTemplate = `Extract the protocol and optional base asset from the user's request.
  If protocol is not specified, default to "Hyperliquid".
  
  Examples of user requests and their parameters:
  - "What trading pairs are available on Hyperliquid?" -> {"protocol": "Hyperliquid"}
  - "Show me Synthetix pairs for BTC" -> {"protocol": "synthetix", "baseAsset": "BTC"}
  - "What are the available pairs on Hyperliquid for ETH?" -> {"protocol": "Hyperliquid", "baseAsset": "ETH"}
  - "List all Hyperliquid trading pairs" -> {"protocol": "hyperliquid"}
  
  Look for these indicators:
  - Protocol: Hyperliquid, synthetix, hyperliquid, etc.
  - Base assets: BTC, ETH, etc.
  
  User's request: "{{recentMessages}}"
  
  Return ONLY a JSON object with the parameters:
  {
      "protocol": "protocol_name",
      "baseAsset": "ASSET_SYMBOL" (optional)
  }`;
  
  export const getPerpsPairsAction: Action = {
    name: "GET_PERP_PAIRS",
    similes: [
      "FETCH_TRADING_PAIRS", 
      "LIST_PAIRS", 
      "SHOW_PERP_PAIRS", 
      "MARKET_PAIRS",
      "AVAILABLE_PAIRS",
      "TRADING_PAIRS",
      "WHAT_CAN_I_TRADE",
      "PERPETUAL_PAIRS"
    ],
    description: "Get available perpetual trading pairs for a protocol",
    validate: async (runtime: IAgentRuntime) => {
      try {
        await validateGrixConfig(runtime);
        return true;
      } catch {
        return false;
      }
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      _options?: { [key: string]: unknown },
      callback?: HandlerCallback
    ): Promise<boolean> => {
      try {
        elizaLogger.warn("🚀 Starting getPerpPairs handler");
  
        const config = await validateGrixConfig(runtime);
        const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });
  
        const extractedParams = await generateObjectDeprecated({
          runtime,
          context: perpsPairsTemplate.replace("{{recentMessages}}", message.content.text),
          modelClass: ModelClass.SMALL,
        });
  
        elizaLogger.warn("🎯 Extracted parameters:", extractedParams);
  
        const normalizedParams = {
          protocolName: (extractedParams.protocol || "Hyperliquid").toLowerCase(),
          asset: extractedParams.baseAsset,
        };
  
        elizaLogger.warn("🔄 Normalized parameters:", normalizedParams);
  
        
        const result = await grixService.getPerpsPairs(normalizedParams);
  
        if (callback) {
          let responseText = `Available trading pairs for ${normalizedParams.protocolName.toUpperCase()}`;
          if (normalizedParams.asset) {
            responseText += ` with ${normalizedParams.asset}`;
          }
          responseText += ":\n";
          
          result.pairs.forEach((pair: any) => {
            responseText += `- ${pair.baseAsset}/${pair.quoteAsset}\n`;
          });
          
          await callback({
            text: responseText,
          });
        }
  
        if (state) {
          let formattedPairs = "";
          result.pairs.forEach((pair: any) => {
            formattedPairs += `- ${pair.baseAsset}/${pair.quoteAsset}\n`;
          });
          state.responseData = { text: formattedPairs, action: "GET_PERP_PAIRS" };
        }
  
        return true;
      } catch (error) {
        elizaLogger.error("Error in GET_PERP_PAIRS action:", error);
        if (callback) {
          await callback({
            text: `Sorry, I couldn't fetch the trading pairs. Error: ${error}`,
          });
        }
        return false;
      }
    },
    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: "What trading pairs are available on Hyperliquid?",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "I'll check the available pairs on Hyperliquid for you.",
            action: "GET_PERP_PAIRS",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "Available trading pairs for Hyperliquid:\n- BTC/USD\n- ETH/USD\n- LINK/USD",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            text: "Show me Synthetix pairs for ETH",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "I'll fetch the Synthetix pairs for ETH.",
            action: "GET_PERP_PAIRS",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "Available trading pairs for SYNTHETIX with ETH:\n- ETH/USD\n- ETH/EUR",
          },
        },
      ],
    ],
  };