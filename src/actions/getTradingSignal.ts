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

const tradingSignalTemplate = `Extract trading parameters from the user's request.
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

export class GetTradingSignalAction implements Action {
	name = "GET_TRADING_SIGNAL";
	description = "Generate trading signals based on market conditions";
	similes = ["generate signals", "trading advice", "options strategy", "investment ideas"];

	examples = [
		[
			{
				user: "{{user}}",
				content: {
					text: "Generate trading signals for BTC with $25,000 budget",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "I'll generate Bitcoin trading signals for a $25,000 budget.",
					action: "GET_TRADING_SIGNAL",
				},
			},
			{
				user: "{{agent}}",
				content: {
					text: "Here are my recommended trading signals based on a budget of $25,000:\n\n1. OPEN LONG position on BTC-30JUN23-40000-C at $1,250\n   Reason: Bullish momentum with strong support at current levels\n   Confidence: 75%\n\n2. OPEN SHORT position on BTC-30JUN23-50000-C at $420\n   Reason: Overpriced premium relative to probability of reaching strike\n   Confidence: 65%\n\nThese signals are based on current market conditions and should be considered as suggestions, not financial advice.",
				},
			},
		],
	];

	async validate(runtime: IAgentRuntime): Promise<boolean> {
		try {
			await validateGrixConfig(runtime);
			return true;
		} catch {
			return false;
		}
	}

	async handler(
		runtime: IAgentRuntime,
		message: Memory,
		state?: State,
		_options?: { [key: string]: unknown },
		callback?: HandlerCallback
	): Promise<boolean> {
		try {
			const config = await validateGrixConfig(runtime);
			const grixService = new GrixService({ apiKey: config.GRIX_API_KEY });

			// Initialize or update state
			let localState = state;
			localState = !localState
				? await runtime.composeState(message)
				: await runtime.updateRecentMessageState(localState);

			const recentMessages = composeContext({
				state: localState,
				template: "{{conversation}}",
			});

			// Use LLM to extract parameters from user message
			const extractedParams = await generateObjectDeprecated({
				runtime,
				context: tradingSignalTemplate.replace("{{recentMessages}}", message.content.text),
				modelClass: ModelClass.SMALL,
			});

			elizaLogger.warn("🎯 Extracted signal parameters:", extractedParams);

			const normalizedParams = {
				asset: (extractedParams.asset || "BTC").toUpperCase(),
				budget_usd: extractedParams.budget_usd || 10000,
				risk_level: extractedParams.risk_level || "moderate",
				strategy_focus: extractedParams.strategy_focus || "growth",
			};

			// Get signals from service
			const result = await grixService.generateSignals({
				asset: normalizedParams.asset,
				budget_usd: normalizedParams.budget_usd,
				risk_level: normalizedParams.risk_level,
				strategy_focus: normalizedParams.strategy_focus,
				trade_window_ms: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
			});

			// Format the response
			const responseText = this.formatTradingSignals(result, normalizedParams.budget_usd);

			if (callback) {
				await callback({
					text: responseText,
				});
			}

			if (state) {
				state.responseData = { text: responseText, action: this.name };
			}

			return true;
		} catch (error) {
			elizaLogger.error("Error in trading signal action handler:", error);

			if (callback) {
				await callback({
					text: `Sorry, I couldn't generate trading signals. Error: ${error}`,
				});
			}

			return false;
		}
	}

	formatTradingSignals(result: any, budget: number): string {
		let response = `Here are my recommended trading signals based on a budget of $${budget.toLocaleString()}:\n\n`;

		if (!result.signals || result.signals.length === 0) {
			return response + "No viable trading signals found for the current market conditions.";
		}

		result.signals.forEach((signal: any, index: number) => {
			response += `${
				index + 1
			}. ${signal.action_type.toUpperCase()} ${signal.position_type.toUpperCase()} position on ${
				signal.instrument
			} at $${signal.expected_instrument_price_usd.toLocaleString()}\n`;
			response += `   Reason: ${signal.reason}\n`;

			if (signal.confidence_score) {
				response += `   Confidence: ${Math.round(signal.confidence_score * 100)}%\n`;
			}

			response += "\n";
		});

		response +=
			"These signals are based on current market conditions and should be considered as suggestions, not financial advice.";
		return response;
	}
}

export const getTradingSignalAction = new GetTradingSignalAction();
