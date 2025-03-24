# Sharepoint

A Model Context Protocol server that provides access to Organisational Sharepoint.

## Components

### Tools
- Connects to Sharepoint using Microsoft Graph API
- Exposes Sharepoint documents and file system as resources
- Provides tools for searching documents and reading documents
- Includes prompts for common Sharepoint tasks

## Enviremental Variables

- Copy .env.example as .env
- Fill the requires fields

## Usage with Claude Desktop

To use this server with the Claude Desktop app, add the following configuration to the "mcpServers" section of your `claude_desktop_config.json`:

### Docker

* Docker build and tag `docker build -t mcp/sharepoint .`

```json
{
  "mcpServers": {
    "sharepoint": {
      "command": "docker",
      "args": [
        "run", 
        "-i", 
        "--rm", 
        "mcp/sharepoint"
        ]
    }
  }
}
```


## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.