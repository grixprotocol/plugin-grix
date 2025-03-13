import { BaseService } from "./base";
import { ASSET_TYPES, OPTION_TYPES, POSITION_TYPES } from "../constants/api";
import { ERROR_MESSAGES } from "../constants/errors";
import { InvalidParameterError } from "../types/error";
import type { ServiceOptions } from "./base";
import { UnderlyingAsset, OptionType, PositionType } from "@grixprotocol/sdk";
import { elizaLogger } from "@elizaos/core";

interface OptionData {
	optionId: number;
	symbol: string;
	type: string;
	expiry: string;
	strike: number;
	protocol: string;
	marketName: string;
	contractPrice: number;
	availableAmount: string;
}

export interface OptionRequest {
	asset: string;
	optionType: string;
	positionType?: string;
	strike?: number;
	expiry?: string;
	limit?: number;
}

export interface OptionResponse {
	asset: string;
	optionType: string;
	formattedOptions: string;
	options: {
		optionId: number;
		expiry: string;
		strike: number;
		price: number;
		protocol: string;
		available: number;
		type: string;
	}[];
	timestamp: number;
}

export class OptionService extends BaseService {
	private optionsCache: OptionData[] = [];
	private lastFetchTime: number = 0;
	private static CACHE_DURATION = 60000; // 1 minute cache

	constructor(options?: ServiceOptions) {
		super(options);
	}

	/**
	 * Get option data for a cryptocurrency
	 */
	async getOptions(request: {
		asset: string;
		optionType?: string;
		positionType?: string;
		strike?: number;
		expiry?: string;
	}) {
		try {
			elizaLogger.warn("🚀 Starting getOptions with request:", {
				...request,
				timestamp: new Date().toISOString(),
			});

			const sdk = await this.getSDK();
			const asset =
				request.asset.toUpperCase() === "BTC" ? UnderlyingAsset.BTC : UnderlyingAsset.ETH;
			const optionType = request.optionType === "call" ? OptionType.call : OptionType.put;
			const positionType = request.positionType === "long" ? "long" : "short";
			// Fetch and cache options data if needed
			if (this.shouldRefreshCache()) {
				elizaLogger.warn("📡 Fetching options data for asset:", asset);
				const response = await sdk.getOptionsMarketBoard({
					asset,
					optionType: optionType,
					positionType: positionType as PositionType,
				});

				elizaLogger.warn("📥 Received response array:", response);

				const transformedOptions = this.transformOptionsData(response);
				elizaLogger.warn("🔄 Transformed options count:", transformedOptions.length);

				this.optionsCache = transformedOptions.map((opt) => ({
					optionId: opt.optionId,
					symbol: asset,
					type: opt.type,
					expiry: opt.expiry,
					strike: opt.strike,
					protocol: opt.protocol,
					marketName: opt.protocol,
					contractPrice: opt.price,
					availableAmount: opt.available.toString(),
				}));
				elizaLogger.info(
					"💾 Updated cache with options:",
					JSON.stringify(this.optionsCache, null, 2)
				);
				this.lastFetchTime = Date.now();
			}

			// Log filtering steps
			elizaLogger.info("🔍 Starting options filtering...");
			let filteredOptions = this.optionsCache;

			if (request.optionType) {
				elizaLogger.info(`Filtering by option type: ${request.optionType}`);
				filteredOptions = filteredOptions.filter(
					(opt) => opt.type.toLowerCase() === request.optionType?.toLowerCase()
				);
			}

			elizaLogger.info(`✨ Final filtered options count: ${filteredOptions.length}`);
			elizaLogger.info("📤 Returning options response");

			const response = {
				asset: request.asset,
				optionType: request.optionType || "all",
				formattedOptions: this.formatOptionsResponse(filteredOptions),
				options: filteredOptions.map((opt) => ({
					optionId: opt.optionId,
					expiry: opt.expiry,
					strike: opt.strike,
					price: opt.contractPrice,
					protocol: opt.protocol,
					available: parseFloat(opt.availableAmount),
					type: opt.type,
				})),
				timestamp: Date.now(),
			};

			// Log the final response
			elizaLogger.warn("📦 Final response summary:", {
				asset: request.asset,
				optionType: request.optionType || "all",
				optionsCount: filteredOptions.length,
			});

			return response;
		} catch (error) {
			elizaLogger.error("❌ Error:", error);
			throw this.handleError(error, "options fetch");
		}
	}

	private shouldRefreshCache(): boolean {
		return Date.now() - this.lastFetchTime > OptionService.CACHE_DURATION;
	}

	// Helper methods for querying cached data
	async getExpiryDates(): Promise<string[]> {
		const uniqueExpiries = [...new Set(this.optionsCache.map((opt) => opt.expiry))];
		return uniqueExpiries.sort();
	}

	async getStrikePrices(expiry?: string): Promise<number[]> {
		let options = this.optionsCache;
		if (expiry) {
			options = options.filter((opt) => opt.expiry === expiry);
		}
		const uniqueStrikes = [...new Set(options.map((opt) => opt.strike))];
		return uniqueStrikes.sort((a, b) => a - b);
	}

	async getProtocols(): Promise<string[]> {
		return [...new Set(this.optionsCache.map((opt) => opt.protocol))];
	}

	/**
	 * Validate option request parameters
	 */
	private validateRequest(request: OptionRequest): void {
		elizaLogger.info("🔍 Validating option request:", request);

		// Validate asset
		const normalizedAsset = request.asset.toUpperCase();
		elizaLogger.info("Validating asset:", normalizedAsset);
		const validAssets = Object.values(ASSET_TYPES);
		if (!validAssets.includes(normalizedAsset as any)) {
			elizaLogger.error("❌ Invalid asset:", normalizedAsset);
			throw new InvalidParameterError(ERROR_MESSAGES.INVALID_ASSET);
		}

		// Validate option type
		const normalizedOptionType = request.optionType.toLowerCase();
		elizaLogger.info("Validating option type:", normalizedOptionType);
		const validOptionTypes = Object.values(OPTION_TYPES);
		if (!validOptionTypes.includes(normalizedOptionType as any)) {
			elizaLogger.error("❌ Invalid option type:", normalizedOptionType);
			throw new InvalidParameterError(ERROR_MESSAGES.INVALID_OPTION_TYPE);
		}

		// Validate position type if provided
		if (request.positionType) {
			const normalizedPositionType = request.positionType.toLowerCase();
			const validPositionTypes = Object.values(POSITION_TYPES);
			if (!validPositionTypes.includes(normalizedPositionType as any)) {
				throw new InvalidParameterError(ERROR_MESSAGES.INVALID_POSITION_TYPE);
			}
		}

		elizaLogger.info("✅ Request validation successful");
	}

	/**
	 * Transform raw options data into standardized format
	 */
	private transformOptionsData(apiResponse: any): OptionResponse["options"] {
		elizaLogger.warn("🔄 Starting options data transformation");

		if (!Array.isArray(apiResponse)) {
			elizaLogger.warn("⚠️ Response is not an array");
			return [];
		}

		elizaLogger.warn(`📊 Processing ${apiResponse.length} options`);

		const options = apiResponse.map((option: any) => ({
			expiry: option.expiry,
			strike: option.strike,
			price: option.contractPrice,
			protocol: option.protocol,
			available: parseFloat(option.availableAmount),
			type: option.type,
			optionId: option.optionId,
		}));

		elizaLogger.warn(`✅ Transformed ${options.length} options successfully`);
		return options;
	}

	private formatOptionSymbol(option: OptionData): string {
		const date = new Date(option.expiry);
		const day = date.getDate().toString().padStart(2, "0");
		const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
		const year = date.getFullYear().toString().slice(-2);
		const type = option.type.charAt(0); // 'C' for CALL, 'P' for PUT

		return `${option.symbol}-${day}${month}${year}-${option.strike}-${type}`;
	}

	private formatOptionsResponse(options: OptionData[]): string {
		if (options.length === 0) {
			return "No options available";
		}

		// Group by expiry date
		const groupedByExpiry = options.reduce((acc, opt) => {
			const expiry = opt.expiry;
			if (!acc[expiry]) {
				acc[expiry] = [];
			}
			acc[expiry].push(opt);
			return acc;
		}, {} as Record<string, OptionData[]>);

		let response = "";
		Object.entries(groupedByExpiry).forEach(([expiry, expiryOptions]) => {
			response += `\nExpiry: ${expiry}\n`;
			expiryOptions.forEach((option) => {
				const symbol = this.formatOptionSymbol(option);
				response += `\n${symbol}\n`;
				response += `Protocol: ${option.protocol}\n`;
				response += `Available: ${option.availableAmount} contracts\n`;
				response += `Price: $${option.contractPrice.toLocaleString()}\n`;
				response += `------------------------\n`;
			});
		});

		return response.trim();
	}
}
