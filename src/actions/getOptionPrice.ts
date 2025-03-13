import {
	type Action,
	composeContext,
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
import { OptionResponse } from "../services/option";

const optionPriceTemplate = `Extract the cryptocurrency and option type from the user's request.
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

interface OptionData {
	protocol: string;
	available: number;
	price: number;
	expiry: string;
	strike: number;
	type: string;
}

export const getOptionPriceAction: Action = {
	name: "GET_OPTION_PRICE",
	similes: ["CHECK_OPTIONS", "OPTION_PRICE", "OPTION_CHECK", "OPTIONS_DATA"],
	description: "Get current option prices for a cryptocurrency",
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
			console.log("🚀 Starting getOptionPrice handler");
			elizaLogger.warn("🚀 Starting getOptionPrice handler");

			const config = await validateGrixConfig(runtime);
			const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });

			// Update state with recent messages
			let localState = state;
			localState = !localState
				? await runtime.composeState(message)
				: await runtime.updateRecentMessageState(localState);

			// Get recent conversation context
			const recentMessages = composeContext({
				state: localState,
				template: "{{conversation}}",
			});
			elizaLogger.warn("📝 Recent messages:", recentMessages);

			// Get the actual user message
			const userMessage = message.content.text;
			elizaLogger.warn("📝 Processing user message:", userMessage);

			const extractedParams = await generateObjectDeprecated({
				runtime,
				context: optionPriceTemplate.replace("{{recentMessages}}", userMessage),
				modelClass: ModelClass.SMALL,
			});

			elizaLogger.warn("🎯 Raw extracted parameters:", extractedParams);

			// Normalize the parameters
			const normalizedParams = {
				asset: (extractedParams.asset || "BTC").toUpperCase(),
				optionType: (extractedParams.optionType || "call").toLowerCase(),
				positionType: (extractedParams.positionType || "long").toLowerCase(),
			};

			elizaLogger.warn("🔄 Normalized parameters:", normalizedParams);

			const result = await grixService.getOptions(normalizedParams);

			elizaLogger.warn("✅ Got options result:", {
				asset: result.asset,
				optionCount: result.options.length,
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
			elizaLogger.error("Error in option price handler:", error);
			if (callback) {
				await callback({
					text: `Sorry, I couldn't get the option prices. Error: ${error}`,
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
					text: "Show me Bitcoin call options",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "I'll check the current Bitcoin call options for you.",
					action: "GET_OPTION_PRICE",
				},
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
------------------------`,
				},
			},
		],
	],
};

function formatOptionsResponse(result: OptionResponse): string {
	if (!result.options || result.options.length === 0) {
		return `No options data available for ${result.asset} ${result.optionType} options.`;
	}

	// First group by expiry
	const groupedByExpiry = result.options.reduce((acc, opt) => {
		if (!acc[opt.expiry]) {
			acc[opt.expiry] = [];
		}
		acc[opt.expiry].push(opt);
		return acc;
	}, {} as Record<string, any[]>);

	let response = "Available Options:\n";

	Object.entries(groupedByExpiry).forEach(([expiry, options]) => {
		response += `\nExpiry: ${expiry}\n`;

		// Group by symbol within each expiry
		const groupedBySymbol = options.reduce((acc, option) => {
			const date = new Date(option.expiry);
			const day = date.getDate().toString().padStart(2, "0");
			const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
			const year = date.getFullYear().toString().slice(-2);
			const symbol = `${result.asset}-${day}${month}${year}-${
				option.strike
			}-${option.type.charAt(0)}`;

			if (!acc[symbol]) {
				acc[symbol] = [];
			}
			acc[symbol].push(option);
			return acc;
		}, {} as Record<string, OptionData[]>);

		// Format each symbol group
		(Object.entries(groupedBySymbol) as [string, OptionData[]][]).forEach(
			([symbol, symbolOptions]) => {
				response += `\n${symbol}\n`;
				symbolOptions.forEach((option) => {
					response += `Protocol: ${option.protocol}\n`;
					response += `Available: ${option.available} contracts\n`;
					response += `Price: $${option.price.toLocaleString()}\n`;
				});
				response += `------------------------\n`;
			}
		);
	});

	return response.trim();
}
