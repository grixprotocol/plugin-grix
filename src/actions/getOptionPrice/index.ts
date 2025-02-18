import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { OptionPriceProvider } from "../../providers/optionProvider";

export class GetOptionPriceAction implements Action {
	name = "GET_OPTION_PRICE";
	description = "Fetches and returns option price information.";
	similes = ["fetch option price", "check option price", "get options"]; // Similar triggers for action

	examples = [
		[
			{
				user: "{{user}}",
				content: {
					text: "Show me BTC call options",
				},
			},
			{
				user: "{{system}}",
				content: {
					text: "Here are the available BTC call options...",
					action: "GET_OPTION_PRICE",
				},
			},
		],
	];

	async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
		// Validate if the message contains option-related keywords
		const content =
			typeof message.content === "string" ? message.content : message.content?.text;
		return !!content && /\b(option|options|call|put)\b/i.test(content);
	}

	async handler(
		runtime: IAgentRuntime,
		message: Memory,
		state?: State,
		_options: { [key: string]: unknown } = {},
		callback?: HandlerCallback
	): Promise<boolean> {
		try {
			const provider = runtime.providers.find((p) => p instanceof OptionPriceProvider);
			if (!provider) throw new Error("Option price provider not found");

			const priceData = await provider.get(runtime, message, state);

			if (callback) {
				await callback({ text: priceData, action: this.name });
			}

			if (state) {
				state.responseData = { text: priceData, action: this.name };
			}

			return true;
		} catch (error) {
			console.error("Error in option price action handler:", error);
			return false;
		}
	}
}

export const getOptionPriceAction = new GetOptionPriceAction();
