export const ERROR_CODES = {
	INVALID_CREDENTIALS: 401,
	INVALID_PARAMETERS: 400,
	SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
	INVALID_CREDENTIALS: "Invalid API credentials. Please check your API key.",
	INVALID_ASSET: "Invalid asset. Only BTC and ETH are supported.",
	INVALID_OPTION_TYPE: "Invalid option type. Only 'call' and 'put' are supported.",
	INVALID_POSITION_TYPE: "Invalid position type. Only 'long' and 'short' are supported.",
	SERVICE_UNAVAILABLE: "The Grix service is currently unavailable. Please try again later.",
	OPTION_FETCH_ERROR: (asset: string) => `Failed to fetch options data for ${asset}`,
	PRICE_FETCH_ERROR: (asset: string) => `Failed to fetch price for ${asset}`,
} as const; 