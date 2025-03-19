import { BaseService } from "./base";
import { ERROR_MESSAGES } from "../constants/errors";
import { InvalidParameterError } from "../types/error";
import type { ServiceOptions } from "./base";
import { PERPS_PROTOCOLS } from "../constants/api";
import { elizaLogger } from "@elizaos/core";
import { GetPairsParams } from "@grixprotocol/sdk";
export interface PerpsPairsResponse {
  pairs: {
    baseAsset: string;
    quoteAsset: string;
  }[];
}

export interface PerpsPairsRequest {
  protocolName: string;
  asset?: string;
}

export class PerpsPairsService extends BaseService {
  constructor(options?: ServiceOptions) {
    super(options);
  }

  /**
   * Get current price for a cryptocurrency
   */
  async getPerpsPairs(request: PerpsPairsRequest): Promise<PerpsPairsResponse> {
    try {
      this.validateProtocol(request.protocolName);

      const sdk = await this.getSDK();
      let assetName = null;
      if (request.asset?.toLowerCase() === "btc") {
        assetName = "BTC";
      } else if (request.asset?.toLowerCase() === "eth") {
        assetName = "ETH";
      } else {
        elizaLogger.info("🔄 No asset provided, or provided asset not supported, fetching all pairs");
      }

      const pairsRequest: GetPairsParams = {
        protocol: request.protocolName,
      };

      if (assetName) {
        pairsRequest.baseAsset = assetName;
      }
      
      const pairsResponse = await sdk.getPerpsPairs(pairsRequest);

      // Transform the string pairs into objects with baseAsset and quoteAsset
      const formattedPairs = pairsResponse.pairs.map((pair: string) => {
        const [baseAsset, quoteAsset] = pair.split("-");
        return {
          baseAsset,
          quoteAsset,
        };
      });

      return {
        pairs: formattedPairs,
      };
    } catch (error) {
      throw this.handleError(
        error,
        ERROR_MESSAGES.PERPS_PAIRS_FETCH_ERROR(request.protocolName)
      );
    }
  }

  /**
   * Validate asset is supported
   */
  private validateProtocol(protocolName: string): void {
    const normalizedProtocolName = protocolName.toLowerCase();
    const validProtocols = Object.values(PERPS_PROTOCOLS);

    if (!validProtocols.includes(normalizedProtocolName as any)) {
      throw new InvalidParameterError(
        ERROR_MESSAGES.INVALID_PROTOCOL(protocolName)
      );
    }
  }
}
