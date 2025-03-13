import { BaseService } from "./base";
import { ASSET_TYPES } from "../constants/api";
import { ERROR_MESSAGES } from "../constants/errors";
import { InvalidParameterError } from "../types/error";
import type { ServiceOptions } from "./base";
import { UnderlyingAsset } from "@grixprotocol/sdk";
import { elizaLogger } from "@elizaos/core";

export interface TradingSignalRequest {
	asset: string;
	budget_usd: number;
	trade_window_ms: number;
	risk_level: "conservative" | "moderate" | "aggressive";
	strategy_focus: "income" | "growth" | "hedging";
}

export interface SignalResponse {
	signals: Array<{
		id: string;
		action_type: string;
		position_type: string;
		instrument: string;
		instrument_type: string;
		size: number;
		expected_instrument_price_usd: number;
		expected_total_price_usd: number;
		reason: string;
		target_position_id: string;
		created_at: number;
		updated_at: number;
	}>;
	timestamp: number;
}

interface SignalData {
	id: string;
	signal: {
		action_type: string;
		position_type: string;
		instrument: string;
		instrument_type: string;
		size: number;
		expected_instrument_price_usd: number;
		expected_total_price_usd: number;
		reason: string;
		target_position_id: string | null;
	};
	created_at: string;
	updated_at: string;
}

export class SignalService extends BaseService {
	private static DEFAULT_AGENT_CONFIG = {
		agent_name: "OS-E",
		is_simulation: true,
		signal_request_config: {
			protocols: ["derive", "aevo", "premia", "moby", "ithaca", "zomma", "deribit"],
			input_data: ["marketData", "assetPrices"],
			context_window_ms: 604800000, // 1 week
		},
	};

	private static MAX_RETRIES = 10;
	private static RETRY_DELAY = 2000; // 2 seconds

	constructor(options?: ServiceOptions) {
		super(options);
	}

	private async waitForSignals(agentId: number | string): Promise<any> {
		let retries = 0;

		while (retries < SignalService.MAX_RETRIES) {
			const result = await this.getSDK().then((sdk) =>
				sdk.getTradeSignals({ agentId: agentId.toString() })
			);

			const signalRequest = result.personalAgents[0]?.signal_requests[0];
			if (signalRequest?.progress === "completed" && signalRequest?.signals?.length > 0) {
				elizaLogger.info("Signals generated successfully");
				return result;
			}

			elizaLogger.info(
				`Waiting for signals... (attempt ${retries + 1}/${SignalService.MAX_RETRIES})`
			);
			await new Promise((resolve) => setTimeout(resolve, SignalService.RETRY_DELAY));
			retries++;
		}

		throw new Error("Timeout waiting for signals");
	}

	/**
	 * Generate trading signals based on configuration
	 */
	async generateSignals(request: TradingSignalRequest): Promise<SignalResponse> {
		try {
			elizaLogger.info("Generating trading signals for request:", request);
			this.validateRequest(request);

			const sdk = await this.getSDK();

			// Create trade agent
			const createRequest = {
				ownerAddress: "default",
				config: {
					...SignalService.DEFAULT_AGENT_CONFIG,
					signal_request_config: {
						...SignalService.DEFAULT_AGENT_CONFIG.signal_request_config,
						budget_usd: request.budget_usd.toString(),
						assets: [request.asset],
						trade_window_ms: request.trade_window_ms,
					},
				},
			};

			elizaLogger.info(
				"Creating trade agent with request:",
				JSON.stringify(createRequest, null, 2)
			);
			const { agentId } = await sdk.createTradeAgent(createRequest);
			elizaLogger.info("Created trade agent with ID:", agentId);

			// Request signals
			const signalRequest = {
				config: {
					budget_usd: request.budget_usd.toString(),
					assets: [request.asset],
					trade_window_ms: request.trade_window_ms,
					context_window_ms: 604800000,
					input_data: ["marketData", "assetPrices"],
					protocols: ["derive", "aevo", "premia", "moby", "ithaca", "zomma", "deribit"],
					user_prompt: `Generate ${request.risk_level} ${request.strategy_focus} strategies`,
				},
			};

			elizaLogger.info("Requesting trade agent signals with:", {
				agentId,
				request: JSON.stringify(signalRequest, null, 2),
			});
			await sdk.requestTradeAgentSignals(Number(agentId), signalRequest);
			elizaLogger.info("Successfully requested signals for agent:", agentId);
			const result = await this.waitForSignals(agentId);
			const allSignals = result.personalAgents[0].signal_requests[0].signals;

			return {
				signals: allSignals.map((s: SignalData) => ({
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
					updated_at: s.updated_at,
				})),
				timestamp: Date.now(),
			};
		} catch (error) {
			elizaLogger.error("Error generating signals:", error);
			throw this.handleError(error, `signal generation for ${request.asset}`);
		}
	}

	/**
	 * Validate trading signal request parameters
	 */
	private validateRequest(request: TradingSignalRequest): void {
		// Validate asset
		const normalizedAsset = request.asset.toUpperCase();
		const validAssets = Object.values(ASSET_TYPES);
		if (!validAssets.includes(normalizedAsset as any)) {
			throw new InvalidParameterError(ERROR_MESSAGES.INVALID_ASSET);
		}

		// Validate budget (must be positive)
		if (request.budget_usd <= 0) {
			throw new InvalidParameterError("Budget must be greater than zero");
		}

		// Validate time window (must be positive)
		if (request.trade_window_ms <= 0) {
			throw new InvalidParameterError("Trading window must be greater than zero");
		}

		// Risk level validation
		const validRiskLevels = ["conservative", "moderate", "aggressive"];
		if (!validRiskLevels.includes(request.risk_level)) {
			throw new InvalidParameterError(
				`Invalid risk level. Must be one of: ${validRiskLevels.join(", ")}`
			);
		}

		// Strategy focus validation
		const validFocuses = ["income", "growth", "hedging"];
		if (!validFocuses.includes(request.strategy_focus)) {
			throw new InvalidParameterError(
				`Invalid strategy focus. Must be one of: ${validFocuses.join(", ")}`
			);
		}
	}
}
