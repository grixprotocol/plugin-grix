import { Action, IAgentRuntime, Memory, State, HandlerCallback, Plugin } from '@elizaos/core';

declare const getAssetPriceAction: Action;

declare const getOptionPriceAction: Action;

declare class GetTradingSignalAction implements Action {
    name: string;
    description: string;
    similes: string[];
    examples: ({
        user: string;
        content: {
            text: string;
            action?: undefined;
        };
    } | {
        user: string;
        content: {
            text: string;
            action: string;
        };
    })[][];
    validate(runtime: IAgentRuntime): Promise<boolean>;
    handler(runtime: IAgentRuntime, message: Memory, state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
    formatTradingSignals(result: any, budget: number): string;
}
declare const getTradingSignalAction: GetTradingSignalAction;

declare class ShowGrixHelpAction implements Action {
    name: string;
    description: string;
    similes: string[];
    examples: ({
        user: string;
        content: {
            text: string;
            action?: undefined;
        };
    } | {
        user: string;
        content: {
            text: string;
            action: string;
        };
    })[][];
    validate: (_runtime: IAgentRuntime) => Promise<boolean>;
    handler(_runtime: IAgentRuntime, _message: Memory, state?: State, _options?: Record<string, unknown>, callback?: HandlerCallback): Promise<boolean>;
}
declare const showGrixHelpAction: ShowGrixHelpAction;

declare const getPerpsPairsAction: Action;

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
declare const grixPlugin: Plugin;

export { GetTradingSignalAction, ShowGrixHelpAction, grixPlugin as default, getAssetPriceAction, getOptionPriceAction, getPerpsPairsAction, getTradingSignalAction, grixPlugin, showGrixHelpAction };
