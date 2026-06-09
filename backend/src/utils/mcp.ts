import { MCPToolset } from "@google/adk";

export function createElasticMCPToolset(): MCPToolset {
  const elasticUrl = process.env.ELASTIC_URL;
  const elasticApiKey = process.env.ELASTIC_API_KEY;
  const kibanaUrl = process.env.KIBANA_URL;

  if (!elasticUrl || !elasticApiKey || !kibanaUrl) {
    throw new Error(
      "Missing Elastic environment variables: ELASTIC_URL, ELASTIC_API_KEY, KIBANA_URL",
    );
  }

  return new MCPToolset({
    type: "StreamableHTTPConnectionParams",
    url: `${kibanaUrl}/api/agent_builder/mcp`,
    header: {
      Authorization: `ApiKey ${elasticApiKey}`,
      "kbn-xsrf": "true",
    },
  });
}
