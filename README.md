# Sharepoint - WIP, just for R&D ATM

A Model Context Protocol server that provides access to Organisational Sharepoint.

## Implementation 

| Component          | Operation            | Resource | Dynamic Resource | Tool |
|--------------------|---------------------|----------|------------------|------|
| Users              |                     | ❌        | ❌               | ❌   |
|                    | Read User           | ❌        | ❌               | ❌   |
|                    | Find User           | ❌        | ❌               | ❌   |
| Sites              |                     | ❌        | ❌               | ❌   |
|                    | List Sites          | ✅        | ❌               | ❌   |
|                    | Get Site Details    | ❌        | ❌               | ❌   |
|                    | Create Subsite      | ❌        | ❌               | ❌   |
|                    | Delete Site         | ❌        | ❌               | ❌   |
| Drives             |                     | ❌        | ❌               | ❌   |
|                    | List Folders        | ❌        | ❌               | ❌   |
|                    | Search Folders      | ❌        | ❌               | ✅   |
|                    | Create Folder       | ❌        | ❌               | ❌   |
|                    | Delete Folder       | ❌        | ❌               | ❌   |
|                    | Upload File         | ❌        | ❌               | ❌   |
|                    | List Items          | ❌        | ✅               | ❌   |
|                    | Download File       | ❌        | ❌               | ✅   |
|                    | Read File           | ✅        | ❌               | ❌   |
|                    | Move File           | ❌        | ❌               | ❌   |
|                    | Copy File           | ❌        | ❌               | ❌   |
| Lists              |                     | ❌        | ❌               | ❌   |
|                    | Create List         | ❌        | ❌               | ❌   |
|                    | Read List           | ❌        | ❌               | ❌   |
|                    | Add to List         | ❌        | ❌               | ❌   |
|                    | Update List         | ❌        | ❌               | ❌   |
|                    | Delete List         | ❌        | ❌               | ❌   |
| Calendar           |                     | ❌        | ❌               | ❌   |
|                    | Create Event        | ❌        | ❌               | ❌   |
|                    | Read Event          | ❌        | ❌               | ❌   |
|                    | Update Event        | ❌        | ❌               | ❌   |
|                    | Delete Event        | ❌        | ❌               | ❌   |

### Prompts

- document-summary
- find-relevant-documents
- explore-folder

## Enviremental Variables

- Copy .env.example as .env
- Fill the requires fields

## Inspector

From root

```Bash
npx @modelcontextprotocol/inspector -e TENANT_ID=your_tenant_id -e CLIENT_ID=your_client_id -e CLIENT_SECRET=your_client_secret -e SITE_ID=your_site_id -e DRIVE_ID=your_drive_id -- node dist/index.js
```

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
        "--init", 
        "-e", "DOCKER_CONTAINER=true",
        "-e", "TENANT_ID=your-tenant-id",
        "-e", "CLIENT_ID=your-client-id",
        "-e", "CLIENT_SECRET=your-client-secret",
        "-e", "SITE_ID=your-site-id",
        "-e", "DRIVE_ID=your-drive-id",
        "mcp/sharepoint"
      ]
    }
  }
}
```
###  MCP configuration file

```bash
pnpm run build
```

```json
{
  "mcpServers": {
    "sharepoint": {
      "command": "node",
      "args": ["run", "start"],
      "env": {
        "TENANT_ID": "your-tenant-id",
        "CLIENT_ID": "your-client-id",
        "CLIENT_SECRET": "your-client-secret",
        "SITE_ID": "your-site-id",
        "DRIVE_ID": "your-drive-id",
      }
    }
  }
}
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
