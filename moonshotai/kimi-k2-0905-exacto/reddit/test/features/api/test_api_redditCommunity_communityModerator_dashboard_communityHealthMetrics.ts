import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunityHealthMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityHealthMetrics";

export async function test_api_redditCommunity_communityModerator_dashboard_communityHealthMetrics(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunityHealthMetrics =
    await api.functional.redditCommunity.communityModerator.dashboard.communityHealthMetrics(
      connection,
    );
  typia.assert(output);
}
