# @elizaos/plugin-grix

A plugin that enables DeFi options data fetching and price analysis through the Grix Finance API integration.

## Overview

Grix Plugin provides real-time access to decentralized options trading data across multiple protocols, including price feeds for BTC and ETH. It aggregates options data from various DeFi protocols and provides comprehensive options market information through a simple interface.

## Installation

```bash
pnpm add @elizaos/plugin-grix
```

## Configuration

### Required Environment Variables

```env
GRIX_API_KEY=your_api_key  # Required: Get your API key from https://discord.com/invite/ZgPpr9psqp
```

### Character Configuration

Add the plugin to your character configuration file (e.g., `characters/your_character.character.json`):

```json
{
	"name": "Your Character",
	"plugins": ["@elizaos/plugin-grix"],
	"settings": {
		"secrets": {
			"GRIX_API_KEY": "your_api_key_here"
		}
	}
}
```

## Features

### Price Data

-   Real-time BTC/ETH price feeds
-   Options pricing across multiple protocols
-   Available liquidity information

### Options Data

-   Call and Put options data
-   Strike prices and expiry dates
-   Protocol-specific pricing
-   Position types (long/short)

## Quick Start

1. Visit [Grix Finance](https://app.grix.finance/)
2. Get your API key
3. Add configuration to your character file
4. Start querying options data!

## Community & Support

-   [Discord Community](https://discord.com/invite/ZgPpr9psqp)
-   [Telegram Group](https://t.me/GrixFinance)
-   [Grix App](https://app.grix.finance/)
-   [Documentation](https://app.grix.finance/docs)

## License

MIT

## Dependencies

-   @elizaos/core: workspace:\*
-   ethers: ^6.7.1
-   zod: ^3.22.4

## Development

### Building

```bash
pnpm build
```

### Running with Eliza

1. Install dependencies

```bash
pnpm install
```

2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your GRIX_API_KEY
```

3. Start Eliza with your character

```bash
pnpm start --character="characters/your_character.character.json"
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## Disclaimer

This plugin is for accessing DeFi options data only. Please ensure compliance with your local regulations regarding options trading.
