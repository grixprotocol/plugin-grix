// src/actions/getAssetPrice.ts
import {
  elizaLogger as elizaLogger6,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/services/base.ts
import { elizaLogger } from "@elizaos/core";
import { GrixSDK } from "@grixprotocol/sdk";

// src/constants/api.ts
var API_DEFAULTS = {
  BASE_URL: "https://api.grix.finance",
  TIMEOUT: 3e4,
  // 30 seconds
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 100,
    WEIGHT_PER_REQUEST: 1
  }
};
var OPTION_TYPES = {
  CALL: "call",
  PUT: "put"
};
var POSITION_TYPES = {
  LONG: "long",
  SHORT: "short"
};
var ASSET_TYPES = {
  BTC: "BTC",
  ETH: "ETH"
};
var PERPS_PROTOCOLS = {
  HYPERLIQUID: "hyperliquid"
};

// src/types/error.ts
var GrixError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "GrixError";
  }
};
var AuthenticationError = class extends GrixError {
  constructor(message = "Authentication failed. Please check your API credentials.") {
    super(message);
    this.name = "AuthenticationError";
  }
};
var InvalidParameterError = class extends GrixError {
  constructor(message) {
    super(message);
    this.name = "InvalidParameterError";
  }
};
var ApiError = class extends GrixError {
  constructor(message, code, response) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.response = response;
  }
};

// src/services/base.ts
var BaseService = class {
  constructor(options) {
    this.sdk = null;
    this.apiKey = options?.apiKey;
    this.timeout = options?.timeout || API_DEFAULTS.TIMEOUT;
  }
  /**
   * Initialize the SDK instance if needed
   */
  async getSDK() {
    elizaLogger.info("\u{1F50C} Initializing Grix SDK...");
    if (!this.sdk) {
      this.validateApiKey();
      try {
        elizaLogger.info("Creating new SDK instance...");
        this.sdk = await GrixSDK.initialize({
          apiKey: this.apiKey
        });
        elizaLogger.info("\u2705 SDK initialized successfully");
      } catch (error) {
        elizaLogger.error("\u274C SDK initialization failed:", error);
        throw this.handleError(error, "SDK initialization");
      }
    }
    return this.sdk;
  }
  /**
   * Validate API key presence
   */
  validateApiKey() {
    if (!this.apiKey) {
      throw new AuthenticationError();
    }
  }
  /**
   * Standardized error handling for service errors
   */
  handleError(error, context) {
    elizaLogger.error(`\u{1F6A8} Error in ${context || "unknown context"}:`, error);
    if (error instanceof GrixError || error instanceof Error) {
      return error;
    }
    const message = error?.toString() || "Unknown error";
    const contextStr = context ? ` during ${context}` : "";
    return new ApiError(`Grix API error${contextStr}: ${message}`, 500);
  }
};

// src/constants/errors.ts
var ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid API credentials. Please check your API key.",
  INVALID_ASSET: "Invalid asset. Only BTC and ETH are supported.",
  INVALID_OPTION_TYPE: "Invalid option type. Only 'call' and 'put' are supported.",
  INVALID_POSITION_TYPE: "Invalid position type. Only 'long' and 'short' are supported.",
  SERVICE_UNAVAILABLE: "The Grix service is currently unavailable. Please try again later.",
  OPTION_FETCH_ERROR: (asset) => `Failed to fetch options data for ${asset}`,
  PRICE_FETCH_ERROR: (asset) => `Failed to fetch price for ${asset}`,
  PERPS_PAIRS_FETCH_ERROR: (protocolName) => `Failed to fetch perps pairs for ${protocolName}`,
  INVALID_PROTOCOL: (protocolName) => `Invalid protocol. Only ${protocolName} is supported.`
};

// src/services/price.ts
var PriceService = class extends BaseService {
  constructor(options) {
    super(options);
  }
  /**
   * Get current price for a cryptocurrency
   */
  async getPrice(request) {
    try {
      this.validateAsset(request.asset);
      const sdk = await this.getSDK();
      const assetName = request.asset.toLowerCase() === "btc" ? "bitcoin" : "ethereum";
      const price = await sdk.fetchAssetPrice(assetName);
      return {
        asset: request.asset.toUpperCase(),
        price,
        formattedPrice: this.formatPrice(price),
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error, `price fetch for ${request.asset}`);
    }
  }
  /**
   * Validate asset is supported
   */
  validateAsset(asset) {
    const normalizedAsset = asset.toUpperCase();
    const validAssets = Object.values(ASSET_TYPES);
    if (!validAssets.includes(normalizedAsset)) {
      throw new InvalidParameterError(ERROR_MESSAGES.INVALID_ASSET);
    }
  }
  /**
   * Format price for display
   */
  formatPrice(price) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(price);
  }
};

// src/services/option.ts
import { UnderlyingAsset, OptionType } from "@grixprotocol/sdk";
import { elizaLogger as elizaLogger2 } from "@elizaos/core";
var _OptionService = class _OptionService extends BaseService {
  // 1 minute cache
  constructor(options) {
    super(options);
    this.optionsCache = [];
    this.lastFetchTime = 0;
  }
  /**
   * Get option data for a cryptocurrency
   */
  async getOptions(request) {
    try {
      elizaLogger2.warn("\u{1F680} Starting getOptions with request:", {
        ...request,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      const sdk = await this.getSDK();
      const asset = request.asset.toUpperCase() === "BTC" ? UnderlyingAsset.BTC : UnderlyingAsset.ETH;
      const optionType = request.optionType === "call" ? OptionType.call : OptionType.put;
      const positionType = request.positionType === "long" ? "long" : "short";
      if (this.shouldRefreshCache()) {
        elizaLogger2.warn("\u{1F4E1} Fetching options data for asset:", asset);
        const response2 = await sdk.getOptionsMarketBoard({
          asset,
          optionType,
          positionType
        });
        elizaLogger2.warn("\u{1F4E5} Received response array:", response2);
        const transformedOptions = this.transformOptionsData(response2);
        elizaLogger2.warn("\u{1F504} Transformed options count:", transformedOptions.length);
        this.optionsCache = transformedOptions.map((opt) => ({
          optionId: opt.optionId,
          symbol: asset,
          type: opt.type,
          expiry: opt.expiry,
          strike: opt.strike,
          protocol: opt.protocol,
          marketName: opt.protocol,
          contractPrice: opt.price,
          availableAmount: opt.available.toString()
        }));
        elizaLogger2.info(
          "\u{1F4BE} Updated cache with options:",
          JSON.stringify(this.optionsCache, null, 2)
        );
        this.lastFetchTime = Date.now();
      }
      elizaLogger2.info("\u{1F50D} Starting options filtering...");
      let filteredOptions = this.optionsCache;
      if (request.optionType) {
        elizaLogger2.info(`Filtering by option type: ${request.optionType}`);
        filteredOptions = filteredOptions.filter(
          (opt) => opt.type.toLowerCase() === request.optionType?.toLowerCase()
        );
      }
      elizaLogger2.info(`\u2728 Final filtered options count: ${filteredOptions.length}`);
      elizaLogger2.info("\u{1F4E4} Returning options response");
      const response = {
        asset: request.asset,
        optionType: request.optionType || "all",
        formattedOptions: this.formatOptionsResponse(filteredOptions),
        options: filteredOptions.map((opt) => ({
          optionId: opt.optionId,
          expiry: opt.expiry,
          strike: opt.strike,
          price: opt.contractPrice,
          protocol: opt.protocol,
          available: parseFloat(opt.availableAmount),
          type: opt.type
        })),
        timestamp: Date.now()
      };
      elizaLogger2.warn("\u{1F4E6} Final response summary:", {
        asset: request.asset,
        optionType: request.optionType || "all",
        optionsCount: filteredOptions.length
      });
      return response;
    } catch (error) {
      elizaLogger2.error("\u274C Error:", error);
      throw this.handleError(error, "options fetch");
    }
  }
  shouldRefreshCache() {
    return Date.now() - this.lastFetchTime > _OptionService.CACHE_DURATION;
  }
  // Helper methods for querying cached data
  async getExpiryDates() {
    const uniqueExpiries = [...new Set(this.optionsCache.map((opt) => opt.expiry))];
    return uniqueExpiries.sort();
  }
  async getStrikePrices(expiry) {
    let options = this.optionsCache;
    if (expiry) {
      options = options.filter((opt) => opt.expiry === expiry);
    }
    const uniqueStrikes = [...new Set(options.map((opt) => opt.strike))];
    return uniqueStrikes.sort((a, b) => a - b);
  }
  async getProtocols() {
    return [...new Set(this.optionsCache.map((opt) => opt.protocol))];
  }
  /**
   * Validate option request parameters
   */
  validateRequest(request) {
    elizaLogger2.info("\u{1F50D} Validating option request:", request);
    const normalizedAsset = request.asset.toUpperCase();
    elizaLogger2.info("Validating asset:", normalizedAsset);
    const validAssets = Object.values(ASSET_TYPES);
    if (!validAssets.includes(normalizedAsset)) {
      elizaLogger2.error("\u274C Invalid asset:", normalizedAsset);
      throw new InvalidParameterError(ERROR_MESSAGES.INVALID_ASSET);
    }
    const normalizedOptionType = request.optionType.toLowerCase();
    elizaLogger2.info("Validating option type:", normalizedOptionType);
    const validOptionTypes = Object.values(OPTION_TYPES);
    if (!validOptionTypes.includes(normalizedOptionType)) {
      elizaLogger2.error("\u274C Invalid option type:", normalizedOptionType);
      throw new InvalidParameterError(ERROR_MESSAGES.INVALID_OPTION_TYPE);
    }
    if (request.positionType) {
      const normalizedPositionType = request.positionType.toLowerCase();
      const validPositionTypes = Object.values(POSITION_TYPES);
      if (!validPositionTypes.includes(normalizedPositionType)) {
        throw new InvalidParameterError(ERROR_MESSAGES.INVALID_POSITION_TYPE);
      }
    }
    elizaLogger2.info("\u2705 Request validation successful");
  }
  /**
   * Transform raw options data into standardized format
   */
  transformOptionsData(apiResponse) {
    elizaLogger2.warn("\u{1F504} Starting options data transformation");
    if (!Array.isArray(apiResponse)) {
      elizaLogger2.warn("\u26A0\uFE0F Response is not an array");
      return [];
    }
    elizaLogger2.warn(`\u{1F4CA} Processing ${apiResponse.length} options`);
    const options = apiResponse.map((option) => ({
      expiry: option.expiry,
      strike: option.strike,
      price: option.contractPrice,
      protocol: option.protocol,
      available: parseFloat(option.availableAmount),
      type: option.type,
      optionId: option.optionId
    }));
    elizaLogger2.warn(`\u2705 Transformed ${options.length} options successfully`);
    return options;
  }
  formatOptionSymbol(option) {
    const date = new Date(option.expiry);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = date.getFullYear().toString().slice(-2);
    const type = option.type.charAt(0);
    return `${option.symbol}-${day}${month}${year}-${option.strike}-${type}`;
  }
  formatOptionsResponse(options) {
    if (options.length === 0) {
      return "No options available";
    }
    const groupedByExpiry = options.reduce((acc, opt) => {
      const expiry = opt.expiry;
      if (!acc[expiry]) {
        acc[expiry] = [];
      }
      acc[expiry].push(opt);
      return acc;
    }, {});
    let response = "";
    Object.entries(groupedByExpiry).forEach(([expiry, expiryOptions]) => {
      response += `
Expiry: ${expiry}
`;
      expiryOptions.forEach((option) => {
        const symbol = this.formatOptionSymbol(option);
        response += `
${symbol}
`;
        response += `Protocol: ${option.protocol}
`;
        response += `Available: ${option.availableAmount} contracts
`;
        response += `Price: $${option.contractPrice.toLocaleString()}
`;
        response += `------------------------
`;
      });
    });
    return response.trim();
  }
};
_OptionService.CACHE_DURATION = 6e4;
var OptionService = _OptionService;

// src/services/signal.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
var _SignalService = class _SignalService extends BaseService {
  // 2 seconds
  constructor(options) {
    super(options);
  }
  async waitForSignals(agentId) {
    let retries = 0;
    while (retries < _SignalService.MAX_RETRIES) {
      const result = await this.getSDK().then(
        (sdk) => sdk.getTradeSignals({ agentId: agentId.toString() })
      );
      const signalRequest = result.personalAgents[0]?.signal_requests[0];
      if (signalRequest?.progress === "completed" && signalRequest?.signals?.length > 0) {
        elizaLogger3.info("Signals generated successfully");
        return result;
      }
      elizaLogger3.info(
        `Waiting for signals... (attempt ${retries + 1}/${_SignalService.MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, _SignalService.RETRY_DELAY));
      retries++;
    }
    throw new Error("Timeout waiting for signals");
  }
  /**
   * Generate trading signals based on configuration
   */
  async generateSignals(request) {
    try {
      elizaLogger3.info("Generating trading signals for request:", request);
      this.validateRequest(request);
      const sdk = await this.getSDK();
      const createRequest = {
        ownerAddress: "default",
        config: {
          ..._SignalService.DEFAULT_AGENT_CONFIG,
          signal_request_config: {
            ..._SignalService.DEFAULT_AGENT_CONFIG.signal_request_config,
            budget_usd: request.budget_usd.toString(),
            assets: [request.asset],
            trade_window_ms: request.trade_window_ms
          }
        }
      };
      elizaLogger3.info(
        "Creating trade agent with request:",
        JSON.stringify(createRequest, null, 2)
      );
      const { agentId } = await sdk.createTradeAgent(createRequest);
      elizaLogger3.info("Created trade agent with ID:", agentId);
      const signalRequest = {
        config: {
          budget_usd: request.budget_usd.toString(),
          assets: [request.asset],
          trade_window_ms: request.trade_window_ms,
          context_window_ms: 6048e5,
          input_data: ["marketData", "assetPrices"],
          protocols: ["derive", "aevo", "premia", "moby", "ithaca", "zomma", "deribit"],
          user_prompt: `Generate ${request.risk_level} ${request.strategy_focus} strategies`
        }
      };
      elizaLogger3.info("Requesting trade agent signals with:", {
        agentId,
        request: JSON.stringify(signalRequest, null, 2)
      });
      await sdk.requestTradeAgentSignals(Number(agentId), signalRequest);
      elizaLogger3.info("Successfully requested signals for agent:", agentId);
      const result = await this.waitForSignals(agentId);
      const allSignals = result.personalAgents[0].signal_requests[0].signals;
      return {
        signals: allSignals.map((s) => ({
          id: s.id,
          action_type: s.signal.action_type,
          position_type: s.signal.position_type,
          instrument: s.signal.instrument,
          instrument_type: s.signal.instrument_type,
          size: s.signal.size,
          expected_instrument_price_usd: s.signal.expected_instrument_price_usd,
          expected_total_price_usd: s.signal.expected_total_price_usd,
          reason: s.signal.reason,
          target_position_id: s.signal.target_position_id,
          created_at: s.created_at,
          updated_at: s.updated_at
        })),
        timestamp: Date.now()
      };
    } catch (error) {
      elizaLogger3.error("Error generating signals:", error);
      throw this.handleError(error, `signal generation for ${request.asset}`);
    }
  }
  /**
   * Validate trading signal request parameters
   */
  validateRequest(request) {
    const normalizedAsset = request.asset.toUpperCase();
    const validAssets = Object.values(ASSET_TYPES);
    if (!validAssets.includes(normalizedAsset)) {
      throw new InvalidParameterError(ERROR_MESSAGES.INVALID_ASSET);
    }
    if (request.budget_usd <= 0) {
      throw new InvalidParameterError("Budget must be greater than zero");
    }
    if (request.trade_window_ms <= 0) {
      throw new InvalidParameterError("Trading window must be greater than zero");
    }
    const validRiskLevels = ["conservative", "moderate", "aggressive"];
    if (!validRiskLevels.includes(request.risk_level)) {
      throw new InvalidParameterError(
        `Invalid risk level. Must be one of: ${validRiskLevels.join(", ")}`
      );
    }
    const validFocuses = ["income", "growth", "hedging"];
    if (!validFocuses.includes(request.strategy_focus)) {
      throw new InvalidParameterError(
        `Invalid strategy focus. Must be one of: ${validFocuses.join(", ")}`
      );
    }
  }
};
_SignalService.DEFAULT_AGENT_CONFIG = {
  agent_name: "OS-E",
  is_simulation: true,
  signal_request_config: {
    protocols: ["derive", "aevo", "premia", "moby", "ithaca", "zomma", "deribit"],
    input_data: ["marketData", "assetPrices"],
    context_window_ms: 6048e5
    // 1 week
  }
};
_SignalService.MAX_RETRIES = 10;
_SignalService.RETRY_DELAY = 2e3;
var SignalService = _SignalService;

// src/services/perpsPairs.ts
import { elizaLogger as elizaLogger4 } from "@elizaos/core";
var PerpsPairsService = class extends BaseService {
  constructor(options) {
    super(options);
  }
  /**
   * Get current price for a cryptocurrency
   */
  async getPerpsPairs(request) {
    try {
      this.validateProtocol(request.protocolName);
      const sdk = await this.getSDK();
      let assetName = null;
      if (request.asset?.toLowerCase() === "btc") {
        assetName = "BTC";
      } else if (request.asset?.toLowerCase() === "eth") {
        assetName = "ETH";
      } else {
        elizaLogger4.info("\u{1F504} No asset provided, or provided asset not supported, fetching all pairs");
      }
      const pairsRequest = {
        protocol: request.protocolName
      };
      if (assetName) {
        pairsRequest.baseAsset = assetName;
      }
      const pairsResponse = await sdk.getPerpsPairs(pairsRequest);
      const formattedPairs = pairsResponse.pairs.map((pair) => {
        const [baseAsset, quoteAsset] = pair.split("-");
        return {
          baseAsset,
          quoteAsset
        };
      });
      return {
        pairs: formattedPairs
      };
    } catch (error) {
      throw this.handleError(
        error,
        ERROR_MESSAGES.PERPS_PAIRS_FETCH_ERROR(request.protocolName)
      );
    }
  }
  /**
   * Validate asset is supported
   */
  validateProtocol(protocolName) {
    const normalizedProtocolName = protocolName.toLowerCase();
    const validProtocols = Object.values(PERPS_PROTOCOLS);
    if (!validProtocols.includes(normalizedProtocolName)) {
      throw new InvalidParameterError(
        ERROR_MESSAGES.INVALID_PROTOCOL(protocolName)
      );
    }
  }
};

// src/services/index.ts
var GrixService = class {
  constructor(options) {
    this.priceService = new PriceService(options);
    this.optionService = new OptionService(options);
    this.signalService = new SignalService(options);
    this.perpsPairsService = new PerpsPairsService(options);
  }
  static formatPrice(price) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(price);
  }
  /**
   * Price-related operations
   */
  async getPrice(request) {
    return this.priceService.getPrice(request);
  }
  /**
   * Option-related operations
   */
  async getOptions(request) {
    return this.optionService.getOptions(request);
  }
  /**
   * Trading signal operations
   */
  async generateSignals(request) {
    return this.signalService.generateSignals(request);
  }
  /**
   * Perps pairs operations
   */
  async getPerpsPairs(request) {
    return this.perpsPairsService.getPerpsPairs(request);
  }
};

// src/environment.ts
import { z } from "zod";
import { elizaLogger as elizaLogger5 } from "@elizaos/core";
var grixEnvSchema = z.object({
  GRIX_API_KEY: z.string().min(1, "Grix API key is required"),
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required")
});
async function validateGrixConfig(runtime) {
  elizaLogger5.info("\u{1F510} Validating Grix configuration...");
  try {
    const config = {
      GRIX_API_KEY: runtime.getSetting("GRIX_API_KEY"),
      OPENAI_API_KEY: runtime.getSetting("OPENAI_API_KEY")
    };
    elizaLogger5.info("Checking required settings...");
    const result = grixEnvSchema.parse(config);
    elizaLogger5.info("\u2705 Configuration validated successfully");
    return result;
  } catch (error) {
    elizaLogger5.error("\u274C Configuration validation failed:", error);
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(`Grix configuration validation failed:
${errorMessages}`);
    }
    throw error;
  }
}

// src/actions/getAssetPrice.ts
var assetPriceTemplate = `Extract the cryptocurrency from the user's request.
If not specified, default to BTC.

Examples of user requests and their parameters:
- "What's the current Bitcoin price?" -> {"asset": "BTC"}
- "Show me ETH price" -> {"asset": "ETH"}
- "How much is Ethereum worth?" -> {"asset": "ETH"}
- "Check BTC price" -> {"asset": "BTC"}
- "What's the price right now?" -> {"asset": "BTC"}

Look for these indicators:
- BTC/Bitcoin/btc
- ETH/Ethereum/eth

User's request: "{{recentMessages}}"

Return ONLY a JSON object with the parameter:
{
    "asset": "BTC" or "ETH"
}`;
var getAssetPriceAction = {
  name: "GET_ASSET_PRICE",
  similes: ["CHECK_PRICE", "PRICE_CHECK", "TOKEN_PRICE", "CRYPTO_PRICE"],
  description: "Get current price for a cryptocurrency",
  validate: async (runtime) => {
    try {
      await validateGrixConfig(runtime);
      return true;
    } catch {
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      elizaLogger6.warn("\u{1F680} Starting getAssetPrice handler");
      const config = await validateGrixConfig(runtime);
      const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });
      const extractedParams = await generateObjectDeprecated({
        runtime,
        context: assetPriceTemplate.replace("{{recentMessages}}", message.content.text),
        modelClass: ModelClass.SMALL
      });
      elizaLogger6.warn("\u{1F3AF} Extracted asset parameters:", extractedParams);
      const normalizedParams = {
        asset: (extractedParams.asset || "BTC").toUpperCase()
      };
      elizaLogger6.warn("\u{1F504} Normalized parameters:", normalizedParams);
      const result = await grixService.getPrice(normalizedParams);
      if (callback) {
        await callback({
          text: `The current ${result.asset} price is ${result.formattedPrice}`
        });
      }
      if (state) {
        state.responseData = { text: result.formattedPrice, action: "GET_ASSET_PRICE" };
      }
      return true;
    } catch (error) {
      elizaLogger6.error("Error in GET_ASSET_PRICE action:", error);
      if (callback) {
        await callback({
          text: `Sorry, I couldn't get the price. Error: ${error}`
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
          text: "What's the current Bitcoin price?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current Bitcoin price for you.",
          action: "GET_ASSET_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "The current BTC price is $42,150.25"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "How much is ETH worth right now?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current Ethereum price for you.",
          action: "GET_ASSET_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "The current ETH price is $2,245.80"
        }
      }
    ]
  ]
};

// src/actions/getOptionPrice.ts
import {
  composeContext,
  elizaLogger as elizaLogger7,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2
} from "@elizaos/core";
var optionPriceTemplate = `Extract the cryptocurrency and option type from the user's request.
If option type is not specified, default to "call".

Examples:
- "give me btc call options" -> {"asset": "BTC", "optionType": "call", "positionType": "long"}
- "show eth put options" -> {"asset": "ETH", "optionType": "put", "positionType": "long"}
- "check bitcoin options" -> {"asset": "BTC", "optionType": "call", "positionType": "long"}
- "give me eth options" -> {"asset": "ETH", "optionType": "call", "positionType": "long"}

User's request: "{{recentMessages}}"

Return ONLY a JSON object with the parameters:
{
    "asset": "BTC" or "ETH",
    "optionType": "call" (default) or "put",
    "positionType": "long" (default) or "short"
}`;
var getOptionPriceAction = {
  name: "GET_OPTION_PRICE",
  similes: ["CHECK_OPTIONS", "OPTION_PRICE", "OPTION_CHECK", "OPTIONS_DATA"],
  description: "Get current option prices for a cryptocurrency",
  validate: async (runtime) => {
    try {
      await validateGrixConfig(runtime);
      return true;
    } catch {
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      console.log("\u{1F680} Starting getOptionPrice handler");
      elizaLogger7.warn("\u{1F680} Starting getOptionPrice handler");
      const config = await validateGrixConfig(runtime);
      const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });
      let localState = state;
      localState = !localState ? await runtime.composeState(message) : await runtime.updateRecentMessageState(localState);
      const recentMessages = composeContext({
        state: localState,
        template: "{{conversation}}"
      });
      elizaLogger7.warn("\u{1F4DD} Recent messages:", recentMessages);
      const userMessage = message.content.text;
      elizaLogger7.warn("\u{1F4DD} Processing user message:", userMessage);
      const extractedParams = await generateObjectDeprecated2({
        runtime,
        context: optionPriceTemplate.replace("{{recentMessages}}", userMessage),
        modelClass: ModelClass2.SMALL
      });
      elizaLogger7.warn("\u{1F3AF} Raw extracted parameters:", extractedParams);
      const normalizedParams = {
        asset: (extractedParams.asset || "BTC").toUpperCase(),
        optionType: (extractedParams.optionType || "call").toLowerCase(),
        positionType: (extractedParams.positionType || "long").toLowerCase()
      };
      elizaLogger7.warn("\u{1F504} Normalized parameters:", normalizedParams);
      const result = await grixService.getOptions(normalizedParams);
      elizaLogger7.warn("\u2705 Got options result:", {
        asset: result.asset,
        optionCount: result.options.length
      });
      const responseText = formatOptionsResponse(result);
      if (callback) {
        await callback({ text: responseText });
      }
      if (state) {
        state.responseData = { text: responseText, action: "GET_OPTION_PRICE" };
      }
      return true;
    } catch (error) {
      elizaLogger7.error("Error in option price handler:", error);
      if (callback) {
        await callback({
          text: `Sorry, I couldn't get the option prices. Error: ${error}`
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
          text: "Show me Bitcoin call options"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the current Bitcoin call options for you.",
          action: "GET_OPTION_PRICE"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: `Available Options:

Expiry: 2023-01-1

BTC-29JAN1-50000-C
Protocol: DERIVE
Available: 10.5 contracts
Price: $1,250.50
------------------------

BTC-29JAN1-55000-C
Protocol: ZOMMA
Available: 5.2 contracts
Price: $980.25
------------------------`
        }
      }
    ]
  ]
};
function formatOptionsResponse(result) {
  if (!result.options || result.options.length === 0) {
    return `No options data available for ${result.asset} ${result.optionType} options.`;
  }
  const groupedByExpiry = result.options.reduce((acc, opt) => {
    if (!acc[opt.expiry]) {
      acc[opt.expiry] = [];
    }
    acc[opt.expiry].push(opt);
    return acc;
  }, {});
  let response = "Available Options:\n";
  Object.entries(groupedByExpiry).forEach(([expiry, options]) => {
    response += `
Expiry: ${expiry}
`;
    const groupedBySymbol = options.reduce((acc, option) => {
      const date = new Date(option.expiry);
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const year = date.getFullYear().toString().slice(-2);
      const symbol = `${result.asset}-${day}${month}${year}-${option.strike}-${option.type.charAt(0)}`;
      if (!acc[symbol]) {
        acc[symbol] = [];
      }
      acc[symbol].push(option);
      return acc;
    }, {});
    Object.entries(groupedBySymbol).forEach(
      ([symbol, symbolOptions]) => {
        response += `
${symbol}
`;
        symbolOptions.forEach((option) => {
          response += `Protocol: ${option.protocol}
`;
          response += `Available: ${option.available} contracts
`;
          response += `Price: $${option.price.toLocaleString()}
`;
        });
        response += `------------------------
`;
      }
    );
  });
  return response.trim();
}

// src/actions/getTradingSignal.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger8,
  generateObjectDeprecated as generateObjectDeprecated3,
  ModelClass as ModelClass3
} from "@elizaos/core";
var tradingSignalTemplate = `Extract trading parameters from the user's request.
If parameters are not specified, use defaults.

The user might request trading signals in many different ways. Here are examples with their expected parameters:

- "Generate BTC trading signals with $5000 budget" -> 
  {"asset": "BTC", "budget_usd": 5000, "risk_level": "moderate", "strategy_focus": "growth"}

- "Give me conservative ETH signals for $10000" -> 
  {"asset": "ETH", "budget_usd": 10000, "risk_level": "conservative", "strategy_focus": "safety"}

- "What should I trade with $25000?" -> 
  {"asset": "BTC", "budget_usd": 25000, "risk_level": "moderate", "strategy_focus": "growth"}

- "Need safe trading ideas for BTC" -> 
  {"asset": "BTC", "budget_usd": 10000, "risk_level": "conservative", "strategy_focus": "safety"}

Look for these indicators:
- Asset: BTC/Bitcoin or ETH/Ethereum
- Budget: Dollar amounts like $5000, 10k, etc.
- Risk Level: conservative/safe, moderate/normal, aggressive/risky
- Strategy: growth/profit, safety/protection, yield/income

Defaults:
- asset: "BTC"
- budget_usd: 10000
- risk_level: "moderate"
- strategy_focus: "growth"

User's request: "{{recentMessages}}"

Return ONLY a JSON object with the parameters:
{
    "asset": "BTC" or "ETH",
    "budget_usd": number (default: 10000),
    "risk_level": "conservative" or "moderate" or "aggressive",
    "strategy_focus": "growth" or "safety" or "yield"
}`;
var GetTradingSignalAction = class {
  constructor() {
    this.name = "GET_TRADING_SIGNAL";
    this.description = "Generate trading signals based on market conditions";
    this.similes = ["generate signals", "trading advice", "options strategy", "investment ideas"];
    this.examples = [
      [
        {
          user: "{{user}}",
          content: {
            text: "Generate trading signals for BTC with $25,000 budget"
          }
        },
        {
          user: "{{agent}}",
          content: {
            text: "I'll generate Bitcoin trading signals for a $25,000 budget.",
            action: "GET_TRADING_SIGNAL"
          }
        },
        {
          user: "{{agent}}",
          content: {
            text: "Here are my recommended trading signals based on a budget of $25,000:\n\n1. OPEN LONG position on BTC-30JUN23-40000-C at $1,250\n   Reason: Bullish momentum with strong support at current levels\n   Confidence: 75%\n\n2. OPEN SHORT position on BTC-30JUN23-50000-C at $420\n   Reason: Overpriced premium relative to probability of reaching strike\n   Confidence: 65%\n\nThese signals are based on current market conditions and should be considered as suggestions, not financial advice."
          }
        }
      ]
    ];
  }
  async validate(runtime) {
    try {
      await validateGrixConfig(runtime);
      return true;
    } catch {
      return false;
    }
  }
  async handler(runtime, message, state, _options, callback) {
    try {
      const config = await validateGrixConfig(runtime);
      const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });
      let localState = state;
      localState = !localState ? await runtime.composeState(message) : await runtime.updateRecentMessageState(localState);
      const recentMessages = composeContext2({
        state: localState,
        template: "{{conversation}}"
      });
      const extractedParams = await generateObjectDeprecated3({
        runtime,
        context: tradingSignalTemplate.replace("{{recentMessages}}", message.content.text),
        modelClass: ModelClass3.SMALL
      });
      elizaLogger8.warn("\u{1F3AF} Extracted signal parameters:", extractedParams);
      const normalizedParams = {
        asset: (extractedParams.asset || "BTC").toUpperCase(),
        budget_usd: extractedParams.budget_usd || 1e4,
        risk_level: extractedParams.risk_level || "moderate",
        strategy_focus: extractedParams.strategy_focus || "growth"
      };
      const result = await grixService.generateSignals({
        asset: normalizedParams.asset,
        budget_usd: normalizedParams.budget_usd,
        risk_level: normalizedParams.risk_level,
        strategy_focus: normalizedParams.strategy_focus,
        trade_window_ms: 7 * 24 * 60 * 60 * 1e3
        // 1 week in milliseconds
      });
      const responseText = this.formatTradingSignals(result, normalizedParams.budget_usd);
      if (callback) {
        await callback({
          text: responseText
        });
      }
      if (state) {
        state.responseData = { text: responseText, action: this.name };
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error in trading signal action handler:", error);
      if (callback) {
        await callback({
          text: `Sorry, I couldn't generate trading signals. Error: ${error}`
        });
      }
      return false;
    }
  }
  formatTradingSignals(result, budget) {
    let response = `Here are my recommended trading signals based on a budget of $${budget.toLocaleString()}:

`;
    if (!result.signals || result.signals.length === 0) {
      return response + "No viable trading signals found for the current market conditions.";
    }
    result.signals.forEach((signal, index) => {
      response += `${index + 1}. ${signal.action_type.toUpperCase()} ${signal.position_type.toUpperCase()} position on ${signal.instrument} at $${signal.expected_instrument_price_usd.toLocaleString()}
`;
      response += `   Reason: ${signal.reason}
`;
      if (signal.confidence_score) {
        response += `   Confidence: ${Math.round(signal.confidence_score * 100)}%
`;
      }
      response += "\n";
    });
    response += "These signals are based on current market conditions and should be considered as suggestions, not financial advice.";
    return response;
  }
};
var getTradingSignalAction = new GetTradingSignalAction();

// src/actions/showGrixHelp.ts
var ShowGrixHelpAction = class {
  constructor() {
    this.name = "SHOW_GRIX_HELP";
    this.description = "Shows available Grix commands and examples";
    this.similes = [
      "grix help",
      "trading help",
      "options help",
      "show commands",
      "menu",
      "what can you do",
      "show me what you can do"
    ];
    this.examples = [
      [
        {
          user: "{{user}}",
          content: {
            text: "Show me what you can do"
          }
        },
        {
          user: "{{agent}}",
          content: {
            text: "Here's what I can help you with:",
            action: "SHOW_GRIX_HELP"
          }
        },
        {
          user: "{{agent}}",
          content: {
            text: `# \u{1F916} Grix Trading Assistant

Here are some examples of what you can ask me:

## \u{1F4CA} Price Information
- "What's the current BTC price?"
- "Show me ETH price"

## \u{1F4C8} Options Trading
- "Find me BTC calls"
- "Show ETH put options"
- "What are the best BTC options right now?"

*Just type any of these questions or ask in your own words!*`
          }
        }
      ]
    ];
    this.validate = async (_runtime) => {
      return true;
    };
  }
  async handler(_runtime, _message, state, _options, callback) {
    const helpText = `# \u{1F916} Grix Trading Assistant

Here are some examples of what you can ask me:

## \u{1F4CA} Price Information
- "What's the current BTC price?"
- "Show me ETH price"

## \u{1F4C8} Options Trading
- "Find me BTC calls"
- "Show ETH put options" 
- "What are the best BTC options right now?"

## \u{1F4CB} Trading Signals
- "Generate trading signals for BTC"
- "What should I trade with $25,000?"
- "Give me conservative ETH trading ideas"

*Just type any of these questions or ask in your own words!*`;
    if (callback) {
      await callback({ text: helpText, action: this.name });
    }
    if (state) {
      state.responseData = { text: helpText, action: this.name };
    }
    return true;
  }
};
var showGrixHelpAction = new ShowGrixHelpAction();

// src/actions/getPerpsPairs.ts
import {
  elizaLogger as elizaLogger9,
  generateObjectDeprecated as generateObjectDeprecated4,
  ModelClass as ModelClass4
} from "@elizaos/core";
var perpsPairsTemplate = `Extract the protocol and optional base asset from the user's request.
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
var getPerpsPairsAction = {
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
  validate: async (runtime) => {
    try {
      await validateGrixConfig(runtime);
      return true;
    } catch {
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      elizaLogger9.warn("\u{1F680} Starting getPerpPairs handler");
      const config = await validateGrixConfig(runtime);
      const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });
      const extractedParams = await generateObjectDeprecated4({
        runtime,
        context: perpsPairsTemplate.replace("{{recentMessages}}", message.content.text),
        modelClass: ModelClass4.SMALL
      });
      elizaLogger9.warn("\u{1F3AF} Extracted parameters:", extractedParams);
      const normalizedParams = {
        protocolName: (extractedParams.protocol || "Hyperliquid").toLowerCase(),
        asset: extractedParams.baseAsset
      };
      elizaLogger9.warn("\u{1F504} Normalized parameters:", normalizedParams);
      const result = await grixService.getPerpsPairs(normalizedParams);
      if (callback) {
        let responseText = `Available trading pairs for ${normalizedParams.protocolName.toUpperCase()}`;
        if (normalizedParams.asset) {
          responseText += ` with ${normalizedParams.asset}`;
        }
        responseText += ":\n";
        result.pairs.forEach((pair) => {
          responseText += `- ${pair.baseAsset}/${pair.quoteAsset}
`;
        });
        await callback({
          text: responseText
        });
      }
      if (state) {
        let formattedPairs = "";
        result.pairs.forEach((pair) => {
          formattedPairs += `- ${pair.baseAsset}/${pair.quoteAsset}
`;
        });
        state.responseData = { text: formattedPairs, action: "GET_PERP_PAIRS" };
      }
      return true;
    } catch (error) {
      elizaLogger9.error("Error in GET_PERP_PAIRS action:", error);
      if (callback) {
        await callback({
          text: `Sorry, I couldn't fetch the trading pairs. Error: ${error}`
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
          text: "What trading pairs are available on Hyperliquid?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll check the available pairs on Hyperliquid for you.",
          action: "GET_PERP_PAIRS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Available trading pairs for Hyperliquid:\n- BTC/USD\n- ETH/USD\n- LINK/USD"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me Synthetix pairs for ETH"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll fetch the Synthetix pairs for ETH.",
          action: "GET_PERP_PAIRS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Available trading pairs for SYNTHETIX with ETH:\n- ETH/USD\n- ETH/EUR"
        }
      }
    ]
  ]
};

// src/index.ts
var grixPlugin = {
  name: "grixv2",
  description: "Grix Finance Plugin v2 - Advanced crypto options trading insights and signals",
  actions: [
    getAssetPriceAction,
    getOptionPriceAction,
    getTradingSignalAction,
    showGrixHelpAction,
    getPerpsPairsAction
  ],
  // Removed evaluators since actions now handle parameter extraction
  evaluators: [],
  providers: []
};
var index_default = grixPlugin;
export {
  GetTradingSignalAction,
  ShowGrixHelpAction,
  index_default as default,
  getAssetPriceAction,
  getOptionPriceAction,
  getPerpsPairsAction,
  getTradingSignalAction,
  grixPlugin,
  showGrixHelpAction
};
//# sourceMappingURL=index.js.map