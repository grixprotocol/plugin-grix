import { BaseService } from "./base";
import { ASSET_TYPES } from "../constants/api";
import { ERROR_MESSAGES } from "../constants/errors";
import { InvalidParameterError } from "../types/error";
import type { ServiceOptions } from "./base";

export interface PriceResponse {
    asset: string;
    price: number;
    formattedPrice: string;
    timestamp: number;
}

export interface PriceRequest {
    asset: string;
}

export class PriceService extends BaseService {
    constructor(options?: ServiceOptions) {
        super(options);
    }

    /**
     * Get current price for a cryptocurrency
     */
    async getPrice(request: PriceRequest): Promise<PriceResponse> {
        try {
            this.validateAsset(request.asset);
            
            const sdk = await this.getSDK();
            const assetName = request.asset.toLowerCase() === 'btc' ? 'bitcoin' : 'ethereum';
            
            const price = await sdk.fetchAssetPrice(assetName);
            
            return {
                asset: request.asset.toUpperCase(),
                price,
                formattedPrice: this.formatPrice(price),
                timestamp: Date.now()
            };
        } catch (error) {
            throw this.handleError(error, `price fetch for ${request.asset}`);
        }
    }

    /**
     * Validate asset is supported
     */
    private validateAsset(asset: string): void {
        const normalizedAsset = asset.toUpperCase();
        const validAssets = Object.values(ASSET_TYPES);
        
        if (!validAssets.includes(normalizedAsset as any)) {
            throw new InvalidParameterError(ERROR_MESSAGES.INVALID_ASSET);
        }
    }

    /**
     * Format price for display
     */
    private formatPrice(price: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }
} 