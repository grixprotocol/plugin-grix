import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { validateGrixConfig } from "../environment";
import { GRIX_BASE_URL } from "../config";

interface AssetPriceResponse {
	assetPrice: number;
}

export class AssetPriceProvider implements Provider {
	async get(runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
		try {
			const config = await validateGrixConfig(runtime);
			const content =
				typeof message.content === "string" ? message.content : message.content?.text;
			if (!content) throw new Error("No content provided");

			// Extract asset from message
			const asset = content.toUpperCase().includes("ETH") ? "ETH" : "BTC";

			const url = `${GRIX_BASE_URL}/assetprice?asset=${asset}`;

			const response = await fetch(url, {
				headers: {
					"x-api-key": config.GRIX_API_KEY,
					Accept: "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`API error: ${response.status}`);
			}

			const data = (await response.json()) as AssetPriceResponse;
			return `Current ${asset} price: $${Number(data.assetPrice).toLocaleString()}`;
		} catch (error: any) {
			console.error("AssetPriceProvider error:", error);
			return `Error: ${error.message}`;
		}
	}
}

export const assetPriceProvider = new AssetPriceProvider();
