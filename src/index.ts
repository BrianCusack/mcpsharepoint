import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import dotenv from "dotenv";
dotenv.config();

// Configuration for Microsoft Graph API connection
interface SharepointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteId: string; // The ID or URL of your SharePoint site
}

class SharepointConnector {
  private client: Client;
  private siteId: string;

  constructor(config: SharepointConfig) {
    // Create a credential using client ID and secret
    const credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    // Create an auth provider for Microsoft Graph
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });

    // Initialize the Graph client
    this.client = Client.initWithMiddleware({
      authProvider
    });

    this.siteId = config.siteId;
  }

  async searchDocuments(query: string, maxResults = 10) {
    try {
      const searchResults = await this.client.api('/search/query')
        .post({
          requests: [{
            entityTypes: ["driveItem"],
            query: {
              queryString: query
            },
            from: 0,
            size: maxResults,
            fields: ["name", "webUrl", "lastModifiedDateTime", "createdDateTime", "size", "author", "filetype"]
          }]
        });

      return searchResults.value[0].hitsContainers[0].hits.map((hit: { resource: { id: string; properties: { name: string; webUrl: string; lastModifiedDateTime: string; createdDateTime: string; size: number; author: string; filetype: string; }; }; }) => ({
        id: hit.resource.id,
        name: hit.resource.properties.name,
        url: hit.resource.properties.webUrl,
        lastModified: hit.resource.properties.lastModifiedDateTime,
        created: hit.resource.properties.createdDateTime,
        size: hit.resource.properties.size,
        author: hit.resource.properties.author,
        type: hit.resource.properties.filetype
      }));
    } catch (error) {
      console.error("Error searching documents:", error);
      throw error;
    }
  }

  async getDocumentContent(documentId: string) {
    try {
      // First get document metadata
      const document = await this.client.api(`/sites/${this.siteId}/drive/items/${documentId}`).get();

      // Get the content based on file type
      const fileType = document.name.split('.').pop()?.toLowerCase();

      if (['docx', 'xlsx', 'pptx'].includes(fileType)) {
        // For Office documents, get a text representation
        const content = await this.client.api(`/sites/${this.siteId}/drive/items/${documentId}/content`).get();
        // Note: In a real implementation, you would need to convert these file types to text
        // This is a simplified placeholder
        return {
          metadata: document,
          content: content
        };
      } else if (['txt', 'html', 'md', 'json', 'csv'].includes(fileType)) {
        // For text files, get the raw content
        return {
          metadata: document,
          content: await this.client.api(`/sites/${this.siteId}/drive/items/${documentId}/content`).get()
        };
      } else if (['pdf'].includes(fileType)) {
        // For PDFs, you'd need additional processing to extract text
        // This is a simplified placeholder
        const content = await this.client.api(`/sites/${this.siteId}/drive/items/${documentId}/content`).get();
        return {
          metadata: document,
          content: content
        };
      } else {
        return {
          metadata: document,
          content: `Content extraction not supported for file type: ${fileType}`
        };
      }
    } catch (error) {
      console.error("Error getting document content:", error);
      throw error;
    }
  }

  async listSites() {
    try {
      const sites = await this.client.api('/sites').get();
      return sites.value;
    } catch (error) {
      console.error("Error listing sites:", error);
      throw error;
    }
  }

  async listLibraries() {
    try {
      const libraries = await this.client.api(`/sites/${this.siteId}/drives`).get();
      return libraries.value;
    } catch (error) {
      console.error("Error listing document libraries:", error);
      throw error;
    }
  }

  async listFolderContents(folderId?: string) {
    try {
      let endpoint;
      if (folderId) {
        endpoint = `/sites/${this.siteId}/drive/items/${folderId}/children`;
      } else {
        endpoint = `/sites/${this.siteId}/drive/root/children`;
      }

      const items = await this.client.api(endpoint).get();
      return items.value;
    } catch (error) {
      console.error("Error listing folder contents:", error);
      throw error;
    }
  }
}

// Initialize the MCP server and SharePoint connector
async function createSharepointMcpServer(config: SharepointConfig) {
  // Create the server
  const server = new McpServer({
    name: "SharePoint Server",
    version: "1.0.0"
  });

  // Initialize SharePoint connector
  const sharepoint = new SharepointConnector(config);

  // Resource: List of SharePoint sites
  server.resource(
    "sites",
    "sharepoint://sites",
    async (uri) => {
      const sites = await sharepoint.listSites();
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(sites, null, 2)
        }]
      };
    }
  );

  // Resource: List of document libraries for the configured site
  server.resource(
    "libraries",
    "sharepoint://libraries",
    async (uri) => {
      const libraries = await sharepoint.listLibraries();
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(libraries, null, 2)
        }]
      };
    }
  );

  // Resource: Folder contents (root or specific folder)
  server.resource(
    "folder",
    new ResourceTemplate("sharepoint://folder/{folderId?}", { list: undefined }),
    async (uri, params) => {
      const folderId = Array.isArray(params.folderId) ? params.folderId[0] : params.folderId;
      const items = await sharepoint.listFolderContents(folderId);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(items, null, 2)
        }]
      };
    }
  );

  // Resource: Document content
  server.resource(
    "document",
    new ResourceTemplate("sharepoint://document/{documentId}", { list: undefined }),
    async (uri, { documentId }) => {
      const result = await sharepoint.getDocumentContent(Array.isArray(documentId) ? documentId[0] : documentId);
      return {
        contents: [{
          uri: uri.href,
          text: typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content, null, 2)
        }]
      };
    }
  );

  // Tool: Search for documents
  server.tool(
    "search-documents",
    {
      query: z.string().describe("Search query to find documents"),
      maxResults: z.string().optional().describe("Maximum number of results to return (as a string)")
    },
    async ({ query, maxResults = 10 }) => {
      try {
        const results = await sharepoint.searchDocuments(query, parseInt(maxResults.toString(), 10));
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error searching documents: ${error}`
          }],
          isError: true
        };
      }
    }
  );

  // Prompt: Search and summarize a document
  server.prompt(
    "document-summary",
    {
      documentId: z.string().describe("The ID of the document to summarize")
    },
    ({ documentId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please retrieve the document with ID ${documentId} using the sharepoint://document/${documentId} resource, then provide a concise summary of its key points, main topics, and important information.`
        }
      }]
    })
  );

  // Prompt: Find relevant documents
  server.prompt(
    "find-relevant-documents",
    {
      topic: z.string().describe("The topic or subject to find documents about"),
      maxResults: z.string().optional().describe("Maximum number of results to return (as a string)")
    },
    ({ topic, maxResults = "5" }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Please use the search-documents tool to find up to ${maxResults} documents related to "${topic}". For each document, provide the title, author, last modified date, and a brief description of what it appears to contain based on the metadata.`
        }
      }]
    })
  );

  // Prompt: Explore folder contents
  server.prompt(
    "explore-folder",
    {
      folderId: z.string().optional().describe("The ID of the folder to explore (leave empty for root folder)")
    },
    ({ folderId }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: folderId
            ? `Please explore the contents of the folder with ID ${folderId} using the sharepoint://folder/${folderId} resource. List all documents and subfolders, organizing them by type and providing key details about each item.`
            : `Please explore the contents of the root folder using the sharepoint://folder resource. List all documents and subfolders, organizing them by type and providing key details about each item.`
        }
      }]
    })
  );

  return server;
}

// Example usage
async function main() {
  // Load configuration from environment variables or a config file
  const config: SharepointConfig = {
    tenantId: process.env.TENANT_ID || "",
    clientId: process.env.CLIENT_ID || "",
    clientSecret: process.env.CLIENT_SECRET || "",
    siteId: process.env.SITE_ID || ""
  };

  // Create and start the server
  const server = await createSharepointMcpServer(config);

  // Connect using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
});