import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityKnowledgeBaseUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKnowledgeBaseUsage";

export async function test_api_redditCommunity_platformModerator_reports_knowledgeBaseUsage(
  connection: api.IConnection,
) {
  const output: IRedditCommunityKnowledgeBaseUsage =
    await api.functional.redditCommunity.platformModerator.reports.knowledgeBaseUsage(
      connection,
    );
  typia.assert(output);
}
