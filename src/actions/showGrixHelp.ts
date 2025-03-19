import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

export class ShowGrixHelpAction implements Action {
	name = "SHOW_GRIX_HELP";
	description = "Shows available Grix commands and examples";
	similes = [
		"grix help",
		"trading help",
		"options help",
		"show commands",
		"menu",
		"what can you do",
		"show me what you can do",
	];

	examples = [
		[
			{
				user: "{{user}}",
				content: {
					text: "Show me what you can do",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "Here's what I can help you with:",
					action: "SHOW_GRIX_HELP",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: '# 🤖 Grix Trading Assistant\n\nHere are some examples of what you can ask me:\n\n## 📊 Price Information\n- "What\'s the current BTC price?"\n- "Show me ETH price"\n\n## 📈 Options Trading\n- "Find me BTC calls"\n- "Show ETH put options"\n- "What are the best BTC options right now?"\n\n*Just type any of these questions or ask in your own words!*',
				},
			},
		],
	];

	validate = async (_runtime: IAgentRuntime): Promise<boolean> => {
		return true; // Always available since it doesn't require external APIs
	};

	async handler(
		_runtime: IAgentRuntime,
		_message: Memory,
		state?: State,
		_options?: Record<string, unknown>,
		callback?: HandlerCallback
	): Promise<boolean> {
		const helpText = `# 🤖 Grix Trading Assistant

Here are some examples of what you can ask me:

## 📊 Price Information
- "What's the current BTC price?"
- "Show me ETH price"

## 📈 Options Trading
- "Find me BTC calls"
- "Show ETH put options" 
- "What are the best BTC options right now?"

## 📋 Trading Signals
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
}

export const showGrixHelpAction = new ShowGrixHelpAction();
