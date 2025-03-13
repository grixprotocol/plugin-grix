import type { Plugin } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";

import { getAssetPriceAction } from "./actions/getAssetPrice";
import { getOptionPriceAction } from "./actions/getOptionPrice";
import { getTradingSignalAction } from "./actions/getTradingSignal";
import { showGrixHelpAction } from "./actions/showGrixHelp";

/**
 * Grix Finance Plugin v2
 * Provides cryptocurrency price feeds, options data, and trading signals
 *
 * This plugin follows a service-oriented architecture with:
 * - Specialized services with clear responsibilities
 * - Clean separation between services and actions
 * - Standardized error handling
 * - Consistent parameter validation
 */

// Configure logger to show all levels

export const grixPlugin: Plugin = {
	name: "grixv2",
	description: "Grix Finance Plugin v2 - Advanced crypto options trading insights and signals",
	actions: [
		getAssetPriceAction,
		getOptionPriceAction,
		getTradingSignalAction,
		showGrixHelpAction,
	],
	// Removed evaluators since actions now handle parameter extraction
	evaluators: [],
	providers: [],
};

export default grixPlugin;

// Re-export all actions for external use
export * from "./actions";
