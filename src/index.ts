import type { Plugin } from "@elizaos/core";
import { GetOptionPriceAction } from "./actions/getOptionPrice";
import { GetAssetPriceAction } from "./actions/getAssetPrice";
import { OptionPriceEvaluator } from "./evaluators/optionEvaluator";
import { AssetPriceEvaluator } from "./evaluators/assetPriceEvaluator";
import { OptionPriceProvider } from "./providers/optionProvider";
import { AssetPriceProvider } from "./providers/assetPriceProvider";

export const grixPlugin: Plugin = {
	name: "grix",
	description:
		"Grix Plugin for fetching and analyzing options pricing data across various protocols",
	actions: [new GetOptionPriceAction(), new GetAssetPriceAction()],
	evaluators: [new OptionPriceEvaluator(), new AssetPriceEvaluator()],
	providers: [new OptionPriceProvider(), new AssetPriceProvider()],
};

export default grixPlugin;
