import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityContentRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRanking";

export async function test_api_redditCommunity_platformModerator_statistics_engagement_summary_engagementSummary(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRanking =
    await api.functional.redditCommunity.platformModerator.statistics.engagement_summary.engagementSummary(
      connection,
    );
  typia.assert(output);
}
