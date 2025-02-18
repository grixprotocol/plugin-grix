import type { Content } from "@elizaos/core";

/**
 * Type definitions for option-related data structures
 */

/**
 * Main content type for option requests
 * Contains all parameters that can be extracted from user messages
 */
export interface GetOptionPriceContent extends Content {
	symbol: string; // BTC or ETH
	type: string; // CALL or PUT
	expiry?: string; // Optional expiry date
	strike?: number; // Optional strike price
	protocol?: string; // For single-protocol requests; for comparisons, protocols can be comma‐separated
	text: string; // Original message text
	analyze?: {
	  type: "lowest" | "highest"; // Analysis type
	  compareProtocols?: boolean; // If true, compare among the specified protocols
	};
	positionType?: string; // Optional position type
  }
  
  

export interface OptionPriceData {
	price: number;
	delta?: number;
	gamma?: number;
	vega?: number;
	theta?: number;
	impliedVolatility?: number;
	marketName?: string;
	availableAmount?: number;
	formattedExpiry?: string;
}

interface OptionPriceDataResponse {
	markPrice?: number;
	assetPrice?: number;
	premiumRate?: number | null;
}

interface GrixOption {
	optionId: number;
	marketName: string;
	strikePrice: string;
	expirationDate: string;
	optionType: string;
	positionType: string;
	priceType: string;
	contractPrice: string;
	availableContractAmount: string;
	asset: string;
	optionPriceData: OptionPriceDataResponse;
}

export interface GrixApiResponse {
	expirationBoard: string[];
	strikeBoard: {
		[key: string]: string[];
	};
	optionBoard: {
		[expiry: string]: {
			[strike: string]: GrixOption[];
		};
	};
}

/**
 * Represents a flattened option from the API
 * Contains all relevant option data in a normalized format
 */
export interface FlattenedOption {
	optionId: number;
	symbol: "BTC" | "ETH";
	type: "CALL" | "PUT";
	expiry: string;
	strike: number;
	protocol: string;
	marketName: string;
	contractPrice: number;
	availableAmount: number;
}
