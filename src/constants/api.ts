export const API_DEFAULTS = {
	BASE_URL: "https://api.grix.finance",
	TIMEOUT: 30000, // 30 seconds
	RATE_LIMIT: {
		MAX_REQUESTS_PER_MINUTE: 100,
		WEIGHT_PER_REQUEST: 1,
	},
};

export const OPTION_TYPES = {
	CALL: "call",
	PUT: "put",
} as const;

export const POSITION_TYPES = {
	LONG: "long",
	SHORT: "short",
} as const;

export const ASSET_TYPES = {
	BTC: "BTC",
	ETH: "ETH",
} as const; 

export const PERPS_PROTOCOLS = {
	HYPERLIQUID: "hyperliquid",
} as const;