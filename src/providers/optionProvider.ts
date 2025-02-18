import type { Provider, IAgentRuntime, Memory, Content, State } from "@elizaos/core";
import { validateGrixConfig } from "../environment";
import type { GetOptionPriceContent, FlattenedOption } from "../actions/getOptionPrice/types";
import { GRIX_BASE_URL } from "../config";


export class OptionPriceProvider implements Provider {
	async get(runtime: IAgentRuntime, message: Memory, _state?: State): Promise<string> {
		try {
			const config = await validateGrixConfig(runtime);
			const content = this.extractContent(message);
			if (!content) throw new Error("No valid content provided");

			try {
				const options = await this.fetchAndProcessOptions(config.GRIX_API_KEY, content);
				return this.formatResponse(options, content);
			} catch (error: any) {
				// If we get a 500 error but have data, continue processing
				if (error.message.includes("500") && error.data && Array.isArray(error.data)) {
					return this.formatResponse(error.data, content);
				}
				throw error; // Re-throw if it's not a recoverable error
			}
		} catch (error: any) {
			console.error("OptionPriceProvider error:", error);
			return `Error: ${error.message}`;
		}
	}

	private extractContent(message: Memory): GetOptionPriceContent | null {
		// Support both string and object with a 'text' property
		const text: string | undefined =
			typeof message.content === "string" ? message.content : message.content?.text;
		if (!text) return null;

		const upperText = text.toUpperCase();
		return {
			symbol: this.extractSymbol(upperText) || "BTC",
			type: this.extractType(upperText) || "CALL",
			protocol: this.extractProtocol(upperText),
			positionType: this.extractPositionType(upperText),
			text,
		};
	}

	private extractProtocol(text: string): string | undefined {
		const protocolMap: Record<string, string> = {
			PREMIA: "PREMIA",
			DERIBIT: "DERIBIT",
			AEVO: "AEVO",
			DERIVE: "DERIVE",
			RYSK: "RYSK",
			HEGIC: "HEGIC",
			DOPEX: "DOPEX",
			ZOMMA: "ZOMMA",
			THETANUTS: "THETANUTS",
			MOBY: "MOBY",
			SDX: "SDX",
			STRYKE: "STRYKE",
		};
		for (const [key, value] of Object.entries(protocolMap)) {
			if (text.includes(key)) return value;
		}
		return undefined;
	}

	private extractType(text: string): string | undefined {
		return text.includes("PUT") ? "PUT" : text.includes("CALL") ? "CALL" : undefined;
	}

	private extractSymbol(text: string): string | undefined {
		return text.includes("ETH") ? "ETH" : text.includes("BTC") ? "BTC" : undefined;
	}

	private extractPositionType(text: string): string {
		// If "SHORT" is mentioned, return "short", otherwise default to "long"
		return text.includes("SHORT") ? "short" : "long";
	}

	private async fetchAndProcessOptions(
		apiKey: string,
		content: GetOptionPriceContent
	): Promise<FlattenedOption[]> {
		const url = new URL(`${GRIX_BASE_URL}/elizatradeboard`);
		// Use the extracted positionType
		url.searchParams.append("positionType", content.positionType);
		url.searchParams.append("optionType", content.type.toLowerCase());
		url.searchParams.append("asset", content.symbol);

		let retries = 3;
		let delay = 1000; // 1 second

		while (retries > 0) {
			try {
				const response = await fetch(url.toString(), {
					headers: {
						"x-api-key": apiKey,
						Accept: "application/json",
					},
				});

				const data = await response.json();

				// Accept valid array data even if response status is 500
				if (Array.isArray(data)) {
					return data
						.filter(
							(option) =>
								!option.protocol ||
								option.protocol === option.marketName.toUpperCase()
						)
						.map((option) => ({
							...option,
							protocol: option.marketName.toUpperCase(),
						}));
				}

				// Only throw if we don't have valid data
				if (!response.ok) {
					throw new Error(
						`API error (${response.status}): ${data.message || "Unknown error"}`
					);
				}

				throw new Error(`Invalid data format: ${JSON.stringify(data)}`);
			} catch (error: any) {
				if (retries <= 1) {
					console.error("Error fetching options:", error);
					throw error;
				}
				retries--;
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= 2;
			}
		}

		throw new Error("Max retries reached");
	}
	private formatResponse(options: FlattenedOption[], content: GetOptionPriceContent): string {
		let filteredOptions = options;

		if (content.protocol) {
			filteredOptions = options.filter(
				(opt) => opt.protocol.toUpperCase() === content.protocol?.toUpperCase()
			);
			if (filteredOptions.length === 0) {
				return `No options found for ${content.protocol} protocol with ${content.symbol} ${content.type}`;
			}
		}

		// If an expiry was requested, filter the options board by that expiry.
		if (content.expiry) {
			filteredOptions = filteredOptions.filter((opt) => opt.expiry === content.expiry);
			if (filteredOptions.length === 0) {
				return `No ${content.symbol} ${content.type} options found expiring on ${content.expiry}.`;
			}
		}

		// Group options by expiry date.
		const groupedByExpiry = filteredOptions.reduce((acc, opt) => {
			acc[opt.expiry] = acc[opt.expiry] || [];
			acc[opt.expiry].push(opt);
			return acc;
		}, {} as Record<string, FlattenedOption[]>);

		let response = `Available ${content.symbol} options:\n\n`;

		// Process each expiry group.
		for (const [expiry, expiryOptions] of Object.entries(groupedByExpiry)) {
			response += `${expiry.toUpperCase()} Options:\n`;

			// Group within the same expiry by strike.
			const groupedByStrike = expiryOptions.reduce((acc, opt) => {
				const strikeKey = opt.strike.toString();
				acc[strikeKey] = acc[strikeKey] || [];
				acc[strikeKey].push(opt);
				return acc;
			}, {} as Record<string, FlattenedOption[]>);

			// For each strike, print a single key and list each protocol's details.
			for (const [strike, strikeOptions] of Object.entries(groupedByStrike)) {
				// Format expiry into key (e.g. "2025-02-07" → "250207")
				const formattedExpiry = expiry.replace(/-/g, "").slice(2);
				const optionKey = `${content.symbol}-${formattedExpiry}-${strike}-${content.type[0]}`;
				response += `${optionKey}:\n`;

				// List each protocol's details on separate indented lines.
				strikeOptions.forEach((opt) => {
					response += ` ${opt.protocol.toLowerCase()} - ${Number(
						opt.contractPrice
					).toFixed(2)} USD (Available: ${Number(opt.availableAmount).toFixed(6)})\n`;
				});
				response += "\n";
			}
		}

		return response.trim();
	}
}

export const optionPriceProvider = new OptionPriceProvider();
