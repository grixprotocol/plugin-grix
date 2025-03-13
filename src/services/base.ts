import { elizaLogger } from "@elizaos/core";
import { GrixSDK } from "@grixprotocol/sdk";
import { API_DEFAULTS } from "../constants/api";
import { ApiError, AuthenticationError, GrixError } from "../types/error";

export interface ServiceOptions {
	timeout?: number;
	apiKey?: string;
}

export abstract class BaseService {
	protected sdk: GrixSDK | null = null;
	protected apiKey: string | undefined;
	protected timeout: number;

	constructor(options?: ServiceOptions) {
		this.apiKey = options?.apiKey;
		this.timeout = options?.timeout || API_DEFAULTS.TIMEOUT;
	}

	/**
	 * Initialize the SDK instance if needed
	 */
	protected async getSDK(): Promise<GrixSDK> {
		elizaLogger.info("🔌 Initializing Grix SDK...");
		if (!this.sdk) {
			this.validateApiKey();
			try {
				elizaLogger.info("Creating new SDK instance...");
				this.sdk = await GrixSDK.initialize({
					apiKey: this.apiKey as string,
				});
				elizaLogger.info("✅ SDK initialized successfully");
			} catch (error) {
				elizaLogger.error("❌ SDK initialization failed:", error);
				throw this.handleError(error, "SDK initialization");
			}
		}
		return this.sdk;
	}

	/**
	 * Validate API key presence
	 */
	protected validateApiKey(): void {
		if (!this.apiKey) {
			throw new AuthenticationError();
		}
	}

	/**
	 * Standardized error handling for service errors
	 */
	protected handleError(error: unknown, context?: string): Error {
		elizaLogger.error(`🚨 Error in ${context || "unknown context"}:`, error);

		// If it's already a GrixError or Error, return it
		if (error instanceof GrixError || error instanceof Error) {
			return error;
		}

		// Convert unknown error to ApiError
		const message = error?.toString() || "Unknown error";
		const contextStr = context ? ` during ${context}` : "";
		return new ApiError(`Grix API error${contextStr}: ${message}`, 500);
	}
}
