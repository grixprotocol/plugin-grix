# Grix Plugin for ElizaOS

This plugin integrates Grix Protocol functionality into ElizaOS, providing advanced trading capabilities.



### 1. Clone and Setup ElizaOS

```bash
# Clone the repository
git clone https://github.com/elizaOS/eliza

# Navigate to the project directory
cd eliza

# Checkout the latest release
git checkout $(git describe --tags `git rev-list --tags --max-count=1`)

# Install dependencies
pnpm install --no-frozen-lockfile
```

### 3. Plugin Configuration

1. Create a `.env` file in the main Eliza directory with the required API keys:

```env
# Required API Keys
GRIX_API_KEY=your_grix_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Required for ElizaOS
```

2. Configure your agent's character by adding the Grix plugin to your configuration:

```json
{
	"plugins": ["@elizaos-plugins/plugin-grix"]
}
```

### 4. Install and Verify Plugins

```bash
# List all installed plugins (verify Grix installation)
npx elizaos plugins list

# Add Grix plugin if not already installed
npx elizaos plugins add @elizaos-plugins/plugin-grix

# Build the project
pnpm run build
```

### 5. Start the Application

```bash
sh scripts/start.sh
```

## Troubleshooting

If you encounter any issues:

1. Ensure all API keys are correctly set in your `.env` file
2. Verify that all dependencies are installed correctly
3. Make sure you're using the correct Node.js version
4. Check that the plugin is properly listed in your configuration
 