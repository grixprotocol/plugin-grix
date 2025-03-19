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

const assetPriceTemplate = `Extract the cryptocurrency from the user's request.
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

export const getAssetPriceAction: Action = {
	name: "GET_ASSET_PRICE",
	similes: ["CHECK_PRICE", "PRICE_CHECK", "TOKEN_PRICE", "CRYPTO_PRICE"],
	description: "Get current price for a cryptocurrency",
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
			elizaLogger.warn("🚀 Starting getAssetPrice handler");

			const config = await validateGrixConfig(runtime);
			const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });

			const extractedParams = await generateObjectDeprecated({
				runtime,
				context: assetPriceTemplate.replace("{{recentMessages}}", message.content.text),
				modelClass: ModelClass.SMALL,
			});

			elizaLogger.warn("🎯 Extracted asset parameters:", extractedParams);

			const normalizedParams = {
				asset: (extractedParams.asset || "BTC").toUpperCase(),
			};

			elizaLogger.warn("🔄 Normalized parameters:", normalizedParams);

			const result = await grixService.getPrice(normalizedParams);

			if (callback) {
				await callback({
					text: `The current ${result.asset} price is ${result.formattedPrice}`,
				});
			}

			if (state) {
				state.responseData = { text: result.formattedPrice, action: "GET_ASSET_PRICE" };
			}

			return true;
		} catch (error) {
			elizaLogger.error("Error in GET_ASSET_PRICE action:", error);
			if (callback) {
				await callback({
					text: `Sorry, I couldn't get the price. Error: ${error}`,
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
					text: "What's the current Bitcoin price?",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "I'll check the current Bitcoin price for you.",
					action: "GET_ASSET_PRICE",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "The current BTC price is $42,150.25",
				},
			},
		],
		[
			{
				user: "{{user1}}",
				content: {
					text: "How much is ETH worth right now?",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "I'll check the current Ethereum price for you.",
					action: "GET_ASSET_PRICE",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "The current ETH price is $2,245.80",
				},
			},
		],
	],
};
