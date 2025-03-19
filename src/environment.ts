import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";
import { elizaLogger } from "@elizaos/core";

export const grixEnvSchema = z.object({
	GRIX_API_KEY: z.string().min(1, "Grix API key is required"),
	OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
});

export type GrixConfig = z.infer<typeof grixEnvSchema>;

/**
 * Environment configuration validator
 * Ensures required API keys and settings are present
 */
export async function validateGrixConfig(runtime: IAgentRuntime): Promise<GrixConfig> {
	elizaLogger.info("🔐 Validating Grix configuration...");
	try {
		const config = {
			GRIX_API_KEY: runtime.getSetting("GRIX_API_KEY"),
			OPENAI_API_KEY: runtime.getSetting("OPENAI_API_KEY"),
		};
		elizaLogger.info("Checking required settings...");

		const result = grixEnvSchema.parse(config);
		elizaLogger.info("✅ Configuration validated successfully");
		return result;
	} catch (error) {
		elizaLogger.error("❌ Configuration validation failed:", error);
		if (error instanceof z.ZodError) {
			const errorMessages = error.errors
				.map((err) => `${err.path.join(".")}: ${err.message}`)
				.join("\n");
			throw new Error(`Grix configuration validation failed:\n${errorMessages}`);
		}
		throw error;
	}
}
