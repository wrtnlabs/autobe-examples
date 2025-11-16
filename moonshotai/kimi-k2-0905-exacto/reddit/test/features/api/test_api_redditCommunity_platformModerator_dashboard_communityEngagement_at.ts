import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityContentRankingsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentRankingsDashboard";

export async function test_api_redditCommunity_platformModerator_dashboard_communityEngagement_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentRankingsDashboard =
    await api.functional.redditCommunity.platformModerator.dashboard.communityEngagement.at(
      connection,
    );
  typia.assert(output);
}
