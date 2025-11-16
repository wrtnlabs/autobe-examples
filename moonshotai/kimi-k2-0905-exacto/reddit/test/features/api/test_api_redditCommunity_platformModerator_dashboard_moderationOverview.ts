import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationDashboard";

export async function test_api_redditCommunity_platformModerator_dashboard_moderationOverview(
  connection: api.IConnection,
) {
  const output: IRedditCommunityModerationDashboard =
    await api.functional.redditCommunity.platformModerator.dashboard.moderationOverview(
      connection,
    );
  typia.assert(output);
}
