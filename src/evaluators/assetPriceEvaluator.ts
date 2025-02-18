import type { Evaluator, IAgentRuntime, Memory, State, EvaluationExample } from "@elizaos/core";

export class AssetPriceEvaluator implements Evaluator {
	name = "ASSET_PRICE_EVALUATOR";
	description = "Evaluates messages for asset price requests";
	similes = ["price check", "current price", "asset value", "token price"];

	examples: EvaluationExample[] = [
		{
			context: "User asks for BTC price",
			messages: [
				{
					user: "{{user}}",
					content: { text: "What's the current price of Bitcoin?" },
				},
			],
			outcome: "GET_ASSET_PRICE",
		},
		{
			context: "User asks for ETH price",
			messages: [
				{
					user: "{{user}}",
					content: { text: "How much is ETH worth right now?" },
				},
			],
			outcome: "GET_ASSET_PRICE",
		},
	];

	async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
		return !!message.content;
	}

	async handler(runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
		const content =
			typeof message.content === "string" ? message.content : message.content?.text;
		if (!content) throw new Error("No message content provided");

		const pricePattern = /\b(price|worth|cost|value)\b.*\b(btc|eth|bitcoin|ethereum)\b/i;

		if (pricePattern.test(content)) {
			return "GET_ASSET_PRICE";
		}

		return "";
	}
}

export const assetPriceEvaluator = new AssetPriceEvaluator();
