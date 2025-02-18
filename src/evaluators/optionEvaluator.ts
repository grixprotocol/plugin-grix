import type { Evaluator, IAgentRuntime, Memory, State, EvaluationExample } from "@elizaos/core";
import { generateText, ModelClass, parseJSONObjectFromText } from "@elizaos/core";

export class OptionPriceEvaluator implements Evaluator {
	name = "OPTION_PRICE_EVALUATOR";
	description = "Evaluates messages for option price requests using AI analysis.";
	similes = ["option price", "option data", "cheapest option", "option chain"];

	examples: EvaluationExample[] = [
		{
			context: "Requesting the cheapest BTC call option",
			messages: [
				{
					user: "{{user}}",
					content: { text: "Give me BTC call options with the lowest price." },
				},
			],
			outcome: "GET_OPTION_PRICE",
		},
		{
			context: "Requesting ETH put options for a specific protocol",
			messages: [
				{ user: "{{user}}", content: { text: "Show me ETH put options on Premia." } },
			],
			outcome: "GET_OPTION_PRICE",
		},
	];

	async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
		return !!message.content;
	}

	async handler(runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
		const content =
			typeof message.content === "string" ? message.content : message.content?.text;
		if (!content) throw new Error("No message content provided");

		const prompt = `
			Analyze the following user request and return the relevant option trading parameters as JSON:
			{
				"symbol": "BTC" | "ETH",
				"type": "CALL" | "PUT",
				"expiry": string | null,
				"strike": number | null,
				"protocol": string | null,
				"positionType": "long" | "short",
				"text": string
			}
			User Request: "${content}"
		`;

		const response = await generateText({
			runtime,
			context: prompt,
			modelClass: ModelClass.LARGE,
		});

		const parsedResponse = parseJSONObjectFromText(response);

		// Ensure the parsed response includes the 'text' property
		message.content = {
			...parsedResponse,
			text: content,
		};

		return "GET_OPTION_PRICE";
	}
}

export const optionPriceEvaluator = new OptionPriceEvaluator();
