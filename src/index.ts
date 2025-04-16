import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { register } from "microsoft-graph/services/context";
import { getEnvironmentVariable } from "microsoft-graph/services/environmentVariable";
import { TenantId } from "microsoft-graph/models/TenantId";
import { ClientId } from "microsoft-graph/models/ClientId";
import { SiteId } from "microsoft-graph/models/SiteId";
import { ClientSecret } from "microsoft-graph/models/ClientSecret";
import dotenv from "dotenv";

import { createDriveRef } from "microsoft-graph/services/drive";
import { createSiteRef } from "microsoft-graph/services/site";
import { DriveId } from "microsoft-graph/models/DriveId";
import listDriveItems from "microsoft-graph/operations/driveItem/listDriveItems";
import { createDriveItemRef } from "microsoft-graph/services/driveItem";
import { DriveItemId } from "microsoft-graph/models/DriveItemId";
import getDriveItem from "microsoft-graph/operations/driveItem/getDriveItem";
import listSites from "microsoft-graph/operations/site/listSites";
dotenv.config();

// Initialize the MCP server and SharePoint connector
async function createSharepointMcpServer() {
  
  const tenantId = getEnvironmentVariable("TENANT_ID") as TenantId;
  const clientId = getEnvironmentVariable("CLIENT_ID") as ClientId;
  const clientSecret = getEnvironmentVariable("CLIENT_SECRET") as ClientSecret;

  const driveId = getEnvironmentVariable("DRIVE_ID") as DriveId;
  const siteId = getEnvironmentVariable("SITE_ID") as SiteId;
  // Create the server
  const server = new McpServer({
    name: "SharePoint Server",
    version: "1.0.0"
  });

  const contextRef = register(tenantId, clientId, clientSecret);
  const siteRef = createSiteRef(contextRef, siteId);
  const driveRef = createDriveRef(siteRef, driveId);

  // Resource: Folder contents (root or specific folder)
  server.resource(
    "folder",
    new ResourceTemplate("sharepoint://folder/{folderId?}", { list: undefined }),
    async (uri) => {
      const items = await listDriveItems(driveRef);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(items, null, 2)
        }]
      };
    }
  );

  // Resource: Sites 
  server.resource(
    "sites",
    "sharepoint://sites",
    async (uri) => {
      const items = await listSites(contextRef);
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
      const driveItemRef = createDriveItemRef(driveRef, documentId as DriveItemId);
      const result = await getDriveItem(driveItemRef);
      return {
        contents: [{
          uri: uri.href,
          text: result.content
            ? (typeof result.content === 'string'
                ? result.content
                : JSON.stringify(result.content, null, 2))
            : "No content available" // Fallback value
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
        const driveRef = createDriveRef(siteRef, driveId);
        const driveItems = await listDriveItems(driveRef);
        const results = driveItems.filter((item: any) => item.name.includes(query)).slice(0, parseInt(maxResults.toString(), 10));
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2) // Ensure this is a valid string
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

  // Download document content
  server.tool(
    "download-document",
    {
      documentId: z.string().describe("The ID of the document to download")
    },
    async ({ documentId }) => {
      try {
        const driveItemRef = createDriveItemRef(driveRef, documentId as DriveItemId);
        const result = await getDriveItem(driveItemRef);
        return {
          content: [{
            type: "text",
            text: result.content
              ? (typeof result.content === 'string'
                  ? result.content
                  : JSON.stringify(result.content, null, 2))
              : "No content available" // Fallback value
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error downloading document: ${error}`
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

  // Create and start the server
  const server = await createSharepointMcpServer();

  // Connect using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Run the server
main().catch(error => {
  console.error("Error starting server:", error);
  process.exit(1);
});