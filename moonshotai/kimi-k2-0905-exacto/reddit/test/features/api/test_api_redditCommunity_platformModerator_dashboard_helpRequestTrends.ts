import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityHelpDeskTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityHelpDeskTrends";

export async function test_api_redditCommunity_platformModerator_dashboard_helpRequestTrends(
  connection: api.IConnection,
) {
  const output: IRedditCommunityHelpDeskTrends =
    await api.functional.redditCommunity.platformModerator.dashboard.helpRequestTrends(
      connection,
    );
  typia.assert(output);
}
