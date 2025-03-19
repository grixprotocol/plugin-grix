import type { ServiceOptions } from "./base";
import { PriceService } from "./price";
import { OptionService } from "./option";
import { SignalService } from "./signal";
import { PerpsPairsService } from "./perpsPairs";

/**
 * Main service facade that coordinates between specialized services
 */
export class GrixService {
	private priceService: PriceService;
	private optionService: OptionService;
	private signalService: SignalService;
	private perpsPairsService: PerpsPairsService;

	constructor(options?: ServiceOptions) {
		this.priceService = new PriceService(options);
		this.optionService = new OptionService(options);
		this.signalService = new SignalService(options);
		this.perpsPairsService = new PerpsPairsService(options);
	}

	static formatPrice(price: number): string {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(price);
	}

	/**
	 * Price-related operations
	 */
	async getPrice(request: { asset: string }) {
		return this.priceService.getPrice(request);
	}

	/**
	 * Option-related operations
	 */
	async getOptions(request: {
		asset: string;
		optionType: string;
		positionType?: string;
		strike?: number;
		expiry?: string;
		limit?: number;
	}) {
		return this.optionService.getOptions(request);
	}

	/**
	 * Trading signal operations
	 */
	async generateSignals(request: {
		asset: string;
		budget_usd: number;
		trade_window_ms: number;
		risk_level: "conservative" | "moderate" | "aggressive";
		strategy_focus: "income" | "growth" | "hedging";
	}) {
		return this.signalService.generateSignals(request);
	}

	/**
	 * Perps pairs operations
	 */
	async getPerpsPairs(request: { protocolName: string; asset?: string }) {
		return this.perpsPairsService.getPerpsPairs(request);
	}
}

export { PriceService, OptionService, SignalService, PerpsPairsService };
