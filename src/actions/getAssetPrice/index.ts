import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { AssetPriceProvider } from "../../providers/assetPriceProvider";

export class GetAssetPriceAction implements Action {
	name = "GET_ASSET_PRICE";
	description = "Fetches current price for BTC or ETH";
	similes = ["price of", "what's the price", "how much is", "current price"];

	examples = [
		[
			{
				user: "{{user}}",
				content: {
					text: "What's the price of BTC?",
				},
			},
			{
				user: "{{system}}",
				content: {
					text: "Let me check the current BTC price...",
					action: "GET_ASSET_PRICE",
				},
			},
		],
	];

	async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
		const content =
			typeof message.content === "string" ? message.content : message.content?.text;
		return (
			!!content &&
			/\b(price|worth|cost|value)\b.*\b(btc|eth|bitcoin|ethereum)\b/i.test(content)
		);
	}

	async handler(
		runtime: IAgentRuntime,
		message: Memory,
		state?: State,
		_options: { [key: string]: unknown } = {},
		callback?: HandlerCallback
	): Promise<boolean> {
		try {
			const provider = runtime.providers.find((p) => p instanceof AssetPriceProvider);
			if (!provider) throw new Error("Asset price provider not found");

			const priceData = await provider.get(runtime, message, state);

			if (callback) {
				await callback({ text: priceData, action: this.name });
			}

			if (state) {
				state.responseData = { text: priceData, action: this.name };
			}

			return true;
		} catch (error) {
			console.error("Error in asset price action handler:", error);
			return false;
		}
	}
}

export const getAssetPriceAction = new GetAssetPriceAction();
